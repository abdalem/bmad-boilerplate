import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import {
	MANIFEST_FILE,
	MIGRATION_REPORT_JSON,
	MIGRATION_REPORT_MD,
	REPO_ROOT,
} from './constants.js';
import {
	copyTemplateEntry,
	ensureDir,
	exists,
	readText,
	writeJsonFile,
	writeText,
} from './fs-utils.js';
import { createDefaultManifest, slugify, writeManifest } from './manifest.js';
import {
	getModuleDefinition,
	getProviderModuleId,
	isProviderSupportedForKind,
} from './module-registry.js';
import type {
	ArchetypeType,
	DeployProvider,
	DetectedPackage,
	DetectedStack,
	ModuleId,
	MigrationAction,
	MigrationArtifact,
	MigrationReport,
	PackageModuleId,
	PresetName,
	ProjectManifest,
} from './types.js';

const hasAny = async (targetPath: string, entries: string[]) => {
	for (const entry of entries) {
		if (await exists(join(targetPath, entry))) {
			return true;
		}
	}

	return false;
};

const detectPreset = async (targetPath: string): Promise<PresetName> => {
	const hasWebsite = await hasAny(targetPath, [
		'apps/website',
		'apps/landing',
		'astro.config.mjs',
		'apps/website/astro.config.mjs',
		'apps/landing/astro.config.mjs',
	]);
	const hasWeb = await hasAny(targetPath, [
		'apps/web',
		'app',
		'next.config.js',
		'next.config.mjs',
		'next.config.ts',
		'apps/web/next.config.js',
		'apps/web/next.config.mjs',
		'apps/web/next.config.ts',
	]);
	const hasApi = await hasAny(targetPath, [
		'apps/api',
		'start/routes.ts',
		'ace.js',
	]);
	const hasMobile = await hasAny(targetPath, [
		'apps/mobile',
		'apps/mobile/app.json',
		'apps/mobile/App.tsx',
		'app.json',
		'App.tsx',
	]);

	if (hasWebsite && hasWeb && hasApi && hasMobile) {
		return 'full-product';
	}

	if (hasWeb && hasApi && hasMobile) {
		return 'web-api-mobile';
	}

	if (hasWebsite && hasApi) {
		return 'website-api';
	}

	if (hasWeb && hasApi) {
		return 'web-api';
	}

	if (hasWeb) {
		return 'web-app';
	}

	if (hasApi) {
		return 'api';
	}

	if (hasMobile) {
		return 'mobile';
	}

	if (hasWebsite) {
		return 'website';
	}

	return 'web-api';
};

export const detectStack = async (
	targetPath: string,
): Promise<DetectedStack> => {
	const isMonorepo = await hasAny(targetPath, [
		'pnpm-workspace.yaml',
		'turbo.json',
		'apps',
	]);
	const packageManager = (await exists(join(targetPath, 'pnpm-lock.yaml')))
		? 'pnpm'
		: (await exists(join(targetPath, 'yarn.lock')))
			? 'yarn'
			: (await exists(join(targetPath, 'package-lock.json')))
				? 'npm'
				: 'unknown';

	const lint: Array<'biome' | 'eslint' | 'prettier'> = [];
	if (await hasAny(targetPath, ['biome.json'])) lint.push('biome');
	if (
		await hasAny(targetPath, [
			'.eslintrc',
			'.eslintrc.js',
			'.eslintrc.json',
			'eslint.config.js',
		])
	)
		lint.push('eslint');
	if (
		await hasAny(targetPath, [
			'.prettierrc',
			'.prettierrc.js',
			'.prettierrc.json',
			'prettier.config.js',
		])
	) {
		lint.push('prettier');
	}

	return {
		repoShape: isMonorepo
			? 'monorepo'
			: (await hasAny(targetPath, ['package.json']))
				? 'single-app'
				: 'unknown',
		packageManager,
		lint,
		turbo: await hasAny(targetPath, ['turbo.json']),
		devcontainer: await hasAny(targetPath, ['.devcontainer/devcontainer.json']),
		githubActions: await hasAny(targetPath, ['.github/workflows']),
		terraform: await hasAny(targetPath, ['infra/terraform', '.terraform']),
		docker: await hasAny(targetPath, [
			'Dockerfile',
			'apps/api/Dockerfile',
			'apps/web/Dockerfile',
		]),
		presetGuess: await detectPreset(targetPath),
	};
};

const buildEvidence = async (targetPath: string) => {
	const evidence = {
		railway: [] as string[],
		vercel: [] as string[],
		cloudRun: [] as string[],
		cloudflarePages: [] as string[],
		ghPages: [] as string[],
		aws: [] as string[],
	};

	const addIfExists = async (collection: string[], relPath: string) => {
		if (await exists(join(targetPath, relPath))) {
			collection.push(relPath);
		}
	};

	await Promise.all([
		addIfExists(evidence.railway, 'railway.toml'),
		addIfExists(evidence.railway, 'infra/terraform/main.tf'),
		addIfExists(evidence.vercel, '.vercel/project.json'),
		addIfExists(evidence.vercel, 'vercel.json'),
		addIfExists(evidence.vercel, '.github/workflows/reusable-vercel.yml'),
		addIfExists(evidence.vercel, 'scripts/vercel.sh'),
		addIfExists(evidence.cloudflarePages, 'wrangler.jsonc'),
		addIfExists(evidence.cloudflarePages, 'apps/website/wrangler.jsonc'),
		addIfExists(evidence.cloudflarePages, 'apps/landing/wrangler.jsonc'),
		addIfExists(
			evidence.cloudflarePages,
			'.github/workflows/deploy-website-cloudflare-pages.yml',
		),
		addIfExists(evidence.cloudRun, 'deploy/cloud-run'),
		addIfExists(evidence.cloudRun, 'scripts/cloud-run.sh'),
		addIfExists(evidence.cloudRun, 'scripts/gcloud-run.sh'),
		addIfExists(evidence.ghPages, '.github/workflows/deploy-gh-pages.yml'),
		addIfExists(evidence.aws, 'apprunner.yaml'),
	]);

	const filesToScan = [
		'README.md',
		'infra/terraform/main.tf',
		'.github/workflows/reusable-deploy.yml',
		'.github/workflows/reusable-terraform.yml',
		'wrangler.jsonc',
		'apps/website/wrangler.jsonc',
		'apps/landing/wrangler.jsonc',
		'scripts/deployment.sh',
		'scripts/terraform.sh',
	];

	for (const file of filesToScan) {
		const absolutePath = join(targetPath, file);
		if (!(await exists(absolutePath))) {
			continue;
		}

		const raw = await readText(absolutePath);
		if (/run\.googleapis|google_cloud_run|Cloud Run|gcloud/i.test(raw)) {
			evidence.cloudRun.push(file);
		}
		if (/railway/i.test(raw)) {
			evidence.railway.push(file);
		}
		if (/vercel/i.test(raw)) {
			evidence.vercel.push(file);
		}
		if (/cloudflare|wrangler|pages_project/i.test(raw)) {
			evidence.cloudflarePages.push(file);
		}
		if (/gh-pages|github pages/i.test(raw)) {
			evidence.ghPages.push(file);
		}
		if (/apprunner|app runner|aws/i.test(raw)) {
			evidence.aws.push(file);
		}
	}

	return evidence;
};

const detectCurrentProvider = async (
	targetPath: string,
	packageId: string,
	kind: DetectedPackage['kind'],
): Promise<{ provider: DeployProvider | null; evidence: string[] }> => {
	const evidence = await buildEvidence(targetPath);

	if (kind === 'website') {
		if (evidence.cloudflarePages.length > 0) {
			return {
				provider: 'cloudflare-pages',
				evidence: evidence.cloudflarePages,
			};
		}
		if (evidence.vercel.length > 0) {
			return { provider: 'vercel', evidence: evidence.vercel };
		}
		if (evidence.ghPages.length > 0) {
			return { provider: 'gh-pages', evidence: evidence.ghPages };
		}
	}

	if (packageId === 'web' && evidence.vercel.length > 0) {
		return { provider: 'vercel', evidence: evidence.vercel };
	}

	if (
		(packageId === 'api' || kind === 'worker') &&
		evidence.cloudRun.length > 0
	) {
		return { provider: 'cloud-run', evidence: evidence.cloudRun };
	}

	if (evidence.railway.length > 0) {
		return { provider: 'railway', evidence: evidence.railway };
	}

	if (evidence.cloudRun.length > 0) {
		return { provider: 'cloud-run', evidence: evidence.cloudRun };
	}

	if (evidence.aws.length > 0) {
		return { provider: 'aws-app-runner', evidence: evidence.aws };
	}

	return { provider: null, evidence: [] };
};

const isArchetypeKind = (
	kind: DetectedPackage['kind'],
): kind is ArchetypeType => {
	return (
		kind === 'web-app' ||
		kind === 'api' ||
		kind === 'mobile' ||
		kind === 'website'
	);
};

const detectPackages = async (
	targetPath: string,
): Promise<DetectedPackage[]> => {
	const detectedPackages: DetectedPackage[] = [];

	const candidates: Array<{
		id: string;
		path: string;
		kind: DetectedPackage['kind'];
		modules: PackageModuleId[];
	}> = [
		{
			id: 'website',
			path: 'apps/website',
			kind: 'website',
			modules: ['website-astro'],
		},
		{
			id: 'landing',
			path: 'apps/landing',
			kind: 'website',
			modules: ['website-astro'],
		},
		{ id: 'web', path: 'apps/web', kind: 'web-app', modules: ['web-next'] },
		{ id: 'api', path: 'apps/api', kind: 'api', modules: ['api-adonis'] },
		{
			id: 'mobile',
			path: 'apps/mobile',
			kind: 'mobile',
			modules: ['mobile-expo'],
		},
		{
			id: 'worker',
			path: 'apps/worker',
			kind: 'worker',
			modules: ['api-adonis'],
		},
	];

	for (const candidate of candidates) {
		if (!(await exists(join(targetPath, candidate.path)))) {
			continue;
		}

		const current = await detectCurrentProvider(
			targetPath,
			candidate.id,
			candidate.kind,
		);
		detectedPackages.push({
			id: candidate.id,
			path: candidate.path,
			kind: candidate.kind,
			modules: candidate.modules,
			currentProvider: current.provider,
			providerEvidence: current.evidence,
		});
	}

	if (
		detectedPackages.length === 0 &&
		(await hasAny(targetPath, [
			'next.config.js',
			'next.config.mjs',
			'next.config.ts',
			'app',
		]))
	) {
		const current = await detectCurrentProvider(targetPath, 'web', 'web-app');
		detectedPackages.push({
			id: 'web',
			path: '.',
			kind: 'web-app',
			modules: ['web-next'],
			currentProvider: current.provider,
			providerEvidence: current.evidence,
		});
	}

	if (
		detectedPackages.length === 0 &&
		(await hasAny(targetPath, ['astro.config.mjs', 'src/pages']))
	) {
		const current = await detectCurrentProvider(
			targetPath,
			'website',
			'website',
		);
		detectedPackages.push({
			id: 'website',
			path: '.',
			kind: 'website',
			modules: ['website-astro'],
			currentProvider: current.provider,
			providerEvidence: current.evidence,
		});
	}

	if (
		detectedPackages.length === 0 &&
		(await hasAny(targetPath, ['start/routes.ts', 'ace.js']))
	) {
		const current = await detectCurrentProvider(targetPath, 'api', 'api');
		detectedPackages.push({
			id: 'api',
			path: '.',
			kind: 'api',
			modules: ['api-adonis'],
			currentProvider: current.provider,
			providerEvidence: current.evidence,
		});
	}

	if (
		detectedPackages.length === 0 &&
		(await hasAny(targetPath, ['app.json', 'App.tsx']))
	) {
		const current = await detectCurrentProvider(targetPath, 'mobile', 'mobile');
		detectedPackages.push({
			id: 'mobile',
			path: '.',
			kind: 'mobile',
			modules: ['mobile-expo'],
			currentProvider: current.provider,
			providerEvidence: current.evidence,
		});
	}

	return detectedPackages;
};

const buildRecommendedManifest = async (
	targetPath: string,
	detected: DetectedStack,
	detectedPackages: DetectedPackage[],
	desiredProviders: Record<string, DeployProvider>,
) => {
	const manifest = createDefaultManifest(targetPath, detected.presetGuess);
	const packages =
		detectedPackages.length > 0 ? detectedPackages : manifest.packages;
	const workspaceMode = packages.length > 1 ? 'monorepo' : 'standalone';

	manifest.workspace = { mode: workspaceMode };
	manifest.archetypes = packages.flatMap(projectPackage => {
		const type = projectPackage.kind;
		if (!isArchetypeKind(type)) {
			return [];
		}

		return [
			{
				id: projectPackage.id,
				type,
				path: projectPackage.path,
			},
		];
	});
	manifest.coreModules = [
		'repo-foundation',
		'devcontainer',
		'github-actions',
		'docs-core',
		...(workspaceMode === 'monorepo'
			? (['monorepo-core', 'shared-contracts'] as const)
			: []),
	];
	manifest.packages = packages.map(projectPackage => ({
		id: projectPackage.id,
		name:
			projectPackage.id === 'api'
				? 'API'
				: projectPackage.id === 'web'
					? 'Web App'
					: projectPackage.id === 'mobile'
						? 'Mobile App'
						: projectPackage.id === 'website' || projectPackage.id === 'landing'
							? 'Website'
							: slugify(projectPackage.id),
		path: projectPackage.path,
		kind: projectPackage.kind,
		modules: projectPackage.modules,
	}));

	manifest.deployments = manifest.packages.flatMap(projectPackage => {
		if (projectPackage.kind === 'mobile') {
			return [];
		}

		const detectedPackage = detectedPackages.find(
			entry => entry.id === projectPackage.id,
		);
		const desiredProvider = desiredProviders[projectPackage.id];
		const selectedProvider =
			desiredProvider &&
			isProviderSupportedForKind(projectPackage.kind, desiredProvider)
				? desiredProvider
				: detectedPackage?.currentProvider &&
						isProviderSupportedForKind(
							projectPackage.kind,
							detectedPackage.currentProvider,
						)
					? detectedPackage.currentProvider
					: projectPackage.kind === 'website'
						? 'cloudflare-pages'
						: projectPackage.kind === 'web-app'
							? 'vercel'
							: 'cloud-run';

		return {
			packageId: projectPackage.id,
			provider: selectedProvider,
			moduleId: getProviderModuleId(selectedProvider),
			version: '1.0.0',
			environmentBindings:
				projectPackage.kind === 'api'
					? [
							{
								name: 'PORT',
								source: 'runtime' as const,
								description: 'Runtime port exposed by the provider.',
							},
						]
					: projectPackage.kind === 'web-app'
						? [
								{
									name: 'NEXT_PUBLIC_API_URL',
									source: 'runtime' as const,
									description: 'Public API base URL used by the frontend.',
								},
							]
						: [],
			dependencyEdges:
				projectPackage.id === 'web' &&
				detectedPackages.some(entry => entry.id === 'api')
					? [{ packageId: 'api', relation: 'calls' as const }]
					: [],
		};
	});

	return manifest;
};

const collectMissingArtifacts = async (
	targetPath: string,
): Promise<MigrationArtifact[]> => {
	const candidates = [
		{
			path: MANIFEST_FILE,
			reason: 'technical package and deployment manifest',
		},
		{
			path: '.boilerplate/bmad-workflow-pack/pack.json',
			reason: 'versioned BMAD workflow pack source',
		},
		{
			path: '.agents/skills/bmad-start-project/SKILL.md',
			reason: 'new-project inception and first Work Item skill',
		},
		{
			path: '.agents/skills/bmad-update-project/SKILL.md',
			reason: 'legacy baseline and governed repository update skill',
		},
		{
			path: '.agents/skills/bmad-workflow-setup/SKILL.md',
			reason: 'project workflow onboarding and reconfiguration skill',
		},
		{
			path: '.agents/skills/bmad-publish-work-item/SKILL.md',
			reason: 'adaptive Work Item publication and routing skill',
		},
		{
			path: '_bmad/custom/guidelines/kiss.md',
			reason: 'generic BMAD KISS policy',
		},
		{
			path: 'docs/bmad-project-workflow/index.md',
			reason: 'new-project and existing-repository workflow documentation',
		},
		{
			path: 'docs/bmad-work-item-workflow/index.md',
			reason: 'adaptive Work Item delivery workflow documentation',
		},
	];

	const missing: MigrationArtifact[] = [];
	for (const candidate of candidates) {
		if (!(await exists(join(targetPath, candidate.path)))) {
			missing.push(candidate);
		}
	}

	return missing;
};

const buildActions = (
	detectedPackages: DetectedPackage[],
	manifest: ProjectManifest,
	missingArtifacts: MigrationArtifact[],
	desiredProviders: Record<string, DeployProvider>,
) => {
	const actions: MigrationAction[] = [];

	if (missingArtifacts.length > 0) {
		actions.push({
			id: 'adopt-core-artifacts',
			type: 'adopt-core-artifact',
			title: 'Adopt technical manifest and BMAD workflow pack',
			details: missingArtifacts
				.map(artifact => `${artifact.path} (${artifact.reason})`)
				.join(', '),
		});
	}

	for (const detectedPackage of detectedPackages) {
		const desiredProvider = desiredProviders[detectedPackage.id];
		if (!desiredProvider) {
			continue;
		}

		const manifestDeployment = manifest.deployments.find(
			entry => entry.packageId === detectedPackage.id,
		);
		if (!manifestDeployment) {
			continue;
		}

		actions.push({
			id: `set-provider-${detectedPackage.id}-${desiredProvider}`,
			type: 'set-provider',
			title: `Set ${detectedPackage.id} provider to ${desiredProvider}`,
			details: `Current provider: ${detectedPackage.currentProvider ?? 'unassigned'}. Target provider: ${desiredProvider}.`,
			packageId: detectedPackage.id,
			fromProvider: detectedPackage.currentProvider,
			toProvider: manifestDeployment.provider,
		});
	}

	return actions;
};

const reportToMarkdown = (report: MigrationReport) => {
	const packageLines =
		report.detectedPackages
			.map(projectPackage => {
				const evidence =
					projectPackage.providerEvidence.join(', ') ||
					'no explicit provider evidence';
				return `- ${projectPackage.id}: ${projectPackage.kind} at ${projectPackage.path} -> ${projectPackage.currentProvider ?? 'unassigned'} (${evidence})`;
			})
			.join('\n') || '- none';

	const artifactLines =
		report.missingArtifacts
			.map(artifact => `- ${artifact.path} (${artifact.reason})`)
			.join('\n') || '- none';

	const actionLines =
		report.actions
			.map(action => `- ${action.id}: ${action.title} -> ${action.details}`)
			.join('\n') || '- none';

	const deploymentLines =
		report.recommendedManifest.deployments
			.map(
				entry =>
					`- ${entry.packageId}: ${entry.provider} via ${entry.moduleId}`,
			)
			.join('\n') || '- none';

	return `# Migration Report

Generated at: ${report.generatedAt}
Target: ${report.targetPath}

## Detected Stack

- Repo shape: ${report.detected.repoShape}
- Preset guess: ${report.detected.presetGuess}
- Package manager: ${report.detected.packageManager}
- Lint stack: ${report.detected.lint.join(', ') || 'none'}
- Turbo: ${report.detected.turbo}
- Devcontainer: ${report.detected.devcontainer}
- GitHub Actions: ${report.detected.githubActions}
- Terraform: ${report.detected.terraform}
- Docker: ${report.detected.docker}

## Detected Packages
${packageLines}

## Recommended Deployment Topology
${deploymentLines}

## Missing Artifacts
${artifactLines}

## Actions
${actionLines}
`;
};

const applyModuleDynamicFiles = async (args: {
	targetPath: string;
	manifest: ProjectManifest;
	moduleId: ModuleId;
	packageId?: string;
}) => {
	const definition = getModuleDefinition(args.moduleId);
	if (!definition.dynamicFiles) {
		return [];
	}

	const projectPackage = args.packageId
		? args.manifest.packages.find(entry => entry.id === args.packageId)
		: undefined;
	const deployment = projectPackage
		? args.manifest.deployments.find(
				entry => entry.packageId === projectPackage.id,
			)
		: undefined;

	const files = definition.dynamicFiles({
		manifest: args.manifest,
		projectPackage,
		deployment,
	});

	const written: string[] = [];
	for (const [relativePath, content] of Object.entries(files)) {
		await writeText(
			join(args.targetPath, relativePath),
			content.endsWith('\n') ? content : `${content}\n`,
		);
		written.push(relativePath);
	}

	return written;
};

export const runMigrationAnalysis = async (
	targetPath: string,
	desiredProviders: Record<string, DeployProvider> = {},
) => {
	const detected = await detectStack(targetPath);
	const detectedPackages = await detectPackages(targetPath);
	const recommendedManifest = await buildRecommendedManifest(
		targetPath,
		detected,
		detectedPackages,
		desiredProviders,
	);
	const missingArtifacts = await collectMissingArtifacts(targetPath);
	const actions = buildActions(
		detectedPackages,
		recommendedManifest,
		missingArtifacts,
		desiredProviders,
	);

	const report: MigrationReport = {
		generatedAt: new Date().toISOString(),
		targetPath,
		detected,
		detectedPackages,
		recommendedManifest,
		missingArtifacts,
		actions,
		summary: {
			packageCount: detectedPackages.length,
			missingArtifactCount: missingArtifacts.length,
			actionCount: actions.length,
		},
	};

	await ensureDir(join(targetPath, dirname(MIGRATION_REPORT_JSON)));
	await writeJsonFile(join(targetPath, MIGRATION_REPORT_JSON), report);
	await writeText(
		join(targetPath, MIGRATION_REPORT_MD),
		reportToMarkdown(report),
	);

	return report;
};

export const applyMigration = async (args: {
	targetPath: string;
	selectedPatchFiles: string[];
	applyAllPatches: boolean;
	desiredProviders: Record<string, DeployProvider>;
}) => {
	const report = await runMigrationAnalysis(
		args.targetPath,
		args.desiredProviders,
	);
	const selected = new Set(
		args.selectedPatchFiles.map(value => value.trim()).filter(Boolean),
	);
	const shouldApplyAction = (action: MigrationAction) =>
		args.applyAllPatches ||
		selected.size === 0 ||
		selected.has(action.id) ||
		selected.has(action.packageId ?? '');

	await writeManifest(args.targetPath, report.recommendedManifest);

	const appliedArtifacts: string[] = [];

	if (
		report.actions.some(
			action =>
				action.type === 'adopt-core-artifact' && shouldApplyAction(action),
		)
	) {
		for (const moduleId of ['docs-core'] as const) {
			const written = await applyModuleDynamicFiles({
				targetPath: args.targetPath,
				manifest: report.recommendedManifest,
				moduleId,
			});
			appliedArtifacts.push(...written);
		}

		for (const script of ['install-bmad.sh', 'bmad-workflow-pack.mjs']) {
			await copyTemplateEntry({
				sourcePath: join(REPO_ROOT, 'scripts', script),
				targetPath: join(args.targetPath, 'scripts', script),
				replacements: {},
				overwrite: false,
			});
			appliedArtifacts.push(`scripts/${script}`);
		}

		const packApply = spawnSync(
			process.execPath,
			[
				join(REPO_ROOT, 'scripts', 'bmad-workflow-pack.mjs'),
				'apply',
				'--source',
				join(REPO_ROOT, '.boilerplate', 'bmad-workflow-pack'),
				'--target',
				args.targetPath,
			],
			{ encoding: 'utf8' },
		);
		if (packApply.status !== 0) {
			throw new Error(
				`Failed to apply BMAD workflow pack: ${packApply.stderr.trim()}`,
			);
		}
		appliedArtifacts.push(
			'.boilerplate/bmad-workflow-pack',
			'docs/bmad-project-workflow',
			'docs/bmad-work-item-workflow',
		);
	}

	for (const deployment of report.recommendedManifest.deployments) {
		const action = report.actions.find(
			candidate =>
				candidate.type === 'set-provider' &&
				candidate.packageId === deployment.packageId &&
				shouldApplyAction(candidate),
		);

		if (!action && Object.keys(args.desiredProviders).length > 0) {
			continue;
		}

		const written = await applyModuleDynamicFiles({
			targetPath: args.targetPath,
			manifest: report.recommendedManifest,
			moduleId: deployment.moduleId,
			packageId: deployment.packageId,
		});
		appliedArtifacts.push(...written);
	}

	return {
		appliedArtifacts: Array.from(new Set(appliedArtifacts)),
		appliedActions: report.actions
			.filter(action => shouldApplyAction(action))
			.map(action => action.id),
	};
};
