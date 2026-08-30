import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const makeTempDir = async (prefix: string) => {
	return mkdtemp(join(tmpdir(), `boilerplate-${prefix}-`));
};

export const writeFixtureFiles = async (
	root: string,
	files: Record<string, string>,
) => {
	for (const [relativePath, content] of Object.entries(files)) {
		const absolutePath = join(root, relativePath);
		await mkdir(dirname(absolutePath), { recursive: true });
		await writeFile(absolutePath, content, 'utf8');
	}
};

export const removeTempDir = async (root: string) => {
	await rm(root, { recursive: true, force: true });
};

export const createLeythFixture = async () => {
	const root = await makeTempDir('leyth');
	await writeFixtureFiles(root, {
		'package.json': '{ "name": "leyth", "private": true }\n',
		'README.md': '# Leyth\n',
		'apps/web/package.json': '{ "name": "@apps/web" }\n',
		'apps/api/package.json': '{ "name": "@apps/api" }\n',
		'infra/terraform/main.tf':
			'provider "railway" {}\nresource "railway_project" "app" {}\n',
		'.github/workflows/reusable-terraform.yml': 'name: terraform\n',
		'docs/superpowers/specs/2026-03-10-hybrid-coach-os-design.md':
			'# Leyth Design\n',
	});
	return root;
};

export const createMizanFixture = async () => {
	const root = await makeTempDir('mizan');
	await writeFixtureFiles(root, {
		'package.json': '{ "name": "mizan", "private": true }\n',
		'README.md': '# Mizan\n',
		'apps/web/package.json': '{ "name": "@apps/web" }\n',
		'apps/api/package.json': '{ "name": "@apps/api" }\n',
		'apps/mobile/package.json': '{ "name": "@apps/mobile" }\n',
		'infra/terraform/main.tf':
			'provider "railway" {}\nresource "railway_project" "app" {}\n',
	});
	return root;
};

export const createIssueCrafterFixture = async () => {
	const root = await makeTempDir('issue-crafter');
	await writeFixtureFiles(root, {
		'package.json': '{ "name": "issue-crafter", "private": true }\n',
		'README.md': '# IssueCrafter\n',
		'apps/web/package.json': '{ "name": "@apps/web" }\n',
		'apps/api/package.json': '{ "name": "@apps/api" }\n',
		'infra/terraform/main.tf':
			'provider "railway" {}\nresource "railway_project" "app" {}\n',
		'docs/context-packs.md': '# Context Packs\n',
		'docs/tickets/template.md': '# Ticket Template\n',
	});
	return root;
};
