import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface PackageInfo {
  name?: string;
  version?: string;
}

export function findPackageRoot(fromUrl: string = import.meta.url): string {
  let current: string | null = dirname(fileURLToPath(fromUrl));
  while (current) {
    const candidate = join(current, 'package.json');
    if (existsSync(candidate)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      current = null;
      continue;
    }
    current = parent;
  }
  throw new Error('Unable to locate package.json');
}

export function loadPackageInfo(fromUrl: string = import.meta.url): PackageInfo {
  const root = findPackageRoot(fromUrl);
  const pkgPath = join(root, 'package.json');
  const raw = readFileSync(pkgPath, 'utf8');
  return JSON.parse(raw) as PackageInfo;
}
