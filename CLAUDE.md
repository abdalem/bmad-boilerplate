# Claude Code Guidance

Use `bmad-start-project` for an unconfigured boilerplate clone and
`bmad-update-project` before adopting or modernizing an existing repository.
Start normal ticket work in an established project with
`bmad-publish-work-item`. Use `bmad-workflow-setup` only for onboarding or
explicit reconfiguration.

For new projects, use this repo as the technical foundation and let BMAD drive
product discovery and adaptive Work Item delivery.

For existing repos, run host-side adoption from the boilerplate repo, then open
the target repo in its own devcontainer:

```bash
/home/abdalem/projects/boilerplate/scripts/adopt-stack.sh /path/to/existing-repo
```

Use `docs/bmad-project-workflow/` for repository-level scenarios,
`docs/stack/` for stack-specific conventions, and
`docs/bmad-work-item-workflow/` for delivery. Use `bmad-build` for implementation
and never commit automatically.
