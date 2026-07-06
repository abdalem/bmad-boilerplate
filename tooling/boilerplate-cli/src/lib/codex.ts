import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

export const isCodexInstalled = () => {
  const result = spawnSync('codex', ['--version'], { encoding: 'utf8' });
  return result.status === 0;
};

export const runCodexJson = async <T>(args: {
  prompt: string;
  schemaPath: string;
  cwd: string;
}): Promise<T> => {
  const tempDir = await mkdtemp(join(tmpdir(), 'boilerplate-codex-'));
  const outputFile = join(tempDir, 'response.json');

  const commandArgs = [
    'exec',
    '--skip-git-repo-check',
    '--sandbox',
    'danger-full-access',
    '--output-schema',
    args.schemaPath,
    '--output-last-message',
    outputFile,
    args.prompt,
  ];

  const result = spawnSync('codex', commandArgs, {
    cwd: args.cwd,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10,
  });

  if (result.status !== 0) {
    await rm(tempDir, { recursive: true, force: true });
    const spawnError = result.error?.message;
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    throw new Error(
      `Codex exec failed (${spawnError ? `spawn error: ${spawnError}` : `exit ${result.status}`}). ${stderr || stdout || 'No output from codex.'}`,
    );
  }

  const raw = await readFile(outputFile, 'utf8');
  await rm(tempDir, { recursive: true, force: true });

  return JSON.parse(raw) as T;
};
