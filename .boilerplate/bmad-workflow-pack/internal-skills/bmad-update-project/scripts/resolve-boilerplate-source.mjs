#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const DEFAULT_BOILERPLATE_SOURCE =
	'https://github.com/abdalem/bmad-boilerplate.git';

export const resolveBoilerplateSource = ({
	repository,
	explicitUrl,
	readRemote = root =>
		execFileSync('git', ['-C', root, 'remote', 'get-url', 'boilerplate'], {
			encoding: 'utf8',
		}).trim(),
}) => {
	if (explicitUrl?.trim()) {
		return { source: explicitUrl.trim(), origin: 'explicit' };
	}
	try {
		const remote = readRemote(resolve(repository));
		if (remote) return { source: remote, origin: 'remote' };
	} catch {
		// Repositories without a boilerplate remote use the documented fallback.
	}
	return { source: DEFAULT_BOILERPLATE_SOURCE, origin: 'default' };
};

const isMain = process.argv[1]
	? fileURLToPath(import.meta.url) === resolve(process.argv[1])
	: false;

if (isMain) {
	const repositoryIndex = process.argv.indexOf('--repository');
	const explicitIndex = process.argv.indexOf('--url');
	const repository =
		repositoryIndex >= 0 ? process.argv[repositoryIndex + 1] : process.cwd();
	const explicitUrl =
		explicitIndex >= 0 ? process.argv[explicitIndex + 1] : null;
	try {
		console.log(
			JSON.stringify(
				resolveBoilerplateSource({ repository, explicitUrl }),
				null,
				2,
			),
		);
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 2;
	}
}
