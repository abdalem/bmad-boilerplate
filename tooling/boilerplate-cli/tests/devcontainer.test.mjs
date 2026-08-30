import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
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
			assert.match(adapter, /chrome-devtools-mcp@latest/);
			assert.match(adapter, /host\.docker\.internal/);
			assert.match(adapter, /9222/);
		}
	} finally {
		await rm(target, { recursive: true, force: true });
	}
});
