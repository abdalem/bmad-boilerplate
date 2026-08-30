# BMAD Project Inception And Repository Update Implementation Plan

**Design:** `docs/superpowers/specs/2026-08-30-bmad-project-inception-and-repository-update-design.md`
**Execution policy:** no automatic commits; preserve unrelated worktree changes

## Objective

Add the missing project-level workflow above the adaptive Work Item lifecycle:
one guided skill for creating a product from a clean boilerplate clone, one
independently installable skill for comparing and safely upgrading an existing
repository, and a complete Markdown product handoff that can be produced and
reviewed in ChatGPT or Claude web sessions.

## Implementation Order

### Task 1: Define And Test The Product Handoff Contract

**Files:**

- Add product-input templates under
  `.boilerplate/bmad-workflow-pack/docs/bmad-project-workflow/templates/product-input/`
- Add
  `.boilerplate/bmad-workflow-pack/internal-skills/bmad-start-project/scripts/inspect-product-input.mjs`
- Modify `tooling/boilerplate-cli/tests/workflow-pack.test.mjs`

**Steps:**

1. Declare the seven required Markdown filenames and the optional `REVIEW.md`.
2. Give every file a stable title and required section headings matching its
   responsibility in the design.
3. Implement a small read-only inspector for exact inventory, manifest status,
   required headings, and reviewed-bundle completeness.
4. Reject partial bundles, unexpected Markdown files, reviewed status without
   `REVIEW.md`, and `REVIEW.md` on an original bundle.
5. Return machine-readable findings without performing product reasoning or
   writing maintained artifacts.
6. Test complete original, complete reviewed, incomplete, and mixed fixtures.

**Checkpoint:** both web and direct-discovery paths have one verifiable input
shape without adding a user-facing workflow command.

### Task 2: Add Managed Project Workflow Documentation And Web Prompts

**Files:**

- Add `.boilerplate/bmad-workflow-pack/docs/bmad-project-workflow/index.md`
- Add `.boilerplate/bmad-workflow-pack/docs/bmad-project-workflow/new-project.md`
- Add
  `.boilerplate/bmad-workflow-pack/docs/bmad-project-workflow/existing-repository.md`
- Add
  `.boilerplate/bmad-workflow-pack/docs/bmad-project-workflow/product-handoff.md`
- Add
  `.boilerplate/bmad-workflow-pack/docs/bmad-project-workflow/figma-lifecycle.md`
- Add prompts under
  `.boilerplate/bmad-workflow-pack/docs/bmad-project-workflow/prompts/`
- Add legacy baseline and upgrade wave templates under
  `.boilerplate/bmad-workflow-pack/docs/bmad-project-workflow/templates/`

**Steps:**

1. Write a copy-paste product-definition prompt that challenges the product and
   exports all seven files, with no code tasks or Scrum vocabulary.
2. Write a copy-paste independent-review prompt that accepts the complete
   original bundle and emits a complete replacement plus `REVIEW.md`.
3. Document that imported files are evidence and approved BMAD artifacts become
   the maintained project state.
4. Document direct discovery as an equivalent producer of the same bundle.
5. Document initial Figma setup and ongoing per-Work-Item design evolution.
6. Document legacy baseline proof, accepted pre-existing failures, upgrade
   waves, conflict proposals, and backups.
7. Keep all examples generic and agent-neutral.

**Checkpoint:** a user can copy either web prompt without reconstructing the
contract from multiple documents.

### Task 3: Implement `bmad-start-project`

**Files:**

- Add
  `.boilerplate/bmad-workflow-pack/internal-skills/bmad-start-project/SKILL.md`
- Add
  `.boilerplate/bmad-workflow-pack/internal-skills/bmad-start-project/agents/openai.yaml`
- Modify `tooling/boilerplate-cli/tests/workflow-pack.test.mjs`

**Steps:**

1. Detect whether the repository is a clean boilerplate clone, a partially
   configured clone, or a legacy replatforming target.
2. Ask one unresolved technical question at a time and confirm archetypes,
   package paths, and deployment providers before invoking existing init and
   scaffold interfaces.
3. Offer bundle import or direct product discovery.
4. Inspect imported inventory before reading it as product evidence.
5. Challenge business value, users, scope, non-goals, domain, risks, and work
   candidates one question at a time.
6. Route only necessary BMAD product, research, UX, and architecture workflows.
7. Require initial Figma approval only for design-dependent work.
8. Confirm the initial work map, then publish only the first approved actionable
   item through `bmad-publish-work-item`.
9. Return current state, created artifacts, unresolved blockers, and the first
   copy-ready next prompt.
10. Never commit automatically.

**Checkpoint:** one skill can take a clone from technical selection to the first
delivery prompt without reviving deterministic ticket generation.

### Task 4: Implement `bmad-update-project`

**Files:**

- Add
  `.boilerplate/bmad-workflow-pack/internal-skills/bmad-update-project/SKILL.md`
- Add
  `.boilerplate/bmad-workflow-pack/internal-skills/bmad-update-project/agents/openai.yaml`
- Add
  `.boilerplate/bmad-workflow-pack/internal-skills/bmad-update-project/scripts/resolve-boilerplate-source.mjs`
- Modify `tooling/boilerplate-cli/tests/workflow-pack.test.mjs`

**Steps:**

1. Resolve source precedence as explicit URL, `boilerplate` Git remote, then
   `https://github.com/abdalem/bmad-boilerplate.git`.
2. Test source resolution with temporary local Git repositories and fake remotes.
3. Inspect runtime, package manager, lockfiles, workspaces, services,
   environment, framework versions, and existing verification commands.
4. Write a legacy baseline record and block modernization until it passes or an
   explicit pre-existing failure is accepted and recorded.
5. Clone the source into a temporary directory without changing target remotes
   or history.
6. Run dry-run adoption and topology migration analysis before proposing work.
7. Group proposals into the five approved upgrade waves and apply only one
   explicitly approved wave at a time.
8. Use managed proposals and force backups rather than overwriting conflicts.
9. Verify each wave, record rollback information, and return the next prompt.
10. Leave the target unchanged on source or network failure and never commit.

**Checkpoint:** an unrelated repository can install this one skill and obtain a
safe, evidence-based update plan from the public boilerplate.

### Task 5: Register And Distribute The New Managed Assets

**Files:**

- Modify `.boilerplate/bmad-workflow-pack/pack.json`
- Modify `.boilerplate/bmad-workflow-pack/managed-files.json`
- Modify `.boilerplate/bmad-workflow-pack/help-overlay.csv`
- Modify `.boilerplate/bmad-workflow-pack/lib/workflow-pack.mjs`
- Modify `tooling/boilerplate-cli/tests/workflow-pack.test.mjs`

**Steps:**

1. Add both skills to the internal-skill declaration.
2. Add `docs/bmad-project-workflow` as a managed documentation group.
3. Add BMAD help rows for new-project inception and existing-repository update.
4. Extend validation to require both skills for Codex and Claude and the project
   workflow index and web prompts.
5. Preserve hash-based update, conflict, retirement, and force-backup behavior.
6. Verify pack application remains idempotent.

**Checkpoint:** scaffold, adoption, and BMAD reinstall all restore the same two
scenario skills and documentation.

### Task 6: Update Public Guidance And Generated Project Instructions

**Files:**

- Modify `README.md`
- Modify `docs/new-project.md` and `docs/existing-repo.md`
- Modify `AGENTS.md` and `CLAUDE.md`
- Modify `templates/base/AGENTS.md` and `templates/base/CLAUDE.md`
- Modify `templates/base/docs/stack/README.md`
- Modify `templates/base/docs/stack/existing-repo-adoption.md`
- Modify `tooling/boilerplate-cli/src/lib/module-registry.ts`
- Modify `tooling/boilerplate-cli/src/lib/migrate.ts` where reports enumerate
  workflow assets
- Modify scaffold and migration tests

**Steps:**

1. Make `bmad-start-project` the entry point after cloning a new project.
2. Link the two copy-paste web prompts directly from the new-project procedure.
3. Document the direct-discovery alternative.
4. Publish the exact Skills CLI command for installing only
   `bmad-update-project` from the public repository.
5. Explain baseline-first legacy migration and approved update waves.
6. Keep `bmad-publish-work-item` as the normal entry point after inception.
7. Update generated README and adoption inventory text to mention both skills
   and `docs/bmad-project-workflow/`.

**Checkpoint:** README routes each user to one skill rather than a sequence of
low-level commands.

### Task 7: Apply The Pack To The Boilerplate Root

**Generated targets:**

- `.agents/skills/bmad-start-project/`
- `.claude/skills/bmad-start-project/`
- `.agents/skills/bmad-update-project/`
- `.claude/skills/bmad-update-project/`
- `docs/bmad-project-workflow/`
- `.boilerplate/bmad-workflow-pack-state.json`
- `_bmad/_config/bmad-help.csv`

**Steps:**

1. Run focused tests before application.
2. Dry-run the managed pack and review proposals or retirement conflicts.
3. Apply without force when no conflicts exist.
4. Merge the help overlay and validate upstream BMAD plus internal assets.
5. Confirm canonical and Codex/Claude copies match.
6. Confirm no generated product input is added to the boilerplate root.

**Checkpoint:** the boilerplate is a valid consumer and public source of both
skills.

### Task 8: Complete Regression And Integration Verification

**Commands:**

```bash
pnpm test:unit
pnpm test:release-notes
pnpm check
pnpm bmad:validate
pnpm test
```

**Scenarios:**

1. Inspect a complete original product bundle.
2. Reject a missing-file bundle without side effects.
3. Accept a complete reviewed replacement and reject mixed review state.
4. Verify direct-discovery instructions require the same contract.
5. Verify visual inception routes to Figma and non-visual work may continue.
6. Resolve explicit, remote, and fallback boilerplate sources in order.
7. Verify modernization is gated by baseline evidence or explicit accepted
   failure.
8. Verify update instructions require dry-run, one approved wave, and conflict
   proposals/backups.
9. Scaffold a fixture and require both skills and project workflow docs.
10. Dry-run and reapply the pack to prove idempotence.
11. Search active managed assets for Scrum, Story, Sprint, sized workflow, and
    automatic-commit regressions.
12. Inspect final Git diff without reverting unrelated changes.

## Completion Criteria

- One skill handles new-project inception from clone to first Work Item.
- One independently installable skill handles existing-repository comparison
  and approved upgrades.
- Two web prompts produce and review one exact Markdown bundle.
- Direct agent discovery converges on the same contract.
- Initial and evolving Figma work use one documented lifecycle.
- Legacy modernization cannot start without baseline evidence or explicit
  accepted failure.
- Public-source comparison never merges histories or mutates the target before
  approval.
- The adaptive Work Item lifecycle remains the only delivery process.
- Codex, Claude, scaffold, adoption, help, and README guidance agree.
- All focused and full verification passes.
