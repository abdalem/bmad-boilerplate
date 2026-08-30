# Devcontainer And Chrome MCP Design

## Goal

Make generated and adopted projects independent of GHCR-hosted devcontainer
features while providing the same host Chrome DevTools MCP connection to Codex
and Claude Code.

## Devcontainer Baseline

- Install Docker CLI, GitHub CLI, Infisical, Terraform, Node.js, and `uv` in the
  Dockerfile.
- Install pinned Node.js 24 from the official archive and verify its published
  SHA-256 checksum.
- Keep Docker socket access because some generated projects build and inspect
  containers from the devcontainer.
- Remove the `features` section and feature metadata from `devcontainer.json`
  and the Dockerfile.
- Map `host.docker.internal` through Docker's `host-gateway` so Linux engines
  can reach Chrome running on the host.

## MCP Adapters

- Generate `.codex/config.toml` for Codex.
- Generate `.mcp.json` for Claude Code and compatible clients.
- Resolve `host.docker.internal` at process startup and pass its address to
  `chrome-devtools-mcp@latest` at port `9222`.
- Do not set project-level Codex approval or sandbox policies.

## Adoption

New projects receive the files through the base template. Existing-project
adoption copies missing adapters, preserves identical files, and proposes
conflicts instead of overwriting local MCP configuration.

## Validation

- Assert generated devcontainers contain no hosted features.
- Assert required tools and checksum verification are present in the
  Dockerfile.
- Assert both generated MCP adapters use dynamic host resolution and port
  `9222`.
- Run unit, type, formatting, shell-syntax, and Docker Compose configuration
  checks where the host tooling is available.
