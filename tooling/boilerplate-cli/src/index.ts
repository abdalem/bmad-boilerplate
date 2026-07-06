#!/usr/bin/env node
import { Command } from 'commander';
import { runDoctorCommand } from './commands/doctor.js';
import { runInit } from './commands/init.js';
import { parseDesiredProviders, runMigrate, runMigrateApply } from './commands/migrate.js';
import { runScaffold } from './commands/scaffold.js';
import { runSpecInit } from './commands/spec-init.js';

const program = new Command();
const presetHelp =
  'Project preset (web-app, api, mobile, website, web-api, web-api-mobile, website-api, full-product)';

program
  .name('boilerplate')
  .description('Boilerplate generator and migration toolkit')
  .version('0.1.0');

program
  .command('init')
  .description('Create v2 workflow artifacts for a new project or inspect an existing repo')
  .option('--path <dir>', 'Target directory', process.cwd())
  .option('--deterministic', 'Skip codex generation and use deterministic templates', false)
  .option('--preset <preset>', presetHelp, 'web-api')
  .action(async options => {
    await runInit({
      targetPath: options.path,
      deterministic: Boolean(options.deterministic),
      preset: options.preset,
    });
  });

program
  .command('spec:init')
  .description(
    'Refresh PRODUCT_SPEC.md from the project brief, manifest, and approved design/plan docs',
  )
  .option('--path <dir>', 'Target directory', process.cwd())
  .option('--deterministic', 'Skip codex generation and use deterministic templates', false)
  .option('--preset <preset>', presetHelp, 'web-api')
  .action(async options => {
    await runSpecInit({
      targetPath: options.path,
      deterministic: Boolean(options.deterministic),
      preset: options.preset,
    });
  });

program
  .command('scaffold')
  .description('Apply selected modules and package-scoped provider files from the manifest')
  .option('--path <dir>', 'Target directory', process.cwd())
  .option('--deterministic', 'Skip codex generation and use deterministic docs/tickets', false)
  .option('--docs-only', 'Generate docs only', false)
  .option('--tickets-only', 'Generate tickets only', false)
  .option('--with-tickets', 'Generate tickets in addition to templates/docs', false)
  .option('--force', 'Overwrite existing files when template file already exists', false)
  .option('--preset <preset>', presetHelp, 'web-api')
  .action(async options => {
    await runScaffold({
      targetPath: options.path,
      deterministic: Boolean(options.deterministic),
      docsOnly: Boolean(options.docsOnly),
      ticketsOnly: Boolean(options.ticketsOnly),
      withTickets: Boolean(options.withTickets),
      overwrite: Boolean(options.force),
      preset: options.preset,
    });
  });

program
  .command('migrate')
  .description('Analyze an existing project and report v2 artifact and deployment-topology actions')
  .requiredOption('--path <dir>', 'Target project path')
  .option(
    '--set-provider <package=provider...>',
    'Plan provider changes like web=vercel api=cloud-run',
    [],
  )
  .action(async options => {
    await runMigrate({
      targetPath: options.path,
      desiredProviders: parseDesiredProviders(
        Array.isArray(options.setProvider) ? options.setProvider : [options.setProvider],
      ),
    });
  });

program
  .command('migrate:apply')
  .description('Apply selected v2 artifact and provider actions')
  .requiredOption('--path <dir>', 'Target project path')
  .option('--patch <file...>', 'Patch file(s) to apply from .boilerplate/conflict-patches', [])
  .option('--all-patches', 'Apply all proposed conflict patches', false)
  .option(
    '--set-provider <package=provider...>',
    'Apply provider changes like web=vercel api=cloud-run',
    [],
  )
  .action(async options => {
    await runMigrateApply({
      targetPath: options.path,
      patchFiles: Array.isArray(options.patch) ? options.patch : [options.patch].filter(Boolean),
      applyAllPatches: Boolean(options.allPatches),
      desiredProviders: parseDesiredProviders(
        Array.isArray(options.setProvider) ? options.setProvider : [options.setProvider],
      ),
    });
  });

program
  .command('doctor')
  .description('Validate local environment and, optionally, provider tools required by a manifest')
  .option('--path <dir>', 'Target directory that contains .boilerplate/project-manifest.json')
  .action(async options => {
    await runDoctorCommand(options.path);
  });

program.parseAsync(process.argv).catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
