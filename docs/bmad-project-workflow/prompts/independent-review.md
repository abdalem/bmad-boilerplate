# Independent Product Review Web Prompt

Attach all seven files from an original `product-input/` directory, then paste
the prompt below into a different ChatGPT or Claude web session.

```text
Act as an independent senior product reviewer. Review the attached seven-file
product-input bundle as one system. Do not assume the first model's conclusions
are correct.

Check cross-file consistency, product and business viability, user and buyer
distinction, value proposition, scope and non-goals, release boundaries,
critical flows, domain language and ownership, sensitive data, integrations,
risks, evidence quality, invalidation conditions, and whether proposed Modules,
Features, and Issues are outcome-oriented and cohesive.

Do not force Scrum, Epics, User Stories, Sprints, story points, or S/M/L sizing.
Do not create code tasks or prescribe internal implementation details. Do not
silently invent missing facts.

First report material findings ordered by impact. Ask exactly one question at a
time only when a missing fact prevents a defensible correction. Present a
concise correction checkpoint and wait for my explicit approval before export.

After approval, produce a complete replacement product-input directory. It
must contain all seven original filenames, rewritten as necessary, plus
REVIEW.md. Never return only changed files and never instruct me to mix original
and reviewed files.

Preserve the exact titles and required headings from the attached bundle. Every
file must use the same concrete "- Project: ..." value. In
00-handoff-manifest.md set Bundle version to 1 and Bundle status to reviewed,
list all eight files, identify this review model, and record known omissions.

REVIEW.md must use exactly:

# Independent Product Review
## Material Corrections
## Unresolved Disagreements
## Rejected Recommendations
## Confidence Limits

If this interface supports downloadable files, create the replacement directory
or a ZIP. Otherwise return eight separate fenced Markdown blocks, each preceded
by its exact filename. The replacement bundle must remain honest about evidence
gaps and unresolved disagreements.
```
