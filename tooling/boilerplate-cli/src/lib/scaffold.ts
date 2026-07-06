import { join } from 'node:path';
import { z } from 'zod';
import { BOILERPLATE_DIR, PRODUCT_SPEC_FILE, PROMPT_ROOT, SCHEMA_ROOT } from './constants.js';
import { runCodexJson } from './codex.js';
import {
  copyTemplateTree,
  ensureDir,
  exists,
  readText,
  writeJsonFile,
  writeText,
} from './fs-utils.js';
import { getModuleDefinition, getTicketTemplateMarkdown } from './module-registry.js';
import { loadPromptTemplate } from './prompt-loader.js';
import { buildDeterministicProductSpec } from './spec.js';
import type { ParsedProjectBrief, ProjectManifest, ProjectPackage } from './types.js';

const docsResponseGuard = (
  value: unknown,
): value is { docs: Array<{ path: string; markdown: string }> } => {
  const schema = z.object({
    docs: z.array(
      z.object({
        path: z.string().regex(/^docs\/.+\.md$/),
        markdown: z.string().min(10),
      }),
    ),
  });

  return schema.safeParse(value).success;
};

const ticketsResponseGuard = (
  value: unknown,
): value is { tickets: Array<{ path: string; markdown: string }> } => {
  const schema = z.object({
    tickets: z.array(
      z.object({
        path: z.string().regex(/^docs\/tickets\/.+\.md$/),
        markdown: z.string().min(10),
      }),
    ),
  });

  return schema.safeParse(value).success;
};

const replacementsForManifest = (manifest: ProjectManifest, projectPackage?: ProjectPackage) => {
  const isStandalone = manifest.workspace?.mode === 'standalone';
  const packageName = projectPackage
    ? isStandalone
      ? manifest.projectSlug
      : `@apps/${projectPackage.id}`
    : manifest.projectSlug;
  const tsconfigBaseExtends =
    projectPackage?.path === '.' ? './tsconfig.base.json' : '../../tsconfig.base.json';

  return {
    '__PROJECT_NAME__': manifest.projectName,
    '__PROJECT_SLUG__': manifest.projectSlug,
    '__PACKAGE_ID__': projectPackage?.id ?? manifest.projectSlug,
    '__PACKAGE_NAME__': packageName,
    '__TSCONFIG_BASE_EXTENDS__': tsconfigBaseExtends,
  };
};

const docsFallback = (brief: ParsedProjectBrief, manifest: ProjectManifest) => {
  const packageTopology = manifest.packages
    .map(projectPackage => {
      const deployment = manifest.deployments.find(entry => entry.packageId === projectPackage.id);
      return `- ${projectPackage.id}: ${projectPackage.kind} at ${projectPackage.path} via ${deployment?.provider ?? 'unassigned'}`;
    })
    .join('\n');

  return [
    {
      path: 'docs/00-overview.md',
      markdown: `# Overview\n\n${brief.sections['product-direction'] || manifest.description}\n`,
    },
    {
      path: 'docs/01-features.md',
      markdown: `# Features\n\n${brief.sections['mvp-scope'] || '- Define the MVP in the project brief.'}\n`,
    },
    {
      path: 'docs/02-domain-model.md',
      markdown: `# Domain Model\n\nDerive the first domain entities from the approved design docs and the workflow described in the project brief.\n`,
    },
    {
      path: 'docs/03-architecture.md',
      markdown: `# Architecture\n\n## Package Topology\n${packageTopology}\n`,
    },
    {
      path: 'docs/04-acceptance-tests.md',
      markdown: `# Acceptance Tests\n\n- Core workflow works end-to-end\n- Package topology and provider choices are reflected in the repo\n`,
    },
  ];
};

const ticketsFallback = (brief: ParsedProjectBrief) => {
  const featureLines = brief.sections['mvp-scope']
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  const featureTickets = featureLines.map((feature, index) => {
    const ticketId = `V1-${String(index + 2).padStart(2, '0')}`;
    const slug =
      feature
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'scope';

    return {
      path: `docs/tickets/V1/${ticketId}-${slug}.md`,
      markdown: `# ${ticketId} - ${feature.replace(/^-+\s*/, '')}\n\n## Goal\nImplement ${feature.replace(/^-+\s*/, '')}.\n\n## Acceptance Criteria\n- Matches PRODUCT_SPEC.md\n- Keeps package-scoped deployment topology intact\n`,
    };
  });

  return [
    {
      path: 'docs/tickets/template.md',
      markdown: getTicketTemplateMarkdown(),
    },
    {
      path: 'docs/tickets/V1/00-foundations.md',
      markdown:
        '# V1 - Foundations\n\nEstablish the brief, manifest, approved design, implementation plan, and first package topology.\n',
    },
    ...featureTickets,
    {
      path: 'docs/tickets/V2/00-advanced.md',
      markdown:
        '# V2 - Advanced\n\nExpand into deeper provider modules, richer workflows, and broader operational tooling after the core workflow proves itself.\n',
    },
  ];
};

const generateDocsWithCodex = async (
  targetPath: string,
  brief: ParsedProjectBrief,
  manifest: ProjectManifest,
  productSpec: string,
) => {
  const prompt = await loadPromptTemplate(join(PROMPT_ROOT, 'docs-generation.md'), {
    '{{PROJECT_NAME}}': manifest.projectName,
    '{{PROJECT_BRIEF}}': brief.raw,
    '{{MANIFEST_JSON}}': JSON.stringify(manifest, null, 2),
    '{{PRODUCT_SPEC}}': productSpec,
  });

  const result = await runCodexJson<unknown>({
    prompt,
    schemaPath: join(SCHEMA_ROOT, 'docs.schema.json'),
    cwd: targetPath,
  });

  if (!docsResponseGuard(result)) {
    throw new Error('Invalid docs response format from codex.');
  }

  return result.docs;
};

const generateTicketsWithCodex = async (
  targetPath: string,
  brief: ParsedProjectBrief,
  manifest: ProjectManifest,
  productSpec: string,
) => {
  const prompt = await loadPromptTemplate(join(PROMPT_ROOT, 'tickets-generation.md'), {
    '{{PROJECT_NAME}}': manifest.projectName,
    '{{PROJECT_BRIEF}}': brief.raw,
    '{{MANIFEST_JSON}}': JSON.stringify(manifest, null, 2),
    '{{PRODUCT_SPEC}}': productSpec,
  });

  const result = await runCodexJson<unknown>({
    prompt,
    schemaPath: join(SCHEMA_ROOT, 'tickets.schema.json'),
    cwd: targetPath,
  });

  if (!ticketsResponseGuard(result)) {
    throw new Error('Invalid tickets response format from codex.');
  }

  return result.tickets;
};

const writeGeneratedFiles = async (
  targetPath: string,
  files: Array<{ path: string; markdown: string }>,
) => {
  for (const file of files) {
    await writeText(join(targetPath, file.path), `${file.markdown.trim()}\n`);
  }
};

const applyModule = async (args: {
  targetPath: string;
  manifest: ProjectManifest;
  moduleId: ReturnType<typeof getModuleDefinition>['id'];
  overwrite: boolean;
  projectPackage?: ProjectPackage;
}) => {
  const definition = getModuleDefinition(args.moduleId);
  const replacements = replacementsForManifest(args.manifest, args.projectPackage);
  const deployment = args.projectPackage
    ? args.manifest.deployments.find(entry => entry.packageId === args.projectPackage?.id)
    : undefined;

  for (const source of definition.sources ?? []) {
    const targetPrefix = source.targetPrefix ?? args.projectPackage?.path ?? undefined;

    await copyTemplateTree(source.root, args.targetPath, replacements, args.overwrite, {
      include: source.include,
      exclude: source.exclude,
      targetPrefix,
    });
  }

  const dynamicFiles = definition.dynamicFiles?.({
    manifest: args.manifest,
    projectPackage: args.projectPackage,
    deployment,
  });

  for (const [relativePath, content] of Object.entries(dynamicFiles ?? {})) {
    await writeText(
      join(args.targetPath, relativePath),
      content.endsWith('\n') ? content : `${content}\n`,
    );
  }
};

const applyScaffoldModules = async (
  targetPath: string,
  manifest: ProjectManifest,
  overwrite: boolean,
) => {
  for (const moduleId of manifest.coreModules) {
    await applyModule({
      targetPath,
      manifest,
      moduleId,
      overwrite,
    });
  }

  for (const projectPackage of manifest.packages) {
    for (const moduleId of projectPackage.modules) {
      await applyModule({
        targetPath,
        manifest,
        moduleId,
        overwrite,
        projectPackage,
      });
    }
  }

  for (const deployment of manifest.deployments) {
    const projectPackage = manifest.packages.find(entry => entry.id === deployment.packageId);
    if (!projectPackage) {
      continue;
    }

    await applyModule({
      targetPath,
      manifest,
      moduleId: deployment.moduleId,
      overwrite,
      projectPackage,
    });
  }
};

export const scaffoldProject = async (args: {
  targetPath: string;
  brief: ParsedProjectBrief;
  manifest: ProjectManifest;
  deterministic: boolean;
  docsOnly: boolean;
  ticketsOnly: boolean;
  withTickets: boolean;
  overwrite: boolean;
}) => {
  const notes: string[] = [];

  if (!args.docsOnly && !args.ticketsOnly) {
    await applyScaffoldModules(args.targetPath, args.manifest, args.overwrite);
    notes.push('module-files-generated');
  }

  const hasProductSpec = await exists(join(args.targetPath, PRODUCT_SPEC_FILE));
  const fallbackSpec = await buildDeterministicProductSpec({
    targetPath: args.targetPath,
    manifest: args.manifest,
    brief: args.brief,
  });
  const productSpec = hasProductSpec
    ? await readText(join(args.targetPath, PRODUCT_SPEC_FILE))
    : fallbackSpec;

  const runDocs = !args.ticketsOnly;
  const runTickets = args.ticketsOnly || (!args.docsOnly && args.withTickets);

  if (runDocs) {
    let docs = docsFallback(args.brief, args.manifest);

    if (!args.deterministic) {
      try {
        docs = await generateDocsWithCodex(args.targetPath, args.brief, args.manifest, productSpec);
        notes.push('docs-generated-codex');
      } catch {
        notes.push('docs-generated-fallback');
      }
    } else {
      notes.push('docs-generated-fallback');
    }

    await writeGeneratedFiles(args.targetPath, docs);
  }

  if (runTickets) {
    let tickets = ticketsFallback(args.brief);

    if (!args.deterministic) {
      try {
        tickets = await generateTicketsWithCodex(
          args.targetPath,
          args.brief,
          args.manifest,
          productSpec,
        );
        notes.push('tickets-generated-codex');
      } catch {
        notes.push('tickets-generated-fallback');
      }
    } else {
      notes.push('tickets-generated-fallback');
    }

    await writeGeneratedFiles(args.targetPath, tickets);
    await writeText(join(args.targetPath, 'docs', 'product-spec.md'), `${productSpec.trim()}\n`);
  }

  await ensureDir(join(args.targetPath, BOILERPLATE_DIR));
  await writeJsonFile(join(args.targetPath, BOILERPLATE_DIR, 'scaffold-log.json'), {
    generatedAt: new Date().toISOString(),
    docsOnly: args.docsOnly,
    ticketsOnly: args.ticketsOnly,
    deterministic: args.deterministic,
    notes,
    packages: args.manifest.packages.map(projectPackage => ({
      id: projectPackage.id,
      kind: projectPackage.kind,
      path: projectPackage.path,
      provider:
        args.manifest.deployments.find(entry => entry.packageId === projectPackage.id)?.provider ??
        null,
    })),
  });
};
