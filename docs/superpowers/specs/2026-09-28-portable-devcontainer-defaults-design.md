# Portable devcontainer defaults and project adoption

Date: 2026-09-28
Status: design approved in conversation; written specification awaiting review.
Canonical copy: VPS boilerplate repository, `docs/superpowers/specs/2026-09-28-portable-devcontainer-defaults-design.md`.

## Objective and sequence

Make the reusable boilerplate produce the working development setup by default,
instead of requiring the same fixes after every project migration.

1. Fix and test the boilerplate's own portable configuration, generation
   templates, and existing-project adoption output.
2. Apply the corresponding development-environment fixes to Leyth on the VPS.
3. Upgrade Mizan using the updated boilerplate's existing-project workflow,
   reconcile its configuration, and only then initialize its VPS Remok setup.

Mizan and Leyth are already extracted under the VPS projects directory. Their
original local folders and verified archives remain intact. This work does not
create GitHub repositories or migrate Docker volume contents.

## Findings and chosen approach

The inspected VPS boilerplate checkout is on main at cd4b786 with existing
uncommitted workstation changes. Its own setup script has visible steps and a
duplicate-run guard, but templates/base still has the old Infisical checks and
startup defaults. Fixing only generated projects would repeat that divergence.

Chosen approach: correct the reusable sources and verify both generation and
adoption, then reconcile the selected projects. Rejected alternatives are
project-only patches (future projects regress) and a separate VPS-only template
fork (duplicate maintenance and machine-specific defaults).

Before implementation, verify the current upstream main revision without
resetting or blindly pulling over the dirty checkout. If upstream advanced,
review and integrate it while preserving the existing workstation edits. Record
the exact boilerplate revision and local fixes used for Mizan's adoption.

## Portable defaults

- Setup prints named phases and a final success, warning, failure, or interrupted
  status. Required failures return nonzero and identify the failed phase.
- Keep the existing flock-based duplicate-run guard. A second concurrent setup
  exits clearly; normal completion or interruption releases the lock without
  deleting the lock file. Check that the image provides flock.
- Never invoke Infisical authentication or token probing during automatic setup.
  Explain that the developer runs infisical login manually when needed.
- Preserve each project's optional BMAD installation policy; optional failure
  remains a visible warning rather than masking dependency-installation failure.
- Use noninteractive sudo for necessary setup permissions so failures are visible
  instead of waiting for an unavailable prompt. Do not add broader recursive
  permission changes.
- Set shutdownAction to none and remote.autoForwardPorts to false. Manual port
  forwarding remains available. Fresh templates omit redundant web forwards
  already served by shared Traefik; adoption preserves unrelated explicit ports.
- Keep persistent agent homes and the startup-script installation/update policy
  for Codex and Claude. Reuse the existing installer; do not introduce another
  installer or copy authentication files.
- Correct relevant Dockerfile workspace paths and shell/tool-path defects found
  during review. Preserve project tool versions unless an adoption requirement
  is demonstrated. Verify pnpm in a fresh noninteractive shell.

## VPS configuration boundary

Portable projects must continue to work locally without Remok being installed.
Do not put VPS usernames, absolute host state paths, private bridge addresses,
or workstation network enrollment in reusable defaults.

Reuse the existing environment-driven Chrome MCP launcher: the remote endpoint
comes from the workstation environment or a project override, while the local
fallback remains unchanged. Keep project-specific MCP servers intact.

Use installed Remok dry-run/status checks for each trusted project, then apply
reviewed enrollment separately. Private network/environment overlays and state
records remain outside the portable repository. Enrollment permits access to the
shared Herdr API, including host panes. No firewall changes are in scope.

## Project reconciliation

Leyth already uses Compose. Correct the stale /workspaces/geolog5 Dockerfile path
to its own workspace, apply portable setup defaults, and retain its app, API,
Traefik routing, package manager pin, environment files, and persistent home.
Do not add database services or transfer host SSH private keys.

Mizan must first follow the repository's bmad-update-project/adoption workflow
from the host, not from a separate boilerplate devcontainer. Read that workflow
before adopting. Inspect adoption dry-run output; use non-overwriting proposals
for conflicts, not blanket --force. Apply the corrected Compose template with
Mizan-specific names only after reconciling its existing configuration. Preserve
application code, manifests, env files, and the explicitly configured mobile port
19006 unless separately approved otherwise. No product or deployment redesign.

## Verification and recovery

- Add fixture tests for successful setup, repeat runs, dependency/tool/permission
  failure, concurrent execution, interruption, and optional BMAD failure.
- Fixtures assert automatic setup never calls Infisical or prompts for login.
- Verify generated and adopted projects receive the corrected setup, startup
  scripts, persistent home, and VS Code defaults, without VPS-specific values.
- Verify adoption leaves existing project/MCP customizations unchanged and emits
  reviewable proposals for conflicts. Assert correct workspace substitution.
- Run shell syntax checks and sanitized Compose/config validation without
  printing expanded secrets. Run tests in isolated fixtures, not active projects.
- Back up each changed VPS file before replacement and check for intervening
  edits. Never restore an entire checkout over unrelated newer work.
- Report static validation, Remok initialization, container build/start, actual
  agent-home persistence, and MCP connectivity as separate verification results.

No container starts, rebuilds, restarts, shared-Traefik changes, volume deletion,
credential migration, or changes to active unrelated projects during this phase.
Runtime smoke tests require a separate lifecycle approval and memory check.
No automatic commits or pushes, following the boilerplate AGENTS.md policy.

## Delivery gates

- Context inspection and conversational design approval: complete.
- Written design and inline consistency/scope review: complete.
- User review of this written specification: pending.
- Implementation planning and repository-required BMAD workflow: after review.
- Boilerplate fixes/tests, Leyth reconciliation, Mizan adoption/enrollment: after
  planning, in that order.

The writing-plans skill is not available in this session. After specification
approval, use an explicit implementation checklist together with the repository's
available BMAD instructions, and disclose missing workflow prerequisites rather
than inventing them.
