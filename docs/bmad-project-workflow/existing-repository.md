# Existing Repository Workflow

Install `bmad-update-project` directly from the public boilerplate when the
target has not adopted the workflow pack yet:

```bash
npx skills add https://github.com/abdalem/bmad-boilerplate/tree/main/.boilerplate/bmad-workflow-pack/internal-skills/bmad-update-project -a codex -a claude-code -y
```

Then invoke:

```text
bmad-update-project
```

## Baseline Before Modernization

The skill identifies the repository's current runtime, package manager,
frameworks, workspaces, services, environment, and verification commands. It
records evidence that the old version installs, starts, and exercises one
representative path.

Runtime and framework modernization must not begin until the baseline passes.
You may explicitly accept a pre-existing failure, but the failure, impact, and
missing evidence remain visible in every affected upgrade wave.

## Comparison Source

The skill resolves the boilerplate source in this order:

1. An explicit URL supplied in the request.
2. A Git remote named `boilerplate`.
3. `https://github.com/abdalem/bmad-boilerplate.git`.

It clones the source into a temporary directory and never merges its Git
history into the target.

## Upgrade Waves

1. Agent workflow and documentation.
2. Devcontainer and development tooling.
3. Package topology and monorepo configuration.
4. Framework and runtime upgrades, one workspace at a time.
5. Package-scoped deployment changes.

Only one approved wave is applied at a time. Adoption dry runs place conflicts
under `.boilerplate/adoption/proposed/`. Force mode requires explicit approval
and keeps timestamped backups.

Network or source failures leave the target unchanged. The skill never commits
automatically.
