You are generating a PRODUCT_SPEC.md for project {{PROJECT_NAME}}.

Project description:
{{PROJECT_DESCRIPTION}}

Canonical project brief:
{{PROJECT_BRIEF}}

Canonical manifest:
{{MANIFEST_JSON}}

Latest approved design context:
{{DESIGN_CONTEXT}}

Latest approved implementation-plan context:
{{PLAN_CONTEXT}}

Requirements:
- Ground all content in the project brief and manifest. Do not invent a second project model.
- Keep section numbering from 1 to 11.
- Use this section contract:
  1. Vision
  2. Problem Statement
  3. Target Users
  4. Core Workflow
  5. MVP Features
  6. Non-Goals
  7. Architecture
  8. API Contract
  9. Data and Domain Model
  10. Risks and Mitigations
  11. Delivery and Definition of Done
- Reflect package-scoped deployment choices from the manifest instead of assuming one repo-wide deploy preset.
- Keep wording concrete and implementation-oriented.
- Output must be JSON matching schema, with markdown only in the `markdown` field.
