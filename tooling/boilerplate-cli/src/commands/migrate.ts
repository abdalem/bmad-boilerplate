import { resolve } from 'node:path';
import { applyMigration, runMigrationAnalysis } from '../lib/migrate.js';
import type { DeployProvider } from '../lib/types.js';

const parseDesiredProviders = (entries: string[]) => {
  const output: Record<string, DeployProvider> = {};

  for (const entry of entries) {
    const [packageId, provider] = entry.split('=').map(part => part.trim());
    if (!packageId || !provider) {
      continue;
    }

    output[packageId] = provider as DeployProvider;
  }

  return output;
};

export const runMigrate = async (args: {
  targetPath: string;
  desiredProviders: Record<string, DeployProvider>;
}) => {
  const targetPath = resolve(args.targetPath);
  const report = await runMigrationAnalysis(targetPath, args.desiredProviders);

  console.log(`Migration analysis completed for ${targetPath}.`);
  console.log(
    `Packages: ${report.summary.packageCount}, Missing artifacts: ${report.summary.missingArtifactCount}, Actions: ${report.summary.actionCount}.`,
  );
  console.log(`Report: ${targetPath}/.boilerplate/migration-report.md`);
};

export const runMigrateApply = async (args: {
  targetPath: string;
  patchFiles: string[];
  applyAllPatches: boolean;
  desiredProviders: Record<string, DeployProvider>;
}) => {
  const targetPath = resolve(args.targetPath);
  const result = await applyMigration({
    targetPath,
    selectedPatchFiles: args.patchFiles,
    applyAllPatches: args.applyAllPatches,
    desiredProviders: args.desiredProviders,
  });

  console.log(`Migration apply completed for ${targetPath}.`);
  console.log(`Artifacts written: ${result.appliedArtifacts.length}`);
  console.log(`Actions applied: ${result.appliedActions.length}`);
};

export { parseDesiredProviders };
