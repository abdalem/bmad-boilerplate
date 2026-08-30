---
name: bmad-update-project
description: Compare an existing repository with the latest public boilerplate, prove its legacy baseline, and apply one explicitly approved workflow, tooling, topology, workspace-runtime, or deployment upgrade wave safely.
---

# BMAD Update Project

## Goal

Improve or modernize an existing repository using the latest public boilerplate
without merging histories, breaking a previously working legacy stack, or
overwriting local customizations.

## Rules

- Run inside the target repository, not inside a separate boilerplate
  devcontainer.
- Inspect and prove current behavior before modernization.
- Ask exactly one unresolved question at a time.
- Perform comparison before proposing changes.
- Apply only one explicitly approved upgrade wave at a time.
- Use proposals and backups for conflicts.
- Never commit automatically.

## Stage 1: Protect The Target

Inspect:

```bash
pwd
git status --short
git branch --show-current
git remote -v
```

Record unrelated uncommitted changes and do not overwrite or revert them. Read
repository instructions, package manifests, lockfiles, workspace definitions,
devcontainer files, CI, deployment files, BMAD assets, and existing adoption
state.

If the target is not a Git repository, continue only after the user confirms
the path and accepts that Git-based rollback evidence is unavailable.

## Stage 2: Establish The Legacy Baseline

Create or update:

```text
.boilerplate/adoption/legacy-baseline.md
```

Use the managed template when available. Determine:

- Runtime and package-manager versions, including version-manager files.
- Lockfiles and workspace boundaries.
- Framework, database, and required service versions.
- Required environment variables and external dependencies without exposing
  secret values.
- Install, start, representative smoke path, test, lint, and build commands.
- Existing failures and missing dependencies.

Run the smallest safe commands that prove the current supported version can
install, start, and exercise one representative path. Do not upgrade runtimes,
lockfiles, dependencies, or framework configuration during baseline work.

Set baseline status to passed only with evidence. A framework/runtime upgrade
is blocked when baseline is pending or failed. The user may explicitly accept a
pre-existing failure; record who accepted it, when, impact, evidence gap, and
affected verification. Never silently convert a failure into a pass.

## Stage 3: Resolve The Public Boilerplate Source

Locate this skill's bundled resolver and run:

```bash
node <skill-directory>/scripts/resolve-boilerplate-source.mjs --repository .
```

Supply `--url <source>` only when the user explicitly provided one. Precedence
is:

1. Explicit URL.
2. Git remote named `boilerplate`.
3. `https://github.com/abdalem/bmad-boilerplate.git`.

Show the resolved source and require confirmation before network access.

Clone it into a temporary directory outside the target:

```bash
comparison_dir="$(mktemp -d)"
git clone --depth 1 <resolved-source> "$comparison_dir/boilerplate"
```

If resolution or clone fails, report the exact retry command and stop. Do not
write adoption reports or alter target files after a source failure.

## Stage 4: Compare Without Applying

From the temporary checkout, run host-side dry-run adoption:

```bash
"$comparison_dir/boilerplate/scripts/adopt-stack.sh" "$PWD" --dry-run --skip-bmad
```

Also run topology migration analysis when the target and available Node runtime
support the boilerplate CLI. If it cannot run safely under the legacy runtime,
record that limitation and defer topology analysis to the Node 24 devcontainer;
do not change the target runtime merely to produce the report.

Compare at least:

- BMAD modules, internal and external skills, custom overrides, and workflow
  docs.
- Devcontainer, MCP, editor, formatting, lint, and package-manager setup.
- Package/workspace topology and shared packages.
- Framework and runtime versions by workspace.
- Package-scoped deployment providers and stale provider files.
- Managed conflicts, retired files, and preserved project-specific content.

Write a comparison summary and proposed wave list under
`.boilerplate/adoption/update-plan.md` only after source retrieval and dry-run
succeed.

## Stage 5: Propose Independent Upgrade Waves

Use these boundaries:

1. **Workflow:** agent guidance, BMAD pack, internal skills, and workflow docs.
2. **Development tooling:** devcontainer, MCP, editor, Biome, package scripts,
   and host tooling.
3. **Topology:** standalone/monorepo shape, packages, shared configuration, and
   technical manifest.
4. **Workspace runtime:** framework, runtime, and dependencies for one workspace
   per Work Item.
5. **Deployment:** provider changes for explicitly selected packages.

For each wave, state current evidence, exact paths, exclusions, prerequisites,
risks, verification, rollback, and one next prompt. Do not bundle framework
upgrades with devcontainer adoption or provider changes.

Present the wave list and ask which single wave to approve.

## Stage 6: Apply One Approved Wave

Before applying, repeat the exact expected paths and commands and receive
explicit confirmation.

- Workflow wave: apply the workflow pack from the temporary checkout, then
  merge help and validate. Preserve project policy and customizations.
- Development-tooling wave: use `adopt-stack.sh` without force first. Treat
  unchanged workflow files as harmless overlap and review every proposal.
- Topology wave: use migration dry run and apply only selected topology actions.
- Workspace-runtime wave: publish a dedicated adaptive Work Item for one
  workspace. Require baseline evidence and incremental verification.
- Deployment wave: select package-scoped provider actions explicitly and retire
  old provider files through governed migration.

Never use force until the user has reviewed exact proposal files. Force mode
must create timestamped backups. Do not delete historical product docs, tickets,
personal BMAD settings, or unrelated customizations.

## Stage 7: Verify And Continue

Run wave-specific checks plus unchanged baseline checks. Record:

- Applied, unchanged, proposed, retired, and backed-up files.
- Commands and evidence.
- Accepted pre-existing failures.
- New failures and rollback status.
- Remaining waves and dependencies.

If verification fails, stop the upgrade sequence and recommend rollback or a
focused remediation Work Item. If it passes, return one copy-ready prompt for
the next approved wave or normal `bmad-publish-work-item` delivery.

Remove only the temporary comparison clone after its source revision and report
references have been recorded. Do not remove adoption reports or backups.

## Completion

Return the baseline status, source and revision, comparison report paths,
approved wave, application result, conflict and backup locations, verification
evidence, remaining risks, and next prompt. Never commit automatically.
