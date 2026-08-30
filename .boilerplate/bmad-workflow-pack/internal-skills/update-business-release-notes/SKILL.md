---
name: update-business-release-notes
description: Prepare business-facing release notes from stable GitHub Releases using the repository workflow policy. Use when asked to synchronize or update release notes. Exit without writing when release notes are absent or disabled in `_bmad/custom/project-workflow.toml`.
---

# Update Business Release Notes

Read `_bmad/custom/project-workflow.toml` before doing anything else.

## Disabled Gate

If `[release_notes].enabled` is not `true`, state that release-note support is disabled and stop. Do not create a release document, call GitHub, or modify files.

When enabled, require a non-empty release-note `path` and `language`. Preserve local edits to that document.

## Evidence Collection

1. Confirm the repository root and inspect the configured document plus its current diff.
2. Require authenticated `gh` access.
3. Run the read-only collector, using a temporary JSON output outside the release document:

```bash
python3 .agents/skills/update-business-release-notes/scripts/collect_releases.py \
  --policy _bmad/custom/project-workflow.toml \
  --output /tmp/release-evidence.json
```

4. Inspect release metadata, associated pull requests, commits, changed files, and material code changes. Never infer customer-facing behavior from titles alone.
5. Draft only stable releases newer than the newest version already documented.
6. Write concise business-facing notes in the configured language. Exclude internal refactors, dependency churn, CI-only changes, and implementation details unless they materially affect users or operators.
7. Present the proposed insertion and require explicit approval before editing.
8. Re-read the document and diff immediately before writing. Stop on overlapping changes.
9. Show the final diff and verify ordering, dates, versions, and duplicate absence.

The collector is evidence-only and must never overwrite the release document.
