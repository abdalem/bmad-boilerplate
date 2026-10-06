# Existing Repository

Start inside the existing repository. Install only the update skill when the
repository has not adopted this boilerplate yet:

```bash
npx skills add https://github.com/abdalem/bmad-boilerplate/tree/main/.boilerplate/bmad-workflow-pack/internal-skills/bmad-update-project -a codex -a claude-code -y
```

## 1. Compare Safely

Invoke in Codex or Claude Code:

```text
bmad-update-project
```

The skill first proves the repository under its current supported runtime and
framework versions. It then resolves the latest public boilerplate, clones it
into a temporary directory, and runs dry-run adoption and topology analysis.
It never merges boilerplate Git history into the target.

The comparison proposes independent waves for workflow, development tooling,
topology, one-workspace runtime upgrades, and package-scoped deployment.

## 2. Approve One Wave

Review:

```bash
cat .boilerplate/adoption/legacy-baseline.md
cat .boilerplate/adoption/update-plan.md
find .boilerplate/adoption/proposed -type f
```

Runtime and framework modernization remains blocked until the old baseline
passes, unless you explicitly accept and record a pre-existing failure. Apply
only one approved wave, verify it, then decide whether to continue.

## 3. Manual Host-Side Adoption

The skill normally runs these commands for the approved workflow or tooling
wave. They remain available as a manual recovery path from a local boilerplate
clone:

```bash
cd /home/abdalem/projects/boilerplate
pnpm adopt:repo:dry -- /home/abdalem/projects/existing-repo
pnpm adopt:repo -- /home/abdalem/projects/existing-repo
```

Missing or previously managed files update automatically. Locally modified
managed files are written under `.boilerplate/adoption/proposed/`. Historical
`PRODUCT_SPEC.md`, `docs/tickets`, BMAD outputs, personal BMAD configuration,
and unrelated customizations are preserved.

Force mode creates timestamped backups before replacement:

```bash
pnpm adopt:repo:force -- /home/abdalem/projects/existing-repo
```

## 4. Open The Target Devcontainer

```bash
cd /home/abdalem/projects/existing-repo
cat .boilerplate/adoption/report.md
find .boilerplate/adoption/proposed -type f
code .
```

Reopen in the target repo's devcontainer. If upstream installation was skipped
or failed, run `pnpm bmad:install`; an incomplete status is recorded in
`.boilerplate/bmad-install-status.json` and reruns are safe.

Adoption also proposes or installs `.codex/config.toml` and `.mcp.json`. These
configure Chrome DevTools MCP for both agents without overriding Codex approval
or sandbox policies.

## 5. Continue Delivery

Use `bmad-project-context adopt` to maintain concise repository instructions.
In Codex or Claude Code, actionable cohesive Features, Issues, and Bugs go to
`bmad-build`, then `bmad-close-work-item`. Supply the tracker ID or URL, pasted
intent, or an existing local contract. A `work-item.md` is optional.

Use `bmad-publish-work-item` to create or refine unclear items. Run
`bmad-workflow-setup` separately for onboarding or explicit policy reconfiguration.
Build investigates implementation complexity and includes independent review;
standalone `bmad-code-review` is optional for external work or explicit review.
Use `docs/bmad-work-item-workflow/` for delivery and `docs/stack/` for conventions.

To use browser automation, start a dedicated host Chrome profile on port `9222`
with a non-default `--user-data-dir`. The generated MCP command resolves the
host dynamically from inside the devcontainer.
