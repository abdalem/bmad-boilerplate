# Stack Pack

BMAD owns product discovery and adaptive Work Item delivery guidance.
This stack pack owns the technical defaults:

- Devcontainer with Node 24, pnpm, uv, Docker CLI, GitHub CLI, Infisical, and Terraform.
- Chrome DevTools MCP adapters for Codex and Claude Code.
- Archetypes for Next.js web apps, AdonisJS APIs, Expo mobile apps, and Astro +
  React websites.
- Package-scoped deployment guidance for Cloudflare Pages, Vercel, Cloud Run,
  Railway, GitHub Pages, and AWS App Runner.

Use `bmad-start-project` for a new clone and `bmad-update-project` for an existing
repository comparison. Start actionable ticket work with `bmad-build`, then `bmad-close-work-item`.
Use `bmad-publish-work-item` to create or refine unclear items.
Run `bmad-workflow-setup` only for onboarding or explicit policy
reconfiguration. Use `docs/bmad-project-workflow/` for repository scenarios and
`docs/bmad-work-item-workflow/` for delivery routing.

## Devcontainer Tooling

The devcontainer uses no hosted Dev Container Features. Its Dockerfile installs
the shared CLI toolchain directly and verifies the official Node.js archive
checksum, keeping builds independent of third-party feature images.

Setup reports named phases and a final completion, warning, failure, or
interrupted status. Required permission/Corepack/dependency failures stop setup;
BMAD remains optional and reports a warning if its installer fails. A per-home
lock prevents duplicate setup runs and is released on exit. Retry setup with
`bash .devcontainer/setup.sh` after resolving the reported failure.
Interrupting setup forwards the signal to its current installer process group,
allows two seconds for shutdown, then forces termination. Installer descendants
do not inherit the setup or agent-update lock.

Authentication is manual: run `infisical login` when secrets are needed, and
sign in to Codex or Claude from their own CLI when prompted. Automatic setup
does not probe authentication or tokens. Startup runs the bounded per-user
agent installer/updater; unavailable updates warn and leave startup usable.
The Compose `node_user_data` volume persists `/home/node`, including agent homes.

Closing VS Code leaves Compose running (`shutdownAction: none`). Automatic port
forwarding is disabled and fresh configurations have no redundant web forwards.
Use the Ports panel to forward a port manually when needed, using its displayed
local address. For sibling containers use `service:port`. Adoption preserves
existing configurations and script modes, writing conflicts under
`.boilerplate/adoption/proposed/`; review proposals before applying them. Project
identity comes from `.boilerplate/project-manifest.json`, or a validated folder
name when no manifest exists.
When a retained devcontainer has a different or unverified workspace (including
JSONC), newly added MCP configurations also remain proposals. Reconcile their
helper paths with the retained workspace before applying them.

## Chrome DevTools MCP

The generated `.codex/config.toml` and `.mcp.json` connect Codex and Claude Code
through `.devcontainer/chrome-mcp.cjs` to Chrome running on the host. Before using the MCP, start a dedicated Chrome
profile with remote debugging exposed on port `9222`:

```bash
google-chrome --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-devtools-mcp"
```

The MCP can inspect and control that browser profile. Do not use the profile for
sensitive browsing.

By default the helper resolves `host.docker.internal` and uses port `9222`.
Set `REMOK_CHROME_URL` in the container environment to select an explicit HTTP(S)
browser base URL (optional port; no credentials, path, query, or fragment).
Codex forwards this variable to the MCP process. Restart the MCP client after
changing its environment. An invalid override fails without falling back or
printing its value. Remok is optional; workstation endpoints, network enrollment,
and host state mounts belong in external overrides, not portable templates.
