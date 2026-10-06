# Artifact Naming

Normalize the tracker or local ID to lowercase for paths while preserving the original ID in content.

```text
APP-001
|-- _bmad-output/planning-artifacts/app-001/
|   |-- work-item.md             # optional, when refinement/publication occurred
|   |-- spec.md                  # only when routed
|   `-- ux.md                    # only when routed
`-- _bmad-output/implementation-artifacts/app-001/
    |-- build-plan.md            # only when useful
    `-- verification.md          # only when useful
```

Do not create empty directories or placeholder artifacts. A local Work Item contract is optional: Build uses tracker context or explicit intent when it is absent. Build creates only the spec and evidence its adaptive route requires. Keep outputs ticket-scoped when identity exists; explicit intent without tracker identity may use upstream Build spec locations. `_bmad-output` is temporary working memory; durable knowledge belongs in maintained documentation.

Record Figma node links in the existing `work-item.md`, tracker intent, or Build spec; do not create a contract solely to store them. Approved screen references and the screen registry use the durable paths configured under `[design]` in `_bmad/custom/project-workflow.toml`.

During closeout, transfer lasting knowledge into maintained project documentation, then propose removal of the ticket-scoped planning and implementation folders. Delete nothing without explicit approval.
