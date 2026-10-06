# Work Item Design Lifecycle

For design-dependent work, determine the design-impact value in the current intent/spec or existing Work Item contract:

- `none`
- `new-screen`
- `screen-change`
- `design-system-change`

Only the last three activate the design gate.

## Design Gate

Before Build, confirm:

1. The affected user flow and screens are identified.
2. Default, loading, empty, error, disabled, and success states are defined when relevant.
3. Responsive behavior and supported breakpoints are explicit.
4. Accessibility-sensitive interactions are explicit.
5. Approved Figma file and node links are recorded in the tracker intent, Build spec, or existing `work-item.md`.
6. Approved visual references are stored under the configured durable reference path.
7. The screen registry points to the current Figma nodes and reference files.

Figma is the editable design source. The Work Item records intent and binding decisions. Git-managed visual references capture the approved implementation baseline for the item. Running code remains the behavioral source after implementation.

Design may be created or updated by an agent or a human designer. Material design changes must be associated with a Work Item. A non-visual item is never blocked by missing Figma configuration.

## Verification And Closeout

Compare the implementation with approved Figma references and responsive states. Before ticket artifacts are removed, update the durable screen registry and references when the design changed.
