import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ValidatorCandidate, ValidatorDetectionResult, ValidatorEcosystem } from './types.js';

const NODE_PACKAGE_MANAGER_MAP: Record<string, string> = {
  pnpm: 'pnpm test',
  yarn: 'yarn test',
  npm: 'npm test',
  bun: 'bun test'
};

const NODE_LOCKFILES: Array<{ file: string; command: string }> = [
  { file: 'pnpm-lock.yaml', command: 'pnpm test' },
  { file: 'yarn.lock', command: 'yarn test' },
  { file: 'package-lock.json', command: 'npm test' },
  { file: 'bun.lockb', command: 'bun test' }
];

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function ecosystemReason(ecosystem: ValidatorEcosystem, reason: string): string {
  return `${ecosystem}: ${reason}`;
}

async function detectNodeCandidates(repoRoot: string): Promise<ValidatorCandidate[]> {
  const candidates: ValidatorCandidate[] = [];
  const packageJsonPath = join(repoRoot, 'package.json');
  if (await fileExists(packageJsonPath)) {
    try {
      const raw = await readFile(packageJsonPath, 'utf8');
      const parsed = JSON.parse(raw) as { packageManager?: string };
      const packageManager = parsed.packageManager?.trim();
      if (packageManager) {
        const tool = packageManager.split('@')[0]?.trim();
        const command = tool ? NODE_PACKAGE_MANAGER_MAP[tool] : undefined;
        if (command) {
          candidates.push({
            command,
            reason: ecosystemReason('node', `packageManager=${packageManager}`),
            ecosystem: 'node'
          });
        }
      }
    } catch {
      // Ignore invalid package.json for auto-detection.
    }
  }

  for (const lockfile of NODE_LOCKFILES) {
    const lockPath = join(repoRoot, lockfile.file);
    if (await fileExists(lockPath)) {
      candidates.push({
        command: lockfile.command,
        reason: ecosystemReason('node', lockfile.file),
        ecosystem: 'node'
      });
    }
  }

  return candidates;
}

async function detectPythonCandidates(repoRoot: string): Promise<ValidatorCandidate[]> {
  const candidates: ValidatorCandidate[] = [];
  const pyprojectPath = join(repoRoot, 'pyproject.toml');
  if (await fileExists(pyprojectPath)) {
    candidates.push({
      command: 'python -m pytest',
      reason: ecosystemReason('python', 'pyproject.toml'),
      ecosystem: 'python'
    });
  }

  const pytestIni = join(repoRoot, 'pytest.ini');
  if (await fileExists(pytestIni)) {
    candidates.push({
      command: 'pytest',
      reason: ecosystemReason('python', 'pytest.ini'),
      ecosystem: 'python'
    });
  }

  const requirements = join(repoRoot, 'requirements.txt');
  if (await fileExists(requirements)) {
    candidates.push({
      command: 'pytest',
      reason: ecosystemReason('python', 'requirements.txt'),
      ecosystem: 'python'
    });
  }

  return candidates;
}

async function detectGoCandidates(repoRoot: string): Promise<ValidatorCandidate[]> {
  const goModPath = join(repoRoot, 'go.mod');
  if (await fileExists(goModPath)) {
    return [
      {
        command: 'go test ./...',
        reason: ecosystemReason('go', 'go.mod'),
        ecosystem: 'go'
      }
    ];
  }
  return [];
}

async function detectRustCandidates(repoRoot: string): Promise<ValidatorCandidate[]> {
  const cargoPath = join(repoRoot, 'Cargo.toml');
  if (await fileExists(cargoPath)) {
    return [
      {
        command: 'cargo test',
        reason: ecosystemReason('rust', 'Cargo.toml'),
        ecosystem: 'rust'
      }
    ];
  }
  return [];
}

export async function detectValidatorCandidates(repoRoot: string): Promise<ValidatorCandidate[]> {
  const [node, python, go, rust] = await Promise.all([
    detectNodeCandidates(repoRoot),
    detectPythonCandidates(repoRoot),
    detectGoCandidates(repoRoot),
    detectRustCandidates(repoRoot)
  ]);
  return [...node, ...python, ...go, ...rust];
}

export async function detectValidator(repoRoot: string): Promise<ValidatorDetectionResult> {
  const rawCandidates = await detectValidatorCandidates(repoRoot);
  if (rawCandidates.length === 0) {
    return { status: 'missing', command: null, candidates: [] };
  }

  const grouped = new Map<string, { command: string; reasons: string[]; ecosystem: ValidatorEcosystem }>();
  for (const candidate of rawCandidates) {
    const entry = grouped.get(candidate.command);
    if (entry) {
      entry.reasons.push(candidate.reason);
    } else {
      grouped.set(candidate.command, {
        command: candidate.command,
        reasons: [candidate.reason],
        ecosystem: candidate.ecosystem
      });
    }
  }

  const candidates = Array.from(grouped.values()).map((entry) => ({
    command: entry.command,
    reason: entry.reasons.join('; '),
    ecosystem: entry.ecosystem
  }));

  if (candidates.length === 1) {
    return {
      status: 'selected',
      command: candidates[0]?.command ?? null,
      reason: candidates[0]?.reason,
      candidates
    };
  }

  return { status: 'ambiguous', command: null, candidates };
}
