# BMAD compatibility and customization audit

Workflow pack `3.0.0` tests BMAD Method `6.12.1`, replacing pack `2.1.0`
and its BMAD `6.11.0` installation with a floating `latest` default. The August 2026 BMAD 6.11
specifications remain historical context; the [October convergence design](superpowers/specs/2026-10-06-bmad-6.12.1-workflow-convergence-design.md)
supersedes their active routing and version policy.

## Installation policy

| Command | BMAD Method package | Purpose |
| --- | --- | --- |
| `pnpm bmad:install` | `bmad-method@6.12.1` | Tested default |
| `pnpm bmad:install:stable` | `bmad-method@6.12.1` | Same tested baseline |
| `pnpm bmad:install:latest` | `bmad-method@latest` | Explicit upstream stable evaluation |
| `pnpm bmad:install:preview` | `bmad-method@next` | Explicit preview evaluation |

`--installer` and `BMAD_INSTALLER` allow deliberate package overrides. The
installer uses `--no-shims`; managed active assets reference supported skill
names. Validate after any override with `pnpm bmad:validate`.

Version reporting labels the tested version `SUPPORTED`, pre-6.12 releases
`INCOMPATIBLE`, and other or unknown versions `UNTESTED`. Required skills and
module presence are checked separately; missing capabilities fail validation.
The compatibility suite checks customization fields against the audited upstream
schemas. Maintainers run `pnpm test:bmad-compatibility` after installing the
pinned baseline, or set `BMAD_COMPATIBILITY_TARGET` to an isolated installed
fixture when running the full suite. This exercises all managed customization
fields, the four configuration layers, actual Build renderers, and inherited
review definitions. An untested release needs explicit evaluation; a version label alone
cannot prove compatibility.

A baseline bump requires evaluating upstream, running the workflow-pack suite,
adapting managed overrides, updating the pin, and releasing the boilerplate.
Installation and upgrade retain managed-file hashing: unchanged managed files
update, modified files produce review proposals, and force mode keeps backups.
Project policy, personal overrides, historical tickets, completed planning
artifacts, and project-specific AGENTS.md instructions remain governed by their
own preservation rules.

## External dependencies

The tested Skills CLI is `skills@1.7.0`. Its inspected `source#ref` syntax pins
the five declared external skills by source Git commit in `pack.json`:

| Source | Skills | Tested source revision |
| --- | --- | --- |
| `vercel-labs/skills` | `find-skills` | `14cf84aa922cccc7e5b11fee5af9a01b3750fddf` |
| `github/awesome-copilot` | `refactor` | `143a3d976b3c1603cc8932984d5e1f28501cb5fc` |
| `vercel-labs/agent-skills` | `vercel-composition-patterns`, `vercel-react-best-practices`, `web-design-guidelines` | `063bee94c3f4df8453406c830b0a7df0f2860278` |

BMAD's external modules resolve independently of its pinned Method package.
The real baseline install resolved TEA `1.27.2`, CIS `0.3.2`, and WDS `0.4.3`.
The inspected installer exposed a channel selector, without a supported
per-module version pin. Those module resolutions remain a reproducibility
limit: re-evaluate their customization surfaces when they change rather than
assuming the Method pin locks them too.

## Managed customization audit

Every modified core/BMM TOML was compared with the published BMAD 6.12.1
`customize.toml`; TEA overrides were compared with the real installed TEA
`customize.toml`. Only supported fields remain. The following table accounts
for every previous override and new convergence override.

| Customization | Decision | Retained purpose / reason |
| --- | --- | --- |
| `bmad-build.toml` | SIMPLIFY | Optional contract inheritance, semantic/design gates, KISS, AGENTS governance, explicitly authorized Git operations, normal completion to Close |
| `bmad-build-auto.toml` | KEEP (new) | Same governance and optional contract inheritance for explicitly invoked unattended execution |
| `bmad-code-review.toml` | SIMPLIFY | Standalone review scope and optional contract; no duplicate review after Build |
| `bmad-architecture.toml` | SIMPLIFY | Ticket-scoped delivery spine, binding product decisions, external child Issues |
| `bmad-spec.toml` | SIMPLIFY | Optional contract boundaries and ticket-scoped specification |
| `bmad-ux.toml` | SIMPLIFY | Figma integration, approved states, durable registry/reference routing |
| `bmad-brainstorming.toml` | SIMPLIFY | Scoped discovery output; project discovery does not require tracker identity |
| `bmad-forge-idea.toml` | SIMPLIFY | Scoped product challenge output |
| `bmad-product-brief.toml` | SIMPLIFY | Scoped brief output |
| `bmad-prfaq.toml` | SIMPLIFY | Scoped PRFAQ output |
| `bmad-prd.toml` | SIMPLIFY | Scoped requirements output |
| `bmad-qa-generate-e2e-tests.toml` | SIMPLIFY | Ticket-scoped verification summary |
| `bmad-testarch-test-design.toml` | SIMPLIFY | Ticket-scoped specialist test design, optional product sources |
| `bmad-testarch-atdd.toml` | SIMPLIFY | Ticket-scoped acceptance scaffolding, optional product sources |
| `bmad-testarch-automate.toml` | SIMPLIFY | Ticket-scoped automation, optional product sources |
| `bmad-testarch-test-review.toml` | SIMPLIFY | Ticket-scoped specialist verification review, optional product sources |
| `bmad-testarch-nfr.toml` | SIMPLIFY | Ticket-scoped NFR evidence, optional product sources |
| `bmad-testarch-trace.toml` | SIMPLIFY | Ticket-scoped acceptance traceability, optional product sources |
| `bmad-market-research.toml` | REMOVE | Deprecated shim; use supported `bmad-deep-recon` market lens |
| `bmad-domain-research.toml` | REMOVE | Deprecated shim; use supported `bmad-deep-recon` domain lens |
| `bmad-technical-research.toml` | REMOVE | Deprecated shim; use supported `bmad-deep-recon` technical lens |
| `bmad-deep-recon.toml` | KEEP (new) | One supported research output hook with upstream research firewall and Spike decision handoff |
| `guidelines/kiss.md` | REMOVE | Redundant persistent file; Build retains a brief KISS instruction |

All custom standing `persistent_facts` were removed: duplicated folder
explanations, KISS files, and workflow manuals do not belong in every run.
Purposeful activation hooks retain output placement and governance. Upstream
persistent context still applies where an upstream skill requires it.

Build and Build Auto inherit their upstream review configuration unchanged.
Full Build includes Blind Hunter, Edge Case Hunter, and Verification Gap
Reviewer; the upstream oneshot route has a lighter review configuration, and
Build Auto includes its upstream Intent Alignment Auditor. The boilerplate
copies no review-layer definitions. The internal `bmad-review-verification-gap`
remains a standalone audit for code written outside Build, historical work, or
an explicit additional audit; normal Build -> Close does not invoke it.

## Daily routing

Actionable Features, Issues, and Bugs enter Build directly from tracker context
or explicit intent, then Close. Publication creates/refines product scope and
tracker items. It does not choose implementation complexity; Build investigates
and chooses ceremony. Module defines children, Request requires qualification,
and Spike ends in evidence and a decision. A non-cohesive Feature creates child
Issues in the configured tracker. The six semantic roles remain stable, and
the tracker owns identity, hierarchy, status, assignment, and priority.

New projects use project-context setup; adopted repositories use project-context
adopt. Later refresh, record, and audit keep AGENTS.md concise. Figma remains the
editable design source with approved nodes and durable visual references.
Close accepts an absent local contract, consumes Build verification/review
and repair evidence, transfers lasting knowledge, updates the tracker, and
requests explicit approval before deleting exact ticket-scoped artifacts.

## Completion verification (2026-10-06)

The full suite passed on host Node 24.21.0 and isolated pnpm 10.26.0:
88 Node tests (including actual upstream compatibility, no skips), 17 Python
release-note tests, TypeScript no-emit, Biome, and TypeScript build. Both
Codex and Claude Code Build/Build Auto renderers passed. All 19 customization
schemas, four central-config layers, upstream review inheritance, managed
migration preservation/retirement, new-project scaffolding, adoption, installer
failure recovery, and repeated real installation were exercised. Shell/Node
syntax, whitespace, and sanitized quiet Compose validation passed. Three
independent review layers completed and their accepted findings were repaired.

The root/template portable devcontainers match after identity substitution.
Private root Compose references remain in the local worktree; installer status
and hash state are generated local files. The local project policy and all
pre-existing Work Item artifacts were preserved. Generated dependencies,
private overlays, credentials, and adoption proposals are excluded from the
reusable source commit.

Live image build, browser connectivity, authentication, persistent-home runtime
behavior, and native Windows execution remain unverified. No container
lifecycle operations ran. The pre-existing adoption force/symlink behavior
remains a separate issue; portable defaults and normal proposal adoption are
covered. External BMAD module versions remain the documented reproducibility
limit above.

## Daily cheat sheet

| Situation | Command / skill |
| --- | --- |
| New project | `bmad-start-project`, then `bmad-project-context setup` |
| Existing repository | `bmad-update-project`, approved host adoption, then `bmad-project-context adopt` |
| Actionable Issue, cohesive Feature, or Bug | `bmad-build` |
| New or vague Request | `bmad-publish-work-item` |
| Spike | `bmad-deep-recon`, evidence and decision, then Close |
| UX/design change | `bmad-ux` and approved Figma references |
| Architecture risk across delivery units | `bmad-architecture` |
| Human walkthrough | `bmad-walkthrough` |
| Independent review of external code or explicit extra review | `bmad-code-review` |
| Completed delivery | `bmad-close-work-item` |
