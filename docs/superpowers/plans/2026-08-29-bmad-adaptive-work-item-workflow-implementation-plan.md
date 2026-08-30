# BMAD Adaptive Work Item Workflow Implementation Plan

**Design:** `docs/superpowers/specs/2026-08-29-bmad-adaptive-work-item-workflow-design.md`
**BMAD baseline:** stable `bmad-method@6.11.0`
**Execution policy:** no automatic commits; preserve unrelated worktree changes

## Objective

Replace the boilerplate's managed size-specific delivery workflow with one adaptive Work Item lifecycle using `Module`, `Request`, `Feature`, `Issue`, `Bug`, and `Spike`. Make `bmad-publish-work-item` the normal entry point, route implementation through BMAD 6.11 `bmad-build`, emit the first next prompt with every Work Item, and migrate existing installations without overwriting local customizations.

## Implementation Order

### Task 1: Add Safe Managed-File Retirement

**Files:**

- Modify `.boilerplate/bmad-workflow-pack/lib/workflow-pack.mjs`
- Modify `.boilerplate/bmad-workflow-pack/managed-files.json`
- Modify `scripts/bmad-workflow-pack.mjs` only if new result reporting needs CLI support
- Modify `tooling/boilerplate-cli/tests/workflow-pack.test.mjs`

**Steps:**

1. Add failing fixture tests for files present in the previous managed state but absent from the new pack.
2. Require unchanged obsolete files to be deleted and removed from the next state.
3. Require locally modified obsolete files to remain untouched and appear as explicit retirement conflicts under `.boilerplate/adoption/proposed/`.
4. Require force mode to back up modified obsolete files before deleting them.
5. Remove now-empty managed directories without traversing or deleting unrelated directories.
6. Extend apply results with `removed`, `retirementProposed`, and any required backup reporting.
7. Keep dry-run behavior side-effect free while reporting the same intended operations.
8. Run the focused workflow-pack tests.

**Checkpoint:** managed files can be renamed or removed without leaving obsolete active workflow files in adopted repositories.

### Task 2: Add Keyed Help-Route Retirement

**Files:**

- Modify `.boilerplate/bmad-workflow-pack/lib/workflow-pack.mjs`
- Add `.boilerplate/bmad-workflow-pack/help-remove.csv` or equivalent keyed retirement metadata
- Modify `.boilerplate/bmad-workflow-pack/help-overlay.csv`
- Modify `tooling/boilerplate-cli/tests/workflow-pack.test.mjs`

**Steps:**

1. Add failing tests proving obsolete help keys are removed before overlays are merged.
2. Use the existing `(module, skill, action)` key for both removal and replacement.
3. Retire managed routes for `bmad-quick-dev`, epic/story creation, story implementation, sprint planning, and story-dependent review/test routing.
4. Overlay adaptive routes for `bmad-publish-work-item`, `bmad-build`, `bmad-spec`, UX, research, architecture, verification, and closeout.
5. Keep merge and prune operations idempotent.
6. Validate that upstream compatibility commands may remain installed but are not exposed by the boilerplate's managed route catalog.

**Checkpoint:** rerunning BMAD installation cannot restore obsolete routes into the active help catalog.

### Task 3: Introduce Project Workflow Policy V2

**Files:**

- Modify `.boilerplate/bmad-workflow-pack/project-workflow.example.toml`
- Modify `.boilerplate/bmad-workflow-pack/lib/workflow-pack.mjs`
- Modify `.boilerplate/bmad-workflow-pack/internal-skills/bmad-workflow-setup/SKILL.md`
- Modify `.boilerplate/bmad-workflow-pack/internal-skills/bmad-workflow-setup/agents/openai.yaml`
- Modify `tooling/boilerplate-cli/tests/workflow-pack.test.mjs`

**Policy shape:**

```toml
version = 2

[project]
key = "APP"
summary_language = "English"

[tickets]
identity_mode = "local"
tracker = "none"
project_key = "APP"
local_prefix = "APP"
local_start = 1
local_width = 3

[work_items]
types = ["Module", "Request", "Feature", "Issue", "Bug", "Spike"]
module_children = ["Feature", "Issue"]
feature_children = ["Issue"]

[design]
provider = "figma"
enabled = false
screen_registry_path = "docs/design/screen-registry.md"
reference_path = "docs/design/references"

[automation]
build_auto_enabled = false
loop_enabled = false

[release_notes]
enabled = false
path = ""
language = "English"
```

**Steps:**

1. Extend the constrained TOML parser to support arrays of strings without introducing a broad configuration dependency.
2. Validate the six default item types, unique values, parent relationships, Figma paths, and automation booleans.
3. Accept version 1 policies and normalize missing sections to safe defaults in memory so existing projects continue to validate.
4. Make setup write version 2 when onboarding or explicitly reconfiguring a project.
5. Remove the mandatory setup-before-anything gate and all `bmad-loop-setup` routing.
6. Let setup inspect evidence, apply defaults, ask only unresolved stable questions, show the final policy, and require confirmation before writing.
7. Keep release notes and optional automation disabled unless explicitly confirmed.
8. Add tests for local and external identity, version 1 compatibility, custom taxonomy, invalid parent rules, Figma defaults, and automation defaults.

**Checkpoint:** publication can begin immediately with a valid policy and can minimally bootstrap a missing policy without a separate daily command.

### Task 4: Replace Workflow Documentation And Templates

**Files:**

- Remove `.boilerplate/bmad-workflow-pack/docs/bmad-feature-workflow/`
- Add `.boilerplate/bmad-workflow-pack/docs/bmad-work-item-workflow/index.md`
- Add `.boilerplate/bmad-workflow-pack/docs/bmad-work-item-workflow/routing.md`
- Add `.boilerplate/bmad-workflow-pack/docs/bmad-work-item-workflow/artifact-naming.md`
- Add `.boilerplate/bmad-workflow-pack/docs/bmad-work-item-workflow/design-lifecycle.md`
- Add templates under `.boilerplate/bmad-workflow-pack/docs/bmad-work-item-workflow/templates/`
- Modify `.boilerplate/bmad-workflow-pack/managed-files.json`

**Steps:**

1. Write one lifecycle: `Refine -> Design when needed -> Prepare only what is needed -> Build -> Verify -> Close`.
2. Document evidence-based routing triggers rather than size categories.
3. Define the tracker/local-artifact source-of-truth boundary.
4. Define `design-impact`, Figma approval, durable screen registry, and reference screenshot rules.
5. Define ticket-scoped planning and implementation paths and closeout cleanup behavior.
6. Create templates for `Module`, `Request`, `Feature`, `Issue`, `Bug`, and `Spike` only.
7. Include `Delivery Route`, `Next Action`, and `Next Prompt` in deliverable Work Item templates.
8. Make Module and Request templates end in qualification/decomposition decisions rather than Build.
9. Make Spike end in evidence, recommendation, and decision.
10. Make Bug include severity, reproduction evidence, regression evidence, and Critical safeguards.
11. Remove Story, Improvement, size-specific workflow, sprint, and generic Task templates from the canonical pack.

**Checkpoint:** a reader can route any configured Work Item through one lifecycle without encountering the removed process.

### Task 5: Rewrite Internal Work Item Skills

**Files:**

- Modify `.boilerplate/bmad-workflow-pack/internal-skills/bmad-publish-work-item/SKILL.md`
- Modify `.boilerplate/bmad-workflow-pack/internal-skills/bmad-publish-work-item/agents/openai.yaml`
- Modify `.boilerplate/bmad-workflow-pack/internal-skills/bmad-close-work-item/SKILL.md`
- Modify `.boilerplate/bmad-workflow-pack/internal-skills/bmad-close-work-item/agents/openai.yaml`
- Modify `.boilerplate/bmad-workflow-pack/internal-skills/bmad-review-verification-gap/SKILL.md`
- Retain and verify `update-business-release-notes`
- Modify workflow-pack tests and add fixture contract tests as needed

**Publish behavior:**

1. Read policy when present; run minimal inline policy discovery when required fields are missing.
2. Resolve local or external identity and infer one configured Work Item type.
3. Inspect targeted project evidence and ask only evidence-based unresolved questions, one at a time.
4. Confirm the contract before writing.
5. Record problem, business outcome, scope, non-goals, acceptance criteria, fixed decisions, design impact, dependencies, and risks.
6. Select a route from explicit triggers: direct Build, design, spec, research, architecture, Feature decomposition, or risk-based verification.
7. Emit a mandatory first next action and agent-neutral next prompt.
8. Repeat the next prompt in the skill response.
9. Return tracker-ready content or publish through an available configured integration.
10. Pause external-mode Build until tracker identity is confirmed.

**Close behavior:**

1. Verify acceptance, fixed decisions, tests, design references, and Bug safeguards.
2. Transfer durable knowledge into existing product, architecture, operations, API, or UX documentation.
3. Update the screen registry and visual references when required.
4. Update the external tracker or emit an exact manual closeout payload.
5. Invoke release-note support only when enabled.
6. List exact temporary artifacts and ask before deleting them.
7. Remove the open-ticket contract and temporary implementation artifacts only after approval.

**Checkpoint:** publishing is fast for clear Issues and Bugs, and every wave has an explicit next prompt.

### Task 6: Rebuild BMAD Customizations Around Build

**Files:**

- Add `.boilerplate/bmad-workflow-pack/bmad-custom/bmad-build.toml`
- Modify `.boilerplate/bmad-workflow-pack/bmad-custom/bmad-spec.toml`
- Modify `.boilerplate/bmad-workflow-pack/bmad-custom/bmad-ux.toml`
- Modify relevant product, research, architecture, test, and review TOML files
- Remove obsolete managed TOML files from `.boilerplate/bmad-workflow-pack/bmad-custom/`
- Modify `.boilerplate/bmad-workflow-pack/help-overlay.csv`

**Steps:**

1. Inspect the installed BMAD 6.11 customization schema after stable installation and use only supported override fields.
2. Scope `bmad-build` to `_bmad-output/planning-artifacts/<id>` and `_bmad-output/implementation-artifacts/<id>`.
3. Make the Work Item contract and approved design references binding.
4. Enforce KISS, targeted context, contract-change escalation, next-prompt output, and no automatic commit.
5. Update `bmad-spec`, UX, research, architecture, test, and review overrides to use Work Item identity and adaptive route triggers.
6. Remove customizations for epic/story creation, story implementation, sprint planning, readiness based on story decomposition, and `bmad-quick-dev`.
7. Remove sprint-status and story-file assumptions from code review and verification.
8. Keep upstream compatibility content dependency-managed; do not manually patch generated BMAD source files.

**Checkpoint:** every managed implementation route converges on `bmad-build` and no managed customization invokes the removed process.

### Task 7: Upgrade Installer And Automation Defaults

**Files:**

- Modify `.boilerplate/bmad-workflow-pack/pack.json`
- Modify `scripts/install-bmad.sh`
- Modify `templates/base/scripts/install-bmad.sh`
- Modify `package.json`
- Modify `templates/base/package.json` if present or generated script sources
- Modify `scripts/adopt-stack.sh`
- Modify installer tests

**Steps:**

1. Make `bmad-method@latest` the default installer and verify it resolves to stable 6.11.x.
2. Change the preview shortcut to explicitly select `bmad-method@next`.
3. Keep `bmm`, `tea`, `cis`, and `wds` as default modules; remove `bmad-loop` from defaults.
4. Keep `bmad-build-auto` available through upstream BMAD but disabled by project policy.
5. Remove all mandatory `bmad-loop-setup` completion messages.
6. Preserve external skill installation and lock generation behavior.
7. Reapply internal assets, retirement rules, and help pruning after upstream installation.
8. Update validation to require the new workflow docs and Build customization, and stop requiring the loop module.
9. Preserve incomplete-stage reporting and idempotent recovery.
10. Rename package scripts so the normal command clearly installs stable BMAD and the preview command is explicit, preserving a compatibility alias only if existing projects need it.

**Checkpoint:** a clean Node 24 installation yields BMAD 6.11 stable, adaptive help routing, and no mandatory loop configuration.

### Task 8: Update Scaffold, Adoption, And Agent Guidance

**Files:**

- Modify `AGENTS.md` and `CLAUDE.md`
- Modify `templates/base/AGENTS.md` and `templates/base/CLAUDE.md`
- Modify `docs/new-project.md` and `docs/existing-repo.md`
- Modify `templates/base/docs/stack/README.md`
- Modify `templates/base/docs/stack/existing-repo-adoption.md`
- Modify `tooling/boilerplate-cli/src/lib/module-registry.ts`
- Modify `tooling/boilerplate-cli/src/lib/scaffold.ts`
- Modify `tooling/boilerplate-cli/src/lib/migrate.ts`
- Modify scaffold and migration tests

**Steps:**

1. Make `bmad-publish-work-item` the documented everyday entry point.
2. Explain that setup is standalone only for onboarding/reconfiguration and runs minimally inline when publication finds missing policy.
3. Replace all links to `docs/bmad-feature-workflow/` with `docs/bmad-work-item-workflow/`.
4. Remove statements assigning product work to stories, size workflows, or mandatory loop setup.
5. Update generated module README content and package scripts.
6. Update scaffold assertions to require the adaptive workflow pack and reject obsolete managed assets.
7. Update migration inventory and reports to describe policy version, adaptive docs, retired routes, Build support, and conflicts.
8. Update adoption dry runs to report copied, updated, removed, proposed, and retirement-conflict operations.
9. Ensure historical product and ticket documents are preserved during adoption.

**Checkpoint:** new-project and existing-repository instructions describe the same simple Work Item flow.

### Task 9: Apply The Pack To The Boilerplate Root

**Files:** generated from the canonical pack into:

- `.agents/skills/`
- `.claude/skills/`
- `_bmad/custom/`
- `docs/bmad-work-item-workflow/`
- `.boilerplate/bmad-workflow-pack-state.json`

**Steps:**

1. Run focused tests before applying the pack.
2. Run the pack apply command against the boilerplate root.
3. Confirm unchanged obsolete managed files are removed.
4. Review any locally modified conflict under `.boilerplate/adoption/proposed/` rather than forcing it.
5. Install stable BMAD 6.11 and reapply overlays when network access is available.
6. Validate both Codex and Claude internal skill copies match canonical sources.
7. Search managed active assets for obsolete routing references; allow them only in migration documentation and historical fixtures.

**Checkpoint:** the boilerplate itself is a valid example consumer of its canonical adaptive workflow pack.

### Task 10: Complete Regression And Integration Verification

**Commands:**

```bash
pnpm test:unit
pnpm test:release-notes
pnpm check
pnpm bmad:validate
pnpm test
```

**Scenarios:**

1. Publish a complete local Issue and verify its first next prompt routes directly to `bmad-build`.
2. Publish a normal Bug with complete evidence and verify no unnecessary preparation is selected.
3. Verify a Critical Bug requires rollback, monitoring, and production validation.
4. Verify Module, Request, and Spike cannot route to production Build.
5. Verify a design-impacting Issue blocks Build until approved Figma references exist.
6. Verify an unclear Feature routes to `bmad-spec` and a non-cohesive Feature decomposes into child Issues.
7. Verify closeout proposes durable documentation updates before artifact cleanup.
8. Verify external tracker failure preserves local artifacts and pauses Build.
9. Run adoption fixtures for unchanged old managed files, customized conflicts, existing BMAD installation, offline upstream failure, and successful rerun.
10. Run a final repository search for obsolete active guidance and inspect `git diff` without reverting unrelated changes.

## Completion Criteria

- Stable BMAD 6.11 is the default installation path.
- One adaptive lifecycle replaces all managed size-specific workflows.
- The six configured Work Item types are the only default taxonomy.
- Every emitted deliverable Work Item includes a delivery route and immediately runnable next prompt.
- `bmad-build` is the standard implementation path and cannot commit automatically.
- Figma is enforced only for design-impacting work.
- Existing project policies and customized managed files migrate safely.
- Obsolete files and help routes are actually retired rather than left active.
- New-project, scaffold, adoption, Codex, and Claude guidance agree.
- All focused, regression, integration, lint, and type checks pass.
