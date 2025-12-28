import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export type OptionalResolutionSource = 'cwd' | 'package' | null;

export interface OptionalResolutionResult {
  path: string | null;
  source: OptionalResolutionSource;
}

export function resolveOptionalDependency(
  specifier: string,
  cwd: string = process.cwd()
): OptionalResolutionResult {
  const cwdPackage = join(cwd, 'package.json');
  if (existsSync(cwdPackage)) {
    try {
      const cwdRequire = createRequire(cwdPackage);
      return { path: cwdRequire.resolve(specifier), source: 'cwd' };
    } catch {
      // ignore and fall back
    }
  }

  try {
    const selfRequire = createRequire(import.meta.url);
    return { path: selfRequire.resolve(specifier), source: 'package' };
  } catch {
    return { path: null, source: null };
  }
}

export async function importOptionalDependency<T>(specifier: string, cwd?: string): Promise<T> {
  const resolved = resolveOptionalDependency(specifier, cwd);
  if (!resolved.path) {
    throw new Error(`Missing optional dependency: ${specifier}`);
  }
  return (await import(pathToFileURL(resolved.path).href)) as T;
}
