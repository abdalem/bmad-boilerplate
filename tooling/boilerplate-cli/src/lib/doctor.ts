import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { MANIFEST_FILE } from './constants.js';
import { exists } from './fs-utils.js';
import { providerTooling } from './module-registry.js';
import { loadManifest } from './manifest.js';

const checkCommand = (command: string, args: string[] = ['--version']) => {
	const result = spawnSync(command, args, {
		encoding: 'utf8',
		timeout: 3000,
	});
	return {
		ok: result.status === 0,
		output: (
			result.stdout ||
			result.stderr ||
			result.error?.message ||
			''
		).trim(),
	};
};

const parseVersion = (versionOutput: string) => {
	const match = versionOutput.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
	return match
		? [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)]
		: null;
};

export const isVersionAtLeast = (
	versionOutput: string,
	required: [number, number, number],
) => {
	const parsed = parseVersion(versionOutput);
	if (!parsed) return false;
	for (let index = 0; index < required.length; index += 1) {
		if (parsed[index] > required[index]) return true;
		if (parsed[index] < required[index]) return false;
	}
	return true;
};

export type DoctorCheck = {
	name: string;
	ok: boolean;
	details: string;
	optional?: boolean;
};

export const runDoctor = async (targetPath?: string) => {
	const node = checkCommand('node', ['-v']);
	const pnpm = checkCommand('pnpm', ['-v']);
	const codex = checkCommand('codex', ['--version']);
	const claude = checkCommand('claude', ['--version']);
	const docker = checkCommand('docker', ['--version']);
	const uv = checkCommand('uv', ['--version']);

	const checks: DoctorCheck[] = [
		{
			name: 'Node >= 22.20',
			ok: Boolean(node.ok && isVersionAtLeast(node.output, [22, 20, 0])),
			details: node.ok
				? `${node.output}. If this is below 22.20, open the Node 24 devcontainer.`
				: 'node not found. Open the Node 24 devcontainer to satisfy Node >=22.20.',
		},
		{
			name: 'pnpm >= 10',
			ok: Boolean(pnpm.ok && isVersionAtLeast(pnpm.output, [10, 0, 0])),
			details: pnpm.output || 'pnpm not found',
		},
		{
			name: 'uv available',
			ok: uv.ok,
			details:
				uv.output ||
				'uv not found. Open the devcontainer or install uv for BMAD scripts.',
		},
		{
			name: 'codex available',
			ok: codex.ok,
			details: codex.output || 'codex not found',
		},
		{
			name: 'claude adapter available (optional)',
			ok: claude.ok,
			details: claude.output || 'claude not found',
			optional: true,
		},
		{
			name: 'docker installed (optional)',
			ok: docker.ok,
			details: docker.output || 'docker not found',
			optional: true,
		},
	];

	if (targetPath && (await exists(join(targetPath, MANIFEST_FILE)))) {
		const manifest = await loadManifest(targetPath);
		const providers = Array.from(
			new Set(manifest.deployments.map(entry => entry.provider)),
		);

		for (const provider of providers) {
			const tooling = providerTooling[provider];
			for (const command of tooling.commands) {
				const result = checkCommand(command, ['--version']);
				checks.push({
					name: `${tooling.label} tooling`,
					ok: result.ok,
					details: result.ok
						? result.output
						: `${tooling.help} (${command} not found)`,
				});
			}
		}
	}

	return {
		ok: checks.every(check => check.ok || check.optional),
		checks,
	};
};
