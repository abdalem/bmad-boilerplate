import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { BOILERPLATE_DIR } from './constants.js';
import {
	copyTemplateTree,
	ensureDir,
	readJsonFile,
	writeJsonFile,
	writeText,
} from './fs-utils.js';
import { getModuleDefinition } from './module-registry.js';
import type { ProjectManifest, ProjectPackage } from './types.js';

const replacementsForManifest = (
	manifest: ProjectManifest,
	projectPackage?: ProjectPackage,
) => {
	const isStandalone = manifest.workspace.mode === 'standalone';
	const packageName = projectPackage
		? isStandalone
			? manifest.projectSlug
			: `@apps/${projectPackage.id}`
		: manifest.projectSlug;
	const tsconfigBaseExtends =
		projectPackage?.path === '.'
			? './tsconfig.base.json'
			: '../../tsconfig.base.json';

	return {
		'__PROJECT_NAME__': manifest.projectName,
		'__PROJECT_SLUG__': manifest.projectSlug,
		'__PACKAGE_ID__': projectPackage?.id ?? manifest.projectSlug,
		'__PACKAGE_NAME__': packageName,
		'__TSCONFIG_BASE_EXTENDS__': tsconfigBaseExtends,
	};
};

const applyModule = async (args: {
	targetPath: string;
	manifest: ProjectManifest;
	moduleId: ReturnType<typeof getModuleDefinition>['id'];
	overwrite: boolean;
	projectPackage?: ProjectPackage;
}) => {
	const definition = getModuleDefinition(args.moduleId);
	const replacements = replacementsForManifest(
		args.manifest,
		args.projectPackage,
	);
	const deployment = args.projectPackage
		? args.manifest.deployments.find(
				entry => entry.packageId === args.projectPackage?.id,
			)
		: undefined;

	for (const source of definition.sources ?? []) {
		const targetPrefix =
			source.targetPrefix ?? args.projectPackage?.path ?? undefined;
		await copyTemplateTree(
			source.root,
			args.targetPath,
			replacements,
			args.overwrite,
			{
				include: source.include,
				exclude: source.exclude,
				targetPrefix,
			},
		);
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

export const applyScaffoldModules = async (
	targetPath: string,
	manifest: ProjectManifest,
	overwrite: boolean,
) => {
	for (const moduleId of manifest.coreModules) {
		await applyModule({ targetPath, manifest, moduleId, overwrite });
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
		const projectPackage = manifest.packages.find(
			entry => entry.id === deployment.packageId,
		);
		if (!projectPackage) continue;
		await applyModule({
			targetPath,
			manifest,
			moduleId: deployment.moduleId,
			overwrite,
			projectPackage,
		});
	}
};

const applyWorkflowPack = (targetPath: string, overwrite: boolean) => {
	const script = join(targetPath, 'scripts', 'bmad-workflow-pack.mjs');
	const args = [script, 'apply', '--target', targetPath];
	if (overwrite) args.push('--force');
	const result = spawnSync(process.execPath, args, {
		cwd: targetPath,
		encoding: 'utf8',
	});
	if (result.status !== 0) {
		throw new Error(
			'Failed to apply BMAD workflow pack: ' +
				(result.stderr.trim() || result.stdout.trim() || 'unknown error'),
		);
	}
	return JSON.parse(result.stdout);
};

const ensureRootWorkflowScripts = async (targetPath: string) => {
	const packagePath = join(targetPath, 'package.json');
	const packageJson = await readJsonFile<Record<string, unknown>>(packagePath);
	const scripts = (packageJson.scripts ?? {}) as Record<string, string>;
	scripts['bmad:install'] = 'scripts/install-bmad.sh';
	scripts['bmad:install:stable'] = 'scripts/install-bmad.sh';
	scripts['bmad:install:latest'] =
		'BMAD_INSTALLER=bmad-method@latest scripts/install-bmad.sh';
	scripts['bmad:install:preview'] =
		'BMAD_INSTALLER=bmad-method@next BMAD_CHANNEL=next scripts/install-bmad.sh';
	scripts['bmad:status'] =
		'test -d _bmad || test -d _bmad-core || test -d .bmad-core';
	scripts['bmad:validate'] =
		'node scripts/bmad-workflow-pack.mjs validate --target . --upstream';
	packageJson.scripts = scripts;
	packageJson.engines = {
		...((packageJson.engines ?? {}) as Record<string, string>),
		node: '>=22.20',
		pnpm: '>=10',
	};
	packageJson.packageManager ??= 'pnpm@10.26.0';
	await writeJsonFile(packagePath, packageJson);
};

export const scaffoldProject = async (args: {
	targetPath: string;
	manifest: ProjectManifest;
	overwrite: boolean;
}) => {
	await applyScaffoldModules(args.targetPath, args.manifest, args.overwrite);
	await ensureRootWorkflowScripts(args.targetPath);
	const workflowPack = applyWorkflowPack(args.targetPath, args.overwrite);

	await ensureDir(join(args.targetPath, BOILERPLATE_DIR));
	await writeJsonFile(
		join(args.targetPath, BOILERPLATE_DIR, 'scaffold-log.json'),
		{
			generatedAt: new Date().toISOString(),
			notes: ['module-files-generated', 'bmad-workflow-pack-applied'],
			workflowPack,
			packages: args.manifest.packages.map(projectPackage => ({
				id: projectPackage.id,
				kind: projectPackage.kind,
				path: projectPackage.path,
				provider:
					args.manifest.deployments.find(
						entry => entry.packageId === projectPackage.id,
					)?.provider ?? null,
			})),
		},
	);
};
