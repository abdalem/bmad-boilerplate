import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const cliRoot = resolve(dirname(currentFile), '..');

export const REPO_ROOT = resolve(cliRoot, '..', '..', '..');
export const TEMPLATE_ROOT = resolve(REPO_ROOT, 'templates');

export const BOILERPLATE_DIR = '.boilerplate';
export const MANIFEST_FILE = `${BOILERPLATE_DIR}/project-manifest.json`;
export const MIGRATION_REPORT_JSON = `${BOILERPLATE_DIR}/migration-report.json`;
export const MIGRATION_REPORT_MD = `${BOILERPLATE_DIR}/migration-report.md`;
