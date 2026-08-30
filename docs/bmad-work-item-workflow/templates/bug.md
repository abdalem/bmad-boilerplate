# Bug Template

```markdown
# <ID>: <Bug summary>

## Work Item Metadata

- Type: Bug
- Tracker: <tracker or local>
- Tracker URL: <URL or None>
- Parent: <Module or Feature ID, or None>
- Severity: <Critical | High | Normal | Low>
- Design impact: <none | screen-change | design-system-change>

## Incorrect Behavior And Impact

- Actual behavior: <what happens>
- Expected behavior: <what should happen>
- User or business impact: <impact>

## Evidence

- Reproduction: <steps, signal, or Unknown>
- Environment: <where observed>
- Logs or references: <links or None>

## Scope And Non-Goals

- Scope: <minimum safe correction>
- Non-goals: <explicit exclusion>

## Acceptance And Regression Criteria

- [ ] <Incorrect behavior no longer occurs or detection signal clears>
- [ ] <Relevant surrounding behavior remains correct>

## Fixed Decisions

- <Binding product, compatibility, rollout, or safety decision, or None>

## Critical Safeguards

- Rollback: <required for Critical, otherwise as needed>
- Monitoring: <required for Critical, otherwise as needed>
- Production verification: <required for Critical, otherwise as needed>

## Design References

- Figma: <file and node links or None>
- Approved references: <paths or None>

## Delivery Route

- Route: <Build directly | Investigate | Design | Spec>
- Reason: <Evidence supporting the route>

## Next Action

- Skill: <skill name>
- Reason: <why this action is next>

## Next Prompt

<Immediately runnable agent-neutral prompt.>
```
