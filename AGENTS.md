# Agent Guidance

Use BMAD as the primary planning and delivery workflow.

Start with `bmad-help` whenever the next step is unclear. BMAD owns product
discovery, PRDs, architecture, stories, and workflow sequencing. This repo owns
technical stack conventions, devcontainer setup, templates, and deployment
recipes.

For existing repos, prefer host-side adoption:

```bash
/home/abdalem/projects/boilerplate/scripts/adopt-stack.sh /path/to/existing-repo
```

Then work from the target repo's own devcontainer. Do not adapt an existing repo
from a separate boilerplate devcontainer.

The old repo-local `project-brainstorming` and `ticket-refinement` skills are
legacy fallback only. Prefer BMAD workflows and BMAD-generated artifacts.
