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
repository comparison. Start normal ticket work with `bmad-publish-work-item`.
Run `bmad-workflow-setup` only for onboarding or explicit policy
reconfiguration. Use `docs/bmad-project-workflow/` for repository scenarios and
`docs/bmad-work-item-workflow/` for delivery routing.

## Devcontainer Tooling

The devcontainer uses no hosted Dev Container Features. Its Dockerfile installs
the shared CLI toolchain directly and verifies the official Node.js archive
checksum, keeping builds independent of third-party feature images.

## Chrome DevTools MCP

The generated `.codex/config.toml` and `.mcp.json` connect Codex and Claude Code
to Chrome running on the host. Before using the MCP, start a dedicated Chrome
profile with remote debugging exposed on port `9222`:

```bash
google-chrome --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-devtools-mcp"
```

The MCP can inspect and control that browser profile. Do not use the profile for
sensitive browsing.
