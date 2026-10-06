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
- Actionable Feature, Issue, or Bug: `bmad-build` -> `bmad-close-work-item`.
- New or vague intent / Request qualification: `bmad-publish-work-item`.

Build investigates before deciding ceremony and includes independent review and
repair. A local Work Item contract is optional; existing fixed decisions and
approved Figma references remain binding. Use `bmad-walkthrough` for human
review and standalone `bmad-code-review` when a separate review is warranted.
Repository instructions use `bmad-project-context` setup/adopt, then targeted
refresh/record/audit. The tracker owns identity, hierarchy, status, priority,
and assignment.

For product definition in ChatGPT or Claude web sessions, use the managed
[product prompt](docs/bmad-project-workflow/prompts/product-definition.md) and
optional [independent review prompt](docs/bmad-project-workflow/prompts/independent-review.md).

## Main Commands

```bash
pnpm bmad:install
pnpm bmad:install:stable
pnpm bmad:install:latest
pnpm bmad:install:preview
pnpm bmad:validate
pnpm adopt:repo:dry -- /path/to/repository
pnpm adopt:repo -- /path/to/repository
```

The workflow pack tests BMAD `6.12.1`. Normal and `stable` installation use
that pinned release; `latest` and `preview` are explicit compatibility evaluation
commands. Version bumps require compatibility testing and a boilerplate release.

Runtime: Node `>=22.20`, pnpm `>=10`. The devcontainer uses Node 24 and includes
`uv`, Docker CLI, GitHub CLI, Infisical, and Terraform without hosted Dev
Container Features. Chrome DevTools MCP is preconfigured for Codex and Claude
Code through a dedicated host browser profile.

Setup prints named phases and a final status, prevents duplicate runs, and
leaves Infisical sign-in manual (`infisical login`). BMAD installation and agent
startup updates report optional failures without hiding required setup failures.
Agent tools and their homes persist in the Compose `/home/node` volume; sign in
through each CLI separately. Closing VS Code leaves the container running.
Automatic port forwarding is off; use the Ports panel for manual forwards and
its displayed local address.

Chrome MCP uses the portable `.devcontainer/chrome-mcp.cjs` helper. Its default
is `host.docker.internal:9222`; an externally supplied `REMOK_CHROME_URL` selects
another HTTP(S) browser base URL. Codex forwards this environment variable.
Remok is optional and its private overrides stay outside reusable templates.
See [the stack template guide](templates/base/docs/stack/README.md) for setup
recovery, agent updates, browser configuration, and adoption proposals.

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
