import {
	chmod,
	copyFile,
	mkdir,
	readFile,
	readdir,
	rm,
	stat,
	writeFile,
} from 'node:fs/promises';
import { basename, dirname, extname, join, relative, sep } from 'node:path';

const textExtensions = new Set([
	'.md',
	'.json',
	'.jsonc',
	'.yaml',
	'.yml',
	'.ts',
	'.tsx',
	'.js',
	'.mjs',
	'.cjs',
	'.txt',
	'.sh',
	'.tf',
	'.toml',
	'.rc',
	'.env',
	'.html',
	'.astro',
	'.css',
	'.d.ts',
	'.gitignore',
	'.dockerignore',
]);

const binaryLikeNames = new Set(['pnpm-lock.yaml']);

export const exists = async (path: string) => {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
};

export const ensureDir = async (path: string) => {
	await mkdir(path, { recursive: true });
};

export const readJsonFile = async <T>(path: string): Promise<T> => {
	const raw = await readFile(path, 'utf8');
	return JSON.parse(raw) as T;
};

export const readText = async (path: string) => {
	return readFile(path, 'utf8');
};

export const writeJsonFile = async (path: string, value: unknown) => {
	await ensureDir(dirname(path));
	await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

export const listFilesRecursively = async (root: string): Promise<string[]> => {
	const output: string[] = [];

	const walk = async (dir: string) => {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
			} else if (entry.isFile()) {
				output.push(fullPath);
			}
		}
	};

	if (!(await exists(root))) {
		return output;
	}

	await walk(root);

	return output;
};

const applyReplacements = (
	content: string,
	replacements: Record<string, string>,
) => {
	let rendered = content;

	for (const [key, value] of Object.entries(replacements)) {
		rendered = rendered.split(key).join(value);
	}

	return rendered;
};

const isTextFile = (path: string) => {
	const extension = extname(path);
	if (textExtensions.has(extension)) {
		return true;
	}

	const filename = basename(path);
	return (
		filename === 'Dockerfile' ||
		filename.startsWith('.') ||
		binaryLikeNames.has(filename)
	);
};

const normalizeMatcher = (value: string) => value.split('/').join(sep);

const matchesPattern = (relPath: string, patterns: string[]) => {
	const normalizedPath = normalizeMatcher(relPath);

	return patterns.some(pattern => {
		const normalizedPattern = normalizeMatcher(pattern);
		if (normalizedPattern.endsWith('/**')) {
			return normalizedPath.startsWith(normalizedPattern.slice(0, -3));
		}

		return normalizedPath === normalizedPattern;
	});
};

export const copyTemplateEntry = async (args: {
	sourcePath: string;
	targetPath: string;
	replacements: Record<string, string>;
	overwrite: boolean;
}) => {
	await ensureDir(dirname(args.targetPath));

	if ((await exists(args.targetPath)) && !args.overwrite) {
		return;
	}

	if (isTextFile(args.sourcePath)) {
		const raw = await readFile(args.sourcePath, 'utf8');
		const rendered = applyReplacements(raw, args.replacements);
		await writeFile(args.targetPath, rendered, 'utf8');
	} else {
		await copyFile(args.sourcePath, args.targetPath);
	}

	if (
		args.targetPath.endsWith('.sh') ||
		args.targetPath.includes(`${sep}.husky${sep}`)
	) {
		await chmod(args.targetPath, 0o755);
	}
};

export const copyTemplateTree = async (
	sourceRoot: string,
	targetRoot: string,
	replacements: Record<string, string>,
	overwrite: boolean,
	options?: {
		include?: string[];
		exclude?: string[];
		targetPrefix?: string;
	},
) => {
	const files = await listFilesRecursively(sourceRoot);
	const include = options?.include?.map(normalizeMatcher) ?? null;
	const exclude = options?.exclude ?? [];

	for (const sourcePath of files) {
		const relPath = relative(sourceRoot, sourcePath);
		const normalizedRel = normalizeMatcher(relPath);

		if (include && !include.includes(normalizedRel)) {
			continue;
		}

		if (matchesPattern(relPath, exclude)) {
			continue;
		}

		const targetPath = options?.targetPrefix
			? join(targetRoot, options.targetPrefix, relPath)
			: join(targetRoot, relPath);

		await copyTemplateEntry({
			sourcePath,
			targetPath,
			replacements,
			overwrite,
		});
	}
};

export const cleanPath = async (targetPath: string) => {
	await rm(targetPath, { recursive: true, force: true });
};

export const writeText = async (path: string, content: string) => {
	await ensureDir(dirname(path));
	await writeFile(path, content, 'utf8');
};
