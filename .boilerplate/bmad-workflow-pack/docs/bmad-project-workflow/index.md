# BMAD Project Workflow

This workflow has two repository-level entry points:

- `bmad-start-project`: configure and define a product after cloning the
  boilerplate.
- `bmad-update-project`: compare an existing repository with the latest public
  boilerplate and apply approved upgrade waves.

Once project inception or adoption is complete, use
`bmad-publish-work-item` for normal delivery. Work Items follow the adaptive
lifecycle in `docs/bmad-work-item-workflow/`.

## New Product

1. Invoke `bmad-start-project`.
2. Configure archetypes, package topology, and deployment providers.
3. Import `product-input/` or run direct agent discovery.
4. Challenge and approve the product boundaries.
5. Route only the BMAD product, research, UX, and architecture work that is
   actually needed.
6. Establish Figma references for design-dependent work.
7. Confirm the initial work map and publish the first actionable Work Item.

See [new-project.md](new-project.md) and
[product-handoff.md](product-handoff.md).

## Existing Repository

1. Install or invoke `bmad-update-project` in the target repository.
2. Prove the repository under its current supported stack.
3. Compare it with the latest public boilerplate without merging histories.
4. Review the dry-run reports.
5. Apply one explicitly approved upgrade wave.
6. Verify before selecting another wave.

See [existing-repository.md](existing-repository.md).

Neither scenario commits automatically.
