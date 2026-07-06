---
name: project-brainstorming
description: Agent-first workflow for starting a new software project from an idea. Use when the user wants Codex or Claude to create a project brief, product/business spec, architecture docs, and initial tickets before implementation; when starting from the boilerplate repo; or when refining a new app idea into docs/tickets without writing code.
---

# Project Brainstorming

Use this skill to turn a raw product idea into a documented project foundation. The output is planning artifacts only: brief, manifest, product spec, docs, and tickets. Do not implement features or scaffold app code unless the user explicitly starts a later implementation workflow.

## Operating Rules

- Work agent-first. Prefer conversation and written artifacts over CLI commands.
- Ask one question at a time unless the user asks for a batch.
- Challenge the business and product assumptions, not just the technical architecture.
- Keep implementation out of scope. Stop after docs and tickets are generated.
- If the user is in a hurry, ask fewer but sharper questions and mark unresolved assumptions explicitly.
- Use the current date for generated docs and ticket timestamps when needed.
- Preserve any existing project files unless the user explicitly asks to replace them.

## Expected Starting Point

The user may start from either:

- The boilerplate repo, usually `/home/abdalem/projects/boilerplate`.
- A new project folder, usually under `/home/abdalem/projects/<project-slug>`.

If the project folder does not exist, create it only after confirming the project slug/path.

## Step 1: Project Configuration

Ask configuration questions first. Minimum required answers:

- Project name and slug/path.
- App archetypes:
  - `web-app`: Next.js application.
  - `api`: AdonisJS API.
  - `mobile`: Expo app.
  - `website`: Astro + React website or landing page.
- Optional shortcut presets:
  - `web-api`
  - `web-api-mobile`
  - `website-api`
  - `full-product`
- Deployment intent if known:
  - website: Cloudflare Pages, Vercel, GitHub Pages, undecided
  - web app: Vercel, Railway, Cloud Run, AWS App Runner, undecided
  - api: Cloud Run, Railway, AWS App Runner, undecided
  - mobile: no deploy target yet unless the user explicitly mentions Expo/EAS
- Whether tickets should be generated now.

If the user is unsure, recommend:

- `web-api-mobile` for products that need web, API, and mobile.
- `website` for a marketing/landing site only.
- `full-product` when the product needs website, web app, API, and mobile from the start.
- Cloudflare Pages for websites.
- Vercel for web apps.
- Cloud Run for API.
- No mobile deployment target at this stage.

## Step 2: Deep Product Discovery

Ask focused questions one at a time. Cover these areas before writing final artifacts:

- User and buyer: who has the pain, who pays, who decides.
- Pain: what currently fails, how often, and what it costs.
- Existing alternatives: spreadsheets, manual processes, incumbent tools, custom workflows.
- Wedge: the smallest useful promise that makes the product worth trying.
- Core workflow: first successful user journey from intent to outcome.
- Monetization: subscription, usage, service-led, internal tool, or uncertain.
- Acquisition: how the first ten users find it.
- Retention: what brings users back weekly.
- Data and trust: sensitive data, permissions, auditability, integrations.
- MVP boundary: what must be in V1 and what is explicitly not in V1.
- Riskiest assumptions: technical, market, UX, sales, compliance, operational.

Do not ask every possible question if the user already answered enough. Summarize assumptions and ask for approval before generating artifacts.

## Step 3: Present the Product Thesis

Before writing files, present a concise synthesis:

- Target user and buyer.
- Problem statement.
- Product promise.
- MVP workflow.
- Business model assumption.
- V1 scope.
- Non-goals.
- Architecture shape.
- Ticket strategy.

Ask for explicit approval. If the user changes direction, update the synthesis and ask again.

## Step 4: Generate Artifacts

Create or update these files in the target project:

```text
.boilerplate/project-brief.md
.boilerplate/project-manifest.json
PRODUCT_SPEC.md
docs/00-overview.md
docs/01-business-model.md
docs/02-users-and-workflows.md
docs/03-features.md
docs/04-architecture.md
docs/05-acceptance-tests.md
docs/tickets/template.md
docs/tickets/V1/00-foundations.md
docs/tickets/V1/<number>-<topic>.md
docs/tickets/V2/00-advanced.md
```

If the project needs the superpowers layout, also create:

```text
docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md
docs/superpowers/plans/YYYY-MM-DD-<topic>-implementation-plan.md
```

Only create an implementation plan if the user asked for it. Otherwise stop at docs and tickets.

## Manifest Guidance

Keep `.boilerplate/project-manifest.json` simple. It should describe project topology, not product details.

Use this shape:

```json
{
  "version": "2",
  "projectName": "Example",
  "projectSlug": "example",
  "description": "Short product description.",
  "preset": "web-api-mobile",
  "workflowStage": "brief",
  "adapters": ["codex", "claude-code"],
  "workspace": {
    "mode": "monorepo"
  },
  "archetypes": [
    {
      "id": "web",
      "type": "web-app",
      "path": "apps/web"
    },
    {
      "id": "api",
      "type": "api",
      "path": "apps/api"
    },
    {
      "id": "mobile",
      "type": "mobile",
      "path": "apps/mobile"
    }
  ],
  "coreModules": [
    "repo-foundation",
    "devcontainer",
    "github-actions",
    "monorepo-core",
    "shared-contracts",
    "docs-core"
  ],
  "packages": [
    {
      "id": "web",
      "name": "Web App",
      "path": "apps/web",
      "kind": "web-app",
      "modules": ["web-next"]
    },
    {
      "id": "api",
      "name": "API",
      "path": "apps/api",
      "kind": "api",
      "modules": ["api-adonis"]
    },
    {
      "id": "mobile",
      "name": "Mobile App",
      "path": "apps/mobile",
      "kind": "mobile",
      "modules": ["mobile-expo"]
    }
  ],
  "deployments": [
    {
      "packageId": "web",
      "provider": "vercel",
      "moduleId": "deploy-vercel",
      "version": "1.0.0",
      "environmentBindings": [
        {
          "name": "NEXT_PUBLIC_API_URL",
          "source": "runtime",
          "description": "Public API origin consumed by the frontend."
        }
      ],
      "dependencyEdges": [{ "packageId": "api", "relation": "calls" }]
    },
    {
      "packageId": "api",
      "provider": "cloud-run",
      "moduleId": "deploy-cloud-run",
      "version": "1.0.0",
      "environmentBindings": [
        {
          "name": "PORT",
          "source": "runtime",
          "description": "Runtime port exposed by the hosting provider."
        }
      ],
      "dependencyEdges": []
    }
  ],
  "generatedAt": "YYYY-MM-DDTHH:mm:ss.sssZ"
}
```

Adjust `preset`, `workspace`, `archetypes`, `coreModules`, `packages`, and `deployments` to match the user's configuration. A single archetype uses `workspace.mode: "standalone"` and `path: "."`; multiple archetypes use `workspace.mode: "monorepo"` and `apps/<id>` package paths. Mobile belongs in `packages[]` with `modules: ["mobile-expo"]`, but normally has no `deployments[]` entry.

Provider/module pairs:

- `gh-pages` -> `deploy-gh-pages`
- `vercel` -> `deploy-vercel`
- `railway` -> `deploy-railway`
- `cloud-run` -> `deploy-cloud-run`
- `aws-app-runner` -> `deploy-aws-app-runner`
- `cloudflare-pages` -> `deploy-cloudflare-pages`

## Ticket Guidance

Tickets should be useful for later implementation agents. Each ticket must include:

- Goal.
- User/business value.
- Scope.
- Out of scope.
- Acceptance criteria.
- Technical notes.
- Dependencies.
- Test expectations.
- Open questions.

Use stable ticket IDs:

```text
V1-00-foundations
V1-10-<first-core-slice>
V1-20-<second-core-slice>
V1-30-<third-core-slice>
V1-90-launch-hardening
V2-00-advanced
```

Prefer fewer high-quality vertical-slice tickets over many tiny tasks. Split a ticket only when one ticket would require unrelated product outcomes.

## Completion Criteria

Finish by reporting:

- Files created or updated.
- Key unresolved assumptions.
- The recommended next step: run the future ticket-refinement skill on a specific ticket, or begin implementation if the user approves.

Do not claim implementation readiness if the tickets still contain major open product questions.
