# BMAD Adaptive Work Item Workflow Design

**Status:** Approved
**Date:** 2026-08-29

## Context

The boilerplate workflow pack currently reflects an older BMAD delivery model. Its managed documentation, customizations, and help overlay route work through size-specific flows and can introduce implementation stories, sprint tracking, and `bmad-quick-dev`. This duplicates project-management concepts and does not match the current BMAD Build workflow or the desired product-management model.

The replacement must keep a repository-local contract while a ticket is open, but the configured external tracker remains authoritative for ticket identity, hierarchy, priority, assignment, and status. BMAD is the product-refinement and delivery engine, not a second project-management system.

## Goals

- Provide one adaptive lifecycle for all delivery work.
- Use the canonical item types `Module`, `Request`, `Feature`, `Issue`, `Bug`, and `Spike`.
- Refine and emit a concise repository-local Work Item contract quickly.
- Select only the product, UX, technical, and verification work justified by evidence and risk.
- Use BMAD 6.11 `bmad-build` as the standard implementation engine.
- Generate the first concrete next prompt whenever a Work Item is emitted.
- Integrate ticket-level Figma work into the lifecycle without making design mandatory for non-visual changes.
- Preserve durable knowledge at closeout and remove temporary delivery artifacts with explicit approval.
- Upgrade existing projects without overwriting local customizations or rewriting historical tickets.

## Non-Goals

- Reproducing tracker boards, assignments, statuses, backlogs, or release planning in BMAD artifacts.
- Requiring a fixed Agile methodology or role structure.
- Keeping multiple size-specific lifecycle documents.
- Generating implementation stories or sprint artifacts.
- Applying every available BMAD analysis or test capability to every Work Item.
- Automatically committing installation, migration, implementation, or closeout changes.

## Source Of Truth

The configured tracker owns project-management state. It may be ClickUp, GitHub, Jira, Linear, another explicitly configured tracker, or local-only mode.

While an item is open, `_bmad-output/planning-artifacts/<normalized-id>/work-item.md` is the stable delivery contract used by agents. It is a scoped snapshot of the approved intent, not a replacement tracker record. Supporting BMAD artifacts are ticket-scoped and temporary unless closeout identifies knowledge that belongs in durable project documentation.

## Canonical Work Item Types

| Type | Purpose | Delivery behavior |
| --- | --- | --- |
| `Module` | Long-lived product area that groups related work | Never implemented directly; contains Features or Issues |
| `Request` | Incoming demand or idea requiring qualification | Accepted, rejected, deferred, or converted before delivery |
| `Feature` | Cohesive user or business capability | Built directly when independently deliverable; otherwise decomposed into child Issues |
| `Issue` | Concrete, independently deliverable change | Standard implementation unit |
| `Bug` | Incorrect existing behavior, defect, or regression | Implemented with severity-specific investigation and safeguards |
| `Spike` | Time-boxed investigation needed to make a decision | Ends with evidence, conclusions, and a decision; does not produce production implementation |

The taxonomy is configurable per project, with these six values as the boilerplate defaults. The managed default workflow does not define generic Task, Story, Epic, or Improvement item types.

## Single Adaptive Lifecycle

Every Work Item uses the same lifecycle:

```text
Refine -> Design when needed -> Prepare only what is needed -> Build -> Verify -> Close
```

There are no S, M, L, or separate Bug workflows. Complexity and risk change the route inside the lifecycle, not the lifecycle itself.

### 1. Refine And Publish

`bmad-publish-work-item` is the normal entry point. It must:

1. Resolve the repository policy without imposing a separate daily setup step.
2. Inspect only relevant code, tests, configuration, documentation, existing design references, and tracker context.
3. Challenge business value, boundaries, edge cases, acceptance criteria, fixed decisions, dependencies, and material risks.
4. Ask one evidence-based unresolved question at a time. A complete request does not require ceremonial questions.
5. Confirm the proposed delivery contract before writing it.
6. Write `work-item.md`, including the selected delivery route and first next prompt.
7. Publish through the configured tracker integration when available, or return a tracker-ready title and body for manual publication.

A clear Issue or ordinary Bug must require no more workflow ceremony than the former smallest route. It proceeds from one refinement/publication action to Build, followed by verification and closeout.

### 2. Design Gate

Every deliverable Work Item records one `design-impact` value:

- `none`
- `new-screen`
- `screen-change`
- `design-system-change`

Only the last three activate the design gate. Before Build, the Work Item must then identify the affected flow, required states, responsive behavior, approved Figma file and node links, and approved visual references. Design can be produced or updated by an agent or a human designer.

Figma remains the current editable design source. The Work Item records intent and decisions. Approved reference screenshots and the screen registry remain in durable Git-managed design documentation. Material design changes must be associated with a Work Item.

### 3. Prepare Adaptively

Preparation tools are selected from evidence, uncertainty, and risk:

| Trigger | Route addition |
| --- | --- |
| Scope and implementation boundaries are already clear | Build directly |
| Behavior or acceptance details need focused elaboration | `bmad-spec` |
| User flow or interaction behavior is unresolved | UX and Figma design gate |
| A product or market decision blocks scope | Appropriate product or market research |
| A domain, regulatory, or technology decision blocks delivery | Targeted domain or technical research |
| Independently delivered units could make incompatible decisions | Architecture work |
| A Feature is not independently deliverable in one coherent change | Decompose it into external child Issues |
| Security, data integrity, critical paths, or regression risk warrants it | Targeted test design or independent review |

Preparation must not generate an exhaustive workflow in advance. At the end of each wave, the acting skill evaluates the result and emits the next concrete prompt.

### 4. Build

`bmad-build` is the standard implementation engine for `Feature`, `Issue`, and `Bug`. Its managed customization must:

- Resolve and read the ticket-scoped `work-item.md` and routed supporting artifacts.
- Treat scope, non-goals, acceptance criteria, fixed decisions, and approved design references as binding.
- Use targeted repository context and avoid repeated broad scans.
- Apply KISS and avoid unrelated cleanup, abstractions, dependencies, or refactors.
- Stop and request a contract decision when delivery would change binding product behavior or scope.
- Produce implementation and verification evidence under the ticket-scoped implementation folder when a file is useful.
- Return the recommended next prompt.
- Never commit automatically.

`bmad-build-auto` may be used only when explicitly approved for a sufficiently defined, low-risk Work Item. `bmad-loop` is not installed or configured as a mandatory default and has no setup step in the standard lifecycle. If a project deliberately enables it later, it must consume the configured external Work Item taxonomy and may not introduce a separate Story or Sprint process.

### 5. Verify

Verification compares the implementation against:

- Observable acceptance criteria.
- Fixed decisions and scope boundaries.
- Relevant automated tests and manual evidence.
- Approved Figma references when design impact is not `none`.
- Bug reproduction and regression evidence.

Independent code, test, security, accessibility, performance, or UX review is triggered by risk rather than workflow size. Critical Bugs additionally require explicit rollback and monitoring evidence before closeout.

### 6. Close

`bmad-close-work-item` must:

1. Confirm acceptance and resolve blocking verification gaps.
2. Update the configured tracker or return an exact manual closeout payload.
3. Identify knowledge that must outlive the ticket.
4. Transfer durable product, architecture, operational, API, or UX knowledge into the appropriate maintained project documentation.
5. Update the screen registry and approved visual references when design changed.
6. Run release-note support only when enabled by project policy.
7. Propose deletion of temporary planning and implementation artifacts.
8. Delete nothing until the user explicitly approves cleanup.

The open-ticket `work-item.md` is not retained merely as repository ticket history. The external tracker owns that history. Local-only projects retain the minimum history required by their configured policy.

## Work Item Contract

Every emitted `work-item.md` contains:

- Work Item ID and tracker URL when available.
- Type and parent Module or Feature when applicable.
- Bug severity and available reproduction evidence when applicable.
- Problem and business outcome.
- Scope and explicit non-goals.
- Acceptance criteria.
- Fixed product and strategic technical decisions, or an explicit `None`.
- Design-impact classification and approved design references.
- Dependencies and material risks.
- Delivery route.
- Mandatory first next action and next prompt.

Example route output:

```markdown
## Next Action

- Skill: bmad-build
- Reason: Scope is cohesive and no additional design or specification is needed.

## Next Prompt

Implement APP-001 using `_bmad-output/planning-artifacts/app-001/work-item.md`.
Treat its scope, non-goals, acceptance criteria, fixed decisions, and delivery route as binding.
Use the smallest implementation that satisfies the contract.
Do not commit automatically.
Return verification evidence and the recommended next prompt.
```

The stored prompt is agent-neutral. The active Codex or Claude adapter adds its own invocation syntax when presenting the prompt. `bmad-publish-work-item` repeats the prompt in its response so the user can run it immediately.

## Project Policy And Setup

`_bmad/custom/project-workflow.toml` stores stable project policy:

- Project key and output language.
- Ticket identity mode and tracker type.
- Local numbering policy when required.
- Configured item taxonomy and parent relationships.
- Figma enablement and durable screen-registry/reference paths.
- Release-note enablement, path, and language.
- Optional automation policy.

Project creation or adoption detects and writes as much policy as possible. `bmad-publish-work-item` silently validates it. If required policy is missing, publication performs a minimal inline setup and asks only unresolved stable questions before continuing.

The standalone `bmad-workflow-setup` remains available for initial onboarding and later reconfiguration, but it is not a normal per-ticket prerequisite. Defaults include the canonical six item types, disabled release notes, and disabled optional automation. Figma settings may be detected or configured without blocking a non-design Work Item.

## Managed Workflow-Pack Changes

The canonical source remains `.boilerplate/bmad-workflow-pack/`. The implementation will:

- Replace `docs/bmad-feature-workflow/` with `docs/bmad-work-item-workflow/` containing one lifecycle, routing rules, artifact boundaries, publication and closeout rules, Figma design rules, and six item templates.
- Update `bmad-workflow-setup`, `bmad-publish-work-item`, `bmad-close-work-item`, `bmad-review-verification-gap`, and release-note support to the adaptive lifecycle.
- Add a managed `bmad-build` customization for ticket scoping, binding contracts, next-prompt output, KISS, and no automatic commit.
- Retain only useful customizations for `bmad-spec`, UX, product discovery, research, architecture, verification, and review.
- Remove managed customizations and help-overlay routes for epic/story creation, story implementation, sprint planning, sprint status, and `bmad-quick-dev`.
- Remove managed Story and Improvement templates and replace the generic execution template with `Issue`.
- Remove the mandatory `bmad-loop-setup` route.
- Rebuild help overlays around publication, adaptive preparation, Build, verification, and closeout.

Upstream BMAD may continue to ship compatibility capabilities. Generated upstream directories remain dependency-managed and are not patched merely to remove them. The boilerplate guarantees that its managed policy, templates, prompts, help overlay, and routing do not select those capabilities.

## BMAD Version And Installation

- The default installer uses the latest stable BMAD release, initially 6.11.x.
- A preview or `next` installer remains an explicit opt-in shortcut.
- Installation continues to install the required BMAD modules and external skills, apply internal assets, reapply overlays after upstream installation, merge help entries, and validate the result.
- `bmad-loop` moves out of the default required module set unless another installed capability requires it.
- Installation and upgrade remain idempotent.
- Network or upstream failures leave internal policy and documentation available, mark installation incomplete, return an actionable error, and support a safe rerun.

## Existing-Repository Migration

Migration uses managed-file hashes and never performs a blind overwrite:

- Missing and unchanged managed files are installed or updated automatically.
- Unchanged obsolete managed workflow files are removed automatically.
- Locally modified obsolete or replaced files are copied to `.boilerplate/adoption/proposed/` for review.
- Force mode retains timestamped backups.
- Historical planning artifacts, ticket documents, and product documentation are preserved but are not used by the new router unless explicitly linked.
- Open tickets migrate lazily when first refined; no bulk tracker rewrite is required.
- Project-specific tracker, language, Figma, release-note, and unrelated `_bmad/custom` settings are preserved.
- Installation, migration, Build, and closeout never commit automatically.

If the configured tracker is unavailable during publication, the skill preserves `work-item.md` and returns a tracker-ready title and body. Build remains paused until the user confirms publication and records the external identity. Local-only mode does not require that confirmation.

## Validation Strategy

### Unit Tests

- Parse and validate project policy and the six default item types.
- Validate parent relationships and prohibit direct Build routing for Module, Request, and Spike.
- Validate local ID allocation and external identity behavior.
- Require `Delivery Route`, `Next Action`, and `Next Prompt` in emitted contracts.
- Validate design-impact values and Figma gate requirements.
- Validate closeout knowledge-transfer and cleanup decisions.
- Validate help-overlay merging and managed-file hashing.

### Routing Tests

- A complete Issue routes directly to `bmad-build` without extra preparation.
- A normal Bug asks only for missing defect facts and then routes to Build.
- A Critical Bug adds rollback, monitoring, and stronger verification.
- An unclear Feature routes to `bmad-spec`.
- A design-impacting item routes through Figma approval before Build.
- A cross-system Feature routes to architecture when incompatible decisions are possible.
- A non-cohesive Feature decomposes into external child Issues.
- A Spike ends after evidence and decision publication.
- Every completed wave returns the next prompt.

### Regression Tests

- Managed active assets do not define or route to the removed item types or delivery processes.
- A simple Issue has no more required workflow actions than the former smallest path.
- `bmad-build` cannot commit automatically.
- External tracker failure preserves local work and blocks unsafe delivery.
- Non-design work is not blocked by Figma configuration.
- Existing historical artifacts survive migration.
- Modified managed-file conflicts are proposed rather than overwritten.
- Interrupted installation reports incomplete state and succeeds on rerun.
- Reapplication is idempotent.

### Integration Tests

- Install stable BMAD in a clean Node 24 devcontainer, apply the workflow pack for Codex and Claude, and validate help routing.
- Create and close a local-only Issue.
- Publish and close an externally identified Issue using a mocked tracker adapter.
- Execute a direct-Build route and a Figma-gated route.
- Adopt a fixture with the previous size-specific workflow, unchanged managed files, customized conflicts, and historical artifacts.

## Success Criteria

- A user normally starts by invoking `bmad-publish-work-item`, not a setup or sizing workflow.
- A well-defined small change reaches `bmad-build` after one publication action.
- Every emitted Work Item contains an immediately runnable first next prompt.
- Agents use only the configured Work Item taxonomy and adaptive route.
- Design work is enforced only when the Work Item changes UX or the design system.
- External project-management state is not duplicated in repository workflow files.
- Closeout either transfers durable knowledge or removes temporary artifacts after approval.
- New and migrated repositories can rerun installation safely without losing project-specific configuration.
