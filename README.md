# Boilerplate

Ready-to-run BMAD stack starter.

BMAD owns product discovery, PRDs, architecture, stories, and workflow guidance.
This repo owns the technical foundation: devcontainer, templates, stack
conventions, and deployment recipes.

## Choose Your Path

- Starting a new project: read [docs/new-project.md](docs/new-project.md).
- Adapting an existing repo: read [docs/existing-repo.md](docs/existing-repo.md).

## Shortcuts

Requires Node `>=20` because this repo and BMAD both require modern Node. If
you are temporarily on Node 18, use the scripts directly or run with
`npm_config_engine_strict=false`.

```bash
pnpm bmad:install
pnpm bmad:install:stable
pnpm adopt:repo -- /home/abdalem/projects/existing-repo
pnpm adopt:repo:dry -- /home/abdalem/projects/existing-repo
pnpm adopt:repo:force -- /home/abdalem/projects/existing-repo
```

## Stack Archetypes

- `web-app`: Next.js application.
- `api`: AdonisJS API.
- `mobile`: Expo mobile app.
- `website`: Astro + React website or landing page.

Shortcut presets:

- `web-api`
- `web-api-mobile`
- `website-api`
- `full-product`

## Development

```bash
corepack enable
pnpm install
pnpm check
pnpm test:unit
```
