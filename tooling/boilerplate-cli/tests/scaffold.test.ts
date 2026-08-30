import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { createDefaultManifest, writeManifest } from '../src/lib/manifest.js';
import { exists, readText } from '../src/lib/fs-utils.js';
import { scaffoldProject } from '../src/lib/scaffold.js';
import { makeTempDir, removeTempDir } from './helpers.js';
import type { PresetName } from '../src/lib/types.js';

const scaffoldFromPreset = async (root: string, preset: PresetName) => {
	const manifest = createDefaultManifest(root, preset);
	await writeManifest(root, manifest);

	await scaffoldProject({
		targetPath: root,
		manifest,
		overwrite: true,
	});

	return manifest;
};

test('standalone archetypes render at repo root with standalone tsconfig extends', async () => {
	const presets: PresetName[] = ['web-app', 'api', 'mobile'];

	for (const preset of presets) {
		const root = await makeTempDir(`scaffold-${preset}`);

		try {
			const manifest = await scaffoldFromPreset(root, preset);
			assert.equal(manifest.workspace.mode, 'standalone');
			assert.equal(manifest.packages[0]?.path, '.');
			assert.equal(await exists(join(root, 'tsconfig.base.json')), true);

			const tsconfig = await readText(join(root, 'tsconfig.json'));
			assert.match(tsconfig, /"\.\/tsconfig\.base\.json"/);
			const packageJson = JSON.parse(
				await readText(join(root, 'package.json')),
			);
			assert.equal(packageJson.engines.node, '>=22.20');
			assert.equal(packageJson.devDependencies['@biomejs/biome'], '2.5.4');
			assert.equal(
				packageJson.scripts['bmad:install'],
				'scripts/install-bmad.sh',
			);
			assert.equal(
				packageJson.scripts['bmad:install:stable'],
				'scripts/install-bmad.sh',
			);
			assert.match(
				packageJson.scripts['bmad:install:preview'],
				/bmad-method@next/,
			);
			assert.match(packageJson.scripts['bmad:validate'], /bmad-workflow-pack/);

			const biomeConfig = JSON.parse(await readText(join(root, 'biome.json')));
			assert.equal(
				biomeConfig.$schema,
				'https://biomejs.dev/schemas/2.5.4/schema.json',
			);
			assert.equal(biomeConfig.linter.rules.preset, 'recommended');
			assert.equal(biomeConfig.formatter.indentStyle, 'tab');
			assert.ok(biomeConfig.files.includes.includes('!!**/_bmad'));
			assert.equal(
				biomeConfig.files.includes.some((pattern: string) =>
					pattern.includes('apps/docs'),
				),
				false,
			);
		} finally {
			await removeTempDir(root);
		}
	}
});

test('generic web-api scaffold omits ticketing code', async () => {
	const root = await makeTempDir('scaffold-generic');

	try {
		const manifest = createDefaultManifest(root, 'web-api');
		await writeManifest(root, manifest);

		await scaffoldProject({
			targetPath: root,
			manifest,
			overwrite: true,
		});

		assert.equal(
			await exists(join(root, 'packages/shared/src/ticket.ts')),
			false,
		);
		assert.equal(
			await exists(join(root, 'apps/api/app/services/ticket_service.ts')),
			false,
		);
		assert.equal(await exists(join(root, 'PRODUCT_SPEC.md')), false);
		assert.equal(await exists(join(root, 'docs/tickets')), false);
		assert.equal(
			await exists(join(root, '.agents/skills/bmad-start-project/SKILL.md')),
			true,
		);
		assert.equal(
			await exists(join(root, '.agents/skills/bmad-update-project/SKILL.md')),
			true,
		);
		assert.equal(
			await exists(join(root, '.agents/skills/bmad-workflow-setup/SKILL.md')),
			true,
		);
		assert.equal(
			await exists(join(root, '_bmad/custom/guidelines/kiss.md')),
			true,
		);
		assert.equal(
			await exists(join(root, 'docs/bmad-project-workflow/index.md')),
			true,
		);
		assert.equal(
			await exists(join(root, 'docs/bmad-work-item-workflow/index.md')),
			true,
		);
		assert.equal(
			await exists(join(root, 'docs/bmad-feature-workflow/index.md')),
			false,
		);
		assert.equal(
			await exists(join(root, '.github/workflows/deploy-web-vercel.yml')),
			true,
		);
		assert.equal(
			await exists(join(root, 'deploy/cloud-run/api.service.yaml')),
			true,
		);

		const devcontainer = await readText(
			join(root, '.devcontainer/devcontainer.json'),
		);
		assert.doesNotMatch(devcontainer, /"features"|ghcr\.io/);

		const dockerfile = await readText(join(root, '.devcontainer/Dockerfile'));
		for (const expected of [
			'docker-ce-cli',
			'docker-compose-plugin',
			'gh',
			'infisical',
			'terraform',
			'ARG NODE_VERSION="24.15.0"',
			'SHASUMS256.txt',
			'https://astral.sh/uv/install.sh',
		]) {
			assert.match(dockerfile, new RegExp(expected.replaceAll('.', '\\.')));
		}

		const compose = await readText(
			join(root, '.devcontainer/docker-compose.yml'),
		);
		assert.match(compose, /host\.docker\.internal:host-gateway/);

		const codexMcp = await readText(join(root, '.codex/config.toml'));
		const claudeMcp = await readText(join(root, '.mcp.json'));
		for (const adapter of [codexMcp, claudeMcp]) {
			assert.match(adapter, /chrome-devtools-mcp@latest/);
			assert.match(adapter, /host\.docker\.internal/);
			assert.match(adapter, /9222/);
			assert.doesNotMatch(adapter, /approval_policy|sandbox_mode/);
		}
	} finally {
		await removeTempDir(root);
	}
});

test('mixed deployment topology scaffold writes provider-specific files per package', async () => {
	const root = await makeTempDir('scaffold-topology');

	try {
		const manifest = createDefaultManifest(root, 'full-product');
		const websiteDeployment = manifest.deployments.find(
			entry => entry.packageId === 'website',
		);
		assert.ok(websiteDeployment);
		websiteDeployment.provider = 'gh-pages';
		websiteDeployment.moduleId = 'deploy-gh-pages';

		await writeManifest(root, manifest);

		await scaffoldProject({
			targetPath: root,
			manifest,
			overwrite: true,
		});

		assert.equal(
			await exists(join(root, '.github/workflows/deploy-website-gh-pages.yml')),
			true,
		);
		assert.equal(
			await exists(join(root, '.github/workflows/deploy-web-vercel.yml')),
			true,
		);
		assert.equal(
			await exists(join(root, '.github/workflows/deploy-api-cloud-run.yml')),
			true,
		);
		assert.equal(
			await exists(join(root, 'docs/deployment/website-gh-pages.md')),
			true,
		);
		assert.equal(
			await exists(join(root, 'apps/website/astro.config.mjs')),
			true,
		);
		const websitePage = await readText(
			join(root, 'apps/website/src/pages/index.astro'),
		);
		assert.match(websitePage, /New product foundation/);
	} finally {
		await removeTempDir(root);
	}
});

test('web-api-mobile scaffold includes Expo app without changing deployable package topology', async () => {
	const root = await makeTempDir('scaffold-web-api-mobile');

	try {
		const manifest = createDefaultManifest(root, 'web-api-mobile');
		await writeManifest(root, manifest);

		await scaffoldProject({
			targetPath: root,
			manifest,
			overwrite: true,
		});

		assert.deepEqual(
			manifest.packages.map(projectPackage => projectPackage.id),
			['web', 'api', 'mobile'],
		);
		assert.equal(
			manifest.deployments.some(
				deployment => deployment.packageId === 'mobile',
			),
			false,
		);
		assert.equal(await exists(join(root, 'apps/mobile/app.json')), true);
		assert.equal(await exists(join(root, 'apps/mobile/App.tsx')), true);
		assert.equal(
			await exists(join(root, '.github/workflows/deploy-web-vercel.yml')),
			true,
		);
		assert.equal(
			await exists(join(root, '.github/workflows/deploy-api-cloud-run.yml')),
			true,
		);

		const appJson = await readText(join(root, 'apps/mobile/app.json'));
		assert.match(appJson, /"expo"/);
	} finally {
		await removeTempDir(root);
	}
});
