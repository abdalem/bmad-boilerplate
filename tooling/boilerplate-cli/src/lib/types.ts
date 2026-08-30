export type PresetName =
	| 'web-app'
	| 'api'
	| 'mobile'
	| 'website'
	| 'web-api'
	| 'web-api-mobile'
	| 'website-api'
	| 'full-product';

export type ArchetypeType = 'web-app' | 'api' | 'mobile' | 'website';

export type WorkspaceMode = 'standalone' | 'monorepo';

export type PackageKind = ArchetypeType | 'worker';

export type DeployProvider =
	| 'gh-pages'
	| 'vercel'
	| 'railway'
	| 'cloud-run'
	| 'aws-app-runner'
	| 'cloudflare-pages';

export type CoreModuleId =
	| 'repo-foundation'
	| 'devcontainer'
	| 'github-actions'
	| 'monorepo-core'
	| 'shared-contracts'
	| 'docs-core';

export type PackageModuleId =
	| 'web-next'
	| 'api-adonis'
	| 'mobile-expo'
	| 'website-astro';

export type DeployModuleId =
	| 'deploy-gh-pages'
	| 'deploy-vercel'
	| 'deploy-railway'
	| 'deploy-cloud-run'
	| 'deploy-aws-app-runner'
	| 'deploy-cloudflare-pages';

export type ModuleId = CoreModuleId | PackageModuleId | DeployModuleId;

export type ProjectPackage = {
	id: string;
	name: string;
	path: string;
	kind: PackageKind;
	modules: PackageModuleId[];
};

export type ProjectArchetype = {
	id: string;
	type: ArchetypeType;
	path: string;
};

export type EnvironmentBinding = {
	name: string;
	source: 'runtime' | 'secret' | 'build';
	description: string;
};

export type PackageDependency = {
	packageId: string;
	relation: 'calls' | 'serves' | 'builds-from';
};

export type PackageDeployment = {
	packageId: string;
	provider: DeployProvider;
	moduleId: DeployModuleId;
	version: string;
	environmentBindings: EnvironmentBinding[];
	dependencyEdges: PackageDependency[];
};

export type ProjectManifest = {
	version: '2';
	projectName: string;
	projectSlug: string;
	description: string;
	preset: PresetName;
	workspace: {
		mode: WorkspaceMode;
	};
	archetypes: ProjectArchetype[];
	coreModules: CoreModuleId[];
	packages: ProjectPackage[];
	deployments: PackageDeployment[];
	generatedAt: string;
};

export type DetectedStack = {
	repoShape: 'single-app' | 'monorepo' | 'unknown';
	packageManager: 'pnpm' | 'yarn' | 'npm' | 'unknown';
	lint: Array<'biome' | 'eslint' | 'prettier'>;
	turbo: boolean;
	devcontainer: boolean;
	githubActions: boolean;
	terraform: boolean;
	docker: boolean;
	presetGuess: PresetName;
};

export type DetectedPackage = {
	id: string;
	path: string;
	kind: PackageKind;
	modules: PackageModuleId[];
	currentProvider: DeployProvider | null;
	providerEvidence: string[];
};

export type MigrationArtifact = {
	path: string;
	reason: string;
};

export type MigrationAction = {
	id: string;
	type: 'adopt-core-artifact' | 'set-provider' | 'add-module';
	title: string;
	details: string;
	packageId?: string;
	fromProvider?: DeployProvider | null;
	toProvider?: DeployProvider | null;
};

export type MigrationReport = {
	generatedAt: string;
	targetPath: string;
	detected: DetectedStack;
	detectedPackages: DetectedPackage[];
	recommendedManifest: ProjectManifest;
	missingArtifacts: MigrationArtifact[];
	actions: MigrationAction[];
	summary: {
		packageCount: number;
		missingArtifactCount: number;
		actionCount: number;
	};
};
