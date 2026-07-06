import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { MANIFEST_FILE } from './constants.js';
import { exists } from './fs-utils.js';
import { providerTooling } from './module-registry.js';
import { loadManifest } from './brief.js';

const checkCommand = (command: string, args: string[] = ['--version']) => {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    timeout: 3000,
  });
  return {
    ok: result.status === 0,
    output: (result.stdout || result.stderr || result.error?.message || '').trim(),
  };
};

const parseMajor = (versionOutput: string) => {
  const match = versionOutput.match(/(\d+)/);
  return match ? Number(match[1]) : null;
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

  const nodeMajor = node.ok ? parseMajor(node.output) : null;
  const pnpmMajor = pnpm.ok ? parseMajor(pnpm.output) : null;

  const checks: DoctorCheck[] = [
    {
      name: 'Node >= 20',
      ok: Boolean(node.ok && nodeMajor !== null && nodeMajor >= 20),
      details:
        node.output || 'node not found. Use nvm, fnm, or the devcontainer to get Node >= 20.',
    },
    {
      name: 'pnpm >= 10',
      ok: Boolean(pnpm.ok && pnpmMajor !== null && pnpmMajor >= 10),
      details: pnpm.output || 'pnpm not found',
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
    const providers = Array.from(new Set(manifest.deployments.map(entry => entry.provider)));

    for (const provider of providers) {
      const tooling = providerTooling[provider];
      for (const command of tooling.commands) {
        const result = checkCommand(command, ['--version']);
        checks.push({
          name: `${tooling.label} tooling`,
          ok: result.ok,
          details: result.ok ? result.output : `${tooling.help} (${command} not found)`,
        });
      }
    }
  }

  return {
    ok: checks.every(check => check.ok || check.optional),
    checks,
  };
};
