# Adaptive Routing

Routing is evidence-based. Do not classify work by size before choosing the next action.

## Default Route

A clear, cohesive Feature, Issue, or Bug uses:

```text
bmad-publish-work-item -> bmad-build -> bmad-close-work-item
```

Publication and Build may add focused questions when required facts are missing. They must not add preparation merely because a change touches several files.

## Route Triggers

| Evidence or uncertainty | Next wave |
| --- | --- |
| Scope and behavior are sufficiently clear | `bmad-build` |
| Behavior, boundaries, or acceptance details need focused elaboration | `bmad-spec` |
| User flow, screen behavior, or visual system changes | UX and Figma approval |
| A product or customer decision blocks scope | Product or market research |
| A domain, regulatory, or technology decision blocks delivery | Targeted domain or technical research |
| Independently delivered units could make incompatible decisions | Architecture |
| A Feature is not one cohesive independently verifiable change | Create external child Issues |
| Material security, data, accessibility, performance, or regression risk | Targeted verification or independent review |

At the end of each wave, evaluate current evidence and emit only the next concrete prompt. Do not generate a speculative chain of detailed prompts upfront.

## Type Boundaries

- Module routes to child Feature or Issue definition.
- Request routes to qualification and conversion when accepted.
- Feature routes to Build only when cohesive; otherwise it routes to child Issue publication.
- Issue routes to preparation only when a trigger is present, otherwise directly to Build.
- Bug routes to Build after available evidence, expected behavior, impact, and severity are clear. Critical severity also requires rollback, monitoring, and production verification.
- Spike routes to focused research and closes after recording evidence and a decision.

## Contract Changes

Delivery may refine implementation details without republishing. Stop and return to `bmad-publish-work-item` when implementation would change scope, non-goals, acceptance criteria, fixed decisions, design behavior, public contracts, or material rollout risk.
