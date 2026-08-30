import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applyMigration, runMigrationAnalysis } from '../src/lib/migrate.js';
import { exists, readText } from '../src/lib/fs-utils.js';
import {
	createIssueCrafterFixture,
	createLeythFixture,
	createMizanFixture,
	removeTempDir,
} from './helpers.js';

test('migration analysis detects provider switch actions for Leyth fixture', async () => {
	const root = await createLeythFixture();

	try {
		const report = await runMigrationAnalysis(root, {
			web: 'vercel',
			api: 'cloud-run',
		});

		assert.equal(report.detected.presetGuess, 'web-api');
		assert.equal(report.summary.packageCount, 2);
		assert.ok(
			report.actions.some(action => action.id === 'set-provider-web-vercel'),
		);
		assert.ok(
			report.actions.some(action => action.id === 'set-provider-api-cloud-run'),
		);
	} finally {
		await removeTempDir(root);
	}
});

test('migration analysis treats Vercel script evidence as Vercel, not Cloud Run', async () => {
	const root = await createLeythFixture();

	try {
		await mkdir(join(root, 'scripts'), { recursive: true });
		await writeFile(join(root, 'scripts/vercel.sh'), 'vercel deploy --prod\n');

		const report = await runMigrationAnalysis(root);
		const webDeployment = report.recommendedManifest.deployments.find(
			entry => entry.packageId === 'web',
		);

		assert.equal(webDeployment?.provider, 'vercel');
	} finally {
		await removeTempDir(root);
	}
});

test('migration analysis marks Mizan fixture as web-api-mobile with a mobile package', async () => {
	const root = await createMizanFixture();

	try {
		const report = await runMigrationAnalysis(root);
		assert.equal(report.detected.presetGuess, 'web-api-mobile');
		assert.ok(
			report.recommendedManifest.packages.some(
				projectPackage => projectPackage.id === 'mobile',
			),
		);
		assert.equal(
			report.recommendedManifest.deployments.some(
				deployment => deployment.packageId === 'mobile',
			),
			false,
		);
	} finally {
		await removeTempDir(root);
	}
});

test('migration analysis treats IssueCrafter ticket docs as normal project docs', async () => {
	const root = await createIssueCrafterFixture();

	try {
		const report = await runMigrationAnalysis(root);
		assert.equal(report.detected.presetGuess, 'web-api');
		assert.equal(
			report.recommendedManifest.coreModules.some(moduleId =>
				moduleId.includes('ticket'),
			),
			false,
		);
	} finally {
		await removeTempDir(root);
	}
});

test('migration apply writes core artifacts and provider module files', async () => {
	const root = await createLeythFixture();

	try {
		const result = await applyMigration({
			targetPath: root,
			selectedPatchFiles: [],
			applyAllPatches: true,
			desiredProviders: {
				web: 'vercel',
				api: 'cloud-run',
			},
		});

		assert.ok(result.appliedActions.includes('adopt-core-artifacts'));
		assert.equal(
			await exists(join(root, '.boilerplate/project-manifest.json')),
			true,
		);
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
			await exists(join(root, 'docs/bmad-project-workflow/index.md')),
			true,
		);
		assert.equal(
			await exists(join(root, 'docs/bmad-work-item-workflow/index.md')),
			true,
		);
		assert.equal(
			await exists(join(root, 'docs/deployment/web-vercel.md')),
			true,
		);
		assert.equal(
			await exists(join(root, 'deploy/cloud-run/api.service.yaml')),
			true,
		);

		const manifest = await readText(
			join(root, '.boilerplate/project-manifest.json'),
		);
		assert.match(manifest, /"provider": "cloud-run"/);
		assert.equal(await exists(join(root, 'docs/tickets')), false);
	} finally {
		await removeTempDir(root);
	}
});

test('migration preserves existing legacy product and ticket documents', async () => {
	const root = await createIssueCrafterFixture();
	try {
		await writeFile(
			join(root, 'PRODUCT_SPEC.md'),
			'# Historical product spec\n',
		);
		await applyMigration({
			targetPath: root,
			selectedPatchFiles: [],
			applyAllPatches: true,
			desiredProviders: {},
		});
		assert.equal(
			await readText(join(root, 'PRODUCT_SPEC.md')),
			'# Historical product spec\n',
		);
		assert.equal(
			await readText(join(root, 'docs/tickets/template.md')),
			'# Ticket Template\n',
		);
	} finally {
		await removeTempDir(root);
	}
});
