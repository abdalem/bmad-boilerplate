import { basename, join } from 'node:path';
import { z } from 'zod';
import { BOILERPLATE_DIR, MANIFEST_FILE } from './constants.js';
import { ensureDir, exists, readJsonFile, writeText } from './fs-utils.js';
import type {
	ArchetypeType,
	DeployModuleId,
	DeployProvider,
	PackageKind,
	PresetName,
	ProjectManifest,
} from './types.js';

export const slugify = (value: string) => {
	return (
		value
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'project'
	);
};

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
			modules: z
				.array(
					z.enum(['web-next', 'api-adonis', 'mobile-expo', 'website-astro']),
				)
				.min(1),
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

export const writeManifest = async (
	targetPath: string,
	manifest: ProjectManifest,
) => {
	await ensureDir(join(targetPath, BOILERPLATE_DIR));
	await writeText(
		join(targetPath, MANIFEST_FILE),
		`${JSON.stringify(manifest, null, 2)}\n`,
	);
};

export const loadManifest = async (
	targetPath: string,
): Promise<ProjectManifest> => {
	const parsed = manifestSchema.parse(
		await readJsonFile<ProjectManifest>(join(targetPath, MANIFEST_FILE)),
	);
	const packageIds = new Set<string>();
	for (const projectPackage of parsed.packages) {
		if (packageIds.has(projectPackage.id)) {
			throw new Error(`Duplicate package id: ${projectPackage.id}`);
		}
		packageIds.add(projectPackage.id);
	}
	for (const deployment of parsed.deployments) {
		const projectPackage = parsed.packages.find(
			entry => entry.id === deployment.packageId,
		);
		if (!projectPackage) {
			throw new Error(
				`Deployment references unknown package: ${deployment.packageId}`,
			);
		}
		const expectedModule = deployModuleForProvider(deployment.provider);
		if (deployment.moduleId !== expectedModule) {
			throw new Error(
				'Deployment ' +
					deployment.packageId +
					' must use ' +
					expectedModule +
					' for ' +
					deployment.provider,
			);
		}
		const compatible =
			projectPackage.kind === 'website'
				? ['cloudflare-pages', 'vercel', 'gh-pages']
				: projectPackage.kind === 'web-app'
					? ['vercel', 'railway', 'cloud-run', 'aws-app-runner']
					: projectPackage.kind === 'api'
						? ['railway', 'cloud-run', 'aws-app-runner']
						: projectPackage.kind === 'worker'
							? ['cloud-run', 'railway']
							: [];
		if (!compatible.includes(deployment.provider)) {
			throw new Error(
				'Provider ' +
					deployment.provider +
					' is not supported for ' +
					projectPackage.kind +
					' package ' +
					projectPackage.id,
			);
		}
	}
	return parsed;
};

export const ensureManifest = async (
	targetPath: string,
	preset: PresetName = 'web-api',
) => {
	if (await exists(join(targetPath, MANIFEST_FILE)))
		return loadManifest(targetPath);
	const manifest = createDefaultManifest(targetPath, preset);
	await writeManifest(targetPath, manifest);
	return manifest;
};
