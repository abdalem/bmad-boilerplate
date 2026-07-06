import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFile = fileURLToPath(import.meta.url);
const cliRoot = resolve(dirname(currentFile), '..');

export const REPO_ROOT = resolve(cliRoot, '..', '..', '..');
export const TEMPLATE_ROOT = resolve(REPO_ROOT, 'templates');
export const PROMPT_ROOT = resolve(REPO_ROOT, 'tooling', 'prompts');
export const SCHEMA_ROOT = resolve(REPO_ROOT, 'tooling', 'schemas');

export const BOILERPLATE_DIR = '.boilerplate';
export const PROJECT_BRIEF_FILE = `${BOILERPLATE_DIR}/project-brief.md`;
export const MANIFEST_FILE = `${BOILERPLATE_DIR}/project-manifest.json`;
export const MIGRATION_REPORT_JSON = `${BOILERPLATE_DIR}/migration-report.json`;
export const MIGRATION_REPORT_MD = `${BOILERPLATE_DIR}/migration-report.md`;
export const CONFLICT_PATCH_DIR = `${BOILERPLATE_DIR}/conflict-patches`;
export const BACKUP_DIR = `${BOILERPLATE_DIR}/backups`;
export const ADAPTERS_DIR = `${BOILERPLATE_DIR}/adapters`;

export const SUPERPOWERS_ROOT = 'docs/superpowers';
export const SPECS_DIR = `${SUPERPOWERS_ROOT}/specs`;
export const PLANS_DIR = `${SUPERPOWERS_ROOT}/plans`;
export const PLAYBOOKS_DIR = `${SUPERPOWERS_ROOT}/playbooks`;

export const PRODUCT_SPEC_FILE = 'PRODUCT_SPEC.md';

export const TICKET_SECTION_TITLES = [
  'Goal',
  'Context',
  'User Stories',
  'Rules & Constraints',
  'Data Model Impact',
  'API',
  'UI / UX',
  'Edge Cases',
  'Acceptance Criteria',
  'Test Plan',
] as const;
