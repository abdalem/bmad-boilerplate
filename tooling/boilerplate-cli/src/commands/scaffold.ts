import { resolve } from 'node:path';
import { ensureWorkflowArtifacts, loadManifest, loadProjectBrief } from '../lib/brief.js';
import { scaffoldProject } from '../lib/scaffold.js';
import type { PresetName } from '../lib/types.js';

export const runScaffold = async (args: {
  targetPath: string;
  deterministic: boolean;
  docsOnly: boolean;
  ticketsOnly: boolean;
  withTickets: boolean;
  overwrite: boolean;
  preset?: PresetName;
}) => {
  const targetPath = resolve(args.targetPath);
  await ensureWorkflowArtifacts(targetPath, args.preset ?? 'web-api');
  const [manifest, brief] = await Promise.all([
    loadManifest(targetPath),
    loadProjectBrief(targetPath),
  ]);

  await scaffoldProject({
    targetPath,
    brief,
    manifest,
    deterministic: args.deterministic,
    docsOnly: args.docsOnly,
    ticketsOnly: args.ticketsOnly,
    withTickets: args.withTickets,
    overwrite: args.overwrite,
  });

  console.log(`Scaffold completed for ${targetPath}.`);
};
