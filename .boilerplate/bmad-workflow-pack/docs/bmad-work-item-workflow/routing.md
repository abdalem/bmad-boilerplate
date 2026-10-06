# Adaptive Routing

Routing is evidence-based. Do not classify work by size before choosing the next action.

## Default Route

A clear, cohesive Feature, Issue, or Bug uses:

```text
Actionable Work Item / intent -> bmad-build -> bmad-close-work-item
```

No local `work-item.md` is required. Build investigates first, chooses a minimal spec or deeper preparation as evidence requires, then implements, verifies, reviews, and repairs. Do not classify implementation complexity before Build.

For new or vague intent, first use `bmad-publish-work-item` for product refinement/publication; use `bmad-spec` when focused acceptance or behavior elaboration remains necessary. Publication does not investigate files or implementation sequence unless they expose a product contradiction.

Build inherits upstream review layers: Blind Hunter, Edge Case Hunter, and Verification Gap Reviewer; the upstream oneshot route has its own lighter review configuration. The boilerplate does not copy or replace either configuration. Normal completion routes to Close without mandatory standalone code review.

## Route Triggers

| Evidence or uncertainty | Next wave |
| --- | --- |
| Existing Feature, Issue, or Bug has sufficiently clear scope and behavior | `bmad-build` directly |
| New tracker item, Request, or vague product intent | `bmad-publish-work-item` |
| Behavior, boundaries, or acceptance details need focused elaboration | `bmad-spec` |
| User flow, screen behavior, or visual system changes | UX and Figma approval |
| A product or customer decision blocks scope | `bmad-deep-recon` (market) |
| A domain, regulatory, or technology decision blocks delivery | `bmad-deep-recon` (domain or technical) |
| Independently delivered units could make incompatible decisions | Architecture |
| A Feature is not one cohesive independently verifiable change | Create external child Issues |
| Material security, data, accessibility, performance, or regression risk | Targeted verification or independent review |

At the end of each wave, evaluate current evidence and emit only the next concrete prompt. Do not generate a speculative chain of detailed prompts upfront.

## Type Boundaries

- Module routes to child Feature or Issue definition.
- Request routes to qualification and conversion when accepted.
- Feature routes to Build only when cohesive; otherwise it routes to child Issue publication.
- Issue routes to preparation only when a trigger is present, otherwise directly to Build.
- Bug uses Build -> Close. Build establishes reproduction, root cause, the minimum safe fix, and regression evidence. Critical severity additionally requires minimum safe restoration, rollback readiness, monitoring/detection status, and production/rollout verification; record unavailable evidence explicitly.
- Spike routes to focused research and closes after recording evidence and a decision, or creates follow-up Features, Issues, or Bugs. It enters production Build only after explicit conversion.
- Non-cohesive Features decompose into child Issues in the configured tracker. Do not create a parallel BMAD story or sprint hierarchy.

## Contract Changes

Delivery may refine implementation details without republishing. Stop and return to `bmad-publish-work-item` when implementation would change scope, non-goals, acceptance criteria, fixed decisions, design behavior, public contracts, or material rollout risk.
