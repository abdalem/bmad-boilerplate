---
name: bmad-close-work-item
description: Verify and close an adaptive BMAD Work Item, transfer durable knowledge into maintained documentation, update its tracker, and remove ticket-scoped artifacts only after explicit approval.
---

# BMAD Close Work Item

## Goal

Close one Work Item with verified acceptance, correct durable documentation, an updated tracker, and no unnecessary ticket artifacts.

## Rules

- Resolve the exact Work Item ID before reading artifacts.
- Read `_bmad/custom/project-workflow.toml` when present and use safe defaults when an older policy lacks new sections.
- Inspect only ticket-scoped artifacts and the relevant code and documentation diff.
- Never infer acceptance from implementation claims alone.
- Never create a new summary document when maintained documentation already has the correct home for lasting knowledge.
- Never delete ticket artifacts before explicit approval.
- Never commit automatically.

## Closeout Sequence

### 1. Resolve Evidence

Inspect:

```sh
find _bmad-output -path "*/<normalized-id>/*" -type f | sort
git status --short
git diff --stat
```

Read the Work Item contract, routed planning sources, implementation evidence, relevant tests, approved design references, and optional review findings. Do not load unrelated ticket artifacts.

### 2. Verify The Contract

Confirm:

- Every acceptance or decision criterion has evidence or an explicit failure.
- Scope, non-goals, and fixed decisions were respected.
- Relevant tests and manual checks passed.
- Blocking review findings are resolved.
- Remaining risks and follow-up items are explicit.
- Design-impacting work matches approved Figma nodes, required states, responsive behavior, and durable references.
- A Feature's required child Issues are complete when the Feature was decomposed.

For a Bug, confirm the incorrect behavior no longer reproduces or its detection signal clears and meaningful regression evidence exists. A Critical Bug additionally requires production verification, rollback readiness or an explicit impossibility, and monitoring status.

Stop when evidence is missing. Ask only for the missing completion fact.

### 3. Transfer Durable Knowledge

Determine whether future contributors need any information from the ticket after its artifacts are removed.

Update an existing maintained document when behavior, API, data contracts, permissions, setup, operations, architecture, deployment, or developer guidance changed. Create a new durable document only when no suitable maintained home exists and the knowledge will remain useful.

For design-impacting work, update the configured screen registry and approved visual references before cleanup.

Summarize durable facts; do not copy raw agent discussion or transient delivery plans. If no lasting documentation is needed, state why existing docs remain correct.

### 4. Update External State

When an external tracker is configured, update the item through the available integration. Otherwise return an exact manual closeout payload containing verification, durable documentation changes, remaining risks, and follow-ups.

Run business release-note support only when `[release_notes].enabled` is true.

### 5. Request Cleanup Approval

Present:

- Verification result.
- Tracker update result.
- Documentation updated or intentionally untouched.
- Exact artifacts proposed for deletion.
- Artifacts retained and why.
- Remaining risks and follow-up Work Items.

Use only the resolved ticket paths:

```sh
rm -rf _bmad-output/planning-artifacts/<normalized-id> \
       _bmad-output/implementation-artifacts/<normalized-id>
```

Remove only folders that exist and only after explicit approval. The tracker owns ticket history in external identity mode. In local-only mode, preserve the minimum history required by project policy before cleanup.

## Response

Report the Work Item ID and type, acceptance result, design verification when applicable, tracker result, durable documentation result, cleanup result or pending approval, remaining risks, and follow-up items.
