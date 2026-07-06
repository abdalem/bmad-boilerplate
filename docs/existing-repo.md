# Existing Repo Procedure

Use this when a repo already exists and should adopt the devcontainer, BMAD
bootstrap, stack docs, and technical conventions from the boilerplate.

Run adoption from the host. Do not open the boilerplate devcontainer and try to
modify another repo from inside it.

The pnpm shortcuts require Node `>=20`. If your host is still on Node 18, either
switch Node first or run `scripts/adopt-stack.sh` directly.

## 1. Dry Run

```bash
cd /home/abdalem/projects/boilerplate
pnpm adopt:repo:dry -- /home/abdalem/projects/existing-repo
```

## 2. Adopt Non-Destructively

```bash
pnpm adopt:repo -- /home/abdalem/projects/existing-repo
```

This command:

- Copies missing devcontainer and stack files.
- Adds `scripts/install-bmad.sh`.
- Adds `pnpm bmad:install`.
- Writes `.boilerplate/adoption/report.md`.
- Writes conflicting generated files to `.boilerplate/adoption/proposed/`
  instead of overwriting.
- Tries BMAD install immediately only when host Node is `>=20.12`.

## 3. Review The Report

```bash
cd /home/abdalem/projects/existing-repo
cat .boilerplate/adoption/report.md
find .boilerplate/adoption/proposed -type f
```

Manually compare proposed files before accepting them.

## 4. Force Only If You Mean It

Force mode overwrites conflicting stack files and backs up originals under
`.boilerplate/adoption/backups/`.

```bash
cd /home/abdalem/projects/boilerplate
pnpm adopt:repo:force -- /home/abdalem/projects/existing-repo
```

## 5. Open The Target Repo Devcontainer

```bash
cd /home/abdalem/projects/existing-repo
code .
```

Reopen in the devcontainer. If BMAD did not install on the host:

```bash
pnpm bmad:install
```

## 6. Start BMAD For An Existing Repo

In your AI tool:

```text
bmad-help
```

For existing repos, generate BMAD project context before implementation work.
The context should capture current architecture, stack, conventions, docs,
testing, and deployment assumptions.

## 7. Continue Implementation

Use BMAD artifacts for planning and stories. Use `docs/stack/` for the technical
implementation conventions copied from this boilerplate.
