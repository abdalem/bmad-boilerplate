Generate ticket artifacts for {{PROJECT_NAME}}.

PRODUCT_SPEC:
{{PRODUCT_SPEC}}

Project brief:
{{PROJECT_BRIEF}}

Manifest:
{{MANIFEST_JSON}}

Return JSON with `tickets` array entries containing:
- `path`
- `markdown`

Required ticket outputs:
- docs/tickets/template.md
- docs/tickets/V1/00-foundations.md
- at least 2 additional docs/tickets/V1/*.md files
- docs/tickets/V2/00-advanced.md

Rules:
- Ticket markdown should follow canonical section structure.
- Keep IDs consistent and deterministic.
- Create tickets only from PRODUCT_SPEC content; do not invent unrelated domains.
- Keep ticket scope aligned with the package topology and provider choices in the manifest when deployment is relevant.
