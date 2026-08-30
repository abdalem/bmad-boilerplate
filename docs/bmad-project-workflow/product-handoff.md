# Product Handoff Contract

Web sessions and direct agent discovery produce the same repository-root
directory:

```text
product-input/
|-- 00-handoff-manifest.md
|-- 01-product-brief.md
|-- 02-business-and-market.md
|-- 03-product-requirements.md
|-- 04-domain-and-data.md
|-- 05-risks-and-open-questions.md
`-- 06-initial-work-map.md
```

An independently reviewed bundle contains all seven replacement files plus
`REVIEW.md`. Never combine files from the original and reviewed directories.

## Responsibilities

- The manifest declares project identity, bundle status, model, language,
  inventory, and known omissions.
- The product brief defines problem, users, value, outcomes, scope, and
  non-goals.
- Business and market defines the economic and adoption assumptions.
- Product requirements defines capabilities and critical flows without code
  tasks.
- Domain and data defines language, entities, ownership, sensitivity, and
  boundaries.
- Risks and open questions keeps uncertainty explicit.
- The work map proposes outcome-oriented Modules, Features, and Issues. They
  are not tracker items until refined and approved.
- `REVIEW.md` records material review decisions and confidence limits.

## Inspection

`bmad-start-project` uses its bundled read-only inspector before reading the
bundle as evidence. The inspector validates inventory, bundle status, headings,
and project identity. It never approves product content or writes BMAD
artifacts.

Cross-file product contradictions are resolved conversationally, one question
at a time. Imported files remain source evidence; approved maintained artifacts
are created or updated through the relevant BMAD workflows.
