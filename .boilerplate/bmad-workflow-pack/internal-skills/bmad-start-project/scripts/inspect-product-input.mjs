#!/usr/bin/env node

import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PRODUCT_INPUT_FILES = [
	'00-handoff-manifest.md',
	'01-product-brief.md',
	'02-business-and-market.md',
	'03-product-requirements.md',
	'04-domain-and-data.md',
	'05-risks-and-open-questions.md',
	'06-initial-work-map.md',
];

export const REVIEW_FILE = 'REVIEW.md';

const REQUIRED_HEADINGS = {
	'00-handoff-manifest.md': [
		'# Product Handoff Manifest',
		'## Bundle Metadata',
		'## File Inventory',
		'## Known Omissions',
	],
	'01-product-brief.md': [
		'# Product Brief',
		'## Problem',
		'## Users And Buyers',
		'## Value Proposition',
		'## Outcomes',
		'## Scope',
		'## Non-Goals',
	],
	'02-business-and-market.md': [
		'# Business And Market',
		'## Business Model',
		'## Market And Alternatives',
		'## Positioning',
		'## Adoption And Distribution',
		'## Pricing Assumptions',
		'## Success Measures',
	],
	'03-product-requirements.md': [
		'# Product Requirements',
		'## Capabilities',
		'## Critical Flows',
		'## Constraints',
		'## Outcome Criteria',
		'## Release Boundaries',
	],
	'04-domain-and-data.md': [
		'# Domain And Data',
		'## Domain Language',
		'## Core Entities And Relationships',
		'## Ownership And Lifecycle',
		'## Sensitive Data',
		'## Integration Boundaries',
	],
	'05-risks-and-open-questions.md': [
		'# Risks And Open Questions',
		'## Confirmed Decisions',
		'## Assumptions',
		'## Risks',
		'## Open Questions',
		'## Invalidation Conditions',
	],
	'06-initial-work-map.md': [
		'# Initial Work Map',
		'## Modules',
		'## Features',
		'## Issues',
		'## Dependencies',
		'## Deferred Candidates',
	],
	[REVIEW_FILE]: [
		'# Independent Product Review',
		'## Material Corrections',
		'## Unresolved Disagreements',
		'## Rejected Recommendations',
		'## Confidence Limits',
	],
};

const metadataValue = (content, key) => {
	const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return content.match(new RegExp(`^- ${escaped}:\\s*(.+)$`, 'im'))?.[1].trim();
};

export const inspectProductInput = async directory => {
	const root = resolve(directory);
	const entries = await readdir(root, { withFileTypes: true });
	const names = entries.map(entry => entry.name).sort();
	const manifestPath = resolve(root, PRODUCT_INPUT_FILES[0]);
	let manifest = '';
	try {
		manifest = await readFile(manifestPath, 'utf8');
	} catch {
		// Missing inventory is reported with the other required files.
	}

	const status =
		metadataValue(manifest, 'Bundle status')?.toLowerCase() ?? null;
	const expected = new Set(PRODUCT_INPUT_FILES);
	if (status === 'reviewed') expected.add(REVIEW_FILE);
	const missing = [...expected].filter(name => !names.includes(name));
	const unexpected = names.filter(name => !expected.has(name));
	const errors = [];

	if (metadataValue(manifest, 'Bundle version') !== '1') {
		errors.push('Bundle version must be 1.');
	}
	if (!['original', 'reviewed'].includes(status)) {
		errors.push('Bundle status must be original or reviewed.');
	}
	if (status !== 'reviewed' && names.includes(REVIEW_FILE)) {
		errors.push('REVIEW.md is allowed only when Bundle status is reviewed.');
	}
	const declaredInventory = [...manifest.matchAll(/^- `([^`]+)`\s*$/gm)].map(
		match => match[1],
	);
	const expectedInventory = [...expected].sort();
	if (
		JSON.stringify(declaredInventory.sort()) !==
		JSON.stringify(expectedInventory)
	) {
		errors.push('Manifest File Inventory must list the exact bundle files.');
	}

	const readable = [...PRODUCT_INPUT_FILES];
	if (names.includes(REVIEW_FILE)) readable.push(REVIEW_FILE);
	const projects = new Map();
	for (const name of readable) {
		if (!names.includes(name)) continue;
		const content = await readFile(resolve(root, name), 'utf8');
		for (const heading of REQUIRED_HEADINGS[name]) {
			if (!content.split(/\r?\n/).includes(heading)) {
				errors.push(`${name} is missing heading: ${heading}`);
			}
		}
		const project = metadataValue(content, 'Project');
		if (!project || /^<.*>$/.test(project)) {
			errors.push(`${name} must declare a concrete Project value.`);
		} else {
			projects.set(name, project);
		}
	}

	const uniqueProjects = new Set(projects.values());
	if (uniqueProjects.size > 1) {
		errors.push('Project identity is inconsistent across bundle files.');
	}

	return {
		valid:
			missing.length === 0 && unexpected.length === 0 && errors.length === 0,
		directory: root,
		status,
		project: uniqueProjects.size === 1 ? [...uniqueProjects][0] : null,
		missing,
		unexpected,
		errors,
	};
};

const isMain = process.argv[1]
	? fileURLToPath(import.meta.url) === resolve(process.argv[1])
	: false;

if (isMain) {
	const directoryIndex = process.argv.indexOf('--directory');
	const directory =
		directoryIndex >= 0 ? process.argv[directoryIndex + 1] : null;
	if (!directory) {
		console.error(
			'Usage: inspect-product-input.mjs --directory <product-input>',
		);
		process.exitCode = 2;
	} else {
		try {
			const result = await inspectProductInput(directory);
			console.log(JSON.stringify(result, null, 2));
			if (!result.valid) process.exitCode = 2;
		} catch (error) {
			console.error(error instanceof Error ? error.message : String(error));
			process.exitCode = 2;
		}
	}
}
