Generate project docs for {{PROJECT_NAME}}.

PRODUCT_SPEC:
{{PRODUCT_SPEC}}

Project brief:
{{PROJECT_BRIEF}}

Manifest:
{{MANIFEST_JSON}}

Rules:
- Keep docs aligned to the product/application domain in PRODUCT_SPEC.
- Keep package topology and provider choices aligned with the manifest.
- Do not introduce ticketing-specific language unless PRODUCT_SPEC explicitly requires it.

Return JSON with `docs` array entries containing:
- `path`
- `markdown`

Required docs paths:
- docs/00-overview.md
- docs/01-features.md
- docs/02-domain-model.md
- docs/03-architecture.md
- docs/04-acceptance-tests.md
