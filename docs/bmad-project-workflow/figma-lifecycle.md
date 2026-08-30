# Figma Lifecycle

Figma is the editable source for visual product design.

## During Project Inception

For a visual product, `bmad-start-project` derives a screen and flow inventory
from approved product artifacts, configures the durable screen registry, and
routes initial UX work. Design-dependent coding waits for approved Figma file
and node links.

The design covers relevant default, loading, empty, error, disabled, success,
responsive, and accessibility-sensitive states. Missing Figma access blocks
only design-dependent work; product, API, domain, research, and non-visual work
may continue.

## During Delivery

Every Work Item records one `design-impact` value:

- `none`
- `new-screen`
- `screen-change`
- `design-system-change`

An agent or human designer may update Figma. The Work Item records the approved
references used for implementation. Closeout updates the durable screen
registry and visual references before temporary ticket artifacts are removed.

See `docs/bmad-work-item-workflow/design-lifecycle.md` for the delivery-level
rules.
