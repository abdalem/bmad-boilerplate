import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
	chmod,
	mkdtemp,
	mkdir,
	readFile,
	rm,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	allocateLocalId,
	applyWorkflowPack,
	mergeHelpCatalog,
	parseCsv,
	parseProjectPolicy,
	pruneHelpCatalog,
} from '../../../.boilerplate/bmad-workflow-pack/lib/workflow-pack.mjs';
import {
	inspectProductInput,
	PRODUCT_INPUT_FILES,
	REVIEW_FILE,
} from '../../../.boilerplate/bmad-workflow-pack/internal-skills/bmad-start-project/scripts/inspect-product-input.mjs';
import {
	DEFAULT_BOILERPLATE_SOURCE,
	resolveBoilerplateSource,
} from '../../../.boilerplate/bmad-workflow-pack/internal-skills/bmad-update-project/scripts/resolve-boilerplate-source.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const packRoot = join(repoRoot, '.boilerplate', 'bmad-workflow-pack');
const productInputTemplates = join(
	packRoot,
	'docs',
	'bmad-project-workflow',
	'templates',
	'product-input',
);

const walk = async root => {
	const { readdir } = await import('node:fs/promises');
	const output = [];
	const visit = async directory => {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) await visit(path);
			if (entry.isFile()) output.push(path);
		}
	};
	await visit(root);
	return output;
};

const localPolicy = [
	'version = 1',
	'[project]',
	'key = "APP"',
	'summary_language = "English"',
	'[tickets]',
	'identity_mode = "local"',
	'tracker = "none"',
	'project_key = "APP"',
	'local_prefix = "APP"',
	'local_start = 1',
	'local_width = 3',
	'[release_notes]',
	'enabled = false',
	'path = ""',
	'language = "English"',
	'',
].join('\n');

const version2Policy = [
	'version = 2',
	'[project]',
	'key = "APP"',
	'summary_language = "English"',
	'[tickets]',
	'identity_mode = "local"',
	'tracker = "none"',
	'project_key = "APP"',
	'local_prefix = "APP"',
	'local_start = 1',
	'local_width = 3',
	'[work_items]',
	'types = ["Module", "Request", "Feature", "Issue", "Bug", "Spike"]',
	'module_type = "Module"',
	'request_type = "Request"',
	'feature_type = "Feature"',
	'issue_type = "Issue"',
	'bug_type = "Bug"',
	'spike_type = "Spike"',
	'module_children = ["Feature", "Issue"]',
	'feature_children = ["Issue"]',
	'[design]',
	'provider = "figma"',
	'enabled = false',
	'screen_registry_path = "docs/design/screen-registry.md"',
	'reference_path = "docs/design/references"',
	'[automation]',
	'build_auto_enabled = false',
	'loop_enabled = false',
	'[release_notes]',
	'enabled = false',
	'path = ""',
	'language = "English"',
	'',
].join('\n');

const createProductInputFixture = async ({ reviewed = false } = {}) => {
	const root = await mkdtemp(join(tmpdir(), 'product-input-'));
	for (const name of PRODUCT_INPUT_FILES) {
		let content = await readFile(join(productInputTemplates, name), 'utf8');
		content = content.replaceAll('<project name>', 'Acme');
		if (name === '00-handoff-manifest.md' && reviewed) {
			content = content.replace(
				'Bundle status: original',
				'Bundle status: reviewed',
			);
			content = content.replace(
				'- `06-initial-work-map.md`',
				'- `06-initial-work-map.md`\n- `REVIEW.md`',
			);
		}
		await writeFile(join(root, name), content);
	}
	if (reviewed) {
		const review = (
			await readFile(join(productInputTemplates, REVIEW_FILE), 'utf8')
		).replaceAll('<project name>', 'Acme');
		await writeFile(join(root, REVIEW_FILE), review);
	}
	return root;
};

test('workflow pack declares exact BMAD modules and upstream skill sources', async () => {
	const pack = JSON.parse(await readFile(join(packRoot, 'pack.json'), 'utf8'));
	assert.equal(pack.version, '3.0.0');
	assert.equal(pack.bmad.testedVersion, '6.12.1');
	assert.equal(pack.bmad.defaultInstaller, 'bmad-method@6.12.1');
	assert.equal(pack.bmad.latestInstaller, 'bmad-method@latest');
	assert.equal(pack.bmad.previewInstaller, 'bmad-method@next');
	assert.deepEqual(pack.bmad.modules, ['bmm', 'tea', 'cis', 'wds']);
	assert.deepEqual(pack.bmad.tools, ['claude-code', 'codex']);
	assert.equal(pack.skillsInstaller, 'skills@1.7.0');
	for (const entry of pack.externalSkills)
		assert.match(entry.revision, /^[a-f0-9]{40}$/, entry.skill);
	assert.deepEqual(
		pack.externalSkills.map(entry => `${entry.source}/${entry.skill}`),
		[
			'vercel-labs/skills/find-skills',
			'github/awesome-copilot/refactor',
			'vercel-labs/agent-skills/vercel-composition-patterns',
			'vercel-labs/agent-skills/vercel-react-best-practices',
			'vercel-labs/agent-skills/web-design-guidelines',
		],
	);
	assert.equal(JSON.stringify(pack).includes('writing-plans'), false);
	assert.equal(
		JSON.stringify(pack.externalSkills).includes('brainstorming'),
		false,
	);
	assert.deepEqual(pack.internalSkills.slice(0, 2), [
		'bmad-start-project',
		'bmad-update-project',
	]);
});

test('product input inspector accepts complete original and reviewed bundles', async () => {
	const original = await createProductInputFixture();
	const reviewed = await createProductInputFixture({ reviewed: true });
	try {
		const originalResult = await inspectProductInput(original);
		assert.equal(originalResult.valid, true);
		assert.equal(originalResult.status, 'original');
		assert.equal(originalResult.project, 'Acme');

		const reviewedResult = await inspectProductInput(reviewed);
		assert.equal(reviewedResult.valid, true);
		assert.equal(reviewedResult.status, 'reviewed');
		assert.equal(reviewedResult.missing.length, 0);
	} finally {
		await rm(original, { recursive: true, force: true });
		await rm(reviewed, { recursive: true, force: true });
	}
});

test('product input inspector rejects incomplete and mixed bundles', async () => {
	const incomplete = await createProductInputFixture();
	const mixed = await createProductInputFixture();
	try {
		await rm(join(incomplete, '04-domain-and-data.md'));
		const incompleteResult = await inspectProductInput(incomplete);
		assert.equal(incompleteResult.valid, false);
		assert.deepEqual(incompleteResult.missing, ['04-domain-and-data.md']);

		const review = (
			await readFile(join(productInputTemplates, REVIEW_FILE), 'utf8')
		).replaceAll('<project name>', 'Acme');
		await writeFile(join(mixed, REVIEW_FILE), review);
		const mixedResult = await inspectProductInput(mixed);
		assert.equal(mixedResult.valid, false);
		assert.match(mixedResult.errors.join('\n'), /allowed only when/);
	} finally {
		await rm(incomplete, { recursive: true, force: true });
		await rm(mixed, { recursive: true, force: true });
	}
});

test('product input inspector rejects stale manifest inventory', async () => {
	const root = await createProductInputFixture();
	try {
		const manifestPath = join(root, '00-handoff-manifest.md');
		const manifest = await readFile(manifestPath, 'utf8');
		await writeFile(
			manifestPath,
			manifest.replace('- `06-initial-work-map.md`\n', ''),
		);
		const result = await inspectProductInput(root);
		assert.equal(result.valid, false);
		assert.match(result.errors.join('\n'), /exact bundle files/);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test('boilerplate source resolution prefers explicit URL then remote then default', async () => {
	const repository = await mkdtemp(join(tmpdir(), 'boilerplate-source-'));
	try {
		assert.equal(spawnSync('git', ['init', repository]).status, 0);
		assert.equal(
			spawnSync('git', [
				'-C',
				repository,
				'remote',
				'add',
				'boilerplate',
				'/tmp/local-boilerplate.git',
			]).status,
			0,
		);

		assert.deepEqual(
			resolveBoilerplateSource({
				repository,
				explicitUrl: 'https://example.test/explicit.git',
			}),
			{ source: 'https://example.test/explicit.git', origin: 'explicit' },
		);
		assert.deepEqual(resolveBoilerplateSource({ repository }), {
			source: '/tmp/local-boilerplate.git',
			origin: 'remote',
		});
		assert.deepEqual(
			resolveBoilerplateSource({
				repository,
				readRemote: () => {
					throw new Error('missing');
				},
			}),
			{ source: DEFAULT_BOILERPLATE_SOURCE, origin: 'default' },
		);
	} finally {
		await rm(repository, { recursive: true, force: true });
	}
});

test('project scenario skills preserve the approved workflow gates', async () => {
	const start = await readFile(
		join(packRoot, 'internal-skills/bmad-start-project/SKILL.md'),
		'utf8',
	);
	assert.match(start, /Ask exactly one unresolved question at a time/);
	assert.match(start, /product-input/);
	assert.match(start, /bmad-publish-work-item/);
	assert.match(start, /Figma/);
	assert.match(start, /Never commit automatically/);

	const update = await readFile(
		join(packRoot, 'internal-skills/bmad-update-project/SKILL.md'),
		'utf8',
	);
	assert.match(update, /Legacy Baseline/);
	assert.match(update, /Apply only one explicitly approved upgrade wave/);
	assert.match(update, /--dry-run/);
	assert.match(update, /proposed/);
	assert.match(update, /Never commit automatically/);
});

test('generic pack assets contain no Geolog or LIM-specific values', async () => {
	const contents = await Promise.all(
		(await walk(packRoot)).map(path => readFile(path, 'utf8')),
	);
	const combined = contents.join('\n');
	assert.doesNotMatch(combined, /geolog5/i);
	assert.doesNotMatch(combined, /LIM-/);
	assert.doesNotMatch(combined, /\/home\/abdalem\/projects\/geolog5/i);
	assert.equal(
		(await walk(join(packRoot, 'docs'))).some(path =>
			path.includes('/migrations/'),
		),
		false,
	);
});

test('managed adaptive assets contain no retired delivery routes', async () => {
	const activeRoots = [
		join(packRoot, 'bmad-custom'),
		join(packRoot, 'docs', 'bmad-work-item-workflow'),
		join(packRoot, 'internal-skills'),
	];
	const files = (await Promise.all(activeRoots.map(root => walk(root)))).flat();
	const combined = (
		await Promise.all(files.map(path => readFile(path, 'utf8')))
	).join('\n');
	for (const retired of [
		'bmad-quick-dev',
		'bmad-create-epics-and-stories',
		'bmad-create-story',
		'bmad-dev-story',
		'bmad-sprint-planning',
		'bmad-checkpoint-preview',
	]) {
		assert.equal(combined.includes(retired), false, retired);
	}
	assert.equal(
		files.some(path => path.includes('bmad-feature-workflow')),
		false,
	);
});

test('project policy parser validates local and external identity modes', () => {
	const local = parseProjectPolicy(localPolicy);
	assert.equal(local.tickets.identity_mode, 'local');
	assert.equal(local.version, 2);
	assert.deepEqual(local.work_items.types, [
		'Module',
		'Request',
		'Feature',
		'Issue',
		'Bug',
		'Spike',
	]);
	assert.equal(local.design.enabled, false);
	assert.equal(local.automation.build_auto_enabled, false);
	const external = parseProjectPolicy(
		localPolicy
			.replace('identity_mode = "local"', 'identity_mode = "external"')
			.replace('tracker = "none"', 'tracker = "github"'),
	);
	assert.equal(external.tickets.tracker, 'github');
	assert.throws(
		() => parseProjectPolicy('version = 1'),
		/Invalid project workflow policy/,
	);
});

test('project policy V2 validates adaptive workflow, design, and automation', () => {
	const policy = parseProjectPolicy(version2Policy);
	assert.equal(policy.version, 2);
	assert.equal(policy.work_items.issue_type, 'Issue');
	assert.deepEqual(policy.work_items.module_children, ['Feature', 'Issue']);
	assert.equal(policy.design.provider, 'figma');
	assert.equal(policy.automation.loop_enabled, false);
});

test('project policy V2 supports mapped project-specific item names', () => {
	const policy = parseProjectPolicy(
		version2Policy
			.replace(
				'types = ["Module", "Request", "Feature", "Issue", "Bug", "Spike"]',
				'types = ["Area", "Demand", "Capability", "Change", "Defect", "Research"]',
			)
			.replace('module_type = "Module"', 'module_type = "Area"')
			.replace('request_type = "Request"', 'request_type = "Demand"')
			.replace('feature_type = "Feature"', 'feature_type = "Capability"')
			.replace('issue_type = "Issue"', 'issue_type = "Change"')
			.replace('bug_type = "Bug"', 'bug_type = "Defect"')
			.replace('spike_type = "Spike"', 'spike_type = "Research"')
			.replace(
				'module_children = ["Feature", "Issue"]',
				'module_children = ["Capability", "Change"]',
			)
			.replace('feature_children = ["Issue"]', 'feature_children = ["Change"]'),
	);
	assert.equal(policy.work_items.module_type, 'Area');
	assert.equal(policy.work_items.issue_type, 'Change');
});

test('project policy V2 rejects invalid item mappings and design paths', () => {
	assert.throws(
		() =>
			parseProjectPolicy(
				version2Policy.replace('issue_type = "Issue"', 'issue_type = "Task"'),
			),
		/work_items.issue_type must reference a configured type/,
	);
	assert.throws(
		() =>
			parseProjectPolicy(
				version2Policy.replace(
					'screen_registry_path = "docs/design/screen-registry.md"',
					'screen_registry_path = "/tmp/screens.md"',
				),
			),
		/design.screen_registry_path must be a relative project path/,
	);
});

test('local ID allocation fills the first collision-free number', () => {
	assert.equal(
		allocateLocalId({
			evidence: [
				'planning/app-001/work-item.md',
				'Work item APP-003',
				'implementation/app-002',
			],
			prefix: 'APP',
			start: 1,
			width: 3,
		}),
		'APP-004',
	);
});

test('help overlay merges by module, skill, and action idempotently', async () => {
	const base =
		'module,skill,display-name,menu-code,description,action,args,phase,preceded-by,followed-by,required,output-location,outputs\n' +
		'BMad Method,bmad-prd,Old,PRD,Old description,,,,,,false,,prd\n';
	const overlay = await readFile(join(packRoot, 'help-overlay.csv'), 'utf8');
	const once = mergeHelpCatalog(base, overlay);
	const twice = mergeHelpCatalog(once, overlay);
	assert.equal(twice, once);
	const rows = parseCsv(once);
	assert.equal(rows.filter(row => row[1] === 'bmad-workflow-setup').length, 1);
	assert.equal(rows.filter(row => row[1] === 'bmad-start-project').length, 1);
	assert.equal(rows.filter(row => row[1] === 'bmad-update-project').length, 1);
	assert.match(once, /Work Item has product uncertainty/);
});

test('help catalog pruning removes retired routes by keyed identity', async () => {
	const base = [
		'module,skill,display-name,menu-code,description,action,args,phase,preceded-by,followed-by,required,output-location,outputs',
		'BMad Method,bmad-quick-dev,Quick Dev,QQ,Old route,,,,,,false,,',
		'BMad Method,bmad-create-story,Create Story,CS,Old route,create,,,,,false,,',
		'BMad Method,bmad-build,Build,BD,Current route,,,,,,false,,',
		'',
	].join('\n');
	const removals = await readFile(join(packRoot, 'help-remove.csv'), 'utf8');
	const once = pruneHelpCatalog(base, removals);
	const twice = pruneHelpCatalog(once, removals);
	assert.equal(twice, once);
	assert.doesNotMatch(once, /bmad-quick-dev/);
	assert.doesNotMatch(once, /bmad-create-story/);
	assert.match(once, /bmad-build/);
});

test('managed files update by hash and preserve customized conflicts', async () => {
	const fixture = await mkdtemp(join(tmpdir(), 'workflow-pack-source-'));
	const target = await mkdtemp(join(tmpdir(), 'workflow-pack-target-'));
	try {
		await mkdir(join(fixture, 'assets'), { recursive: true });
		await writeFile(join(fixture, 'pack.json'), '{"version":"1.0.0"}\n');
		await writeFile(
			join(fixture, 'managed-files.json'),
			JSON.stringify({
				version: 1,
				groups: [{ source: 'assets', targets: ['docs'] }],
				stateFile: '.boilerplate/state.json',
				statusFile: '.boilerplate/status.json',
				proposedRoot: '.boilerplate/adoption/proposed',
				backupRoot: '.boilerplate/adoption/backups',
			}),
		);
		await writeFile(join(fixture, 'assets', 'managed.md'), 'v1\n');

		const first = await applyWorkflowPack({ sourcePack: fixture, target });
		assert.ok(first.copied.includes('docs/managed.md'));
		await writeFile(join(fixture, 'assets', 'managed.md'), 'v2\n');
		const updated = await applyWorkflowPack({ sourcePack: fixture, target });
		assert.ok(updated.updated.includes('docs/managed.md'));
		assert.equal(
			await readFile(join(target, 'docs', 'managed.md'), 'utf8'),
			'v2\n',
		);

		await writeFile(join(target, 'docs', 'managed.md'), 'local\n');
		await writeFile(join(fixture, 'assets', 'managed.md'), 'v3\n');
		const conflict = await applyWorkflowPack({ sourcePack: fixture, target });
		assert.ok(conflict.proposed.includes('docs/managed.md'));
		assert.equal(
			await readFile(join(target, 'docs', 'managed.md'), 'utf8'),
			'local\n',
		);
		assert.equal(
			await readFile(
				join(target, '.boilerplate/adoption/proposed/docs/managed.md'),
				'utf8',
			),
			'v3\n',
		);

		const forced = await applyWorkflowPack({
			sourcePack: fixture,
			target,
			force: true,
		});
		assert.ok(forced.backedUp.includes('docs/managed.md'));
		assert.equal(
			await readFile(join(target, 'docs', 'managed.md'), 'utf8'),
			'v3\n',
		);
	} finally {
		await rm(fixture, { recursive: true, force: true });
		await rm(target, { recursive: true, force: true });
	}
});

test('managed files retire by hash and preserve customized retirement conflicts', async () => {
	const fixture = await mkdtemp(join(tmpdir(), 'workflow-pack-retire-source-'));
	const target = await mkdtemp(join(tmpdir(), 'workflow-pack-retire-target-'));
	try {
		await mkdir(join(fixture, 'assets'), { recursive: true });
		await writeFile(join(fixture, 'pack.json'), '{"version":"2.0.0"}\n');
		await writeFile(
			join(fixture, 'managed-files.json'),
			JSON.stringify({
				version: 1,
				groups: [{ source: 'assets', targets: ['docs'] }],
				stateFile: '.boilerplate/state.json',
				statusFile: '.boilerplate/status.json',
				proposedRoot: '.boilerplate/adoption/proposed',
				backupRoot: '.boilerplate/adoption/backups',
			}),
		);

		await writeFile(join(fixture, 'assets', 'unchanged.md'), 'managed\n');
		await writeFile(join(fixture, 'assets', 'customized.md'), 'managed\n');
		await applyWorkflowPack({ sourcePack: fixture, target });
		await writeFile(join(target, 'docs', 'customized.md'), 'local\n');
		await rm(join(fixture, 'assets', 'unchanged.md'));
		await rm(join(fixture, 'assets', 'customized.md'));

		const retirement = await applyWorkflowPack({ sourcePack: fixture, target });
		assert.ok(retirement.removed.includes('docs/unchanged.md'));
		await assert.rejects(readFile(join(target, 'docs', 'unchanged.md')));
		assert.ok(retirement.retirementProposed.includes('docs/customized.md'));
		assert.equal(
			await readFile(join(target, 'docs', 'customized.md'), 'utf8'),
			'local\n',
		);
		assert.equal(
			await readFile(
				join(target, '.boilerplate/adoption/proposed/docs/customized.md'),
				'utf8',
			),
			'local\n',
		);
		assert.match(
			await readFile(
				join(
					target,
					'.boilerplate/adoption/proposed/docs/customized.md.retire',
				),
				'utf8',
			),
			/retired from the workflow pack/,
		);

		const forced = await applyWorkflowPack({
			sourcePack: fixture,
			target,
			force: true,
		});
		assert.ok(forced.removed.includes('docs/customized.md'));
		assert.ok(forced.backedUp.includes('docs/customized.md'));
		await assert.rejects(readFile(join(target, 'docs', 'customized.md')));
	} finally {
		await rm(fixture, { recursive: true, force: true });
		await rm(target, { recursive: true, force: true });
	}
});

test('managed file retirement dry-run reports changes without writing', async () => {
	const fixture = await mkdtemp(join(tmpdir(), 'workflow-pack-retire-dry-'));
	const target = await mkdtemp(join(tmpdir(), 'workflow-pack-retire-target-'));
	try {
		await mkdir(join(fixture, 'assets'), { recursive: true });
		await writeFile(join(fixture, 'pack.json'), '{"version":"2.0.0"}\n');
		await writeFile(
			join(fixture, 'managed-files.json'),
			JSON.stringify({
				version: 1,
				groups: [{ source: 'assets', targets: ['docs'] }],
				stateFile: '.boilerplate/state.json',
				statusFile: '.boilerplate/status.json',
				proposedRoot: '.boilerplate/adoption/proposed',
				backupRoot: '.boilerplate/adoption/backups',
			}),
		);
		await writeFile(join(fixture, 'assets', 'managed.md'), 'managed\n');
		await applyWorkflowPack({ sourcePack: fixture, target });
		await rm(join(fixture, 'assets', 'managed.md'));

		const result = await applyWorkflowPack({
			sourcePack: fixture,
			target,
			dryRun: true,
		});
		assert.ok(result.removed.includes('docs/managed.md'));
		assert.equal(
			await readFile(join(target, 'docs', 'managed.md'), 'utf8'),
			'managed\n',
		);
	} finally {
		await rm(fixture, { recursive: true, force: true });
		await rm(target, { recursive: true, force: true });
	}
});

test('failed upstream installation leaves internal assets and incomplete status', async () => {
	const target = await mkdtemp(join(tmpdir(), 'workflow-pack-offline-'));
	const fakeBin = join(target, 'fake-bin');
	try {
		await mkdir(fakeBin, { recursive: true });
		const fakeNpx = join(fakeBin, 'npx');
		await writeFile(fakeNpx, '#!/bin/sh\nexit 71\n');
		await chmod(fakeNpx, 0o755);
		const result = spawnSync(
			join(repoRoot, 'scripts', 'install-bmad.sh'),
			['--target', target],
			{
				cwd: repoRoot,
				encoding: 'utf8',
				env: {
					...process.env,
					PATH: [
						fakeBin,
						dirname(process.execPath),
						'/usr/local/bin',
						'/usr/bin',
						'/bin',
					].join(':'),
				},
			},
		);
		assert.notEqual(result.status, 0);
		assert.equal(
			await readFile(
				join(target, 'docs/bmad-work-item-workflow/index.md'),
				'utf8',
			).then(Boolean),
			true,
		);
		const status = JSON.parse(
			await readFile(
				join(target, '.boilerplate/bmad-install-status.json'),
				'utf8',
			),
		);
		assert.equal(status.state, 'incomplete');
		assert.equal(status.stage, 'bmad');
	} finally {
		await rm(target, { recursive: true, force: true });
	}
});

test('BMAD installers force the full update path for existing repositories', async () => {
	for (const relativePath of [
		'scripts/install-bmad.sh',
		'templates/base/scripts/install-bmad.sh',
	]) {
		const installer = await readFile(join(repoRoot, relativePath), 'utf8');
		assert.match(installer, /--action update/);
		assert.match(installer, /BMAD_MODULES="bmm,tea,cis,wds"/);
	}
});
