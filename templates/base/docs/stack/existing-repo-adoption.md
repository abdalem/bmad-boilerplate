# Existing Repo Adoption

Recommended order:

1. Run adoption from the host:
   `pnpm adopt:repo -- /path/to/existing-repo`.
2. Review `.boilerplate/adoption/report.md`.
3. Review any proposed files under `.boilerplate/adoption/proposed/`.
4. Open the existing repo in its own devcontainer.
5. Run `pnpm bmad:install` if BMAD was not installed during adoption.
6. Run `bmad-help`.
7. Generate BMAD project context before implementation work.

The devcontainer belongs to the repo being worked on. Do not work on an existing
repo from a separate boilerplate devcontainer.

Useful host-side commands from the boilerplate repo:

```bash
pnpm adopt:repo:dry -- /path/to/existing-repo
pnpm adopt:repo -- /path/to/existing-repo
pnpm adopt:repo:force -- /path/to/existing-repo
```
