import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import {
  createDefaultManifest,
  loadProjectBrief,
  writeManifest,
  writeProjectBrief,
} from '../src/lib/brief.js';
import { exists, readText } from '../src/lib/fs-utils.js';
import { scaffoldProject } from '../src/lib/scaffold.js';
import { makeTempDir, removeTempDir } from './helpers.js';
import type { PresetName } from '../src/lib/types.js';

const scaffoldFromPreset = async (root: string, preset: PresetName) => {
  const manifest = createDefaultManifest(root, preset);
  await writeManifest(root, manifest);
  await writeProjectBrief(root, manifest, true);
  const brief = await loadProjectBrief(root);

  await scaffoldProject({
    targetPath: root,
    brief,
    manifest,
    deterministic: true,
    docsOnly: false,
    ticketsOnly: false,
    withTickets: false,
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
    await writeProjectBrief(root, manifest, true);
    const brief = await loadProjectBrief(root);

    await scaffoldProject({
      targetPath: root,
      brief,
      manifest,
      deterministic: true,
      docsOnly: false,
      ticketsOnly: false,
      withTickets: false,
      overwrite: true,
    });

    assert.equal(await exists(join(root, 'packages/shared/src/ticket.ts')), false);
    assert.equal(await exists(join(root, 'apps/api/app/services/ticket_service.ts')), false);
    assert.equal(await exists(join(root, '.github/workflows/deploy-web-vercel.yml')), true);
    assert.equal(await exists(join(root, 'deploy/cloud-run/api.service.yaml')), true);
  } finally {
    await removeTempDir(root);
  }
});

test('mixed deployment topology scaffold writes provider-specific files per package', async () => {
  const root = await makeTempDir('scaffold-topology');

  try {
    const manifest = createDefaultManifest(root, 'full-product');
    const websiteDeployment = manifest.deployments.find(entry => entry.packageId === 'website');
    assert.ok(websiteDeployment);
    websiteDeployment.provider = 'gh-pages';
    websiteDeployment.moduleId = 'deploy-gh-pages';

    await writeManifest(root, manifest);
    await writeProjectBrief(root, manifest, true);
    const brief = await loadProjectBrief(root);

    await scaffoldProject({
      targetPath: root,
      brief,
      manifest,
      deterministic: true,
      docsOnly: false,
      ticketsOnly: false,
      withTickets: false,
      overwrite: true,
    });

    assert.equal(await exists(join(root, '.github/workflows/deploy-website-gh-pages.yml')), true);
    assert.equal(await exists(join(root, '.github/workflows/deploy-web-vercel.yml')), true);
    assert.equal(await exists(join(root, '.github/workflows/deploy-api-cloud-run.yml')), true);
    assert.equal(await exists(join(root, 'docs/deployment/website-gh-pages.md')), true);
    assert.equal(await exists(join(root, 'apps/website/astro.config.mjs')), true);
    const websitePage = await readText(join(root, 'apps/website/src/pages/index.astro'));
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
    await writeProjectBrief(root, manifest, true);
    const brief = await loadProjectBrief(root);

    await scaffoldProject({
      targetPath: root,
      brief,
      manifest,
      deterministic: true,
      docsOnly: false,
      ticketsOnly: false,
      withTickets: false,
      overwrite: true,
    });

    assert.deepEqual(
      manifest.packages.map(projectPackage => projectPackage.id),
      ['web', 'api', 'mobile'],
    );
    assert.equal(
      manifest.deployments.some(deployment => deployment.packageId === 'mobile'),
      false,
    );
    assert.equal(await exists(join(root, 'apps/mobile/app.json')), true);
    assert.equal(await exists(join(root, 'apps/mobile/App.tsx')), true);
    assert.equal(await exists(join(root, '.github/workflows/deploy-web-vercel.yml')), true);
    assert.equal(await exists(join(root, '.github/workflows/deploy-api-cloud-run.yml')), true);

    const appJson = await readText(join(root, 'apps/mobile/app.json'));
    assert.match(appJson, /"expo"/);
  } finally {
    await removeTempDir(root);
  }
});
