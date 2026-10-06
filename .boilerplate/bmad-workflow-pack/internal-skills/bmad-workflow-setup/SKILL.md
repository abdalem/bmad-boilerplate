---
name: bmad-workflow-setup
description: Configure or update stable repository-specific Work Item policy. Use for project onboarding, explicit workflow reconfiguration, or when bmad-publish-work-item finds required policy that cannot be inferred safely.
---

# BMAD Workflow Setup

Create or update `_bmad/custom/project-workflow.toml` through evidence-based discovery. This is an onboarding and reconfiguration skill, not a per-ticket prerequisite.

## Discovery

1. Inspect `README.md`, `package.json`, repository remotes, existing `_bmad/custom/project-workflow.toml`, planning artifacts, tracker references, design documentation, and release documentation.
2. Preserve confirmed project-specific values.
3. Apply safe defaults for values that do not require a project decision.
4. Ask exactly one question for the first unresolved stable value.
5. Continue one question at a time until required values are resolved.
6. Show the complete proposed policy and require explicit confirmation before writing.

Do not ask the user to reconfirm values established by reliable repository evidence. Keep release notes and optional automation disabled unless explicitly confirmed.

## Policy V2

```toml
version = 2

[project]
key = "APP"
summary_language = "English"

[tickets]
identity_mode = "local" # local or external
tracker = "none" # none, clickup, github, jira, linear, or another explicit tracker
project_key = "APP"
local_prefix = "APP"
local_start = 1
local_width = 3

[work_items]
types = ["Module", "Request", "Feature", "Issue", "Bug", "Spike"]
module_type = "Module"
request_type = "Request"
feature_type = "Feature"
issue_type = "Issue"
bug_type = "Bug"
spike_type = "Spike"
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

The six semantic roles must map to six unique configured type names. Existing trackers may use different names by changing `types`, the six `*_type` mappings, and parent arrays together.

## Defaults And Detection

- Derive project and local prefixes from an established tracker project key or repository name when unambiguous.
- Default summary language to the repository's established documentation language, otherwise English.
- Default to local identity only when no external tracker is established.
- Default the semantic type names and parent rules to the example values.
- Keep Figma disabled when no current design source is established. Its paths may still retain the defaults.
- Keep both automation flags disabled.
- Enable release notes only when a release process and durable document path are confirmed.

## Version 1 Compatibility

Version 1 policies remain valid with default Work Item, design, and automation values supplied in memory. When the user explicitly runs setup, propose an in-place version 2 upgrade that preserves ticket identity and release-note values.

## Local Identity

Allocate collision-free IDs by scanning planning and implementation artifacts:

```bash
node scripts/bmad-workflow-pack.mjs next-id --target . --prefix APP --start 1 --width 3
```

The helper proposes an ID. Require confirmation before creating an item directory.

## Completion

Validate after writing:

```bash
node scripts/bmad-workflow-pack.mjs validate --target .
```

Report the policy path, identity mode, tracker, semantic type mappings, design status, automation status, and release-note status. Recommend `bmad-build` for an already actionable Feature, Issue, or Bug; use `bmad-publish-work-item` for creation, qualification, or refinement. Setup configures stable policy and does not classify implementation complexity.
