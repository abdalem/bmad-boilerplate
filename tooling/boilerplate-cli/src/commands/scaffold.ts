import { resolve } from 'node:path';
import { ensureManifest, loadManifest } from '../lib/manifest.js';
import { scaffoldProject } from '../lib/scaffold.js';
import type { PresetName } from '../lib/types.js';

export const runScaffold = async (args: {
	targetPath: string;
	overwrite: boolean;
	preset?: PresetName;
}) => {
	const targetPath = resolve(args.targetPath);
	await ensureManifest(targetPath, args.preset ?? 'web-api');
	await scaffoldProject({
		targetPath,
		manifest: await loadManifest(targetPath),
		overwrite: args.overwrite,
	});
	console.log(
		`Technical scaffold and BMAD workflow pack completed for ${targetPath}.`,
	);
	console.log(
		'Run `pnpm bmad:install`, then `bmad-workflow-setup` and `bmad-help`.',
	);
};
