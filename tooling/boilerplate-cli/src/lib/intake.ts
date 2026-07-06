import { ensureWorkflowArtifacts } from './brief.js';
import type { ProjectManifest } from './types.js';

export const collectIntake = async (targetPath: string): Promise<ProjectManifest> => {
  return ensureWorkflowArtifacts(targetPath);
};
