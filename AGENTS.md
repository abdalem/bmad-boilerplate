# Agent Guidance

Use BMAD as the primary planning and delivery workflow.

Use `bmad-start-project` for an unconfigured boilerplate clone. It owns technical
selection, product import or direct discovery, initial Figma routing, and the
first actionable Work Item. Use `bmad-update-project` before adopting or
modernizing an existing repository, especially when its legacy runtime must be
proven first.

Start normal ticket work in an established project with
`bmad-publish-work-item`. Use `bmad-workflow-setup` separately for onboarding or
explicit reconfiguration.

For existing repos, prefer host-side adoption:

```bash
/home/abdalem/projects/boilerplate/scripts/adopt-stack.sh /path/to/existing-repo
```

Then work from the target repo's own devcontainer. Do not adapt an existing repo
from a separate boilerplate devcontainer.

Project scenarios follow `docs/bmad-project-workflow/`. Work Item delivery
follows `docs/bmad-work-item-workflow/` and the project policy. Use `bmad-build`
for implementation and never commit automatically.
