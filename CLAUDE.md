# Claude Code Guidance

Use BMAD as the primary workflow. Start with `bmad-help`.

For new projects, use this repo as the technical foundation and let BMAD drive
product discovery, PRDs, architecture, and story creation.

For existing repos, run host-side adoption from the boilerplate repo, then open
the target repo in its own devcontainer:

```bash
/home/abdalem/projects/boilerplate/scripts/adopt-stack.sh /path/to/existing-repo
```

Use `docs/stack/` for stack-specific conventions.
