import { readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ensureWorkflowArtifacts, loadManifest, loadProjectBrief } from '../lib/brief.js';
import { generateProductSpec } from '../lib/spec.js';
import type { PresetName } from '../lib/types.js';

const isDirectoryMostlyEmpty = async (targetPath: string) => {
  const entries = await readdir(targetPath, { withFileTypes: true });
  return entries.filter(entry => !['.git', '.boilerplate'].includes(entry.name)).length === 0;
};

export const runSpecInit = async (args: {
  targetPath: string;
  deterministic: boolean;
  preset?: PresetName;
}) => {
  const targetPath = resolve(args.targetPath);
  await ensureWorkflowArtifacts(targetPath, args.preset ?? 'web-api');
  const [manifest, brief] = await Promise.all([
    loadManifest(targetPath),
    loadProjectBrief(targetPath),
  ]);

  let result: { mode: 'deterministic' | 'codex'; markdown: string };
  try {
    result = await generateProductSpec({
      targetPath,
      manifest,
      brief,
      deterministic: args.deterministic,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const hint = args.deterministic
      ? ''
      : ' Ensure `codex` is installed/authenticated or rerun with `--deterministic`.';
    throw new Error(`Failed to generate PRODUCT_SPEC.md. ${details}${hint}`);
  }

  console.log(
    `PRODUCT_SPEC.md generated at ${join(targetPath, 'PRODUCT_SPEC.md')} (${result.mode}).`,
  );
};

export const warnIfDirectoryNotEmpty = async (targetPath: string) => {
  if (await isDirectoryMostlyEmpty(targetPath)) {
    return false;
  }

  console.log(
    'Current directory is not empty. Workflow artifacts will be added alongside the existing repo.',
  );
  return true;
};
