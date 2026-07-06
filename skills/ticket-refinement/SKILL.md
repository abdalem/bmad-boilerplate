---
name: ticket-refinement
description: "Refine a generated project ticket before implementation. Use when the user gives a ticket number or asks to improve docs/tickets: validate business value, scope, dependencies, acceptance criteria, technical notes, test plan, and whether the ticket should be split or renumbered before coding starts."
---

# Ticket Refinement

Use this skill after `project-brainstorming` generated docs and tickets. Refine one ticket or one tightly related ticket group before implementation. The output is an updated ticket file and, when needed, an updated ticket map. Do not implement code.

## Operating Rules

- Work one ticket number at a time unless the user explicitly asks for a group.
- Ask clarifying questions before rewriting when product intent, scope, or acceptance criteria are weak.
- Challenge tickets from product, business, UX, technical, testability, and dependency angles.
- Prefer splitting oversized tickets over creating vague mega-tickets.
- Preserve existing ticket IDs when possible. Renumber only when the sequence is confusing or dependencies require it.
- Stop after the ticket is ready for implementation. Do not code.

## Inputs To Read

From the target project, inspect only the files needed for the selected ticket:

```text
.boilerplate/project-brief.md
.boilerplate/project-manifest.json
PRODUCT_SPEC.md
docs/00-overview.md
docs/01-business-model.md
docs/02-users-and-workflows.md
docs/03-features.md
docs/04-architecture.md
docs/05-acceptance-tests.md
docs/tickets/template.md
docs/tickets/V1/*.md
docs/tickets/V2/*.md
docs/superpowers/specs/*.md
docs/superpowers/plans/*.md
```

If the user gives a ticket ID such as `V1-20`, search `docs/tickets` for that ID or filename pattern. If no exact match exists, list likely matches and ask which one to refine.

## Step 1: Understand The Ticket

Summarize the ticket in plain language:

- Intended user/business outcome.
- Current scope.
- Dependencies.
- Acceptance criteria.
- Technical/API/UI areas touched.
- Known open questions.

Then identify weaknesses:

- Vague business value.
- Missing user story.
- Scope too broad or too narrow.
- Hidden dependency.
- Unclear data model or API contract.
- Missing error/empty/permission states.
- Weak acceptance criteria.
- Missing tests.
- Conflict with product brief/spec.

## Step 2: Ask Targeted Questions

Ask one question at a time when needed. Prioritize questions in this order:

1. What user outcome proves the ticket succeeded?
2. What is explicitly out of scope?
3. What data or integration is required?
4. What edge case would make this fail in production?
5. What test should block merging?

If the ticket is already clear enough, do not over-question. State assumptions and proceed.

## Step 3: Decide Whether To Split

Recommend splitting when:

- The ticket contains unrelated user outcomes.
- It spans foundation work plus visible UX plus integration complexity.
- It cannot be tested end-to-end with one coherent acceptance path.
- It blocks too many downstream tickets.

When splitting, propose the new ticket IDs and titles before editing. Example:

```text
V1-20-auth-foundation
V1-21-login-and-session-ux
V1-22-role-gated-access
```

Ask for approval before renumbering or creating new ticket files.

## Step 4: Rewrite The Ticket

A refined implementation-ready ticket should use this structure:

```md
# V1-XX - Ticket Title

## Goal

One concise outcome.

## Business / User Value

Why this matters and who benefits.

## Context

Relevant brief/spec/docs references and constraints.

## Scope

- Included item

## Out Of Scope

- Explicit non-goal

## User Stories

- As a <user>, I can <action> so that <outcome>.

## Functional Requirements

- Requirement

## Data Model / Contracts

- Entity, field, schema, API, event, or no impact.

## UX / Flow

- Screen/state/interaction, including empty, loading, error, and permission states.

## Technical Notes

- Package/module boundaries.
- Relevant deployment/provider constraints.
- Integration or background job notes.

## Dependencies

- Depends on `V1-XX`, or none.

## Acceptance Criteria

- Given/when/then or concrete pass/fail criteria.

## Test Plan

- Unit tests.
- Integration/API tests.
- E2E or acceptance tests.

## Open Questions

- Question, or `None`.
```

Keep the ticket concise enough for an implementation agent to hold in context, but specific enough to prevent guesswork.

## Step 5: Update Indexes And Maps

If the project has any of these files, update them when ticket IDs, titles, dependencies, or milestones change:

```text
docs/tickets/V1/00-foundations.md
docs/tickets/implementation-plan-v1-v2.md
docs/05-acceptance-tests.md
docs/superpowers/plans/*.md
```

Do not update unrelated roadmap files.

## Completion Criteria

Finish by reporting:

- Ticket file(s) updated.
- Any split/renumbering performed.
- Remaining open questions.
- Whether the ticket is ready for implementation.
- Suggested next ticket to refine.

If the ticket is not ready, say exactly what blocks it.
