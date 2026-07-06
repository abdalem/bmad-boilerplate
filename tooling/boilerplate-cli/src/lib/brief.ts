import { basename, join } from 'node:path';
import { z } from 'zod';
import { BOILERPLATE_DIR, MANIFEST_FILE, PROJECT_BRIEF_FILE } from './constants.js';
import { ensureDir, exists, readJsonFile, readText, writeText } from './fs-utils.js';
import { slugify } from './spec.js';
import type {
  ArchetypeType,
  BriefSectionKey,
  DeployModuleId,
  DeployProvider,
  PackageKind,
  ParsedProjectBrief,
  PresetName,
  ProjectManifest,
} from './types.js';

const sectionOrder: Array<{ key: BriefSectionKey; title: string }> = [
  { key: 'product-direction', title: 'Product Direction' },
  { key: 'problem', title: 'Problem' },
  { key: 'users', title: 'Users' },
  { key: 'core-workflow', title: 'Core Workflow' },
  { key: 'mvp-scope', title: 'MVP Scope' },
  { key: 'non-goals', title: 'Non-Goals' },
  { key: 'package-topology', title: 'Package Topology' },
  { key: 'delivery-notes', title: 'Delivery Notes' },
  { key: 'references', title: 'References' },
];

const manifestSchema = z.object({
  version: z.literal('2'),
  projectName: z.string().min(2),
  projectSlug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().min(3),
  preset: z.enum([
    'web-app',
    'api',
    'mobile',
    'website',
    'web-api',
    'web-api-mobile',
    'website-api',
    'full-product',
  ]),
  workflowStage: z.enum(['brief', 'design', 'plan', 'scaffolded']),
  adapters: z.array(z.enum(['codex', 'claude-code'])).min(1),
  workspace: z.object({
    mode: z.enum(['standalone', 'monorepo']),
  }),
  archetypes: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum(['web-app', 'api', 'mobile', 'website']),
      path: z.string().min(1),
    }),
  ),
  coreModules: z.array(
    z.enum([
      'repo-foundation',
      'devcontainer',
      'github-actions',
      'monorepo-core',
      'shared-contracts',
      'docs-core',
    ]),
  ),
  packages: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      path: z.string().min(1),
      kind: z.enum(['web-app', 'api', 'mobile', 'website', 'worker']),
      modules: z.array(z.enum(['web-next', 'api-adonis', 'mobile-expo', 'website-astro'])).min(1),
    }),
  ),
  deployments: z.array(
    z.object({
      packageId: z.string().min(1),
      provider: z.enum([
        'gh-pages',
        'vercel',
        'railway',
        'cloud-run',
        'aws-app-runner',
        'cloudflare-pages',
      ]),
      moduleId: z.enum([
        'deploy-gh-pages',
        'deploy-vercel',
        'deploy-railway',
        'deploy-cloud-run',
        'deploy-aws-app-runner',
        'deploy-cloudflare-pages',
      ]),
      version: z.string().min(1),
      environmentBindings: z.array(
        z.object({
          name: z.string().min(1),
          source: z.enum(['runtime', 'secret', 'build']),
          description: z.string().min(1),
        }),
      ),
      dependencyEdges: z.array(
        z.object({
          packageId: z.string().min(1),
          relation: z.enum(['calls', 'serves', 'builds-from']),
        }),
      ),
    }),
  ),
  generatedAt: z.string().min(1),
});

const defaultProviderForKind = (kind: PackageKind): DeployProvider => {
  if (kind === 'website') {
    return 'cloudflare-pages';
  }

  if (kind === 'web-app') {
    return 'vercel';
  }

  if (kind === 'api' || kind === 'worker') {
    return 'cloud-run';
  }

  return 'vercel';
};

const deployModuleForProvider = (provider: DeployProvider): DeployModuleId => {
  switch (provider) {
    case 'gh-pages':
      return 'deploy-gh-pages';
    case 'vercel':
      return 'deploy-vercel';
    case 'railway':
      return 'deploy-railway';
    case 'cloud-run':
      return 'deploy-cloud-run';
    case 'aws-app-runner':
      return 'deploy-aws-app-runner';
    case 'cloudflare-pages':
      return 'deploy-cloudflare-pages';
  }
};

const archetypesForPreset = (preset: PresetName): ArchetypeType[] => {
  switch (preset) {
    case 'web-app':
      return ['web-app'];
    case 'api':
      return ['api'];
    case 'mobile':
      return ['mobile'];
    case 'website':
      return ['website'];
    case 'web-api':
      return ['web-app', 'api'];
    case 'web-api-mobile':
      return ['web-app', 'api', 'mobile'];
    case 'website-api':
      return ['website', 'api'];
    case 'full-product':
      return ['website', 'web-app', 'api', 'mobile'];
  }
};

const idForArchetype = (type: ArchetypeType) => {
  if (type === 'web-app') return 'web';
  return type;
};

const nameForArchetype = (type: ArchetypeType) => {
  if (type === 'web-app') return 'Web App';
  if (type === 'api') return 'API';
  if (type === 'mobile') return 'Mobile App';
  return 'Website';
};

const moduleForArchetype = (type: ArchetypeType) => {
  if (type === 'web-app') return 'web-next' as const;
  if (type === 'api') return 'api-adonis' as const;
  if (type === 'mobile') return 'mobile-expo' as const;
  return 'website-astro' as const;
};

const buildArchetypes = (types: ArchetypeType[]) => {
  const workspaceMode = types.length > 1 ? 'monorepo' : 'standalone';

  return types.map(type => {
    const id = idForArchetype(type);
    return {
      id,
      type,
      path: workspaceMode === 'standalone' ? '.' : `apps/${id}`,
    };
  });
};

export const createDefaultManifest = (
  targetPath: string,
  preset: PresetName = 'web-api',
): ProjectManifest => {
  const projectName = basename(targetPath);
  const projectSlug = slugify(projectName);
  const archetypes = buildArchetypes(archetypesForPreset(preset));
  const workspaceMode = archetypes.length > 1 ? 'monorepo' : 'standalone';
  const packages = archetypes.map(archetype => ({
    id: archetype.id,
    name: nameForArchetype(archetype.type),
    path: archetype.path,
    kind: archetype.type,
    modules: [moduleForArchetype(archetype.type)],
  }));
  const coreModules: ProjectManifest['coreModules'] = [
    'repo-foundation',
    'devcontainer',
    'github-actions',
    'docs-core',
  ];

  if (workspaceMode === 'monorepo') {
    coreModules.push('monorepo-core', 'shared-contracts');
  }

  const deployments = packages.flatMap(pkg => {
    if (pkg.kind === 'mobile') {
      return [];
    }
    const provider = defaultProviderForKind(pkg.kind);
    return {
      packageId: pkg.id,
      provider,
      moduleId: deployModuleForProvider(provider),
      version: '1.0.0',
      environmentBindings:
        pkg.kind === 'api'
          ? [
              {
                name: 'PORT',
                source: 'runtime' as const,
                description: 'Runtime port exposed by the hosting provider.',
              },
            ]
          : pkg.kind === 'web-app'
            ? [
                {
                  name: 'NEXT_PUBLIC_API_URL',
                  source: 'runtime' as const,
                  description: 'Public API origin consumed by the frontend.',
                },
              ]
            : [],
      dependencyEdges:
        pkg.id === 'web' && packages.some(candidate => candidate.id === 'api')
          ? [{ packageId: 'api', relation: 'calls' as const }]
          : [],
    };
  });

  return {
    version: '2',
    projectName,
    projectSlug,
    description: `Application for ${projectName}`,
    preset,
    workflowStage: 'brief',
    adapters: ['codex', 'claude-code'],
    workspace: {
      mode: workspaceMode,
    },
    archetypes,
    coreModules,
    packages,
    deployments,
    generatedAt: new Date().toISOString(),
  };
};

const renderTopologyLine = (manifest: ProjectManifest) => {
  return manifest.packages
    .map(pkg => {
      const deployment = manifest.deployments.find(entry => entry.packageId === pkg.id);
      return `- \`${pkg.id}\` -> ${pkg.kind} at \`${pkg.path}\` via \`${deployment?.provider ?? 'unassigned'}\``;
    })
    .join('\n');
};

export const renderProjectBrief = (manifest: ProjectManifest) => {
  return `# Project Brief: ${manifest.projectName}

This file is the human-edited starting point for the Workflow OS flow.
Update it before generating or refreshing \`PRODUCT_SPEC.md\`.

## Product Direction
Describe the product in plain language. Anchor on the real user outcome, the product thesis, and what makes this project worth building.

## Problem
Describe the problem with enough specificity that the next design step can make good tradeoffs.

## Users
List the primary users, secondary users, and the context they are operating in.

## Core Workflow
Describe the main end-to-end flow from user intent to completed outcome.

## MVP Scope
- Authentication
- Primary workflow
- Polished happy path

## Non-Goals
- No enterprise expansion before the core workflow proves itself

## Package Topology
${renderTopologyLine(manifest)}

## Delivery Notes
- Canonical design docs live under \`docs/superpowers/specs/\`
- Canonical implementation plans live under \`docs/superpowers/plans/\`
- Keep Codex and Claude working from the same written artifacts

## References
- Existing docs, research notes, or reference repos
`;
};

const titleToKey = new Map(sectionOrder.map(section => [section.title.toLowerCase(), section.key]));

const normalizeSectionValue = (value: string) => value.trim().replace(/\n{3,}/g, '\n\n');

export const parseProjectBrief = (raw: string): ParsedProjectBrief => {
  const sections = Object.fromEntries(
    sectionOrder.map(section => [section.key, '']),
  ) as ParsedProjectBrief['sections'];

  const matches = Array.from(raw.matchAll(/^##\s+(.+)$/gm));
  for (const [index, match] of matches.entries()) {
    const title = match[1]?.trim().toLowerCase() ?? '';
    const key = titleToKey.get(title);

    if (!key) {
      continue;
    }

    const start = match.index === undefined ? 0 : match.index + match[0].length;
    const end = matches[index + 1]?.index ?? raw.length;
    sections[key] = normalizeSectionValue(raw.slice(start, end));
  }

  return { raw, sections };
};

export const loadProjectBrief = async (targetPath: string): Promise<ParsedProjectBrief> => {
  const raw = await readText(join(targetPath, PROJECT_BRIEF_FILE));
  return parseProjectBrief(raw);
};

export const writeProjectBrief = async (
  targetPath: string,
  manifest: ProjectManifest,
  overwrite = false,
) => {
  const briefPath = join(targetPath, PROJECT_BRIEF_FILE);
  if (!overwrite && (await exists(briefPath))) {
    return;
  }

  await ensureDir(join(targetPath, BOILERPLATE_DIR));
  await writeText(briefPath, `${renderProjectBrief(manifest).trim()}\n`);
};

export const writeManifest = async (targetPath: string, manifest: ProjectManifest) => {
  await ensureDir(join(targetPath, BOILERPLATE_DIR));
  await writeText(join(targetPath, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`);
};

export const loadManifest = async (targetPath: string): Promise<ProjectManifest> => {
  const manifest = await readJsonFile<ProjectManifest>(join(targetPath, MANIFEST_FILE));
  return manifestSchema.parse(manifest);
};

export const ensureWorkflowArtifacts = async (
  targetPath: string,
  preset: PresetName = 'web-api',
) => {
  const hasManifest = await exists(join(targetPath, MANIFEST_FILE));
  const manifest = hasManifest
    ? await loadManifest(targetPath)
    : createDefaultManifest(targetPath, preset);

  if (!hasManifest) {
    await writeManifest(targetPath, manifest);
  }

  await writeProjectBrief(targetPath, manifest);

  return manifest;
};

export const buildPackageTopologySummary = (manifest: ProjectManifest) => {
  return manifest.packages
    .map(pkg => {
      const deployment = manifest.deployments.find(entry => entry.packageId === pkg.id);
      return `${pkg.id}: ${pkg.kind} (${pkg.path}) -> ${deployment?.provider ?? 'unassigned'}`;
    })
    .join('\n');
};
