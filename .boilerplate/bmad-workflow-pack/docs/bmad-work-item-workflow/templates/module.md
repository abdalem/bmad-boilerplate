# Module Template

```markdown
# <ID>: <Module name>

## Work Item Metadata

- Type: Module
- Tracker: <tracker or local>
- Tracker URL: <URL or None>
- Parent: None

## Purpose

<Product area, users, and business responsibility.>

## Boundaries

### Included

- <Capability area>

### Excluded

- <Neighboring responsibility>

## Fixed Decisions

- <Binding product, ownership, platform, or public-contract boundary, or None>

## Success Measures

- <Observable module-level outcome>

## Child Model

- Allowed child types: Feature, Issue
- Existing children: <links or None>

## Delivery Route

- Outcome: Group and govern child Work Items; do not build this Module directly.

## Next Action

- Skill: bmad-publish-work-item
- Reason: Define the first independently deliverable child Work Item.

## Next Prompt

Define and publish the next child Feature or Issue for <ID>. Preserve this Module's boundaries and fixed decisions.
```
