# Product Definition Web Prompt

Paste the prompt below at any point in an ongoing ChatGPT or Claude web
conversation, including midway through brainstorming or at its end. It captures
what you have already discussed and fills the remaining gaps before export.
You can also use it in a new session by supplying your idea or previous notes.

```text
Act as a rigorous product strategist, business analyst, and domain modeler.
Use our existing conversation to produce a complete evidence-aware product
handoff for an AI-assisted software project. Continue from what we have already
discussed; do not restart discovery or make me repeat established information.

First read the conversation and any supplied notes available to you. Identify
the product this handoff should cover; if several products were discussed and
the intended focus is unclear, ask which one. Use only context relevant to the
selected product. Briefly summarize the current understanding, separating:
- facts and decisions I have confirmed, including technical constraints;
- suggestions and tentative ideas that have not been accepted;
- assumptions, conflicting statements, and unanswered questions.

Respect later explicit decisions that supersede earlier ones. Do not revive
rejected ideas or treat your own suggestions as my decisions. If notes and the
conversation conflict and their authority or chronology is unclear, ask which
governs; do not assume newly supplied notes supersede an explicit decision.
Preserve supporting sources where available. Agreement with an unsupported
external claim does not verify it: mark it as an assumption to validate.
If earlier context is unavailable, say what is missing and ask for the relevant
notes; do not claim to have read it. In a new session, start from the idea or
notes I supply.

Then ask exactly one unresolved question at a time, using my answers to refine
the definition. Challenge weak assumptions and resolve material contradictions.
Ask only about gaps that matter; reuse sufficient existing evidence instead of
repeating an interview checklist. Before producing files, ensure the definition
covers:

- target users, buyers, and affected stakeholders;
- the current problem and existing alternatives, including doing nothing;
- value proposition and measurable customer and business outcomes;
- business model, pricing assumptions, acquisition, activation, and retention;
- product scope, non-goals, release boundaries, and material edge cases;
- critical user and operational flows;
- domain language, core entities, ownership, lifecycle, and sensitive data;
- integrations and external ownership boundaries;
- commercial, regulatory, operational, design, security, and technical risks;
- assumptions, evidence, open questions, and invalidation conditions;
- an outcome-oriented initial map of Modules, Features, and independently
  deliverable Issues.

Do not force Scrum, Epics, User Stories, Sprints, story points, or S/M/L sizing.
Do not create code tasks, choose files, prescribe internal abstractions, or
invent facts. Mark uncertainty explicitly.

When you believe the product boundaries are coherent, present a concise final
checkpoint covering problem, users, business outcome, scope, non-goals, major
decisions, risks, and release boundary. Wait for my explicit approval.

After approval, export a directory named product-input containing exactly these
seven Markdown files:

00-handoff-manifest.md
01-product-brief.md
02-business-and-market.md
03-product-requirements.md
04-domain-and-data.md
05-risks-and-open-questions.md
06-initial-work-map.md

Use the exact titles and headings below. Every file must contain the same
concrete "- Project: ..." value.

00-handoff-manifest.md
# Product Handoff Manifest
## Bundle Metadata
## File Inventory
## Known Omissions
Metadata must include Bundle version 1, Bundle status original, Source model,
Output language, and Generated on.

01-product-brief.md
# Product Brief
## Problem
## Users And Buyers
## Value Proposition
## Outcomes
## Scope
## Non-Goals

02-business-and-market.md
# Business And Market
## Business Model
## Market And Alternatives
## Positioning
## Adoption And Distribution
## Pricing Assumptions
## Success Measures

03-product-requirements.md
# Product Requirements
## Capabilities
## Critical Flows
## Constraints
## Outcome Criteria
## Release Boundaries

04-domain-and-data.md
# Domain And Data
## Domain Language
## Core Entities And Relationships
## Ownership And Lifecycle
## Sensitive Data
## Integration Boundaries

05-risks-and-open-questions.md
# Risks And Open Questions
## Confirmed Decisions
## Assumptions
## Risks
## Open Questions
## Invalidation Conditions

06-initial-work-map.md
# Initial Work Map
## Modules
## Features
## Issues
## Dependencies
## Deferred Candidates

The manifest inventory must list all seven filenames and Known Omissions must
say None or name each omission explicitly. Work-map entries are candidates, not
published tracker items.

If this interface supports downloadable files, create the directory or a ZIP.
Otherwise return seven separate fenced Markdown blocks, each preceded by its
exact filename. Do not add REVIEW.md; that belongs only to an independent
reviewed replacement bundle.
```
