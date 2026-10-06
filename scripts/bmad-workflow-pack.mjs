#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	applyWorkflowPack,
	mergeHelpOverlayFile,
	nextLocalId,
	validateWorkflowPack,
	writeInstallStatus,
} from '../.boilerplate/bmad-workflow-pack/lib/workflow-pack.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const command = process.argv[2];
const argv = process.argv.slice(3);
const value = (name, fallback) => {
	const index = argv.indexOf(name);
	return index === -1 ? fallback : argv[index + 1];
};
const has = name => argv.includes(name);
const target = resolve(value('--target', process.cwd()));
const sourcePack = resolve(
	value('--source', resolve(repoRoot, '.boilerplate', 'bmad-workflow-pack')),
);

try {
	if (command === 'apply') {
		const result = await applyWorkflowPack({
			sourcePack,
			target,
			force: has('--force'),
			dryRun: has('--dry-run'),
			restoreAfterUpstream: has('--restore-after-upstream'),
		});
		console.log(JSON.stringify(result, null, 2));
	} else if (command === 'merge-help') {
		console.log(await mergeHelpOverlayFile({ sourcePack, target }));
	} else if (command === 'next-id') {
		console.log(
			await nextLocalId({
				target,
				prefix: value('--prefix', 'APP').toUpperCase(),
				start: Number(value('--start', '1')),
				width: Number(value('--width', '3')),
			}),
		);
	} else if (command === 'validate') {
		const result = await validateWorkflowPack({
			target,
			requireUpstream: has('--upstream'),
			skipExternalSkills: has('--skip-external-skills'),
		});
		console.log(JSON.stringify(result, null, 2));
	} else if (command === 'status') {
		const result = await writeInstallStatus({
			target,
			state: value('--state', 'incomplete'),
			stage: value('--stage', 'unknown'),
			message: value('--message', ''),
		});
		console.log(JSON.stringify(result, null, 2));
	} else {
		throw new Error(
			'Usage: bmad-workflow-pack.mjs <apply|merge-help|next-id|validate|status> [options]',
		);
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
