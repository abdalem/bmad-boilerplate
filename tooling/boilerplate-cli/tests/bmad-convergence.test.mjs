import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
	chmod,
	mkdtemp,
	mkdir,
	readFile,
	readdir,
	rm,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
	applyWorkflowPack,
	getBmadCompatibility,
	parseCsv,
	validateWorkflowPack,
} from '../../../.boilerplate/bmad-workflow-pack/lib/workflow-pack.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const sourcePack = join(repoRoot, '.boilerplate/bmad-workflow-pack');
const tools = ['.agents', '.claude'];
const requiredSkills = ['bmad-build', 'bmad-build-auto', 'bmad-walkthrough'];
const externalSkills = [
	'find-skills',
	'refactor',
	'vercel-composition-patterns',
	'vercel-react-best-practices',
	'web-design-guidelines',
];

const write = async (path, contents) => {
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, contents);
};

const addUpstream = async (target, version = '6.12.1') => {
	await write(
		join(target, '_bmad/_config/manifest.yaml'),
		`installation:\n  version: ${version}\n  installShims: false\n`,
	);
	for (const module of ['bmm', 'tea', 'cis', 'wds'])
		await mkdir(join(target, '_bmad', module), { recursive: true });
	for (const tool of tools)
		for (const skill of [...requiredSkills, ...externalSkills])
			await write(join(target, tool, 'skills', skill, 'SKILL.md'), '# Skill\n');
};

const mockInstaller = async () => {
	const root = await mkdtemp(join(tmpdir(), 'bmad-convergence-'));
	const target = join(root, 'project');
	const bin = join(root, 'bin');
	const capture = join(root, 'npx-arguments.jsonl');
	await mkdir(target, { recursive: true });
	const mock = `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.BMAD_TEST_CAPTURE, JSON.stringify(args) + '\\n');
if (process.env.BMAD_TEST_FAIL === '1') process.exit(71);
if (args[2] === 'add') {
  const skill = args[args.indexOf('--skill') + 1];
  if (skill === process.env.BMAD_TEST_FAIL_EXTERNAL) process.exit(73);
  for (const tool of ['.agents', '.claude']) {
    const directory = path.join(process.cwd(), tool, 'skills', skill);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'SKILL.md'), '# External skill\\n');
  }
  process.exit(0);
}
const target = args[args.indexOf('--directory') + 1];
if (!target || !args.includes('install')) process.exit(72);
const write = (relative, text) => {
  const file = path.join(target, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
};
write('_bmad/_config/manifest.yaml', 'installation:\\n  version: ' + (process.env.BMAD_TEST_VERSION || '6.12.1') + '\\n  installShims: false\\n');
for (const module of ['bmm', 'tea', 'cis', 'wds']) fs.mkdirSync(path.join(target, '_bmad', module), { recursive: true });
for (const tool of ['.agents', '.claude']) {
  for (const skill of ['bmad-build', 'bmad-build-auto', 'bmad-walkthrough']) write(tool + '/skills/' + skill + '/SKILL.md', '# Upstream skill\\n');
}
// Upstream refresh may replace an overlay: the installer must reapply it.
write('_bmad/custom/bmad-build.toml', '[workflow]\\non_complete = "upstream"\\n');
write('_bmad/_config/bmad-help.csv', 'module,skill,display-name,menu-code,description,action,args,phase,preceded-by,followed-by,required,output-location,outputs\\nBMad Method,bmad-checkpoint-preview,Checkpoint,CP,Deprecated,,,,,,false,,\\nBMad Method,bmad-build,Build,BD,Upstream,,,,,,false,,\\n');
`;
	await write(join(bin, 'npx'), mock);
	await chmod(join(bin, 'npx'), 0o755);
	const run = (args = [], overrides = {}, skipExternalSkills = true) => {
		const env = { ...process.env };
		for (const key of Object.keys(env))
			if (key.startsWith('BMAD_')) delete env[key];
		return spawnSync(
			join(repoRoot, 'scripts/install-bmad.sh'),
			[
				'--target',
				target,
				...(skipExternalSkills ? ['--skip-external-skills'] : []),
				...args,
			],
			{
				cwd: repoRoot,
				encoding: 'utf8',
				timeout: 30_000,
				env: {
					...env,
					PATH: [bin, dirname(process.execPath), '/usr/bin', '/bin'].join(':'),
					BMAD_TEST_CAPTURE: capture,
					...overrides,
				},
			},
		);
	};
	return {
		root,
		target,
		run,
		calls: async () =>
			(await readFile(capture, 'utf8'))
				.trim()
				.split('\n')
				.map(line => JSON.parse(line)),
		status: async () =>
			JSON.parse(
				await readFile(
					join(target, '.boilerplate/bmad-install-status.json'),
					'utf8',
				),
			),
	};
};

const assertSucceeded = result =>
	assert.equal(
		result.status,
		0,
		`${result.stdout.slice(-1800)}\n${result.stderr}`,
	);

test('compatibility distinguishes the tested baseline, untested releases, and incompatible Build generations', () => {
	for (const [version, expected] of [
		['6.12.1', 'SUPPORTED'],
		['6.12.2', 'UNTESTED'],
		['6.13.0', 'UNTESTED'],
		['6.12.1-next.1', 'UNTESTED'],
		['6.11.0', 'INCOMPATIBLE'],
		[undefined, 'UNTESTED'],
	]) {
		const result = getBmadCompatibility(version);
		assert.equal(result.status, expected, String(version));
		assert.equal(result.testedVersion, '6.12.1');
	}
});

test('default installation pins BMAD and uses supported unattended flags without deprecated shims', async () => {
	const fixture = await mockInstaller();
	try {
		assertSucceeded(fixture.run());
		const [args] = await fixture.calls();
		assert.equal(args[1], 'bmad-method@6.12.1');
		assert.equal(args[2], 'install');
		for (const [flag, value] of [
			['--action', 'update'],
			['--modules', 'bmm,tea,cis,wds'],
			['--tools', 'claude-code,codex'],
			['--channel', 'stable'],
		])
			assert.equal(args[args.indexOf(flag) + 1], value, flag);
		assert.ok(args.includes('--no-shims'));
		assert.ok(args.includes('--yes'));
		assert.equal((await fixture.status()).state, 'ready');
		const build = await readFile(
			join(fixture.target, '_bmad/custom/bmad-build.toml'),
			'utf8',
		);
		assert.equal(
			build,
			await readFile(join(sourcePack, 'bmad-custom/bmad-build.toml'), 'utf8'),
		);
		const help = await readFile(
			join(fixture.target, '_bmad/_config/bmad-help.csv'),
			'utf8',
		);
		assert.doesNotMatch(help, /bmad-checkpoint-preview/);
		assert.match(help, /bmad-walkthrough/);
	} finally {
		await rm(fixture.root, { recursive: true, force: true });
	}
});

test('latest and preview evaluation remain explicit and report untested compatibility', async () => {
	for (const [installer, channel, version] of [
		['bmad-method@latest', 'stable', '6.12.2'],
		['bmad-method@next', 'next', '6.13.0-next.1'],
	]) {
		const fixture = await mockInstaller();
		try {
			const result = fixture.run(
				['--installer', installer, '--channel', channel],
				{
					BMAD_TEST_VERSION: version,
				},
			);
			assertSucceeded(result);
			assert.match(`${result.stdout}\n${result.stderr}`, /UNTESTED/);
			const [args] = await fixture.calls();
			assert.equal(args[1], installer);
			assert.equal(args[args.indexOf('--channel') + 1], channel);
			assert.equal((await fixture.status()).state, 'ready');
		} finally {
			await rm(fixture.root, { recursive: true, force: true });
		}
	}
});

test('reinstallation restores overlays idempotently and preserves product contracts and user overrides', async () => {
	const fixture = await mockInstaller();
	try {
		assertSucceeded(fixture.run());
		const contractPath = join(
			fixture.target,
			'_bmad-output/planning-artifacts/app-001/work-item.md',
		);
		const overridePath = join(
			fixture.target,
			'_bmad/custom/bmad-build.user.toml',
		);
		await write(
			contractPath,
			'# Fixed decisions\nPreserve approved behavior.\n',
		);
		await write(overridePath, '[workflow]\nopen_spec = "project editor"\n');
		const helpBefore = await readFile(
			join(fixture.target, '_bmad/_config/bmad-help.csv'),
			'utf8',
		);
		const stateBefore = await readFile(
			join(fixture.target, '.boilerplate/bmad-workflow-pack-state.json'),
			'utf8',
		);
		assertSucceeded(fixture.run());
		assert.equal(
			await readFile(
				join(fixture.target, '_bmad/_config/bmad-help.csv'),
				'utf8',
			),
			helpBefore,
		);
		assert.equal(
			await readFile(
				join(fixture.target, '.boilerplate/bmad-workflow-pack-state.json'),
				'utf8',
			),
			stateBefore,
		);
		assert.equal(
			await readFile(contractPath, 'utf8'),
			'# Fixed decisions\nPreserve approved behavior.\n',
		);
		assert.equal(
			await readFile(overridePath, 'utf8'),
			'[workflow]\nopen_spec = "project editor"\n',
		);
		assert.equal((await fixture.calls()).length, 2);
	} finally {
		await rm(fixture.root, { recursive: true, force: true });
	}
});

test('failed installation preserves internal assets and rerunning recovers ready status', async () => {
	const fixture = await mockInstaller();
	try {
		const failure = fixture.run([], { BMAD_TEST_FAIL: '1' });
		assert.notEqual(failure.status, 0);
		assert.equal((await fixture.status()).state, 'incomplete');
		assert.equal((await fixture.status()).stage, 'bmad');
		assert.match(
			await readFile(
				join(fixture.target, '.agents/skills/bmad-close-work-item/SKILL.md'),
				'utf8',
			),
			/close/i,
		);
		assertSucceeded(fixture.run());
		assert.equal((await fixture.status()).state, 'ready');
	} finally {
		await rm(fixture.root, { recursive: true, force: true });
	}
});

test('external skill installation uses pinned tool and immutable revisions and recovers partial failure', async () => {
	const fixture = await mockInstaller();
	try {
		const failure = fixture.run(
			[],
			{ BMAD_TEST_FAIL_EXTERNAL: 'refactor' },
			false,
		);
		assert.notEqual(failure.status, 0);
		assert.equal((await fixture.status()).state, 'incomplete');
		assert.equal((await fixture.status()).stage, 'external-skills');
		assertSucceeded(fixture.run([], {}, false));
		assert.equal((await fixture.status()).state, 'ready');
		const calls = (await fixture.calls()).filter(args => args[2] === 'add');
		const pack = JSON.parse(
			await readFile(join(sourcePack, 'pack.json'), 'utf8'),
		);
		for (const entry of pack.externalSkills) {
			const args = calls.findLast(
				args => args[args.indexOf('--skill') + 1] === entry.skill,
			);
			assert.ok(args, entry.skill);
			assert.equal(args[1], 'skills@1.7.0');
			assert.equal(args[3], `${entry.source}#${entry.revision}`);
			assert.deepEqual(args.slice(-5), [
				'-a',
				'codex',
				'-a',
				'claude-code',
				'-y',
			]);
		}
	} finally {
		await rm(fixture.root, { recursive: true, force: true });
	}
});

test('incompatible upstream evaluation cannot report ready even when its files exist', async () => {
	const fixture = await mockInstaller();
	try {
		const result = fixture.run(['--installer', 'bmad-method@6.11.0'], {
			BMAD_TEST_VERSION: '6.11.0',
		});
		assert.notEqual(result.status, 0);
		assert.match(result.stderr, /INCOMPATIBLE/);
		assert.equal((await fixture.status()).state, 'incomplete');
		assert.equal((await fixture.status()).stage, 'validation');
	} finally {
		await rm(fixture.root, { recursive: true, force: true });
	}
});

test('upstream validation requires the 6.12 skills in both tools even when external skills are skipped', async () => {
	const target = await mkdtemp(join(tmpdir(), 'bmad-validation-'));
	try {
		await applyWorkflowPack({ sourcePack, target });
		await addUpstream(target);
		const result = await validateWorkflowPack({
			target,
			requireUpstream: true,
		});
		assert.equal(result.compatibility.status, 'SUPPORTED');
		const external = join(target, '.claude/skills/find-skills/SKILL.md');
		await rm(external);
		await assert.rejects(
			validateWorkflowPack({ target, requireUpstream: true }),
			/find-skills/,
		);
		await validateWorkflowPack({
			target,
			requireUpstream: true,
			skipExternalSkills: true,
		});
		await write(external, '# External skill\n');
		for (const tool of tools) {
			for (const skill of requiredSkills) {
				const path = join(target, tool, 'skills', skill, 'SKILL.md');
				await rm(path);
				await assert.rejects(
					validateWorkflowPack({
						target,
						requireUpstream: true,
						skipExternalSkills: true,
					}),
					new RegExp(skill),
				);
				await write(path, '# Upstream skill\n');
			}
		}
		await rm(join(target, '_bmad/_config/manifest.yaml'));
		await assert.rejects(
			validateWorkflowPack({ target, requireUpstream: true }),
			/manifest|version/i,
		);
	} finally {
		await rm(target, { recursive: true, force: true });
	}
});

test('validation rejects pre-6.12 installs and deprecated identifiers in active managed assets', async () => {
	const target = await mkdtemp(join(tmpdir(), 'bmad-validation-retired-'));
	try {
		await applyWorkflowPack({ sourcePack, target });
		await addUpstream(target, '6.11.0');
		await assert.rejects(
			validateWorkflowPack({ target, requireUpstream: true }),
			/INCOMPATIBLE|6\.11/,
		);
		await addUpstream(target);
		const path = join(target, 'docs/bmad-work-item-workflow/index.md');
		await write(path, 'Route through bmad-checkpoint-preview.\n');
		await assert.rejects(
			validateWorkflowPack({ target, requireUpstream: true }),
			/bmad-checkpoint-preview/,
		);
	} finally {
		await rm(target, { recursive: true, force: true });
	}
});

test('Build inherits optional contracts, repository governance, and upstream review layers without persistent manuals', async () => {
	for (const skill of ['bmad-build', 'bmad-build-auto']) {
		const raw = await readFile(
			join(sourcePack, `bmad-custom/${skill}.toml`),
			'utf8',
		);
		assert.match(raw, /AGENTS\.md/);
		assert.match(raw, /Scope/);
		assert.match(raw, /Non-Goals/);
		assert.match(raw, /Acceptance Criteria/);
		assert.match(raw, /Fixed Decisions/);
		assert.match(raw, /approved design references/);
		assert.match(raw, /missing|absent|optional|exists/i);
		assert.doesNotMatch(
			raw,
			/If it is missing, stop|missing.*route to bmad-publish-work-item/i,
		);
		assert.doesNotMatch(raw, /docs\/bmad-work-item-workflow\/index\.md/);
		assert.doesNotMatch(raw, /\[\[workflow\.(?:oneshot_)?review_layers\]\]/);
		assert.match(raw, /never.*commit|Do not commit/i);
		assert.match(raw, /push/);
		assert.match(raw, /pull request/);
		const allowed = new Set([
			'activation_steps_prepend',
			'activation_steps_append',
			'persistent_facts',
			'on_complete',
			'open_spec',
			'implementation_handoff',
		]);
		for (const [, key] of raw.matchAll(/^([a-z_]+)\s*=/gm))
			assert.ok(
				allowed.has(key),
				`Unsupported upstream Build override: ${key}`,
			);
		assert.doesNotMatch(raw, /^persistent_facts\s*=/m);
		const handoff = raw.match(
			/implementation_handoff\s*=\s*"""([\s\S]*?)"""/,
		)?.[1];
		assert.ok(handoff);
		assert.match(handoff, /AGENTS\.md/);
		assert.match(handoff, /Fixed Decisions/);
	}
});

test('help routing sends actionable implementation directly to Build and retains publication for refinement', async () => {
	const rows = parseCsv(
		await readFile(join(sourcePack, 'help-overlay.csv'), 'utf8'),
	);
	const header = rows.shift();
	const index = name => header.indexOf(name);
	const build = rows.find(row => row[index('skill')] === 'bmad-build');
	assert.ok(build);
	assert.equal(
		build[index('preceded-by')].includes('bmad-publish-work-item'),
		false,
	);
	assert.equal(build[index('followed-by')].includes('bmad-code-review'), false);
	assert.match(build[index('followed-by')], /bmad-close-work-item/);
	assert.ok(rows.some(row => row[index('skill')] === 'bmad-publish-work-item'));
	assert.ok(rows.some(row => row[index('skill')] === 'bmad-walkthrough'));
	const standalone = rows.find(
		row => row[index('skill')] === 'bmad-review-verification-gap',
	);
	if (standalone) {
		assert.match(standalone[index('description')], /Standalone/);
		assert.equal(
			standalone[index('preceded-by')].includes('bmad-build'),
			false,
		);
	}
});

test('canonical pack, scaffold pack, and installed workflow documentation stay in parity', async () => {
	const walk = async root => {
		const files = [];
		for (const entry of await readdir(root, { withFileTypes: true })) {
			const path = join(root, entry.name);
			if (entry.isDirectory()) files.push(...(await walk(path)));
			else if (entry.isFile()) files.push(path);
		}
		return files;
	};
	const target = await mkdtemp(join(tmpdir(), 'bmad-scaffold-parity-'));
	try {
		const { createDefaultManifest } = await import('../src/lib/manifest.ts');
		const { scaffoldProject } = await import('../src/lib/scaffold.ts');
		await scaffoldProject({
			targetPath: target,
			manifest: createDefaultManifest(target, 'web-app'),
			overwrite: true,
		});
		const templatePack = join(target, '.boilerplate/bmad-workflow-pack');
		const canonicalFiles = (await walk(sourcePack))
			.map(path => relative(sourcePack, path))
			.sort();
		const templateFiles = (await walk(templatePack))
			.map(path => relative(templatePack, path))
			.sort();
		assert.deepEqual(templateFiles, canonicalFiles);
		for (const path of canonicalFiles)
			assert.equal(
				await readFile(join(templatePack, path), 'utf8'),
				await readFile(join(sourcePack, path), 'utf8'),
				path,
			);
		for (const group of ['bmad-project-workflow', 'bmad-work-item-workflow'])
			for (const path of await walk(join(sourcePack, 'docs', group))) {
				const relativePath = relative(join(sourcePack, 'docs'), path);
				for (const root of [repoRoot, target])
					assert.equal(
						await readFile(join(root, 'docs', relativePath), 'utf8'),
						await readFile(path, 'utf8'),
						join(root, relativePath),
					);
			}
		const packageJson = JSON.parse(
			await readFile(join(target, 'package.json'), 'utf8'),
		);
		assert.equal(
			packageJson.scripts['bmad:install'],
			'scripts/install-bmad.sh',
		);
		assert.equal(
			packageJson.scripts['bmad:install:stable'],
			'scripts/install-bmad.sh',
		);
		assert.match(
			packageJson.scripts['bmad:install:latest'],
			/bmad-method@latest/,
		);
		assert.match(
			packageJson.scripts['bmad:install:preview'],
			/bmad-method@next/,
		);
	} finally {
		await rm(target, { recursive: true, force: true });
	}
	assert.equal(
		await readFile(join(repoRoot, 'scripts/install-bmad.sh'), 'utf8'),
		await readFile(
			join(repoRoot, 'templates/base/scripts/install-bmad.sh'),
			'utf8',
		),
	);
});

test('upstream validation follows a single selected adapter from the installation manifest', async t => {
	for (const [selected, retained, omitted] of [
		['codex', '.agents', '.claude'],
		['claude-code', '.claude', '.agents'],
	]) {
		const target = await mkdtemp(join(tmpdir(), 'bmad-selected-adapter-'));
		t.after(() => rm(target, { recursive: true, force: true }));
		await applyWorkflowPack({ sourcePack, target });
		await addUpstream(target);
		await write(
			join(target, '_bmad/_config/manifest.yaml'),
			`installation:\n  version: 6.12.1\nides:\n  - ${selected}\n`,
		);
		for (const skill of requiredSkills)
			await rm(join(target, omitted, 'skills', skill), { recursive: true });
		assert.equal(
			(await validateWorkflowPack({ target, requireUpstream: true }))
				.compatibility.status,
			'SUPPORTED',
		);
		await rm(join(target, retained, 'skills/bmad-build/SKILL.md'));
		await assert.rejects(
			validateWorkflowPack({ target, requireUpstream: true }),
			/bmad-build/,
		);
	}
});

test('all specialist verification hooks accept identity-free Build output paths', async () => {
	const names = [
		'bmad-qa-generate-e2e-tests',
		'bmad-testarch-test-design',
		'bmad-testarch-atdd',
		'bmad-testarch-automate',
		'bmad-testarch-test-review',
		'bmad-testarch-nfr',
		'bmad-testarch-trace',
	];
	for (const name of names) {
		const hook = await readFile(
			join(sourcePack, 'bmad-custom', `${name}.toml`),
			'utf8',
		);
		assert.match(hook, /explicit.*path/i, name);
		assert.match(hook, /identity-free.*Build spec\/output path/i, name);
		assert.doesNotMatch(
			hook,
			/If not, ask for it before choosing output paths/i,
			name,
		);
	}
});
