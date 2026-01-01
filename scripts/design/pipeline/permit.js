import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function loadPermitFile(repoRoot) {
  const permitPath = join(repoRoot, 'compliance', 'permit.json');
  try {
    const raw = await readFile(permitPath, 'utf8');
    return { status: 'found', permit: JSON.parse(raw), path: permitPath, error: null };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { status: 'missing', permit: { allowedSources: [] }, path: permitPath, error: null };
    }
    return {
      status: 'error',
      permit: null,
      path: permitPath,
      error: error?.message ?? String(error)
    };
  }
}

export function buildAllowedOriginSet(permit) {
  const allowed = new Set();
  const sources = Array.isArray(permit?.allowedSources) ? permit.allowedSources : [];
  for (const entry of sources) {
    if (!entry || typeof entry.origin !== 'string') {
      continue;
    }
    try {
      allowed.add(new URL(entry.origin).origin);
    } catch {
      continue;
    }
  }
  return allowed;
}

export function findPermitEntry(permit, origin) {
  const sources = Array.isArray(permit?.allowedSources) ? permit.allowedSources : [];
  let originKey = origin;
  try {
    originKey = new URL(origin).origin;
  } catch {
    // ignore invalid origin
  }
  return (
    sources.find((entry) => entry?.origin === originKey) ??
    sources.find((entry) => {
      if (!entry?.origin) {
        return false;
      }
      try {
        return new URL(entry.origin).origin === originKey;
      } catch {
        return false;
      }
    }) ??
    null
  );
}
