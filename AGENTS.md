# Agent Guidance

Use BMAD as the primary planning and delivery workflow.

Use `bmad-start-project` for an unconfigured boilerplate clone. It owns technical
selection, product import or direct discovery, initial Figma routing, and the
first actionable Work Item. Use `bmad-update-project` before adopting or
modernizing an existing repository, especially when its legacy runtime must be
proven first.

Start actionable Features, Issues, and Bugs in an established project with
`bmad-build`, then `bmad-close-work-item`. Use `bmad-publish-work-item` for new
items, qualification, or product refinement; a local contract is optional.
Use `bmad-workflow-setup` for onboarding or explicit policy reconfiguration.
Maintain concise repository governance through `bmad-project-context` setup
(new projects), adopt (existing repositories), and targeted refresh/record/audit.

For existing repos, prefer host-side adoption:

```bash
/path/to/boilerplate/scripts/adopt-stack.sh /path/to/existing-repo
```

Then work from the target repo's own devcontainer. Do not adapt an existing repo
from a separate boilerplate devcontainer.

Project scenarios follow `docs/bmad-project-workflow/`. Work Item delivery
follows `docs/bmad-work-item-workflow/` and the project policy. Use `bmad-build`
for implementation. Commit, push, or create a PR only with explicit user
authorization; carry authorization forward within the agreed scope.
