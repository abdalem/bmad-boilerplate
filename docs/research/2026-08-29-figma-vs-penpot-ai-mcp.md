# Figma vs Penpot for an AI-First MCP Workflow

**Date:** 2026-08-29
**Audience:** A solo senior software engineer using ChatGPT or Claude for product
discovery and Codex or Claude Code for design and implementation.
**Decision:** Select the default UX provider for the boilerplate while keeping
the workflow portable.

## Executive answer

For this boilerplate's specific workflow, **Penpot should be the default UX
provider and Figma should remain a supported alternative**.

Penpot is the better AI-first programmable canvas for a solo engineering-led
workflow: its official MCP implementation is open source, can be self-hosted,
allows an agent to execute Plugin API code against an editable design, includes
AI workflows on the free plan, and can import and export design tokens in DTCG
JSON. Its official AI Kit also provides reusable skills for foundations,
components, screen construction, accessibility, audits, and handoff.

Figma is the stronger overall product-design and production-handoff platform.
Its MCP offers more specialized tools for design context, screenshots, assets,
motion, libraries, live-UI capture, and component-to-code mapping. However, the
largest differentiator, Code Connect, requires an Organization or Enterprise
plan and a Full or Dev seat. General agent canvas writing requires a Full seat,
is still beta, and Figma says it will become usage-priced.

There is no credible controlled public benchmark directly comparing current
Penpot MCP and current Figma MCP on the same end-to-end design tasks. Therefore,
this recommendation is based on documented capabilities, operating constraints,
cost, portability, and fit with the intended workflow, not a claim that Penpot
always produces more visually attractive screens.

## The important change

Older comparisons are now stale. Figma's official MCP is no longer limited to
reading design context: its remote `use_figma` tool can create and edit native
Figma objects. Penpot and Figma can both support agent-authored editable design.
The decision is now between two different MCP architectures:

- Penpot gives the model a compact programmable interface centered on
  `execute_code`, API discovery, structural overview, visual export, and image
  import.
- Figma combines a general-purpose write tool with many higher-level,
  purpose-built tools for design systems and engineering handoff.

Sources: [Figma MCP tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/),
[Figma write to canvas](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/),
[Penpot MCP documentation](https://help.penpot.app/mcp/), and
[Penpot MCP source](https://github.com/penpot/penpot/tree/develop/mcp).

## Decision matrix

| Criterion | Penpot | Figma | Better fit |
| --- | --- | --- | --- |
| Agent can create and edit native designs | Arbitrary Plugin API code through `execute_code` | General `use_figma` plus specialized tools | Tie |
| Solo-developer access | MCP and core product available free | Full seat needed for agent writes | Penpot |
| Open source and self-hosting | Product and MCP can be self-hosted | Proprietary hosted platform | Penpot |
| Repository-owned design tokens | Documented DTCG JSON import and export | DTCG import and variables APIs; platform remains hosted | Penpot |
| MCP setup simplicity | File and plugin must remain connected in one active browser tab | Hosted OAuth server uses file/node links | Figma |
| Production component mapping | Naming and documented mapping conventions | Code Connect maps design components, props, imports, and snippets | Figma |
| Design-to-code context | Structure, tokens, assets, Plugin API, HTML/CSS generation | Specialized context, screenshot, asset, variable, motion, and code tools | Figma |
| Code-to-design round trip | Agent reconstructs screens through the API | Can capture a running UI as editable Figma layers | Figma |
| Agent workflow assets | Official Penpot AI Kit with build/audit/handoff skills | Official client plugins and workflow skills | Tie |
| Ecosystem and conventional design maturity | Capable but smaller ecosystem | Long-established libraries, plugins, collaboration, and handoff | Figma |

## Why Penpot fits this boilerplate

### 1. The AI is the primary designer

The intended user is not handing an established design system to a design team.
The agent starts from a product packet, creates foundations, components, flows,
and screens, and then hands those results back to an engineering agent. Penpot's
MCP is explicitly structured as a programmable design environment: the model
can discover the API and execute typed JavaScript against the connected file.
That provides broad automation without waiting for a vendor to add one tool per
operation.

The [Penpot AI Kit](https://github.com/penpot/penpot-ai-kit) materially improves
this model. It includes skills for creating token foundations, generating
component variants, building screens from written briefs, rebuilding from code,
documenting handoff, and auditing accessibility and token usage. It supports
project-scoped installation for Codex and native skill installation for Claude
Code.

### 2. The repository can own the design contract

Penpot documents DTCG-compatible design tokens and supports JSON import and
export, including token sets and themes. This makes it practical to keep the
canonical token files in Git and synchronize them with the design canvas instead
of treating the canvas as the only durable source of truth.

Figma also supports DTCG token import, so portability is possible in both
directions. Penpot nevertheless has the cleaner ownership model because the
application, MCP server, and token workflow are open and self-hostable.

Sources: [Penpot design tokens](https://help.penpot.app/user-guide/design-systems/design-tokens/)
and [Figma variable modes and DTCG import](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables).

### 3. Cost does not distort the workflow

Penpot's hosted Professional plan is currently free and lists AI workflows among
the core features. Its MCP positioning explicitly avoids an additional AI
paywall; model usage is paid through the selected agent provider.

Figma Professional currently lists a Full seat at USD 16 per month. The Full
seat is required to write to Figma with agents. Figma also states that write to
canvas will eventually be usage-priced. Code Connect, Figma's most compelling
production mapping feature, is available on Organization and Enterprise plans;
an Organization Full seat is currently USD 55 per month.

Sources: [Penpot pricing](https://penpot.app/pricing),
[Penpot AI workflows](https://penpot.app/ai/ai-workflows),
[Figma pricing](https://www.figma.com/pricing/),
[Figma write to canvas](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/),
and [Figma Code Connect access](https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect).

## Where Figma remains better

### 1. Engineering handoff is more specialized

Figma's `get_design_context` can return framework-oriented context, while
separate tools expose metadata, screenshots, variables, assets, animation,
libraries, and design-system search. Code Connect can include real import paths,
component snippets, prop mappings, source locations, and usage instructions in
the agent's context. Penpot can implement a similar policy through naming,
skills, and Plugin API code, but it does not currently provide an equivalent
first-party component-to-production-code contract.

Sources: [Figma MCP tool inventory](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)
and [Code Connect integration](https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/).

### 2. The hosted MCP is operationally simpler

Figma's remote server authenticates with OAuth and works from file or node links.
It can create new files and does not require a project-specific local MCP daemon.
Penpot's remote MCP still relies on a plugin connected to the currently focused
page. Only one browser tab can own the connection, and the plugin window must
remain connected. The local mode adds a daemon, plugin server, browser local
network permissions, and active-tab lifecycle concerns.

Penpot's public issue tracker also contains recent reports involving remote
WebSocket delivery and multi-connection handling. These reports do not prove the
service is broadly unreliable, but they reinforce that its bridge architecture
has more moving parts.

Sources: [Figma remote MCP setup](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/),
[Penpot MCP setup and lifecycle](https://help.penpot.app/mcp/),
[Penpot remote command issue](https://github.com/penpot/penpot/issues/10753),
and [Penpot multi-connection issue](https://github.com/penpot/penpot/issues/8829).

### 3. The code-to-canvas loop is stronger

Figma can capture a running web interface as editable design layers, review a
multi-screen flow on the canvas, and send the reviewed frames back to the coding
agent. This is particularly useful once implementation has started. Penpot can
reconstruct an implementation through its API and AI Kit, but Figma's capture
workflow is a more direct first-party round trip.

Source: [Figma code to canvas](https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/).

## Risks and limitations

### Penpot

- The active file, plugin, page, and browser tab are part of the MCP runtime.
- Its general code-execution model depends heavily on model quality and good
  skills; Penpot itself recommends frontier vision-language models for complex
  work.
- It has fewer specialized production-handoff primitives than Figma.
- Its ecosystem and conventional design collaboration experience are less mature.

### Figma

- Write access is beta and Figma explicitly warns that generated canvas output
  may require cleanup.
- Read operations are rate-limited by plan and seat. Starter access is too
  constrained for a serious agent workflow; paid Full or Dev seats receive
  higher daily and per-minute limits.
- Large design-context responses can exceed client token limits, and Figma
  recommends breaking work into smaller selections.
- The most precise design-system-to-code path is locked behind higher-priced
  plans.
- The MCP server and hosted design data remain vendor-controlled.

Sources: [Figma limitations](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/),
[Figma MCP rate limits](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/),
and [Figma client issues](https://developers.figma.com/docs/figma-mcp-server/mcp-clients-issues/).

## Boilerplate recommendation

The boilerplate should not make either vendor the canonical source of product or
UX requirements. It should define a provider-neutral design contract and then
install one provider adapter.

The recommended default is:

1. Keep the product packet and screen inventory as Markdown in Git.
2. Keep design tokens as DTCG JSON in Git.
3. Select `penpot` or `figma` in a small design-provider manifest.
4. Default new solo projects to Penpot and install the upstream Penpot AI Kit.
5. Offer Figma when the user already works in Figma, requires its ecosystem, or
   has an Organization/Enterprise Code Connect workflow.
6. Store only provider links and stable node/page identifiers in the repository;
   never store MCP credentials.
7. Require visual, responsive, state, and accessibility review before a screen is
   approved for implementation, regardless of provider.

This avoids lock-in while selecting the option that best matches the expected
default user. It also permits a later project-level switch without rewriting the
product-definition workflow.

## Confidence and remaining evidence gap

**Confidence:** Moderate-high for the platform and workflow recommendation;
moderate for comparative output quality.

The research found official documentation, source code, pricing, workflow kits,
and public issue evidence, but no controlled current benchmark that runs the same
screen-generation and design-to-code tasks through both MCP servers. A practical
pilot should therefore compare three representative screens before making Figma
or Penpot irreversible project infrastructure:

- A responsive SaaS dashboard with loading, empty, error, and populated states.
- A multi-step form with validation and accessibility constraints.
- A mobile Expo flow using the same design tokens and component semantics.

Measure setup time, MCP failures, agent tool calls, manual canvas corrections,
token/component reuse, responsive fidelity, accessibility defects, and code
changes required after handoff.

## Source ledger

All sources were accessed on 2026-08-29.

- Figma, "Tools and prompts": https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/
- Figma, "Write to canvas": https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/
- Figma, "Code to canvas": https://developers.figma.com/docs/figma-mcp-server/code-to-canvas/
- Figma, "Code Connect integration": https://developers.figma.com/docs/figma-mcp-server/code-connect-integration/
- Figma, "Rate limits and access": https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/
- Figma, "Known issues with MCP clients": https://developers.figma.com/docs/figma-mcp-server/mcp-clients-issues/
- Figma, pricing: https://www.figma.com/pricing/
- Figma Help, "Code Connect": https://help.figma.com/hc/en-us/articles/23920389749655-Code-Connect
- Figma Help, "Modes for variables": https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables
- Penpot, "Penpot MCP server": https://help.penpot.app/mcp/
- Penpot, official MCP source: https://github.com/penpot/penpot/tree/develop/mcp
- Penpot, official AI Kit: https://github.com/penpot/penpot-ai-kit
- Penpot, "Design Tokens": https://help.penpot.app/user-guide/design-systems/design-tokens/
- Penpot, pricing: https://penpot.app/pricing
- Penpot, "AI Workflows": https://penpot.app/ai/ai-workflows
- Penpot issue 10753: https://github.com/penpot/penpot/issues/10753
- Penpot issue 8829: https://github.com/penpot/penpot/issues/8829
