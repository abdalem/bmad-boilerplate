import { confirm } from '@inquirer/prompts';
import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ensureDir } from '../lib/fs-utils.js';
import { ensureManifest } from '../lib/manifest.js';
import type { PresetName } from '../lib/types.js';

const isDirectoryMostlyEmpty = async (targetPath: string) => {
	const entries = await readdir(targetPath, { withFileTypes: true });
	return (
		entries.filter(entry => !['.git', '.boilerplate'].includes(entry.name))
			.length === 0
	);
};

export const runInit = async (args: {
	targetPath?: string;
	preset?: PresetName;
}) => {
	const targetPath = resolve(args.targetPath ?? process.cwd());
	await ensureDir(targetPath);
	if (!(await isDirectoryMostlyEmpty(targetPath))) {
		const proceed = await confirm({
			message:
				'The target is not empty. Add a technical project manifest here?',
			default: false,
		});
		if (!proceed) return;
	}
	const manifest = await ensureManifest(targetPath, args.preset ?? 'web-api');
	console.log(`Created ${targetPath}/.boilerplate/project-manifest.json`);
	console.log(`Preset: ${manifest.preset}`);
	console.log(
		'Review package deployment targets, then run `pnpm scaffold -- --path <dir>`.',
	);
};
