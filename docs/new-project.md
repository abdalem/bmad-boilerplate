# New Project

Start from a clean Git clone. Do not copy a local boilerplate worktree because
it may contain uncommitted or generated files.

## 1. Clone

```bash
cd /home/abdalem/projects
git clone <boilerplate-repository-url> my-product
cd my-product
git remote rename origin boilerplate
git remote add origin <new-project-repository-url>
code .
```

Reopen in the devcontainer. It installs dependencies and runs
`pnpm bmad:install` automatically. If an upstream install was interrupted,
rerun the same command; installation is idempotent.

The Dockerfile installs Node 24, pnpm, uv, Docker CLI, GitHub CLI, Infisical,
and Terraform directly; it does not depend on hosted Dev Container Features.

## 2. Optionally Define The Product On The Web

Use the ready-to-copy prompts:

- [Product definition](bmad-project-workflow/prompts/product-definition.md)
- [Independent review](bmad-project-workflow/prompts/independent-review.md)

Place the final complete export at repository-root `product-input/`. When an
independent review is used, copy only its complete replacement bundle. Do not
mix original and reviewed files.

This step is optional. The project skill can conduct the same discovery directly
inside Codex or Claude Code.

## 3. Run The Project Skill

```text
bmad-start-project
```

It guides you through:

- Archetypes, standalone/monorepo shape, package paths, and deployments.
- Product bundle import or direct discovery.
- Deep business, user, domain, scope, and risk challenge.
- Required BMAD product, research, UX, and architecture work only.
- Initial Figma design for visual products.
- Initial work-map approval and the first published actionable Work Item.

The skill invokes the technical manifest, scaffold, doctor, and BMAD interfaces
after showing the expected writes and receiving approval. Product content never
belongs in `.boilerplate/project-manifest.json`.

## 4. Continue Normal Delivery

```text
bmad-publish-work-item
```

It inspects relevant evidence, challenges the contract one question at a time,
publishes or prepares the tracker item, writes its temporary `work-item.md`, and
returns the first next prompt. If project policy is missing, publication runs
only the minimal inline setup required to continue.

Run `bmad-workflow-setup` separately only when onboarding or explicitly changing
tracker, taxonomy, language, Figma, automation, or release-note policy.

Use the adaptive lifecycle documented in `docs/bmad-work-item-workflow/`:

```text
Refine -> Design when needed -> Prepare only what is needed -> Build -> Verify -> Close
```

Clear cohesive Features, Issues, and Bugs route directly to `bmad-build`. Design,
specification, research, architecture, and risk-based verification are added
only when evidence requires them.

## 5. Enable Browser Automation When Needed

Codex and Claude Code are preconfigured for Chrome DevTools MCP. Start a
dedicated Chrome profile on the host before using it:

```bash
google-chrome --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --user-data-dir="$HOME/.chrome-devtools-mcp"
```

Do not use this browser profile for sensitive browsing because the MCP can
inspect and control it.

## 6. Verify

```bash
pnpm doctor -- --path .
pnpm bmad:validate
pnpm test
git status
```
