# BMAD Project Workflow

This workflow has two repository-level entry points:

- `bmad-start-project`: configure and define a product after cloning the
  boilerplate.
- `bmad-update-project`: compare an existing repository with the latest public
  boilerplate and apply approved upgrade waves.

Once project inception or adoption is complete, use
`bmad-build` for actionable Features, Issues, and Bugs, and `bmad-publish-work-item` for creation or refinement. Work Items follow the adaptive
lifecycle in `docs/bmad-work-item-workflow/`.

## New Product

1. Invoke `bmad-start-project`.
2. Configure archetypes, package topology, and deployment providers.
3. Establish concise governance with `bmad-project-context setup` and stable policy with `bmad-workflow-setup`.
4. Import `product-input/` or run direct agent discovery.
5. Challenge and approve the product boundaries.
6. Route only the BMAD product, research, UX, and architecture work that is
   actually needed.
7. Establish Figma references for design-dependent work.
8. Confirm the initial work map and publish the first actionable Work Item.

See [new-project.md](new-project.md) and
[product-handoff.md](product-handoff.md).

## Existing Repository

1. Install or invoke `bmad-update-project` in the target repository.
2. Prove the repository under its current supported stack.
3. Compare it with the latest public boilerplate without merging histories.
4. Review the dry-run reports.
5. Apply one explicitly approved upgrade wave.
6. Reconcile governance with `bmad-project-context adopt` and discover stable workflow policy.
7. Verify before selecting another wave.

See [existing-repository.md](existing-repository.md).

Neither scenario commits automatically.
