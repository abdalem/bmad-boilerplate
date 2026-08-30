# Boilerplate

Ready-to-run technical starter with agent-guided product inception, repository
upgrades, and adaptive BMAD delivery.

Choose one procedure:

- [Start a new project](docs/new-project.md)
- [Adopt an existing repository](docs/existing-repo.md)

The boilerplate owns the devcontainer, Next.js, AdonisJS, Expo, Astro + React,
monorepo composition, and package-scoped deployments. BMAD owns discovery,
planning, architecture, work items, implementation routing, and closeout.

Use one entry skill:

- New boilerplate clone: `bmad-start-project`.
- Existing repository comparison or modernization: `bmad-update-project`.
- Established project ticket work: `bmad-publish-work-item`.

For product definition in ChatGPT or Claude web sessions, use the managed
[product prompt](docs/bmad-project-workflow/prompts/product-definition.md) and
optional [independent review prompt](docs/bmad-project-workflow/prompts/independent-review.md).

## Main Commands

```bash
pnpm bmad:install
pnpm bmad:install:stable
pnpm bmad:install:preview
pnpm bmad:validate
pnpm adopt:repo:dry -- /path/to/repository
pnpm adopt:repo -- /path/to/repository
```

Runtime: Node `>=22.20`, pnpm `>=10`. The devcontainer uses Node 24 and includes
`uv`, Docker CLI, GitHub CLI, Infisical, and Terraform without hosted Dev
Container Features. Chrome DevTools MCP is preconfigured for Codex and Claude
Code through a dedicated host browser profile.

## Archetypes

Single selection creates a standalone repo; multiple selections create a
monorepo.

- `web-app`: Next.js
- `api`: AdonisJS
- `mobile`: Expo
- `website`: Astro + React

Presets: `web-api`, `web-api-mobile`, `website-api`, `full-product`.

The project skills select and invoke these technical commands after confirming
the intended changes. See `docs/bmad-project-workflow/` for the full scenarios
and `docs/bmad-work-item-workflow/` for ordinary delivery.
