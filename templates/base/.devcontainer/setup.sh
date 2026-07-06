#!/usr/bin/env bash
set -euo pipefail

echo "Setting up development environment..."

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Ensure gcloud has a writable config directory.
# Some environments can leave ~/.config/gcloud as a broken symlink.
ensure_gcloud_config() {
  local gcloud_config_dir="$HOME/.config/gcloud"

  mkdir -p "$HOME/.config"

  if [ -L "$gcloud_config_dir" ] && [ ! -d "$gcloud_config_dir" ]; then
    rm "$gcloud_config_dir"
  fi

  mkdir -p "$gcloud_config_dir/logs" "$gcloud_config_dir/configurations"
}

ensure_gcloud_config

# Fix node_modules permissions (volume can be created by root).
if [ -d "${REPO_DIR}/node_modules" ]; then
  sudo chown -R node:node "${REPO_DIR}/node_modules"
else
  mkdir -p "${REPO_DIR}/node_modules"
fi

# Enable corepack for all new shells.
if ! grep -q "corepack enable" "$HOME/.bashrc" 2>/dev/null; then
  echo 'eval "$(corepack enable)"' >> "$HOME/.bashrc"
fi

infisical_login() {
  if ! command -v infisical >/dev/null 2>&1; then
    return 0
  fi

  if infisical user get token >/dev/null 2>&1; then
    echo "Infisical token found. Skipping login."
    return 0
  fi

  echo "Initializing Infisical..."
  infisical vault set file >/dev/null 2>&1 || true

  if [ -t 0 ] && [ -t 1 ]; then
    echo "Interactive session detected, attempting login..."
    infisical login -i || true
  else
    echo "Non-interactive environment detected."
    echo "Run 'infisical login' manually after container start if needed."
  fi
}

infisical_login

echo "Installing dependencies..."
corepack enable
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
pnpm install || {
  echo "Failed to install dependencies"
  exit 1
}

if [ -x "${REPO_DIR}/scripts/install-bmad.sh" ]; then
  echo "Installing BMAD..."
  "${REPO_DIR}/scripts/install-bmad.sh" --target "${REPO_DIR}" || {
    echo "BMAD install failed. Run 'pnpm bmad:install' manually after setup."
  }
fi
