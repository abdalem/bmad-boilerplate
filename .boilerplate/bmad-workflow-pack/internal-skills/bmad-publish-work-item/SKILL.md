---
name: bmad-publish-work-item
description: Quickly refine and emit a code-grounded Work Item contract for Module, Request, Feature, Issue, Bug, or Spike. Use to define or improve an item in the configured project-management tool and return its first next prompt.
---

# BMAD Publish Work Item

## Goal

Turn raw intent or an existing tracker item into:

1. A confirmed ticket-scoped `work-item.md` delivery contract.
2. A concise title and body created in, updated in, or ready for the configured tracker.
3. An evidence-based delivery route.
4. The first immediately runnable next prompt.

Keep publication fast. Ask only questions justified by a missing product fact, contradiction, or material risk found in the supplied request or relevant project evidence.

## Policy Guard

Read `_bmad/custom/project-workflow.toml` first.

- If it is valid, start item refinement immediately.
- If it is version 1, use safe Work Item, design, and automation defaults without blocking publication.
- If it is missing, infer stable policy from repository evidence and run the smallest inline setup needed for identity, tracker, project key, and output language. Apply the canonical semantic type defaults. Keep design, automation, and release notes disabled unless established evidence says otherwise.
- Ask one unresolved policy question at a time and confirm before writing a new policy.
- Route to standalone `bmad-workflow-setup` only when the user wants broader reconfiguration or required policy cannot be resolved safely inline.

## Identity

For an existing external item, use the tracker-issued ID. For a new external item, publish the confirmed tracker payload first when an integration is available, then use the returned ID.

If external publication is unavailable or fails, allocate a confirmed local fallback ID, write the contract under that ID with `Tracker identity: Pending`, and return the exact tracker-ready title and body. Do not route to Build until the external identity is recorded and the folder and contract are normalized to it.

For local identity, propose the next ID with:

```bash
node scripts/bmad-workflow-pack.mjs next-id --target . --prefix APP --start 1 --width 3
```

Require confirmation before creating a new local item. Normalize the final ID to lowercase for paths.

## Semantic Item Roles

Use the six role mappings from `[work_items]`:

- Module groups related delivery items and is never built directly.
- Request is qualified, then accepted, rejected, deferred, or converted.
- Feature is a cohesive business or user capability. Build it directly only when independently deliverable; otherwise create child Issues in the tracker.
- Issue is the standard independently deliverable change.
- Bug is incorrect existing behavior and requires severity plus available evidence.
- Spike is a time-boxed investigation ending in evidence and a decision, without production implementation.

Never default ambiguous work silently. Ask one short type question when evidence does not distinguish the relevant roles.

## Refinement Sequence

### 1. Inspect Targeted Evidence

Read project instructions and only the code, tests, configuration, documentation, design references, history, and tracker context relevant to the request. Establish current behavior, product boundaries, comparable patterns, and contradictions.

Avoid broad repeated repository scans. Reuse evidence already gathered in the current run.

### 2. Challenge The Product Contract

Resolve:

- Problem and affected users.
- Business or operational outcome.
- Scope and explicit non-goals.
- Material edge cases.
- Observable acceptance criteria.
- Binding product and strategic technical decisions.
- Design impact.
- Dependencies and material risks.
- Parent Module or Feature when applicable.
- Bug severity, expected behavior, actual behavior, impact, and available reproduction evidence.
- Spike question, timebox, evidence threshold, and decision criteria.

Ask exactly one unresolved question at a time. Do not ask the user to choose files, functions, internal abstractions, implementation order, or technical test structure.

### 3. Confirm Before Writing

Present one concise checkpoint containing the proposed type, problem, outcome, scope, non-goals, acceptance criteria, fixed decisions, design impact, dependencies, risks, and route. Receive explicit confirmation before creating or updating the tracker item and `work-item.md`.

### 4. Select The Route

Use the smallest route supported by evidence:

| Trigger | Next wave |
| --- | --- |
| Cohesive, sufficiently clear Feature, Issue, or Bug | `bmad-build` |
| Behavior or acceptance details need focused elaboration | `bmad-spec` |
| Design impact is not `none` | UX and Figma approval |
| Product, customer, domain, regulatory, or technology decision blocks scope | Matching targeted research |
| Independently delivered units could make incompatible decisions | Architecture |
| Feature is not one cohesive independently verifiable change | Publish external child Issues |
| Spike | Matching research skill, then closeout |
| Module | Publish a child Feature or Issue |
| Accepted Request | Publish the converted item |

Do not prepare every later prompt. Select the next wave and write only its first concrete prompt.

### 5. Write The Contract

Use the matching template under `docs/bmad-work-item-workflow/templates/` and write:

```text
_bmad-output/planning-artifacts/<normalized-id>/work-item.md
```

Every emitted contract records:

- ID, tracker, tracker URL or pending status, semantic type, and parent.
- Problem and business outcome.
- Scope and non-goals.
- Acceptance criteria or type-specific decision criteria.
- Fixed decisions or explicit `None`.
- Design impact and approved references when available.
- Dependencies and material risks.
- Delivery route and reason.
- Next action and first agent-neutral next prompt.

Use this boundary after Fixed Decisions:

```text
All implementation details not listed as fixed are developer-owned within project conventions and acceptance criteria.
```

## Next Prompt Rules

- The prompt is mandatory.
- It references the final Work Item ID and contract path.
- It names the next BMAD or internal skill separately from the agent-neutral body.
- It states the binding contract sections.
- It forbids automatic commits for implementation routes.
- It requests verification evidence and the next recommended prompt.
- It routes back to publication when no safe next action exists.

Direct Build example:

```text
Implement APP-001 using `_bmad-output/planning-artifacts/app-001/work-item.md`.
Treat its scope, non-goals, acceptance criteria, fixed decisions, approved design references, and delivery route as binding.
Use the smallest implementation that satisfies the contract and do not commit automatically.
Return verification evidence and the recommended next prompt.
```

## Tracker Publication

After confirmation, create or update the item through the configured integration when available. Otherwise return a tracker-ready title and body. The tracker payload should be concise and link repository artifacts when the tracker can access them; it must not copy implementation details or temporary analysis.

## Response

Return:

- Final ID, type, tracker status, and local contract path.
- Concise tracker title and publication result.
- Delivery route and reason.
- The next skill name.
- The complete copy-ready first next prompt.
