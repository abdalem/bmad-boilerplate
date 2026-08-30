# Artifact Naming

Normalize the tracker or local ID to lowercase for paths while preserving the original ID in content.

```text
APP-001
|-- _bmad-output/planning-artifacts/app-001/
|   |-- work-item.md
|   |-- spec.md                  # only when routed
|   `-- ux.md                    # only when routed
`-- _bmad-output/implementation-artifacts/app-001/
    |-- build-plan.md            # only when useful
    `-- verification.md          # only when useful
```

Do not create empty placeholder artifacts. The Work Item contract is the only required file while a deliverable item is open.

Figma node links belong in `work-item.md`. Approved screen references and the screen registry use the durable paths configured under `[design]` in `_bmad/custom/project-workflow.toml`.

During closeout, transfer lasting knowledge into maintained project documentation, then propose removal of the ticket-scoped planning and implementation folders. Delete nothing without explicit approval.
