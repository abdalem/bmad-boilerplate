# New Project Procedure

Use this when the new repo should start from this boilerplate stack.

## 1. Create The Repo

```bash
cd /home/abdalem/projects
cp -a boilerplate my-product
cd my-product
```

Recommended cleanup before first commit:

```bash
rm -rf .git node_modules
git init
```

Open it:

```bash
code .
```

Reopen in the devcontainer when VS Code asks.

## 2. Let Devcontainer Bootstrap

The devcontainer runs:

```bash
corepack enable
pnpm install
pnpm bmad:install
```

If BMAD did not install automatically:

```bash
pnpm bmad:install
```

Use stable BMAD instead of next if needed:

```bash
pnpm bmad:install:stable
```

The pnpm shortcuts require Node `>=20`. The devcontainer uses Node 24.

## 3. Start BMAD

In your AI tool:

```text
bmad-help
```

Follow BMAD for product discovery, PRD, architecture, stories, and
implementation sequencing.

## 4. Pick Stack Shape

Single archetypes create standalone repos:

- `web-app`
- `api`
- `mobile`
- `website`

Shortcut presets create monorepos:

- `web-api`
- `web-api-mobile`
- `website-api`
- `full-product`

Default deployment targets:

- `website` -> Cloudflare Pages.
- `web-app` -> Vercel.
- `api` -> Cloud Run.
- `mobile` -> no deployment target by default.

## 5. Optional Technical Scaffold

BMAD is the main workflow. Use the local CLI only when you want to apply stack
templates directly:

```bash
pnpm boilerplate init --path /home/abdalem/projects/my-product --preset web-api-mobile --deterministic
pnpm boilerplate scaffold --path /home/abdalem/projects/my-product --deterministic --force
```

## 6. First Commit Checklist

```bash
pnpm check
pnpm test:unit
git status
```

Review generated BMAD files and stack files before committing.
