# BMAD Work Item Workflow

Use one adaptive lifecycle for product refinement and delivery:

```text
Actionable intent / tracker Work Item -> Build (investigate, implement, verify, review, repair) -> Close
```

Start an actionable Feature, Issue, or Bug directly with `bmad-build`, supplying a tracker URL/ID, local path, pasted requirement, or explicit intent. BMAD 6.12.1 investigates first and then chooses the required ceremony; a simple change can finish in one Build run. A local `work-item.md` is optional. When present, its Scope, Non-Goals, Acceptance Criteria, Fixed Decisions, and approved design references bind delivery.

Use `bmad-publish-work-item` for creation, Request qualification, unclear scope, observable acceptance, product decisions, decomposition, or tracker synchronization. It refines product intent without duplicating Build implementation investigation.

The configured tracker owns identity, hierarchy, priority, assignment, and status. Repository artifacts hold temporary delivery context while the item is open.

## Item Types

| Semantic type | Purpose | Delivery behavior |
| --- | --- | --- |
| Module | Long-lived product area | Contains Features or Issues; not built directly |
| Request | Demand requiring qualification | Accept, reject, defer, or convert before delivery |
| Feature | Cohesive business or user capability | Build directly when cohesive; otherwise create child Issues |
| Issue | Independently deliverable change | Standard Build unit |
| Bug | Incorrect existing behavior | Build with severity-specific safeguards |
| Spike | Time-boxed investigation | End with evidence and a decision, not production implementation |

Names may be mapped in `_bmad/custom/project-workflow.toml`, but these six semantic roles remain distinct.

## Core Rules

- Apply KISS and load only context relevant to the current Work Item.
- Ask questions only for observed product gaps, contradictions, or risky assumptions.
- Keep files, functions, local abstractions, implementation order, and technical test structure developer-owned unless a fixed decision constrains them.
- Run design work only when `design-impact` is not `none`.
- Run specification, research, architecture, and specialist verification only when their trigger is present.
- Use `bmad-build` for implementation; commit, push, or create a PR only with explicit user authorization.
- Inherit upstream independent review and repair. Standalone code review or verification audits require an external-Build change, explicit request, or concrete additional risk.
- Return a concrete next prompt after every workflow wave.
- Use `bmad-close-work-item` to verify, transfer durable knowledge, and request approval before cleanup.

## Daily Actions

| Situation | Normal action |
| --- | --- |
| Existing actionable Issue | `bmad-build` |
| Existing actionable Bug | `bmad-build` |
| Existing cohesive Feature | `bmad-build` |
| New/unclear item or Request | `bmad-publish-work-item` / qualification |
| Module | Define child Feature/Issue |
| Spike | `bmad-deep-recon` targeted research, then decision and closeout |
| Unclear acceptance/behavior | `bmad-spec` |
| UX/design change | `bmad-ux` + Figma approval |
| Cross-unit architecture risk | `bmad-architecture` |
| Human walkthrough | `bmad-walkthrough` |
| Code written outside Build or explicit extra review | Optional `bmad-code-review` |
| Independent verification audit outside Build | Optional `bmad-review-verification-gap` |
| Completed delivery | `bmad-close-work-item` |

## References

- [Adaptive routing](./routing.md)
- [Artifact naming](./artifact-naming.md)
- [Design lifecycle](./design-lifecycle.md)
- [Work Item templates](./templates/index.md)
