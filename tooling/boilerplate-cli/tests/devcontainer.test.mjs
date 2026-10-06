import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
	chmod,
	mkdtemp,
	mkdir,
	readFile,
	rm,
	stat,
	writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

test('existing-repo adoption preserves local MCP configuration as proposals', async () => {
	const target = await mkdtemp(join(tmpdir(), 'boilerplate-adoption-mcp-'));
	const localCodex = '[mcp_servers.local]\ncommand = "local"\n';
	const localClaude = '{"mcpServers":{"local":{"command":"local"}}}\n';

	try {
		await mkdir(join(target, '.codex'), { recursive: true });
		await writeFile(join(target, '.codex/config.toml'), localCodex);
		await writeFile(join(target, '.mcp.json'), localClaude);

		const result = spawnSync(
			join(repoRoot, 'scripts/adopt-stack.sh'),
			[target, '--skip-bmad'],
			{
				cwd: repoRoot,
				encoding: 'utf8',
				env: {
					...process.env,
					PATH: `${dirname(process.execPath)}:${process.env.PATH}`,
				},
			},
		);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(
			await readFile(join(target, '.codex/config.toml'), 'utf8'),
			localCodex,
		);
		assert.equal(
			await readFile(join(target, '.mcp.json'), 'utf8'),
			localClaude,
		);

		const proposedCodex = await readFile(
			join(target, '.boilerplate/adoption/proposed/.codex/config.toml'),
			'utf8',
		);
		const proposedClaude = await readFile(
			join(target, '.boilerplate/adoption/proposed/.mcp.json'),
			'utf8',
		);
		for (const adapter of [proposedCodex, proposedClaude]) {
			assert.match(
				adapter,
				/\/workspaces\/boilerplate-adoption-mcp-[a-z0-9]+\/\.devcontainer\/chrome-mcp\.cjs/,
			);
			assert.doesNotMatch(adapter, /__PROJECT_/);
		}
		assert.match(proposedCodex, /env_vars = \["REMOK_CHROME_URL"\]/);
	} finally {
		await rm(target, { recursive: true, force: true });
	}
});

const adopt = (target, ...args) =>
	spawnSync(
		'bash',
		[join(repoRoot, 'scripts/adopt-stack.sh'), target, '--skip-bmad', ...args],
		{
			cwd: repoRoot,
			encoding: 'utf8',
			env: {
				...process.env,
				PATH: `${dirname(process.execPath)}:${process.env.PATH}`,
			},
		},
	);

test('adoption renders manifest identity and preserves custom content, explicit ports, and modes on repeat', async t => {
	const target = await mkdtemp(join(tmpdir(), 'boilerplate-adoption-repeat-'));
	t.after(() => rm(target, { recursive: true, force: true }));
	for (const directory of [
		'.boilerplate',
		'.devcontainer',
		'scripts',
		'.husky',
	])
		await mkdir(join(target, directory));
	await writeFile(
		join(target, '.boilerplate/project-manifest.json'),
		JSON.stringify({
			projectName: 'My "Project"',
			projectSlug: 'chosen-project',
		}),
	);
	const custom = {
		'.devcontainer/devcontainer.json':
			'{"workspaceFolder":"/workspaces/chosen-project","forwardPorts":[19006],"customizations":{"vscode":{"extensions":["custom.extension"]}}}\n',
		'.devcontainer/setup.sh': '#!/bin/bash\necho custom setup\n',
		'scripts/install-bmad.sh': '#!/bin/bash\necho custom bmad\n',
		'.husky/pre-commit': '#!/bin/bash\necho custom hook\n',
	};
	for (const [path, content] of Object.entries(custom)) {
		await writeFile(join(target, path), content);
		await chmod(join(target, path), 0o640);
	}
	const dry = adopt(target, '--dry-run');
	assert.equal(dry.status, 0, dry.stderr);
	await assert.rejects(stat(join(target, '.boilerplate/adoption')));
	for (let pass = 0; pass < 2; pass++) {
		const result = adopt(target);
		assert.equal(result.status, 0, result.stderr);
		for (const [path, content] of Object.entries(custom)) {
			assert.equal(await readFile(join(target, path), 'utf8'), content);
			assert.equal((await stat(join(target, path))).mode & 0o777, 0o640);
		}
		const proposal = JSON.parse(
			await readFile(
				join(
					target,
					'.boilerplate/adoption/proposed/.devcontainer/devcontainer.json',
				),
				'utf8',
			),
		);
		assert.equal(proposal.name, 'My "Project"');
		assert.equal(proposal.workspaceFolder, '/workspaces/chosen-project');
		assert.equal(proposal.shutdownAction, 'none');
		assert.equal(
			proposal.customizations.vscode.settings['remote.autoForwardPorts'],
			false,
		);
		assert.deepEqual(proposal.forwardPorts, []);
		assert.match(proposal.postStartCommand, /install-agent-clis\.sh/);
		for (const path of [
			'.devcontainer/Dockerfile',
			'.devcontainer/docker-compose.yml',
			'.codex/config.toml',
			'.mcp.json',
		]) {
			const content = await readFile(join(target, path), 'utf8');
			assert.match(content, /chosen-project/);
			assert.doesNotMatch(
				content,
				/__PROJECT_|\/home\/abbi|100\.80\.27\.19|204\.168\.224\.106|\.workstation|docker-compose\.vps/,
			);
		}
		assert.match(
			await readFile(join(target, '.devcontainer/docker-compose.yml'), 'utf8'),
			/node_user_data:\/home\/node/,
		);
		assert.ok(
			(await stat(join(target, '.devcontainer/install-agent-clis.sh'))).mode &
				0o111,
		);
		assert.ok(
			(
				await stat(
					join(target, '.boilerplate/adoption/proposed/.devcontainer/setup.sh'),
				)
			).mode & 0o111,
		);
		await stat(join(target, '.devcontainer/chrome-mcp.cjs'));
		// A matching existing script must retain a developer's deliberate mode too.
		await chmod(join(target, '.devcontainer/bootstrap-traefik.sh'), 0o640);
	}
	assert.equal(
		(await stat(join(target, '.devcontainer/bootstrap-traefik.sh'))).mode &
			0o777,
		0o640,
	);
});

test('adoption rejects an invalid manifest identity before target writes', async t => {
	const target = await mkdtemp(join(tmpdir(), 'boilerplate-adoption-invalid-'));
	t.after(() => rm(target, { recursive: true, force: true }));
	await mkdir(join(target, '.boilerplate'));
	await writeFile(
		join(target, '.boilerplate/project-manifest.json'),
		JSON.stringify({ projectName: 'Bad', projectSlug: '../bad' }),
	);
	const result = adopt(target);
	assert.notEqual(result.status, 0);
	assert.match(result.stderr, /Invalid project identity/);
	await assert.rejects(stat(join(target, '.devcontainer')));
	await assert.rejects(stat(join(target, 'package.json')));
});

for (const [label, config] of [
	['mismatched', '{"workspaceFolder":"/custom/workspace"}'],
	['unknown', '{}'],
	[
		'JSONC',
		'{ // a custom devcontainer\n "workspaceFolder":"/workspaces/chosen-project"\n}',
	],
]) {
	test(`adoption proposes new MCP adapters for a retained ${label} workspace`, async t => {
		const target = await mkdtemp(join(tmpdir(), 'boilerplate-mcp-workspace-'));
		t.after(() => rm(target, { recursive: true, force: true }));
		await mkdir(join(target, '.devcontainer'));
		await mkdir(join(target, '.boilerplate'));
		await writeFile(
			join(target, '.boilerplate/project-manifest.json'),
			JSON.stringify({ projectName: 'Chosen', projectSlug: 'chosen-project' }),
		);
		await writeFile(join(target, '.devcontainer/devcontainer.json'), config);
		const dry = adopt(target, '--dry-run');
		assert.equal(dry.status, 0, dry.stderr);
		assert.match(
			dry.stdout,
			/would propose .mcp.json \(retained workspace is unverified\)/,
		);
		for (let pass = 0; pass < 2; pass++) {
			const result = adopt(target);
			assert.equal(result.status, 0, result.stderr);
			assert.equal(
				await readFile(join(target, '.devcontainer/devcontainer.json'), 'utf8'),
				config,
			);
			for (const file of ['.mcp.json', '.codex/config.toml']) {
				await assert.rejects(stat(join(target, file)));
				assert.match(
					await readFile(
						join(target, '.boilerplate/adoption/proposed', file),
						'utf8',
					),
					/\/workspaces\/chosen-project\/\.devcontainer\/chrome-mcp.cjs/,
				);
			}
		}
		const existing = '{"mcpServers":{"custom":{"command":"custom"}}}\n';
		await writeFile(join(target, '.mcp.json'), existing);
		assert.equal(adopt(target).status, 0);
		assert.equal(await readFile(join(target, '.mcp.json'), 'utf8'), existing);
	});
}

test('fresh adoption installs MCP adapters with the generated matching workspace', async t => {
	const target = await mkdtemp(join(tmpdir(), 'boilerplate-fresh-mcp-'));
	t.after(() => rm(target, { recursive: true, force: true }));
	assert.equal(adopt(target).status, 0);
	const config = JSON.parse(
		await readFile(join(target, '.devcontainer/devcontainer.json'), 'utf8'),
	);
	for (const file of ['.mcp.json', '.codex/config.toml']) {
		const content = await readFile(join(target, file), 'utf8');
		assert.ok(
			content.includes(
				`${config.workspaceFolder}/.devcontainer/chrome-mcp.cjs`,
			),
		);
	}
});

test('adoption installs all pinned and evaluation commands and force replaces script executability with backups', async t => {
	const target = await mkdtemp(
		join(tmpdir(), 'boilerplate-adoption-commands-'),
	);
	t.after(() => rm(target, { recursive: true, force: true }));
	await mkdir(join(target, '.devcontainer'));
	const script = join(target, '.devcontainer/setup.sh');
	await writeFile(script, '#!/bin/bash\necho custom\n');
	await chmod(script, 0o640);
	assert.equal(adopt(target).status, 0);
	assert.equal((await stat(script)).mode & 0o777, 0o640);
	const pkg = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'));
	assert.equal(pkg.scripts['bmad:install'], 'scripts/install-bmad.sh');
	assert.equal(pkg.scripts['bmad:install:stable'], pkg.scripts['bmad:install']);
	assert.equal(
		pkg.scripts['bmad:install:latest'],
		'BMAD_INSTALLER=bmad-method@latest scripts/install-bmad.sh',
	);
	assert.equal(
		pkg.scripts['bmad:install:preview'],
		'BMAD_INSTALLER=bmad-method@next BMAD_CHANNEL=next scripts/install-bmad.sh',
	);
	assert.equal(adopt(target, '--force').status, 0);
	assert.ok((await stat(script)).mode & 0o111);
	const { readdir } = await import('node:fs/promises');
	const backups = join(target, '.boilerplate/adoption/backups');
	const stamps = await readdir(backups);
	assert.equal(
		await readFile(join(backups, stamps[0], '.devcontainer/setup.sh'), 'utf8'),
		'#!/bin/bash\necho custom\n',
	);
	assert.equal(
		(await stat(join(backups, stamps[0], '.devcontainer/setup.sh'))).mode &
			0o777,
		0o640,
	);
});
