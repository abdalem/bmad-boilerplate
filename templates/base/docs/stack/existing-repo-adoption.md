# Existing Repo Adoption

Recommended order:

1. Install and invoke `bmad-update-project` in the existing repository.
2. Prove the old supported stack and review the generated update waves.
3. After approving the workflow or tooling wave, run adoption from the host:
   `pnpm adopt:repo -- /path/to/existing-repo`.
4. Review `.boilerplate/adoption/report.md` and proposed conflicts.
5. Open the existing repo in its own devcontainer.
6. Run `pnpm bmad:install` if BMAD was not installed during adoption.
7. Use `bmad-project-context adopt` to maintain concise repository instructions.
8. Start actionable ticket work with `bmad-build`, then `bmad-close-work-item`;
   use `bmad-publish-work-item` to create or refine unclear items.
9. Run `bmad-workflow-setup` separately only for onboarding or explicit policy
   reconfiguration.

The devcontainer belongs to the repo being worked on. Do not work on an existing
repo from a separate boilerplate devcontainer.

Useful host-side commands from the boilerplate repo:

```bash
pnpm adopt:repo:dry -- /path/to/existing-repo
pnpm adopt:repo -- /path/to/existing-repo
pnpm adopt:repo:force -- /path/to/existing-repo
```
