import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { buildModuleOrder } from '../src/lib/module-registry.js';
import {
	createDefaultManifest,
	loadManifest,
	writeManifest,
} from '../src/lib/manifest.js';
import { makeTempDir, removeTempDir } from './helpers.js';

test('manifest preset expands to selected package and deployment modules', () => {
	const manifest = createDefaultManifest('/tmp/example', 'web-api-mobile');
	assert.deepEqual(
		manifest.packages.map(entry => entry.modules[0]),
		['web-next', 'api-adonis', 'mobile-expo'],
	);
	assert.ok(buildModuleOrder(manifest).includes('deploy-vercel'));
	assert.ok(buildModuleOrder(manifest).includes('deploy-cloud-run'));
	assert.equal(
		manifest.deployments.some(entry => entry.packageId === 'mobile'),
		false,
	);
});

test('manifest rejects incompatible package providers and provider modules', async () => {
	const root = await makeTempDir('manifest-invalid');
	try {
		const manifest = createDefaultManifest(root, 'api');
		const deployment = manifest.deployments[0];
		assert.ok(deployment);
		deployment.provider = 'gh-pages';
		deployment.moduleId = 'deploy-gh-pages';
		await writeManifest(root, manifest);
		await assert.rejects(loadManifest(root), /not supported for api/);

		deployment.provider = 'cloud-run';
		deployment.moduleId = 'deploy-vercel';
		await writeManifest(root, manifest);
		await assert.rejects(loadManifest(root), /must use deploy-cloud-run/);
	} finally {
		await removeTempDir(root);
	}
});

test('technical manifest contains no product workflow state', () => {
	const raw = JSON.stringify(
		createDefaultManifest(join('/tmp', 'example'), 'web-app'),
	);
	assert.doesNotMatch(raw, /workflowStage|adapters|project-brief|PRODUCT_SPEC/);
});
