import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { loadManifest, loadProjectBrief } from './brief.js';
import {
  BOILERPLATE_DIR,
  PLANS_DIR,
  PRODUCT_SPEC_FILE,
  PROMPT_ROOT,
  SCHEMA_ROOT,
  SPECS_DIR,
} from './constants.js';
import { runCodexJson } from './codex.js';
import { ensureDir, readText, writeJsonFile, writeText } from './fs-utils.js';
import { loadPromptTemplate } from './prompt-loader.js';
import type { ParsedProjectBrief, ProjectManifest } from './types.js';

const specResponseSchema = z.object({
  title: z.string().min(1),
  markdown: z.string().min(20),
});

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

const bulletList = (values: string[]) => values.map(value => `- ${value}`).join('\n');

const summarizeDoc = async (targetPath: string, relativeDir: string) => {
  const directory = join(targetPath, relativeDir);

  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const markdownFiles = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => entry.name)
      .sort();

    const latest = markdownFiles.at(-1);
    if (!latest) {
      return 'No approved document found yet.';
    }

    const relativePath = `${relativeDir}/${latest}`;
    const content = await readText(join(targetPath, relativePath));
    const excerpt = content.replace(/\s+/g, ' ').trim().slice(0, 600);

    return `${relativePath}: ${excerpt}`;
  } catch {
    return 'No approved document found yet.';
  }
};

const collectMvpBullets = (brief: ParsedProjectBrief) => {
  const bullets = brief.sections['mvp-scope']
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => (line.startsWith('-') ? line : `- ${line}`));

  return bullets.length > 0 ? bullets.join('\n') : '- Define the initial core workflow slice.';
};

const collectNonGoals = (brief: ParsedProjectBrief) => {
  const bullets = brief.sections['non-goals']
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => (line.startsWith('-') ? line : `- ${line}`));

  return bullets.length > 0
    ? bullets.join('\n')
    : '- No additional non-goals have been written yet.';
};

const renderArchitectureSummary = (manifest: ProjectManifest) => {
  const packageLines = manifest.packages.map(projectPackage => {
    const deployment = manifest.deployments.find(entry => entry.packageId === projectPackage.id);
    return `- ${projectPackage.id}: ${projectPackage.kind} at ${projectPackage.path} via ${deployment?.provider ?? 'unassigned'}`;
  });

  return bulletList([
    `Preset: ${manifest.preset}`,
    `Workflow stage: ${manifest.workflowStage}`,
    `Adapters: ${manifest.adapters.join(', ')}`,
    ...packageLines,
  ]);
};

const renderApiContract = (manifest: ProjectManifest) => {
  if (!manifest.packages.some(projectPackage => projectPackage.kind === 'api')) {
    return '- No API package is currently configured.';
  }

  return bulletList(['GET /health', 'GET /api/v1/resources', 'POST /api/v1/resources']);
};

export const buildDeterministicProductSpec = async (args: {
  targetPath: string;
  manifest: ProjectManifest;
  brief: ParsedProjectBrief;
}) => {
  const designSummary = await summarizeDoc(args.targetPath, SPECS_DIR);
  const planSummary = await summarizeDoc(args.targetPath, PLANS_DIR);

  return `# Product Specification - ${args.manifest.projectName}

## 1. Vision
${args.brief.sections['product-direction'] || 'Refine the project brief before implementation starts.'}

## 2. Problem Statement
${args.brief.sections.problem || 'Write the operating problem clearly in the project brief.'}

## 3. Target Users
${args.brief.sections.users || 'Define the primary and secondary users in the project brief.'}

## 4. Core Workflow
${args.brief.sections['core-workflow'] || 'Describe the primary workflow in the project brief.'}

## 5. MVP Features
${collectMvpBullets(args.brief)}

## 6. Non-Goals
${collectNonGoals(args.brief)}

## 7. Architecture
${renderArchitectureSummary(args.manifest)}

## 8. API Contract
${renderApiContract(args.manifest)}

## 9. Data and Domain Model
- Keep the package topology explicit in \`.boilerplate/project-manifest.json\`.
- Keep deployment ownership package-scoped rather than repo-scoped.
- Define domain entities directly from the core workflow and the approved design docs.

## 10. Risks and Mitigations
- Risk: the brief, design docs, and manifest drift apart.
- Mitigation: treat the brief and manifest as the source inputs for design and scaffold refreshes.
- Risk: provider choices become repo-wide assumptions again.
- Mitigation: keep deployment records per package and update them through governed migrations.

## 11. Delivery and Definition of Done

### Canonical Design Summary
- ${designSummary}

### Canonical Plan Summary
- ${planSummary}

### Delivery Notes
${args.brief.sections['delivery-notes'] || '- Keep Codex and Claude adapters thin and artifact-driven.'}
`;
};

export const loadScaffoldInputs = async (targetPath: string) => {
  const [manifest, brief] = await Promise.all([
    loadManifest(targetPath),
    loadProjectBrief(targetPath),
  ]);
  return { manifest, brief };
};

export const generateProductSpec = async (args: {
  targetPath: string;
  manifest: ProjectManifest;
  brief: ParsedProjectBrief;
  deterministic: boolean;
}) => {
  const fallback = await buildDeterministicProductSpec({
    targetPath: args.targetPath,
    manifest: args.manifest,
    brief: args.brief,
  });

  await ensureDir(join(args.targetPath, BOILERPLATE_DIR));

  if (args.deterministic) {
    await writeText(join(args.targetPath, PRODUCT_SPEC_FILE), `${fallback.trim()}\n`);
    await writeJsonFile(join(args.targetPath, BOILERPLATE_DIR, 'generation-log.json'), {
      generatedAt: new Date().toISOString(),
      mode: 'deterministic',
    });
    return { mode: 'deterministic' as const, markdown: fallback };
  }

  const promptPath = join(PROMPT_ROOT, 'spec-init.md');
  const schemaPath = join(SCHEMA_ROOT, 'product-spec.schema.json');
  const designSummary = await summarizeDoc(args.targetPath, SPECS_DIR);
  const planSummary = await summarizeDoc(args.targetPath, PLANS_DIR);

  const prompt = await loadPromptTemplate(promptPath, {
    '{{PROJECT_NAME}}': args.manifest.projectName,
    '{{PROJECT_DESCRIPTION}}': args.manifest.description,
    '{{PROJECT_BRIEF}}': args.brief.raw,
    '{{MANIFEST_JSON}}': JSON.stringify(args.manifest, null, 2),
    '{{DESIGN_CONTEXT}}': designSummary,
    '{{PLAN_CONTEXT}}': planSummary,
  });

  const response = specResponseSchema.parse(
    await runCodexJson<unknown>({
      prompt,
      schemaPath,
      cwd: args.targetPath,
    }),
  );

  await writeText(join(args.targetPath, PRODUCT_SPEC_FILE), `${response.markdown.trim()}\n`);
  await writeJsonFile(join(args.targetPath, BOILERPLATE_DIR, 'generation-log.json'), {
    generatedAt: new Date().toISOString(),
    mode: 'codex',
    schemaPath,
    promptPath,
  });

  return { mode: 'codex' as const, markdown: response.markdown };
};
