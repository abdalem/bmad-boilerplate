---
name: bmad-start-project
description: Configure a clean boilerplate clone, import or discover a deeply challenged product definition, route only necessary BMAD and Figma work, and publish the first actionable adaptive Work Item.
---

# BMAD Start Project

## Goal

Take a clean or partially configured boilerplate clone from repository setup to
the first approved actionable Work Item. Keep technical topology deterministic,
but keep product discovery, challenge, design routing, and work selection
agent-driven.

## Rules

- Ask exactly one unresolved question at a time.
- Reuse reliable repository and conversation evidence.
- Confirm each write-producing stage before running it.
- Treat imported product files as evidence, not automatically approved truth.
- Do not run every BMAD workflow by default.
- Do not create Scrum artifacts, Epics, User Stories, Sprints, story points, or
  S/M/L estimates.
- Do not mass-publish initial work candidates.
- Never commit automatically.

## Stage 1: Inspect Repository State

Read the root instructions, README, package manifest, Git remotes,
`.boilerplate/project-manifest.json` when present, existing packages, deployment
files, BMAD configuration, `product-input/`, and maintained product/design docs.

Classify the target as:

- clean boilerplate clone;
- partially configured clone;
- existing product being replatformed through a boilerplate clone.

Preserve existing product code and artifacts in the third case. If repository
changes are substantial and modernization is required, route first to
`bmad-update-project` for a legacy baseline rather than overwriting old code.

## Stage 2: Configure Technical Topology

Resolve and confirm:

1. Project name and slug.
2. Archetypes: `web-app`, `api`, `mobile`, and/or `website`.
3. Standalone or monorepo shape. Multiple archetypes imply a monorepo.
4. Package identifiers and paths.
5. One supported deployment provider for each deployable package.
6. Environment bindings and package dependency edges already known.

Use repository presets only as shortcuts. Do not force a preset when custom
package selection is clearer.

Show the complete proposed technical topology before writing. After explicit
approval, use the existing interfaces rather than recreating their logic:

```bash
pnpm boilerplate init --path . --preset <preset>
pnpm boilerplate scaffold --path . --force
pnpm doctor -- --path .
```

For a custom manifest, let `init` create the nearest skeleton, edit only the
confirmed package and deployment values, validate it, then scaffold. Explain
files that `--force` will replace before running it in a non-clean clone.

After the technical topology is established, invoke `bmad-project-context setup` to establish concise AGENTS.md governance, then discover stable policy with `bmad-workflow-setup`. Retain only hard-to-rediscover constraints, dangerous commands, domain pitfalls, and unusual verification. Use project-context refresh when conventions change, record for repeated mistakes, and audit to check drift.

## Stage 3: Select Product Definition Path

Offer exactly two choices:

1. Import a web-session bundle from repository-root `product-input/`.
2. Conduct direct product discovery in the current agent session.

### Import

Locate this skill's bundled `scripts/inspect-product-input.mjs` and run:

```bash
node <skill-directory>/scripts/inspect-product-input.mjs --directory product-input
```

If inspection fails, report every missing, unexpected, or invalid file. Do not
partially import or route maintained BMAD artifacts. When `Bundle status` is
`reviewed`, use the reviewed directory as one complete replacement and never
mix it with original files.

### Direct Discovery

Use the responsibilities and templates in
`docs/bmad-project-workflow/product-handoff.md`. Interview the user one
unresolved question at a time, then draft all seven files under `product-input/`.
Show a product-boundary checkpoint and require approval before writing them.
Set `Bundle status` to `original`, identify the current model, and run the same
inspector after writing.

## Stage 4: Challenge Product Evidence

Read the complete validated bundle and relevant existing evidence. Resolve:

- Target users, buyers, and affected stakeholders.
- Current problem and alternatives, including doing nothing.
- Customer and business value with observable outcomes.
- Business model, pricing, distribution, activation, and retention assumptions.
- Scope, non-goals, release boundary, critical flows, and material edge cases.
- Domain language, entity ownership, lifecycle, sensitive data, and integrations.
- Commercial, regulatory, operational, design, security, and technical risks.
- Contradictions, weak evidence, open questions, and invalidation conditions.
- Whether proposed Modules, Features, and Issues are outcome-oriented and
  cohesive.

Ask only questions justified by a contradiction, missing product fact, or
material risk. Do not ask the user to choose files, abstractions, test structure,
or implementation order.

Present one concise approval checkpoint covering problem, users, value, scope,
non-goals, release boundary, domain boundaries, major decisions, risks, and
remaining unknowns.

## Stage 5: Route Maintained BMAD Artifacts

After approval, inspect existing BMAD planning artifacts and use `bmad-help` to
route only missing durable work:

- Product brief when no approved concise brief exists.
- PRD when product requirements need a maintained project-level contract.
- Targeted market, domain, or technical research only for a blocking decision.
- Architecture only when independently delivered units need shared decisions.
- UX only for visual product flows or a design system.

Do not copy every input file into a duplicate canonical document. Record which
input files informed each maintained artifact and preserve unresolved risks.

## Stage 6: Establish Initial Design State

Classify the product as visual or non-visual.

For a visual product:

1. Run or complete `bmad-workflow-setup` with Figma enabled and confirmed
   registry/reference paths.
2. Derive a screen and flow inventory from approved product artifacts.
3. Route to `bmad-ux` and Figma for initial design.
4. Require relevant default, loading, empty, error, disabled, success,
   responsive, and accessibility-sensitive states.
5. Record approved Figma file and node links in the durable screen registry.

Design-dependent Build remains blocked until approval. Missing Figma access
does not block product, API, domain, research, or other non-visual work.

For a non-visual product, record the decision and keep Figma disabled.

## Stage 7: Confirm Initial Work Map

Review `06-initial-work-map.md` against approved product artifacts:

- Modules group related outcomes and are never built directly.
- Features are cohesive business or user capabilities.
- Issues are independently deliverable changes.
- Unknown or speculative work remains deferred or becomes a Spike.

Present the proposed initial map and receive explicit approval. Publish parent
Modules or Features only when useful to the configured tracker, but do not
publish all child work automatically.

Select the first actionable Feature, Issue, Bug, or Spike with the fewest
unresolved dependencies and invoke `bmad-publish-work-item`. That skill owns
identity, tracker publication, the temporary contract, delivery route, and
first next prompt.

## Completion

Return:

- Repository classification and technical topology.
- Product-definition path and bundle inspection result.
- Approved product and BMAD artifacts.
- Figma/design status and references.
- Initial work-map status.
- First published Work Item ID and tracker result.
- Exact next skill and copy-ready first next prompt.
- Remaining blockers and risks.

If no item is safe to publish, state the one blocking decision and return the
next prompt that resolves it.
