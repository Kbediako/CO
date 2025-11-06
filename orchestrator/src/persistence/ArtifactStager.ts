import { access, copyFile, mkdir, rename, rm } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import type { BuildArtifact } from '../types.js';
import { sanitizeTaskId } from './sanitizeTaskId.js';

export interface StageArtifactsOptions {
  runsDir?: string;
  keepOriginal?: boolean;
  relativeDir?: string;
  overwrite?: boolean;
}

function sanitizeRunId(runId: string): string {
  return runId.replace(/[:]/g, '-');
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function ensureUniquePath(basePath: string): Promise<string> {
  let candidate = basePath;
  let attempt = 0;
  const dir = dirname(basePath);
  const original = basename(basePath);
  const extension = extname(original);
  const stem = extension ? original.slice(0, -extension.length) : original;

  while (attempt < 1000) {
    if (!(await pathExists(candidate))) {
      return candidate;
    }
    attempt += 1;
    const suffix = `-${attempt}`;
    const nextName = `${stem}${suffix}${extension}`;
    candidate = join(dir, nextName);
  }
  throw new Error(`Unable to stage artifact: too many name collisions for ${basePath}`);
}

export async function stageArtifacts(params: {
  taskId: string;
  runId: string;
  artifacts: BuildArtifact[];
  options?: StageArtifactsOptions;
}): Promise<BuildArtifact[]> {
  const { taskId, runId, artifacts, options } = params;
  if (artifacts.length === 0) {
    return artifacts;
  }

  const runsDir = options?.runsDir ?? join(process.cwd(), '.runs');
  const safeTaskId = sanitizeTaskId(taskId);
  const runDir = join(runsDir, safeTaskId, sanitizeRunId(runId));
  const artifactsDir = join(runDir, 'artifacts');
  await mkdir(artifactsDir, { recursive: true });
  const relativeSegments = options?.relativeDir ? sanitizeRelativeDir(options.relativeDir) : [];
  const destinationRoot = relativeSegments.length > 0 ? join(artifactsDir, ...relativeSegments) : artifactsDir;
  await mkdir(destinationRoot, { recursive: true });

  const results: BuildArtifact[] = [];
  for (const artifact of artifacts) {
    const sourcePath = resolve(process.cwd(), artifact.path);
    const relativeToArtifacts = relative(artifactsDir, sourcePath);
    const isWithinArtifactsDir =
      relativeToArtifacts.length > 0 &&
      !relativeToArtifacts.startsWith('..') &&
      !isAbsolute(relativeToArtifacts);
    if (isWithinArtifactsDir) {
      results.push(artifact);
      continue;
    }

    const destinationBase = join(destinationRoot, basename(sourcePath));
    const destinationPath = options?.overwrite
      ? await prepareOverwriteDestination(destinationBase)
      : await ensureUniquePath(destinationBase);
    if (options?.keepOriginal) {
      await copyFile(sourcePath, destinationPath);
    } else {
      await rename(sourcePath, destinationPath);
    }
    const relativePath = relative(process.cwd(), destinationPath);
    results.push({
      ...artifact,
      path: relativePath
    });
  }

  return results;
}

async function prepareOverwriteDestination(destinationBase: string): Promise<string> {
  if (await pathExists(destinationBase)) {
    await rm(destinationBase, { recursive: true, force: true });
  }
  return destinationBase;
}

function sanitizeRelativeDir(relativeDir: string): string[] {
  const sanitized = relativeDir.replace(/\\+/g, '/');
  const segments = sanitized
    .split('/')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);

  for (const segment of segments) {
    if (segment === '.' || segment === '..' || segment.includes('..')) {
      throw new Error(`relativeDir contains invalid segment '${segment}'`);
    }
  }

  return segments;
}
