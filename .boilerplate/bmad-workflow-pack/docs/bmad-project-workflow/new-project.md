# New Project Workflow

Start from a clean clone of the public boilerplate and open it in the supplied
devcontainer. Invoke:

```text
bmad-start-project
```

The skill asks one unresolved question at a time. It first confirms the
technical topology, then defines the product, routes initial design and
planning, and publishes the first actionable Work Item.

## Product Definition Options

Choose one:

1. Define the product in a ChatGPT or Claude web session with
   `prompts/product-definition.md`, optionally review it with a second model
   using `prompts/independent-review.md`, and place the resulting directory at
   `product-input/`.
2. Ask `bmad-start-project` to conduct direct discovery. It will produce the
   same seven-file contract before continuing.

Imported product files are evidence. The skill checks completeness,
contradictions, assumptions, business viability, users, scope, domain, and
risks before routing maintained BMAD artifacts.

## Completion

Project inception is complete when the repository has:

- A confirmed technical manifest and scaffold.
- Approved product boundaries and planning artifacts.
- Initial Figma references or an explicit non-visual decision.
- An approved initial work map.
- One published actionable Work Item with its first next prompt.

After that, start ordinary work with `bmad-publish-work-item`.
