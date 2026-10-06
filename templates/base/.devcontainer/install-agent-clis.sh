#!/usr/bin/env bash
# Run as the devcontainer remoteUser, never through sudo.
# This file is copied into each project's .devcontainer directory.

agent_cli_log() { printf '[agent-clis] %s\n' "$*"; }
agent_cli_warn() { printf '[agent-clis] WARNING: %s\n' "$*" >&2; }

agent_cli_version() {
    timeout --kill-after=2s 10s "$1" --version 2>/dev/null
}

agent_cli_install() {
    local tool="$1" binary="$2" url="$3" interpreter="$4"
    local existing before='' after='' status=0
    existing="$(command -v "$tool" 2>/dev/null || true)"
    if [[ -n "$existing" && "$existing" != "$binary" && ! -x "$binary" ]]; then
        agent_cli_warn "$tool already exists at $existing; leaving that installation untouched."
        return 0
    fi
    if [[ -x "$binary" ]]; then
        before="$(agent_cli_version "$binary")" || before=''
    fi

    agent_cli_log "Checking $tool (install/update budget: ${agent_timeout}s)."
    if [[ "$tool" == claude && -n "$before" ]]; then
        # The native updater respects the user's existing release-channel settings.
        timeout --kill-after=5s "${agent_timeout}s" "$binary" update </dev/null || status=$?
    else
        # Execute only a completely downloaded installer, not a partially read pipe.
        if curl --fail --silent --show-error --location --proto '=https' \
            --proto-redir '=https' --connect-timeout 8 --max-time 20 \
            "$url" --output "$agent_tmp/$tool.sh"; then
            if [[ "$tool" == codex ]]; then
                CODEX_NON_INTERACTIVE=1 timeout --kill-after=5s "${agent_timeout}s" \
                    "$interpreter" "$agent_tmp/$tool.sh" </dev/null || status=$?
            else
                timeout --kill-after=5s "${agent_timeout}s" \
                    "$interpreter" "$agent_tmp/$tool.sh" </dev/null || status=$?
            fi
        else
            status=$?
        fi
    fi

    if after="$(agent_cli_version "$binary")" && [[ -n "$after" ]]; then
        agent_cli_log "$tool available: $after"
        if (( status != 0 )); then
            agent_cli_warn "$tool update failed (exit $status); the installed command is still usable."
        fi
    else
        agent_cli_warn "$tool is unavailable after installation attempt (exit $status); container startup continues."
    fi
    return 0
}

agent_cli_main() (
    # Subshell scopes PATH and the lock to this invocation, including when sourced.
    local agent_home="${HOME:-}" agent_tmp agent_timeout dependency
    if [[ -z "$agent_home" || ! -d "$agent_home" || ! -w "$agent_home" ]]; then
        agent_cli_warn 'A writable home directory is required; skipping installation.'
        return 0
    fi
    for dependency in curl timeout flock mktemp bash sh; do
        if ! command -v "$dependency" >/dev/null 2>&1; then
            agent_cli_warn "$dependency is missing; skipping installation without blocking startup."
            return 0
        fi
    done
    agent_timeout="${AGENT_CLI_INSTALL_TIMEOUT_SECONDS:-120}"
    if [[ ! "$agent_timeout" =~ ^[1-9][0-9]{0,3}$ ]]; then
        agent_cli_warn 'Invalid AGENT_CLI_INSTALL_TIMEOUT_SECONDS; using 120 seconds.'
        agent_timeout=120
    fi
    local codex_bin="${CODEX_INSTALL_DIR:-$agent_home/.local/bin}/codex"
    local claude_bin="$agent_home/.local/bin/claude"
    export PATH="${codex_bin%/*}:$agent_home/.local/bin:$PATH"

    if ! mkdir -p "$agent_home/.cache"; then
        agent_cli_warn 'Cannot create the lock directory; skipping installation.'
        return 0
    fi
    # Never remove this lock file: replacing its inode can allow concurrent writers.
    if ! exec 200>>"$agent_home/.cache/devcontainer-agent-clis.lock"; then
        agent_cli_warn 'Cannot open the installer lock; skipping installation.'
        return 0
    fi
    if ! flock --nonblock 200; then
        agent_cli_log 'Another startup installer is running for this home; skipping.'
        return 0
    fi
    if ! agent_tmp="$(mktemp -d /tmp/devcontainer-agent-clis.XXXXXXXX 200>&-)"; then
        agent_cli_warn 'Cannot create a temporary download directory; skipping installation.'
        return 0
    fi
    trap 'rm -f -- "$agent_tmp/codex.sh" "$agent_tmp/claude.sh" 200>&-; rmdir -- "$agent_tmp" 200>&-' EXIT
    # Only this shell owns the lock; installers/updaters may start descendants.
    agent_cli_install codex "$codex_bin" https://chatgpt.com/codex/install.sh sh 200>&-
    agent_cli_install claude "$claude_bin" https://claude.ai/install.sh bash 200>&-
    return 0
)

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    agent_cli_main
fi
