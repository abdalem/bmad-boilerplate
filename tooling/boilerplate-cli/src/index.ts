#!/usr/bin/env node
import { Command } from 'commander';
import { runDoctorCommand } from './commands/doctor.js';
import { runInit } from './commands/init.js';
import {
	parseDesiredProviders,
	runMigrate,
	runMigrateApply,
} from './commands/migrate.js';
import { runScaffold } from './commands/scaffold.js';

const program = new Command();
const presetHelp =
	'Project preset (web-app, api, mobile, website, web-api, web-api-mobile, website-api, full-product)';

program
	.name('boilerplate')
	.description('Technical stack generator and migration toolkit')
	.version('0.2.0');

program
	.command('init')
	.description('Create a package-topology and deployment manifest')
	.option('--path <dir>', 'Target directory', process.cwd())
	.option('--preset <preset>', presetHelp, 'web-api')
	.action(async options =>
		runInit({ targetPath: options.path, preset: options.preset }),
	);

program
	.command('scaffold')
	.description(
		'Apply technical archetypes, deployment files, and the BMAD workflow pack',
	)
	.option('--path <dir>', 'Target directory', process.cwd())
	.option(
		'--force',
		'Replace template-owned technical files after backups where supported',
		false,
	)
	.option('--preset <preset>', presetHelp, 'web-api')
	.action(async options =>
		runScaffold({
			targetPath: options.path,
			overwrite: Boolean(options.force),
			preset: options.preset,
		}),
	);

program
	.command('migrate')
	.description(
		'Analyze package topology and deployment-provider changes in an existing project',
	)
	.requiredOption('--path <dir>', 'Target project path')
	.option(
		'--set-provider <package=provider...>',
		'Plan changes such as web=vercel api=cloud-run',
		[],
	)
	.action(async options =>
		runMigrate({
			targetPath: options.path,
			desiredProviders: parseDesiredProviders(
				Array.isArray(options.setProvider)
					? options.setProvider
					: [options.setProvider],
			),
		}),
	);

program
	.command('migrate:apply')
	.description('Apply selected technical topology and provider changes')
	.requiredOption('--path <dir>', 'Target project path')
	.option('--patch <file...>', 'Action ids or package ids to apply', [])
	.option('--all-patches', 'Apply all proposed technical actions', false)
	.option(
		'--set-provider <package=provider...>',
		'Apply changes such as web=vercel api=cloud-run',
		[],
	)
	.action(async options =>
		runMigrateApply({
			targetPath: options.path,
			patchFiles: Array.isArray(options.patch)
				? options.patch
				: [options.patch].filter(Boolean),
			applyAllPatches: Boolean(options.allPatches),
			desiredProviders: parseDesiredProviders(
				Array.isArray(options.setProvider)
					? options.setProvider
					: [options.setProvider],
			),
		}),
	);

program
	.command('doctor')
	.description(
		'Validate runtime and provider tools required by a technical manifest',
	)
	.option(
		'--path <dir>',
		'Target containing .boilerplate/project-manifest.json',
	)
	.action(async options => runDoctorCommand(options.path));

program.parseAsync(process.argv).catch(error => {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
});
