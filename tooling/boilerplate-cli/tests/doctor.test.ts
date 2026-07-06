import test from 'node:test';
import assert from 'node:assert/strict';
import { createDefaultManifest, writeManifest } from '../src/lib/brief.js';
import { runDoctor } from '../src/lib/doctor.js';
import { makeTempDir, removeTempDir } from './helpers.js';

test('doctor only adds cloud-run tooling checks when a manifest uses cloud-run', async () => {
  const root = await makeTempDir('doctor-cloud-run');

  try {
    const manifest = createDefaultManifest(root, 'api');
    await writeManifest(root, manifest);

    const result = await runDoctor(root);
    assert.ok(result.checks.some(check => check.name === 'Google Cloud Run tooling'));
  } finally {
    await removeTempDir(root);
  }
});

test('doctor marks Claude and Docker checks as optional', async () => {
  const result = await runDoctor();
  const claude = result.checks.find(check => check.name === 'claude adapter available (optional)');
  const docker = result.checks.find(check => check.name === 'docker installed (optional)');

  assert.equal(claude?.optional, true);
  assert.equal(docker?.optional, true);
});

test('doctor skips cloud-run tooling checks when the manifest does not use cloud-run', async () => {
  const root = await makeTempDir('doctor-static');

  try {
    const manifest = createDefaultManifest(root, 'website');
    manifest.packages = [
      {
        id: 'website',
        name: 'Website',
        path: '.',
        kind: 'website',
        modules: ['website-astro'],
      },
    ];
    manifest.deployments = [
      {
        packageId: 'website',
        provider: 'gh-pages',
        moduleId: 'deploy-gh-pages',
        version: '1.0.0',
        environmentBindings: [],
        dependencyEdges: [],
      },
    ];

    await writeManifest(root, manifest);

    const result = await runDoctor(root);
    assert.equal(
      result.checks.some(check => check.name === 'Google Cloud Run tooling'),
      false,
    );
  } finally {
    await removeTempDir(root);
  }
});
