#!/usr/bin/env bash
set -euo pipefail

SETUP_STEP="initialization"
SETUP_WARNINGS=0
SETUP_INTERRUPTED=false
SETUP_CHILD=''
setup_log() { printf '[setup] %s\n' "$*"; }
setup_step() { SETUP_STEP="$1"; setup_log "Starting: $SETUP_STEP"; }
setup_finish() {
  local status=$?
  if [[ "$SETUP_INTERRUPTED" == true ]]; then
    printf '[setup] Interrupted during %s (exit %s).\n' "$SETUP_STEP" "$status" >&2
  elif (( status != 0 )); then
    printf '[setup] FAILED during %s (exit %s). See output above.\n' "$SETUP_STEP" "$status" >&2
  elif (( SETUP_WARNINGS > 0 )); then
    setup_log "Finished with $SETUP_WARNINGS warning(s); see recovery instructions above."
  else
    setup_log "Setup complete."
  fi
}
# Run long commands in their own process group. Waiting on a background child
# lets Bash handle a signal immediately; children never inherit the setup lock.
setup_run() {
  local status=0
  setsid --wait "$@" 9>&- &
  SETUP_CHILD=$!
  wait "$SETUP_CHILD" || status=$?
  SETUP_CHILD=''
  return "$status"
}
setup_interrupt() {
  local signal="$1" status="$2" attempt
  trap '' INT TERM
  SETUP_INTERRUPTED=true
  if [[ -n "$SETUP_CHILD" ]]; then
    setup_log "Stopping $SETUP_STEP; allowing up to 2 seconds before forced termination."
    kill -s "$signal" -- "-$SETUP_CHILD" 2>/dev/null || kill -s "$signal" "$SETUP_CHILD" 2>/dev/null || true
    for ((attempt=0; attempt<20; attempt++)); do
      kill -0 -- "-$SETUP_CHILD" 2>/dev/null || break
      sleep 0.1 9>&-
    done
    kill -KILL -- "-$SETUP_CHILD" 2>/dev/null || true
    wait "$SETUP_CHILD" 2>/dev/null || true
  fi
  exit "$status"
}
trap setup_finish EXIT
trap 'setup_interrupt INT 130' INT
trap 'setup_interrupt TERM 143' TERM

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

setup_step "setup lock"
if ! command -v flock >/dev/null 2>&1; then
  setup_log "ERROR: flock is required to prevent concurrent setup runs." >&2
  exit 1
fi
if ! command -v setsid >/dev/null 2>&1; then
  setup_log "ERROR: setsid is required for interruptible setup commands." >&2
  exit 1
fi
mkdir -p "$HOME/.cache"
# One project per persistent devcontainer home. Never delete this lock file.
exec 9>>"$HOME/.cache/devcontainer-setup.lock"
if ! flock --nonblock 9; then
  setup_log "Another setup is already running for this home (or the lock is unavailable). Retry after it finishes." >&2
  exit 75
fi

setup_step "gcloud directories"
# Ensure gcloud has a writable config directory.
# Some environments can leave ~/.config/gcloud as a broken symlink.
ensure_gcloud_config() {
  local gcloud_config_dir="$HOME/.config/gcloud"

  mkdir -p "$HOME/.config" 9>&-

  if [ -L "$gcloud_config_dir" ] && [ ! -d "$gcloud_config_dir" ]; then
    rm "$gcloud_config_dir" 9>&-
  fi

  mkdir -p "$gcloud_config_dir/logs" "$gcloud_config_dir/configurations" 9>&-
}

ensure_gcloud_config

setup_step "node_modules permissions"
# Fix node_modules permissions (volume can be created by root).
if [ -d "${REPO_DIR}/node_modules" ]; then
  setup_run sudo -n chown -R node:node "${REPO_DIR}/node_modules"
else
  mkdir -p "${REPO_DIR}/node_modules" 9>&-
fi

setup_step "Corepack shell configuration"
# Enable corepack for all new shells.
if ! grep -q "corepack enable" "$HOME/.bashrc" 9>&- 2>/dev/null; then
  echo 'eval "$(corepack enable)"' >> "$HOME/.bashrc"
fi

# Authentication is deliberately separate from dependency installation.
setup_log "Infisical authentication is not run during setup."
setup_log "Run 'infisical login' manually when you need project secrets."

setup_step "Corepack activation"
setup_run corepack enable
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
setup_step "dependency installation (pnpm install)"
setup_run pnpm install || {
  echo "Failed to install dependencies"
  exit 1
}

if [ -x "${REPO_DIR}/scripts/install-bmad.sh" ]; then
  setup_step "BMAD installation"
  setup_run "${REPO_DIR}/scripts/install-bmad.sh" --target "${REPO_DIR}" || {
    SETUP_WARNINGS=$((SETUP_WARNINGS + 1))
    echo "[setup] WARNING: BMAD install failed. Run 'pnpm bmad:install' manually after setup."
  }
else
  setup_log "BMAD installer unavailable; skipped. Run pnpm bmad:install when available."
fi
