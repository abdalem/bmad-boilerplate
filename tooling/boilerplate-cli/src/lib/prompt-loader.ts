import { readFile } from 'node:fs/promises';

export const loadPromptTemplate = async (path: string, replacements: Record<string, string>) => {
  const raw = await readFile(path, 'utf8');
  let rendered = raw;

  for (const [key, value] of Object.entries(replacements)) {
    rendered = rendered.split(key).join(value);
  }

  return rendered;
};
