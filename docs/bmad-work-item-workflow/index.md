# BMAD Work Item Workflow

Use one adaptive lifecycle for product refinement and delivery:

```text
Refine -> Design when needed -> Prepare only what is needed -> Build -> Verify -> Close
```

Start normal work with `bmad-publish-work-item`. It inspects relevant project evidence, challenges the product contract, asks one unresolved question at a time, and emits a ticket-scoped `work-item.md` with the first next prompt.

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
- Use `bmad-build` for implementation and never commit automatically.
- Return a concrete next prompt after every workflow wave.
- Use `bmad-close-work-item` to verify, transfer durable knowledge, and request approval before cleanup.

## References

- [Adaptive routing](./routing.md)
- [Artifact naming](./artifact-naming.md)
- [Design lifecycle](./design-lifecycle.md)
- [Work Item templates](./templates/index.md)
