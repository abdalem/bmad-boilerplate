import { createHash } from 'node:crypto';
import {
	copyFile,
	mkdir,
	readFile,
	readdir,
	rm,
	rmdir,
	stat,
	writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

export const hashContent = content =>
	createHash('sha256').update(content).digest('hex');

const exists = async path => {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
};

export const listFiles = async root => {
	if (!(await exists(root))) return [];
	const output = [];
	const walk = async directory => {
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			if (entry.name === '__pycache__' || entry.name.endsWith('.pyc')) continue;
			const path = join(directory, entry.name);
			if (entry.isDirectory()) await walk(path);
			if (entry.isFile()) output.push(path);
		}
	};
	await walk(root);
	return output.sort();
};

const stripTomlComment = line => {
	let quoted = false;
	let escaped = false;
	for (let index = 0; index < line.length; index += 1) {
		const character = line[index];
		if (character === '"' && !escaped) quoted = !quoted;
		if (character === '#' && !quoted) return line.slice(0, index).trim();
		escaped = character === '\\' && !escaped;
		if (character !== '\\') escaped = false;
	}
	return line.trim();
};

const parseTomlValue = value => {
	if (value === 'true') return true;
	if (value === 'false') return false;
	if (/^-?\d+$/.test(value)) return Number(value);
	if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
	if (value.startsWith('[') && value.endsWith(']')) {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) throw new Error(`Invalid TOML array: ${value}`);
		return parsed;
	}
	throw new Error(`Unsupported TOML value: ${value}`);
};

const DEFAULT_WORK_ITEMS = {
	types: ['Module', 'Request', 'Feature', 'Issue', 'Bug', 'Spike'],
	module_type: 'Module',
	request_type: 'Request',
	feature_type: 'Feature',
	issue_type: 'Issue',
	bug_type: 'Bug',
	spike_type: 'Spike',
	module_children: ['Feature', 'Issue'],
	feature_children: ['Issue'],
};

const DEFAULT_DESIGN = {
	provider: 'figma',
	enabled: false,
	screen_registry_path: 'docs/design/screen-registry.md',
	reference_path: 'docs/design/references',
};

const DEFAULT_AUTOMATION = {
	build_auto_enabled: false,
	loop_enabled: false,
};

export const parseProjectPolicy = raw => {
	const policy = {};
	let current = policy;
	for (const sourceLine of raw.split(/\r?\n/)) {
		const line = stripTomlComment(sourceLine);
		if (!line) continue;
		const section = line.match(/^\[([a-z_]+)]$/i);
		if (section) {
			current = policy[section[1]] ??= {};
			continue;
		}
		const assignment = line.match(/^([a-z_]+)\s*=\s*(.+)$/i);
		if (!assignment)
			throw new Error(`Invalid project policy line: ${sourceLine}`);
		current[assignment[1]] = parseTomlValue(assignment[2].trim());
	}
	return validateProjectPolicy(policy);
};

export const validateProjectPolicy = policy => {
	const errors = [];
	if (![1, 2].includes(policy.version)) errors.push('version must be 1 or 2');
	const normalized = {
		...policy,
		version: 2,
		project: { ...policy.project },
		tickets: { ...policy.tickets },
		work_items: {
			...DEFAULT_WORK_ITEMS,
			...policy.work_items,
		},
		design: { ...DEFAULT_DESIGN, ...policy.design },
		automation: { ...DEFAULT_AUTOMATION, ...policy.automation },
		release_notes: { ...policy.release_notes },
	};
	if (!/^[A-Z][A-Z0-9]*$/.test(normalized.project?.key ?? '')) {
		errors.push('project.key must be an uppercase project key');
	}
	if (
		typeof normalized.project?.summary_language !== 'string' ||
		!normalized.project.summary_language
	) {
		errors.push('project.summary_language is required');
	}
	if (!['local', 'external'].includes(normalized.tickets?.identity_mode)) {
		errors.push('tickets.identity_mode must be local or external');
	}
	if (
		typeof normalized.tickets?.tracker !== 'string' ||
		!normalized.tickets.tracker
	) {
		errors.push('tickets.tracker is required');
	}
	if (
		typeof normalized.tickets?.project_key !== 'string' ||
		!normalized.tickets.project_key
	) {
		errors.push('tickets.project_key is required');
	}
	if (!/^[A-Z][A-Z0-9]*$/.test(normalized.tickets?.local_prefix ?? '')) {
		errors.push('tickets.local_prefix must be uppercase alphanumeric');
	}
	if (
		!Number.isInteger(normalized.tickets?.local_start) ||
		normalized.tickets.local_start < 1
	) {
		errors.push('tickets.local_start must be a positive integer');
	}
	if (
		!Number.isInteger(normalized.tickets?.local_width) ||
		normalized.tickets.local_width < 1
	) {
		errors.push('tickets.local_width must be a positive integer');
	}

	const types = normalized.work_items.types;
	if (
		!Array.isArray(types) ||
		!types.length ||
		types.some(type => typeof type !== 'string' || !type.trim())
	) {
		errors.push('work_items.types must be a non-empty string array');
	} else if (new Set(types).size !== types.length) {
		errors.push('work_items.types must contain unique values');
	}
	const typeSet = new Set(Array.isArray(types) ? types : []);
	const roleFields = [
		'module_type',
		'request_type',
		'feature_type',
		'issue_type',
		'bug_type',
		'spike_type',
	];
	for (const field of roleFields) {
		if (!typeSet.has(normalized.work_items[field])) {
			errors.push(`work_items.${field} must reference a configured type`);
		}
	}
	const roleTypes = roleFields.map(field => normalized.work_items[field]);
	if (new Set(roleTypes).size !== roleTypes.length) {
		errors.push('work item semantic type mappings must be unique');
	}
	for (const field of ['module_children', 'feature_children']) {
		const children = normalized.work_items[field];
		if (
			!Array.isArray(children) ||
			children.some(child => typeof child !== 'string' || !typeSet.has(child))
		) {
			errors.push(
				`work_items.${field} must contain only configured item types`,
			);
		}
	}

	if (normalized.design.provider !== 'figma') {
		errors.push('design.provider must be figma');
	}
	if (typeof normalized.design.enabled !== 'boolean') {
		errors.push('design.enabled must be boolean');
	}
	const isProjectPath = value =>
		typeof value === 'string' &&
		value.length > 0 &&
		!value.startsWith('/') &&
		!value.split(/[\\/]/).includes('..');
	for (const field of ['screen_registry_path', 'reference_path']) {
		if (!isProjectPath(normalized.design[field])) {
			errors.push(`design.${field} must be a relative project path`);
		}
	}
	if (typeof normalized.automation.build_auto_enabled !== 'boolean') {
		errors.push('automation.build_auto_enabled must be boolean');
	}
	if (typeof normalized.automation.loop_enabled !== 'boolean') {
		errors.push('automation.loop_enabled must be boolean');
	}

	if (typeof normalized.release_notes?.enabled !== 'boolean') {
		errors.push('release_notes.enabled must be boolean');
	}
	if (normalized.release_notes?.enabled && !normalized.release_notes.path) {
		errors.push(
			'release_notes.path is required when release notes are enabled',
		);
	}
	if (
		typeof normalized.release_notes?.language !== 'string' ||
		!normalized.release_notes.language
	) {
		errors.push('release_notes.language is required');
	}
	if (errors.length)
		throw new Error(`Invalid project workflow policy: ${errors.join('; ')}`);
	return normalized;
};

const escapeRegExp = value => value.replace(/[.*+?^$()|[\]{}\\]/g, '\\$&');

export const allocateLocalId = ({ evidence, prefix, start = 1, width = 3 }) => {
	if (!/^[A-Z][A-Z0-9]*$/.test(prefix))
		throw new Error('prefix must be uppercase alphanumeric');
	const pattern = new RegExp(`\\b${escapeRegExp(prefix)}-(\\d+)\\b`, 'gi');
	const used = new Set();
	for (const value of evidence) {
		for (const match of value.matchAll(pattern)) used.add(Number(match[1]));
	}
	let next = start;
	while (used.has(next)) next += 1;
	return `${prefix}-${String(next).padStart(width, '0')}`;
};

export const nextLocalId = async ({ target, prefix, start = 1, width = 3 }) => {
	const roots = [
		join(target, '_bmad-output', 'planning-artifacts'),
		join(target, '_bmad-output', 'implementation-artifacts'),
	];
	const evidence = [];
	for (const root of roots) {
		for (const path of await listFiles(root)) {
			evidence.push(relative(target, path));
			evidence.push(await readFile(path, 'utf8').catch(() => ''));
		}
		if (await exists(root)) {
			const collectDirectories = async directory => {
				for (const entry of await readdir(directory, { withFileTypes: true })) {
					evidence.push(relative(target, join(directory, entry.name)));
					if (entry.isDirectory())
						await collectDirectories(join(directory, entry.name));
				}
			};
			await collectDirectories(root);
		}
	}
	return allocateLocalId({ evidence, prefix, start, width });
};

export const parseCsv = raw => {
	const rows = [];
	let row = [];
	let field = '';
	let quoted = false;
	for (let index = 0; index < raw.length; index += 1) {
		const character = raw[index];
		if (character === '"') {
			if (quoted && raw[index + 1] === '"') {
				field += '"';
				index += 1;
			} else quoted = !quoted;
		} else if (character === ',' && !quoted) {
			row.push(field);
			field = '';
		} else if ((character === '\n' || character === '\r') && !quoted) {
			if (character === '\r' && raw[index + 1] === '\n') index += 1;
			row.push(field);
			if (row.some(value => value !== '')) rows.push(row);
			row = [];
			field = '';
		} else field += character;
	}
	if (field || row.length) {
		row.push(field);
		rows.push(row);
	}
	return rows;
};

const csvField = value => {
	const string = String(value ?? '');
	return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
};

export const stringifyCsv = rows =>
	`${rows.map(row => row.map(csvField).join(',')).join('\n')}\n`;

export const pruneHelpCatalog = (baseRaw, removalsRaw) => {
	const base = parseCsv(baseRaw);
	const removals = parseCsv(removalsRaw);
	if (!base.length || !removals.length)
		throw new Error('Help catalog removal CSV is empty');
	const header = base[0];
	const removalHeader = removals[0];
	const requiredKeys = ['module', 'skill', 'action'];
	for (const name of requiredKeys) {
		if (!header.includes(name) || !removalHeader.includes(name)) {
			throw new Error(`Help removal CSV is missing ${name}`);
		}
	}
	const value = (row, rowHeader, name) => row[rowHeader.indexOf(name)] ?? '';
	const key = (row, rowHeader) =>
		requiredKeys.map(name => value(row, rowHeader, name)).join('\0');
	const retired = new Set(
		removals.slice(1).map(row => key(row, removalHeader)),
	);
	return stringifyCsv([
		header,
		...base.slice(1).filter(row => !retired.has(key(row, header))),
	]);
};

export const mergeHelpCatalog = (baseRaw, overlayRaw) => {
	const base = parseCsv(baseRaw);
	const overlay = parseCsv(overlayRaw);
	if (!base.length || !overlay.length)
		throw new Error('Help catalog CSV is empty');
	const header = base[0];
	if (header.join('\0') !== overlay[0].join('\0'))
		throw new Error('Help overlay header mismatch');
	const index = name => header.indexOf(name);
	const key = row =>
		[row[index('module')], row[index('skill')], row[index('action')]].join(
			'\0',
		);
	const positions = new Map(
		base.slice(1).map((row, offset) => [key(row), offset + 1]),
	);
	for (const row of overlay.slice(1)) {
		const position = positions.get(key(row));
		if (position === undefined) {
			positions.set(key(row), base.length);
			base.push(row);
		} else base[position] = row;
	}
	return stringifyCsv(base);
};

const readJson = async (path, fallback) => {
	try {
		return JSON.parse(await readFile(path, 'utf8'));
	} catch {
		return fallback;
	}
};

const writeAtomic = async (path, content) => {
	await mkdir(dirname(path), { recursive: true });
	const temporary = `${path}.tmp-${process.pid}`;
	await writeFile(temporary, content);
	const { rename } = await import('node:fs/promises');
	await rename(temporary, path);
};

const timestamp = () => new Date().toISOString().replace(/[-:TZ.]/g, '');

const removeEmptyParents = async (path, root) => {
	let directory = dirname(path);
	while (directory !== root) {
		const relativeDirectory = relative(root, directory);
		if (!relativeDirectory || relativeDirectory.startsWith('..')) return;
		try {
			await rmdir(directory);
		} catch {
			return;
		}
		directory = dirname(directory);
	}
};

const managedEntries = async (sourcePack, target, includePackSource) => {
	const metadata = JSON.parse(
		await readFile(join(sourcePack, 'managed-files.json'), 'utf8'),
	);
	const entries = [];
	if (includePackSource) {
		for (const source of await listFiles(sourcePack)) {
			entries.push({
				source,
				target: join(
					target,
					'.boilerplate',
					'bmad-workflow-pack',
					relative(sourcePack, source),
				),
			});
		}
	}
	for (const group of metadata.groups) {
		const sourceRoot = join(sourcePack, group.source);
		for (const source of await listFiles(sourceRoot)) {
			for (const targetRoot of group.targets) {
				entries.push({
					source,
					target: join(target, targetRoot, relative(sourceRoot, source)),
				});
			}
		}
	}
	return { entries, metadata };
};

export const applyWorkflowPack = async ({
	sourcePack,
	target,
	force = false,
	dryRun = false,
	restoreAfterUpstream = false,
}) => {
	sourcePack = resolve(sourcePack);
	target = resolve(target);
	const includePackSource =
		resolve(join(target, '.boilerplate', 'bmad-workflow-pack')) !== sourcePack;
	const { entries, metadata } = await managedEntries(
		sourcePack,
		target,
		includePackSource,
	);
	const statePath = join(target, metadata.stateFile);
	const previous = await readJson(statePath, {
		version: 1,
		packVersion: null,
		files: {},
	});
	const pack = JSON.parse(
		await readFile(join(sourcePack, 'pack.json'), 'utf8'),
	);
	const next = {
		version: 1,
		packVersion: pack.version,
		files: { ...previous.files },
	};
	const result = {
		copied: [],
		updated: [],
		unchanged: [],
		proposed: [],
		removed: [],
		retirementProposed: [],
		backedUp: [],
	};
	const backupStamp = timestamp();
	const activeTargets = new Set();

	for (const entry of entries) {
		const relativeTarget = relative(target, entry.target).split('\\').join('/');
		activeTargets.add(relativeTarget);
		const sourceContent = await readFile(entry.source);
		const sourceHash = hashContent(sourceContent);
		const targetExists = await exists(entry.target);
		const targetContent = targetExists ? await readFile(entry.target) : null;
		const targetHash = targetContent ? hashContent(targetContent) : null;

		if (targetHash === sourceHash) {
			result.unchanged.push(relativeTarget);
			next.files[relativeTarget] = sourceHash;
			continue;
		}

		const managedUpdate =
			targetExists && previous.files[relativeTarget] === targetHash;
		const upstreamReplacement =
			restoreAfterUpstream &&
			targetExists &&
			previous.files[relativeTarget] === sourceHash;
		if (!targetExists || managedUpdate || upstreamReplacement || force) {
			if (!dryRun) {
				await mkdir(dirname(entry.target), { recursive: true });
				if (force && targetExists && !managedUpdate && !upstreamReplacement) {
					const backup = join(
						target,
						metadata.backupRoot,
						backupStamp,
						relativeTarget,
					);
					await mkdir(dirname(backup), { recursive: true });
					await copyFile(entry.target, backup);
					result.backedUp.push(relativeTarget);
				}
				await writeFile(entry.target, sourceContent);
			}
			result[targetExists ? 'updated' : 'copied'].push(relativeTarget);
			next.files[relativeTarget] = sourceHash;
			continue;
		}

		const proposed = join(target, metadata.proposedRoot, relativeTarget);
		if (!dryRun) {
			await mkdir(dirname(proposed), { recursive: true });
			await writeFile(proposed, sourceContent);
		}
		result.proposed.push(relativeTarget);
	}

	for (const [relativeTarget, managedHash] of Object.entries(previous.files)) {
		if (activeTargets.has(relativeTarget)) continue;
		const retiredTarget = join(target, relativeTarget);
		if (!(await exists(retiredTarget))) {
			delete next.files[relativeTarget];
			continue;
		}

		const targetContent = await readFile(retiredTarget);
		const targetHash = hashContent(targetContent);
		const unchanged = targetHash === managedHash;
		if (unchanged || force) {
			if (!dryRun) {
				if (force && !unchanged) {
					const backup = join(
						target,
						metadata.backupRoot,
						backupStamp,
						relativeTarget,
					);
					await mkdir(dirname(backup), { recursive: true });
					await copyFile(retiredTarget, backup);
					result.backedUp.push(relativeTarget);
				}
				await rm(retiredTarget);
				await removeEmptyParents(retiredTarget, target);
			}
			result.removed.push(relativeTarget);
			delete next.files[relativeTarget];
			continue;
		}

		const proposed = join(target, metadata.proposedRoot, relativeTarget);
		if (!dryRun) {
			await mkdir(dirname(proposed), { recursive: true });
			await writeFile(proposed, targetContent);
			await writeFile(
				`${proposed}.retire`,
				[
					`${relativeTarget} was retired from the workflow pack.`,
					'The installed file has local changes and was left untouched.',
					'Review it and delete it manually, or rerun workflow-pack apply with --force to back it up and remove it.',
					'',
				].join('\n'),
			);
		}
		result.retirementProposed.push(relativeTarget);
	}

	if (!dryRun)
		await writeAtomic(statePath, `${JSON.stringify(next, null, '\t')}\n`);
	return result;
};

export const mergeHelpOverlayFile = async ({ sourcePack, target }) => {
	const helpPath = join(target, '_bmad', '_config', 'bmad-help.csv');
	if (!(await exists(helpPath)))
		throw new Error(`BMAD help catalog not found: ${helpPath}`);
	const removalsPath = join(sourcePack, 'help-remove.csv');
	const base = await readFile(helpPath, 'utf8');
	const pruned = (await exists(removalsPath))
		? pruneHelpCatalog(base, await readFile(removalsPath, 'utf8'))
		: base;
	const merged = mergeHelpCatalog(
		pruned,
		await readFile(join(sourcePack, 'help-overlay.csv'), 'utf8'),
	);
	await writeAtomic(helpPath, merged);
	return helpPath;
};

export const writeInstallStatus = async ({
	target,
	state,
	stage,
	message = '',
}) => {
	const status = { state, stage, message, updatedAt: new Date().toISOString() };
	await writeAtomic(
		join(target, '.boilerplate', 'bmad-install-status.json'),
		`${JSON.stringify(status, null, '\t')}\n`,
	);
	return status;
};

export const getBmadCompatibility = (
	installedVersion,
	testedVersion = '6.12.1',
) => {
	const match = /^(\d+)\.(\d+)\.(\d+)(?:-[\w.-]+)?$/.exec(
		installedVersion ?? '',
	);
	const status =
		installedVersion === testedVersion
			? 'SUPPORTED'
			: match &&
					(Number(match[1]) < 6 ||
						(Number(match[1]) === 6 && Number(match[2]) < 12))
				? 'INCOMPATIBLE'
				: 'UNTESTED';
	return { status, installedVersion: installedVersion ?? null, testedVersion };
};

// Retirement manifests may name old identifiers to remove them. Active routing may not.
const deprecatedSkills = [
	'bmad-checkpoint-preview',
	'bmad-quick-dev',
	'bmad-dev-story',
	'bmad-create-story',
	'bmad-create-epics-and-stories',
	'bmad-sprint-status',
	'bmad-market-research',
	'bmad-domain-research',
	'bmad-technical-research',
	'bmad-create-prd',
	'bmad-edit-prd',
	'bmad-validate-prd',
	'bmad-create-architecture',
	'bmad-generate-project-context',
];

export const validateWorkflowPack = async ({
	target,
	requireUpstream = false,
	skipExternalSkills = false,
}) => {
	const manifest = await readFile(
		join(target, '_bmad/_config/manifest.yaml'),
		'utf8',
	).catch(() => '');
	const installedTools = [
		...(manifest.match(/^ides:\s*\n((?:[ \t]+.*\n?)*)/m)?.[1] ?? '').matchAll(
			/^\s+-\s+([\w-]+)/gm,
		),
	].map(match => match[1]);
	const toolRoots = installedTools.length
		? installedTools
				.filter(tool => ['claude-code', 'codex'].includes(tool))
				.map(tool => (tool === 'codex' ? '.agents' : '.claude'))
		: ['.agents', '.claude'];
	const required = [
		'_bmad/custom/bmad-build.toml',
		'docs/bmad-project-workflow/index.md',
		'docs/bmad-project-workflow/prompts/product-definition.md',
		'docs/bmad-project-workflow/prompts/independent-review.md',
		'docs/bmad-work-item-workflow/index.md',
		'.agents/skills/bmad-start-project/SKILL.md',
		'.agents/skills/bmad-update-project/SKILL.md',
		'.agents/skills/bmad-workflow-setup/SKILL.md',
		'.agents/skills/bmad-publish-work-item/SKILL.md',
		'.claude/skills/bmad-start-project/SKILL.md',
		'.claude/skills/bmad-update-project/SKILL.md',
		'.claude/skills/bmad-workflow-setup/SKILL.md',
		'.claude/skills/bmad-publish-work-item/SKILL.md',
	];
	if (requireUpstream) {
		required.push(
			'_bmad/bmm',
			'_bmad/tea',
			'_bmad/cis',
			'_bmad/wds',
			'_bmad/_config/manifest.yaml',
		);
		for (const tool of toolRoots) {
			for (const skill of ['bmad-build', 'bmad-build-auto', 'bmad-walkthrough'])
				required.push(`${tool}/skills/${skill}/SKILL.md`);
		}
		if (!skipExternalSkills) {
			for (const entry of JSON.parse(
				await readFile(
					join(target, '.boilerplate/bmad-workflow-pack/pack.json'),
					'utf8',
				),
			).externalSkills)
				for (const tool of toolRoots)
					required.push(`${tool}/skills/${entry.skill}/SKILL.md`);
		}
	}
	const packRoot = join(target, '.boilerplate/bmad-workflow-pack');
	const pack = await readJson(join(packRoot, 'pack.json'), {
		bmad: { testedVersion: '6.12.1' },
	});
	const activeFiles = [join(packRoot, 'help-overlay.csv')];
	const metadata = await readJson(join(packRoot, 'managed-files.json'), {
		groups: [],
	});
	for (const group of metadata.groups) {
		const sourceRoot = join(packRoot, group.source);
		for (const source of await listFiles(sourceRoot))
			for (const targetRoot of group.targets)
				activeFiles.push(
					join(target, targetRoot, relative(sourceRoot, source)),
				);
	}
	for (const directory of ['bmad-custom', 'docs', 'internal-skills'])
		activeFiles.push(...(await listFiles(join(packRoot, directory))));
	for (const path of activeFiles) {
		if (!(await exists(path))) continue;
		const content = await readFile(path, 'utf8');
		const retired = deprecatedSkills.find(skill =>
			new RegExp(`\\b${skill}\\b`).test(content),
		);
		if (retired)
			throw new Error(
				`Managed asset references deprecated skill ${retired}: ${relative(target, path)}`,
			);
	}
	const installation =
		manifest.match(/^installation:\s*\n((?:[ \t]+.*\n?)*)/m)?.[1] ?? '';
	const installedVersion =
		installation.match(/^\s+version:\s*['"]?([\w.-]+)/m)?.[1] ?? null;
	const compatibility = getBmadCompatibility(
		installedVersion,
		pack.bmad.testedVersion,
	);
	if (requireUpstream && compatibility.status === 'INCOMPATIBLE')
		throw new Error(
			`INCOMPATIBLE BMAD ${installedVersion}; tested baseline is ${compatibility.testedVersion}. Rerun pnpm bmad:install.`,
		);

	const missing = [];
	for (const path of required)
		if (!(await exists(join(target, path)))) missing.push(path);
	const policyPath = join(target, '_bmad', 'custom', 'project-workflow.toml');
	let policy = null;
	if (await exists(policyPath))
		policy = parseProjectPolicy(await readFile(policyPath, 'utf8'));
	if (missing.length)
		throw new Error(
			`Workflow pack validation failed; missing: ${missing.join(', ')}`,
		);
	return {
		policyStatus: policy ? 'configured' : 'missing',
		policy,
		compatibility,
	};
};
