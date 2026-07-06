import { confirm, input, select } from '@inquirer/prompts';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ensureWorkflowArtifacts } from '../lib/brief.js';
import { ensureDir } from '../lib/fs-utils.js';
import { runMigrate } from './migrate.js';
import type { PresetName } from '../lib/types.js';

const isDirectoryMostlyEmpty = async (targetPath: string) => {
  const entries = await readdir(targetPath, { withFileTypes: true });
  return entries.filter(entry => !['.git', '.boilerplate'].includes(entry.name)).length === 0;
};

export const runInit = async (args: {
  targetPath?: string;
  deterministic: boolean;
  preset?: PresetName;
}) => {
  const mode = args.deterministic
    ? 'scratch-current-dir'
    : await select<'scratch-current-dir' | 'migrate-existing-path'>({
        message: 'Choose initialization mode',
        choices: [
          { name: 'scratch-current-dir', value: 'scratch-current-dir' },
          { name: 'migrate-existing-path', value: 'migrate-existing-path' },
        ],
      });

  if (mode === 'migrate-existing-path') {
    const targetPath = await input({
      message: 'Path to existing project directory',
      validate: value => (value.trim().length > 0 ? true : 'Path is required.'),
    });

    await runMigrate({ targetPath, desiredProviders: {} });
    return;
  }

  const targetPath = resolve(args.targetPath ?? process.cwd());
  const preset = args.preset ?? 'web-api';
  await ensureDir(targetPath);
  const hasExistingContent = !(await isDirectoryMostlyEmpty(targetPath));

  if (hasExistingContent && !args.deterministic) {
    const proceed = await confirm({
      message: 'Current directory is not empty. Write v2 workflow artifacts here anyway?',
      default: false,
    });

    if (!proceed) {
      console.log('Cancelled.');
      return;
    }
  }

  const manifest = await ensureWorkflowArtifacts(targetPath, preset);
  console.log(`Created ${targetPath}/.boilerplate/project-brief.md`);
  console.log(`Created ${targetPath}/.boilerplate/project-manifest.json`);
  console.log(`Preset: ${manifest.preset}`);
  console.log(
    'Next steps: refine the brief, create or approve the design doc, then run `pnpm boilerplate spec:init`.',
  );
};
