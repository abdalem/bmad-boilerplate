# BMAD Project Inception And Repository Update Design

## Status

Approved design for the missing project-level workflow layer above the existing
adaptive Work Item lifecycle.

## Purpose

The boilerplate needs two clear agent-driven scenarios:

1. Start a new product from a clean boilerplate clone, configure its technical
   shape, import or discover its product definition, prepare its initial design
   baseline, and publish the first actionable Work Item.
2. Add one skill to an existing repository, compare that repository with the
   latest public boilerplate, establish a working legacy baseline, and apply
   explicitly approved upgrade waves safely.

These scenarios must preserve the existing adaptive delivery lifecycle:

```text
Refine -> Design when needed -> Prepare only what is needed -> Build -> Verify -> Close
```

They must not restore Story, Epic, Sprint, Scrum, or sized S/M/L workflows.

## Architectural Decision

Implement two managed internal skills and a Markdown handoff protocol. Keep the
existing CLI focused on technical topology, scaffolding, migration analysis,
deployment modules, and validation.

- `bmad-start-project` owns new-project orchestration.
- `bmad-update-project` owns existing-repository comparison and governed
  upgrades.
- Web product definition uses a fixed Markdown bundle rather than JSON schemas
  or a new workflow engine.
- Existing `bmad-workflow-setup`, `bmad-publish-work-item`, `bmad-build`, and
  `bmad-close-work-item` continue to own repository policy and ticket delivery.

This keeps reasoning in agent instructions and readable artifacts while using
code only where repeatable technical file operations already exist.

## New-Project Scenario

The user clones the public boilerplate into a clean repository and invokes
`bmad-start-project`. The skill follows this sequence:

```text
Technical configuration
-> product bundle import or direct discovery
-> product challenge and approval
-> BMAD product artifacts
-> initial Figma/UX baseline when needed
-> initial work map
-> first published actionable Work Item
```

### Technical Configuration

The skill inspects existing repository evidence and asks one unresolved
question at a time. It confirms:

- Project identity and repository purpose.
- Selected archetypes: `web-app`, `api`, `mobile`, and `website`.
- Standalone versus monorepo layout, derived from the number of archetypes.
- Package identifiers and paths.
- Package-scoped deployment providers.
- Any legacy code that must be preserved when the clone is being used to
  replatform an old product.

After confirmation, it uses the existing manifest and scaffold interfaces. It
does not recreate topology logic inside the skill.

### Product Definition Paths

The skill supports two equivalent paths:

1. Import a product bundle produced in a ChatGPT or Claude web session.
2. Conduct the same discovery directly in Codex or Claude Code.

Both paths converge on the same seven-file Markdown structure. Direct discovery
must produce and confirm that structure before routing to downstream BMAD
workflows.

### Product Challenge

The skill treats all imported or directly discovered content as evidence, not
as automatically approved truth. It challenges:

- Target users and their current problem.
- Business model and measurable value.
- Product boundaries and non-goals.
- Domain concepts and ownership boundaries.
- Critical flows, constraints, and edge cases.
- Material commercial, regulatory, operational, and technical risks.
- Contradictions, assumptions, and unresolved decisions.
- Whether initial work candidates are cohesive and outcome-oriented.

It asks exactly one unresolved question at a time, avoids implementation-detail
questions, and presents a concise approval checkpoint before writing or routing
maintained BMAD artifacts.

### BMAD Routing

The accepted handoff informs BMAD product brief, PRD, research, UX, and
architecture workflows only where needed. It must not blindly copy every input
file into a second canonical document or run every BMAD planning workflow.

The skill ends project inception with:

- Confirmed technical topology and deployment manifest.
- Approved product planning artifacts.
- Initial design state or an explicit non-visual decision.
- Initial Module, Feature, and Issue candidates.
- The first approved actionable Work Item published through
  `bmad-publish-work-item`.
- The first copy-ready next prompt.

## Web Product Handoff

The managed workflow documentation includes two copy-paste prompts:

1. Product definition and export prompt for a ChatGPT or Claude web session.
2. Independent review and complete re-export prompt for a second LLM.

### Bundle Contract

The first prompt exports this complete directory at the repository root:

```text
product-input/
|-- 00-handoff-manifest.md
|-- 01-product-brief.md
|-- 02-business-and-market.md
|-- 03-product-requirements.md
|-- 04-domain-and-data.md
|-- 05-risks-and-open-questions.md
`-- 06-initial-work-map.md
```

The independent reviewer receives all seven files and exports a complete
replacement directory containing the same seven filenames plus:

```text
REVIEW.md
```

`REVIEW.md` explains material corrections, unresolved disagreements, rejected
recommendations, and confidence limits. The reviewed directory is the only
bundle imported when review is used. Files from original and reviewed bundles
must never be mixed.

### File Responsibilities

- `00-handoff-manifest.md`: bundle version, project identity, generation or
  review status, source model, language, file inventory, and known omissions.
- `01-product-brief.md`: problem, users, value proposition, outcomes, scope,
  and non-goals.
- `02-business-and-market.md`: business model, buyer and user distinction,
  alternatives, positioning, adoption, pricing assumptions, and success
  measures.
- `03-product-requirements.md`: capabilities, critical flows, constraints,
  acceptance-level outcomes, and release boundaries without code tasks.
- `04-domain-and-data.md`: domain language, core entities, relationships,
  ownership, sensitive data, lifecycle, and integration boundaries.
- `05-risks-and-open-questions.md`: assumptions, risks, evidence, decisions,
  unknowns, and invalidation conditions.
- `06-initial-work-map.md`: proposed Modules, Features, and Issues with outcomes
  and dependencies; these are candidates, not published tracker items.
- `REVIEW.md`: second-model review record when present.

The start skill verifies the exact inventory, required headings, project
identity consistency, and unresolved contradictions. An incomplete bundle is
reported file by file and is never partially imported.

## Figma And Design Lifecycle

For a visual product, inception establishes:

- A screen and flow inventory derived from approved product artifacts.
- Figma as the editable design source.
- The configured durable screen registry and visual reference paths.
- Required default, loading, empty, error, disabled, success, responsive, and
  accessibility-sensitive states where relevant.
- Approved Figma file and node references before design-dependent coding.

Missing Figma access blocks only design-dependent work. Product, API, domain,
research, and non-visual tasks may continue.

After inception, design remains evolutionary. Every visual Work Item records
`design-impact` as `none`, `new-screen`, `screen-change`, or
`design-system-change`. An agent or human designer may update Figma, but the
Work Item records approved references and closeout transfers durable design
knowledge before temporary ticket artifacts are removed.

## Existing-Repository Scenario

`bmad-update-project` is installable independently from the public boilerplate
repository and runs inside the target repository.

```text
Detect repository state
-> establish legacy runtime baseline
-> fetch latest public boilerplate into a temporary workspace
-> compare stack, workflow pack, and managed files
-> generate adoption and migration reports
-> approve one upgrade wave
-> apply through conflict and backup rules
-> verify before continuing
```

### Source Resolution

The skill resolves the boilerplate source in this order:

1. Explicit URL supplied by the user.
2. Existing `boilerplate` Git remote.
3. `https://github.com/abdalem/bmad-boilerplate.git`.

It fetches or clones the source into a temporary directory. It never merges the
boilerplate Git history into the target and never requires the target to be
opened from inside the boilerplate devcontainer.

### Legacy Baseline Gate

Before modernization, the skill discovers and records:

- Existing runtime and package-manager versions.
- Lockfiles and workspace boundaries.
- Framework and database versions.
- Required services, environment variables, and startup commands.
- Existing test, lint, build, and smoke-check commands.
- Known failures and missing external dependencies.

It creates evidence that the old application can install, start, and exercise a
representative path under its original supported versions. Framework and
runtime upgrades are blocked until that baseline passes. The user may explicitly
accept a documented pre-existing failure, but the failure must remain visible in
the migration plan and verification results.

### Upgrade Waves

The update skill proposes these independent waves:

1. Agent workflow and documentation.
2. Devcontainer and development tooling.
3. Package topology and monorepo configuration.
4. Framework and runtime upgrades, one workspace at a time.
5. Package-scoped deployment changes.

Only one approved wave is applied at a time. Each wave has its own expected
changes, prerequisites, verification commands, rollback information, and next
prompt.

### Conflict Safety

The skill invokes existing dry-run adoption and migration analysis from the
temporary boilerplate checkout. It uses existing managed-file behavior:

- Missing and unchanged managed files may update automatically.
- Locally modified managed files go to `.boilerplate/adoption/proposed/`.
- Force mode requires explicit approval and creates timestamped backups.
- Personal BMAD configuration and unrelated customizations are never
  overwritten.
- Historical product documents and ticket artifacts are preserved.

Network or source-resolution failures leave the target unchanged and produce a
clear retry command.

## Managed Distribution

Both skills are canonical workflow-pack assets and are installed for Codex and
Claude Code. The pack also manages `docs/bmad-project-workflow/`, containing:

- New-project procedure.
- Existing-repository procedure.
- Bundle contract.
- Product definition prompt.
- Independent review prompt.
- Figma inception and ongoing design guidance.

The public repository documents how to install only `bmad-update-project` into
an existing repository before full adoption. Normal scaffold and adoption then
install the complete pack.

The BMAD help overlay adds both scenario entry points without removing the
normal `bmad-publish-work-item` entry for established projects.

## Failure Handling

- Incomplete product bundles never produce partial maintained artifacts.
- Cross-file contradictions are resolved before planning approval.
- Missing tracker integration produces a tracker-ready payload and pending
  identity; Build remains blocked until external identity is recorded when the
  policy requires it.
- Missing Figma access blocks only design-dependent delivery.
- Offline BMAD or external-skill installation retains internal workflow assets
  and records incomplete status for idempotent retry.
- Offline boilerplate comparison leaves an existing target unchanged.
- Neither scenario commits automatically.

## Testing

Automated coverage must verify:

- Pack declarations and managed installation of both new skills for Codex and
  Claude Code.
- Help-catalog overlay entries and idempotent merge behavior.
- Exact seven-file bundle contract and optional `REVIEW.md` behavior.
- Complete, incomplete, and contradictory handoff fixtures.
- Reviewed bundles replace rather than mix with original files.
- Direct discovery converges on the same artifact contract.
- Initial Figma routing and non-visual continuation behavior.
- First Work Item publication and mandatory next prompt.
- Public-source resolution precedence using local fake Git remotes in tests.
- Legacy-baseline gating and explicit pre-existing-failure acceptance.
- Upgrade-wave isolation.
- Offline source failure with no target mutation.
- Safe proposals, backups, and idempotent managed reapplication.
- Existing adaptive Work Item tests remain green.

## Acceptance Criteria

- A user can clone the boilerplate and invoke one skill to configure the
  technical project, import or discover the product, route required BMAD and
  Figma work, and reach the first actionable Work Item.
- The repository contains two ready-to-copy web prompts and an unambiguous
  Markdown bundle contract.
- A second LLM can review a complete bundle and return one authoritative
  replacement plus a review report.
- A user can install one update skill into an unrelated existing repository and
  compare it with the latest public boilerplate without first copying the full
  boilerplate into that repository.
- Legacy projects are proven under their old supported stack before framework
  modernization begins, unless a pre-existing failure is explicitly accepted
  and recorded.
- No update wave mutates conflicting local files without explicit approval and
  recoverable backups.
- The existing adaptive Work Item, Figma evolution, tracker authority,
  no-auto-commit, and closeout cleanup rules remain intact.

## Non-Goals

- Building a new deterministic product workflow engine.
- Reintroducing generated tickets from CLI flags or JSON product schemas.
- Automatically publishing every initial work candidate.
- Automatically creating or modifying Figma without an available integration
  and approval.
- Automatically upgrading every legacy workspace in one pass.
- Merging boilerplate Git history into product repositories.
- Restoring Scrum, Story, Sprint, Epic, or S/M/L delivery workflows.
