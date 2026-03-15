import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { normalizeTaskKey, pathExists } from './docs-helpers.js';

export type ReviewSurface = 'diff' | 'audit' | 'architecture';
export type ReviewScopeMode = 'uncommitted' | 'base' | 'commit';

interface TaskIndexEntry {
  id?: string;
  slug?: string;
  path?: string;
  relates_to?: string;
  paths?: {
    task?: string;
  };
}

export interface ReviewTaskContext {
  lines: string[];
  architectureSurfacePaths: string[];
}

export interface BuildReviewPromptContextOptions {
  repoRoot: string;
  taskKey?: string | null;
  taskLabel: string;
  reviewSurface: ReviewSurface;
  relativeManifest: string;
  runnerLogExists: boolean;
  relativeRunnerLog: string;
  notes?: string;
  scopeMode: ReviewScopeMode;
  includeBoundedReviewConstraints?: boolean;
}

export interface BuildReviewPromptContextResult {
  promptLines: string[];
  reviewTaskContext: ReviewTaskContext;
  activeCloseoutBundleRoots: string[];
}

async function readTaskIndexEntries(repoRoot: string): Promise<TaskIndexEntry[]> {
  const taskIndexPath = path.join(repoRoot, 'tasks', 'index.json');
  if (!(await pathExists(taskIndexPath))) {
    return [];
  }

  try {
    const raw = await readFile(taskIndexPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.items) ? (parsed.items as TaskIndexEntry[]) : [];
  } catch {
    return [];
  }
}

function extractTaskChecklistCandidate(item: TaskIndexEntry): string | null {
  const directTaskPath =
    typeof item.paths?.task === 'string'
      ? item.paths.task.trim()
      : typeof item.relates_to === 'string'
        ? item.relates_to.trim()
        : '';
  if (directTaskPath.length > 0) {
    return directTaskPath;
  }

  const legacyPath = typeof item.path === 'string' ? item.path.trim() : '';
  const candidate =
    /(?:^|\/)tasks-[0-9]{4}-[A-Za-z0-9-]+\.md$/u.test(legacyPath) ? legacyPath : '';
  return candidate.length > 0 ? candidate : null;
}

async function resolveRegisteredTaskChecklistPath(
  repoRoot: string,
  taskKey: string
): Promise<string | null> {
  const items = await readTaskIndexEntries(repoRoot);
  if (items.length === 0) {
    return null;
  }

  const keyedItems = items
    .map((item) => ({
      key: normalizeTaskKey(item),
      checklistPath: extractTaskChecklistCandidate(item)
    }))
    .filter(
      (entry): entry is { key: string; checklistPath: string } =>
        typeof entry.key === 'string' &&
        entry.key.length > 0 &&
        typeof entry.checklistPath === 'string' &&
        entry.checklistPath.length > 0
    )
    .sort((left, right) => right.key.length - left.key.length);

  const exact = keyedItems.find((entry) => entry.key === taskKey);
  const prefix = keyedItems.find((entry) => taskKey.startsWith(`${entry.key}-`));
  const selected = exact ?? prefix;
  if (!selected) {
    return null;
  }

  const absolute = path.resolve(repoRoot, selected.checklistPath);
  return (await pathExists(absolute)) ? absolute : null;
}

async function resolveCanonicalTaskKey(
  repoRoot: string,
  taskKey: string | null | undefined
): Promise<string | null> {
  if (!taskKey) {
    return null;
  }

  const items = await readTaskIndexEntries(repoRoot);
  if (items.length === 0) {
    return taskKey;
  }

  const keyedItems = items
    .map((item) => ({ key: normalizeTaskKey(item) }))
    .filter((entry): entry is { key: string } => typeof entry.key === 'string' && entry.key.length > 0)
    .sort((left, right) => right.key.length - left.key.length);

  const exact = keyedItems.find((entry) => entry.key === taskKey);
  const prefix = keyedItems.find((entry) => taskKey.startsWith(`${entry.key}-`));
  return exact?.key ?? prefix?.key ?? taskKey;
}

async function resolveTaskChecklistPath(repoRoot: string, taskKey: string): Promise<string | null> {
  const direct = path.join(repoRoot, 'tasks', `tasks-${taskKey}.md`);
  if (await pathExists(direct)) {
    return direct;
  }

  if (!/^\d{4}$/.test(taskKey)) {
    return null;
  }

  const tasksDir = path.join(repoRoot, 'tasks');
  let entries: string[] = [];
  try {
    entries = await readdir(tasksDir);
  } catch {
    return null;
  }

  const candidates = entries
    .filter((name) => name.startsWith(`tasks-${taskKey}-`) && name.endsWith('.md'))
    .map((name) => path.join(tasksDir, name))
    .sort();

  if (candidates.length === 1) {
    return candidates[0] ?? null;
  }

  return null;
}

function extractTaskHeaderBulletLines(taskChecklist: string): string[] {
  const lines = taskChecklist.split('\n');
  const checklistIndex = lines.findIndex((line) => line.trim() === '## Checklist');
  const headerLines = checklistIndex === -1 ? lines : lines.slice(0, checklistIndex);
  return headerLines
    .map((line) => line.trimEnd())
    .filter((line) => line.startsWith('- '));
}

function extractBacktickedPath(line: string): string | null {
  const match = line.match(/`([^`]+)`/);
  return match?.[1] ?? null;
}

function extractTaskHeaderDocPath(headerBullets: string[], patterns: string[]): string | null {
  const match = headerBullets.find((line) => {
    const normalized = line.toLowerCase();
    return patterns.some((pattern) => normalized.includes(pattern));
  });
  return match ? extractBacktickedPath(match) : null;
}

async function buildTaskContext(options: {
  repoRoot: string;
  taskKey: string;
  surface: ReviewSurface;
}): Promise<ReviewTaskContext> {
  const checklistPath =
    (await resolveRegisteredTaskChecklistPath(options.repoRoot, options.taskKey)) ??
    (await resolveTaskChecklistPath(options.repoRoot, options.taskKey));
  if (!checklistPath) {
    return { lines: [], architectureSurfacePaths: [] };
  }

  const relativeChecklist = path.relative(options.repoRoot, checklistPath);
  const checklist = await readFile(checklistPath, 'utf8');
  const headerBullets = extractTaskHeaderBulletLines(checklist);

  const architectureSurfacePaths = options.surface === 'architecture' ? [checklistPath] : [];
  const lines: string[] = ['Task context:', `- Task checklist: \`${relativeChecklist}\``];
  const prdPath = extractTaskHeaderDocPath(headerBullets, ['primary prd:']);
  if (prdPath) {
    lines.push(`- Primary PRD: \`${prdPath}\``);
    const absolutePrdPath = path.resolve(options.repoRoot, prdPath);
    if (options.surface === 'architecture' && (await pathExists(absolutePrdPath))) {
      architectureSurfacePaths.push(absolutePrdPath);
    }
  }
  if (options.surface === 'architecture') {
    const techSpecPath = extractTaskHeaderDocPath(headerBullets, ['tech_spec:', 'tech spec:']);
    if (techSpecPath) {
      lines.push(`- TECH_SPEC: \`${techSpecPath}\``);
      const absoluteTechSpecPath = path.resolve(options.repoRoot, techSpecPath);
      if (await pathExists(absoluteTechSpecPath)) {
        architectureSurfacePaths.push(absoluteTechSpecPath);
      }
    }
    const actionPlanPath = extractTaskHeaderDocPath(headerBullets, ['action_plan:', 'action plan:']);
    if (actionPlanPath) {
      lines.push(`- ACTION_PLAN: \`${actionPlanPath}\``);
      const absoluteActionPlanPath = path.resolve(options.repoRoot, actionPlanPath);
      if (await pathExists(absoluteActionPlanPath)) {
        architectureSurfacePaths.push(absoluteActionPlanPath);
      }
    }
    const architecturePath = path.join(options.repoRoot, '.agent', 'system', 'architecture.md');
    if (await pathExists(architecturePath)) {
      lines.push(`- Repo architecture baseline: \`${path.relative(options.repoRoot, architecturePath)}\``);
      architectureSurfacePaths.push(architecturePath);
    }
  }

  return { lines, architectureSurfacePaths };
}

async function resolveActiveCloseoutBundleRoots(
  repoRoot: string,
  taskKey: string | null | undefined
): Promise<string[]> {
  const canonicalTaskKey = await resolveCanonicalTaskKey(repoRoot, taskKey);
  if (!canonicalTaskKey) {
    return [];
  }

  const manualDir = path.join(repoRoot, 'out', canonicalTaskKey, 'manual');
  if (!(await pathExists(manualDir))) {
    return [];
  }

  let entries: string[] = [];
  try {
    entries = await readdir(manualDir);
  } catch {
    return [];
  }

  const closeoutDirs: string[] = [];
  for (const entry of entries) {
    if (!(entry === 'TODO-closeout' || entry.endsWith('-closeout'))) {
      continue;
    }
    const absolute = path.join(manualDir, entry);
    try {
      if ((await stat(absolute)).isDirectory()) {
        closeoutDirs.push(absolute);
      }
    } catch {
      // ignore disappearing or unreadable entries
    }
  }
  closeoutDirs.sort();

  if (closeoutDirs.length === 0) {
    return [];
  }

  const roots = new Set<string>();
  const todoCloseout = closeoutDirs.find((entry) => path.basename(entry) === 'TODO-closeout');
  if (todoCloseout) {
    roots.add(todoCloseout);
  }
  const completedCloseouts = closeoutDirs.filter((entry) => path.basename(entry) !== 'TODO-closeout');
  const latestCompletedCloseout = completedCloseouts.at(-1);
  if (latestCompletedCloseout) {
    roots.add(latestCompletedCloseout);
  }
  return [...roots];
}

export function buildActiveCloseoutProvenanceLines(
  repoRoot: string,
  activeCloseoutBundleRoots: string[]
): string[] {
  if (activeCloseoutBundleRoots.length === 0) {
    return [];
  }

  return [
    'Active closeout provenance:',
    ...activeCloseoutBundleRoots.map(
      (root) => `- Resolved active closeout root: \`${path.relative(repoRoot, root)}\``
    ),
    '- These roots are already-resolved self-referential review surfaces for this task; do not re-derive or re-enumerate them unless directly necessary to assess code correctness.'
  ];
}

export function resolveReviewNotes(options: {
  notes: string | undefined;
  taskLabel: string;
  surface: ReviewSurface;
}): string {
  if (options.notes) {
    return options.notes;
  }
  const fallback =
    `Goal: standalone review handoff | ` +
    `Summary: auto-generated NOTES fallback (task=${options.taskLabel}, surface=${options.surface}) | ` +
    'Risks: missing custom intent details may reduce review precision';
  console.warn(
    '[run-review] NOTES was not provided; using a generated fallback. ' +
      'Set NOTES="Goal: ... | Summary: ... | Risks: ... | Questions (optional): ..." for higher-signal review context.'
  );
  return fallback;
}

export async function buildReviewPromptContext(
  options: BuildReviewPromptContextOptions
): Promise<BuildReviewPromptContextResult> {
  const notes = resolveReviewNotes({
    notes: options.notes?.trim(),
    taskLabel: options.taskLabel,
    surface: options.reviewSurface
  });
  const activeCloseoutBundleRoots =
    options.reviewSurface === 'diff'
      ? await resolveActiveCloseoutBundleRoots(options.repoRoot, options.taskKey)
      : [];
  const promptLines = [
    `Review task: ${options.taskLabel}`,
    `Review surface: ${options.reviewSurface}`
  ];
  let reviewTaskContext: ReviewTaskContext = { lines: [], architectureSurfacePaths: [] };

  if (options.reviewSurface === 'audit') {
    promptLines.push(`Evidence manifest: ${options.relativeManifest}`);
    if (options.runnerLogExists) {
      promptLines.push(`Evidence runner log: ${options.relativeRunnerLog}`);
    }
  }

  if ((options.reviewSurface === 'audit' || options.reviewSurface === 'architecture') && options.taskKey) {
    reviewTaskContext = await buildTaskContext({
      repoRoot: options.repoRoot,
      taskKey: options.taskKey,
      surface: options.reviewSurface
    });
    if (reviewTaskContext.lines.length > 0) {
      promptLines.push('', ...reviewTaskContext.lines);
    }
  }

  if (notes) {
    promptLines.push('', 'Agent notes:', notes);
  }

  promptLines.push(
    '',
    'Please review the current changes and confirm:',
    '- The solution is minimal and avoids unnecessary abstraction/scope'
  );
  if (options.reviewSurface === 'audit') {
    promptLines.push(
      '- README/SOP docs match the implemented behavior',
      '- Commands/scripts are non-interactive (no TTY prompts)',
      '- Evidence + checklist mirroring requirements are satisfied',
      '- Start with the manifest or runner log before consulting memory, skills, or review docs',
      '',
      'Call out any remaining documentation/code mismatches or guardrail violations.'
    );
  } else if (options.reviewSurface === 'architecture') {
    promptLines.push(
      '- Architecture, layering, and boundaries remain coherent for the requested change',
      '- Use the canonical architecture inputs above as the primary review context before widening further',
      '- Call out architectural drift, abstraction mismatch, or missing design rationale that is directly relevant to this task',
      '- Stay on the requested architecture/context surfaces and directly related implementation paths; do not switch into manifest/runner-log evidence audit unless it is explicitly required',
      '',
      'Keep this pass architecture-focused. Do not treat it as a generic evidence or closeout audit.'
    );
  } else {
    const startupFocusLine =
      options.scopeMode === 'uncommitted'
        ? '- Start with touched paths, scoped diff commands, or nearby changed code before consulting memory, skills, review docs, manifests, or review artifacts'
        : '- Start with touched paths or nearby changed code before consulting memory, skills, review docs, manifests, or review artifacts';
    promptLines.push(
      '- Behavior remains correct for changed files and nearby dependencies',
      '- Call out concrete regressions, risky edge cases, or missing tests in the changed area',
      startupFocusLine,
      '- Concrete same-diff progress can be shown by citing touched paths with explicit locations such as `path:line`, `path:line:col`, `path#Lline`, or `path#LlineCcol`.',
      '- If you already have that diff-local citation evidence, do not search the wider repo for other examples of the rendering.',
      '',
      'Keep this pass diff-focused. Do not audit checklist/docs/evidence surfaces unless they are directly required to assess code correctness.'
    );
  }

  if (options.includeBoundedReviewConstraints) {
    const boundedFocusLine =
      options.reviewSurface === 'audit'
        ? '- Keep this review focused on the requested audit surfaces, supporting evidence, and directly related code/docs paths.'
        : options.reviewSurface === 'architecture'
          ? '- Keep this review focused on the requested architecture surfaces, canonical task docs, and directly relevant implementation paths.'
          : '- Keep this review focused on changed files and nearby dependencies.';
    promptLines.push(
      '',
      'Execution constraints (bounded review mode):',
      boundedFocusLine,
      '- Avoid full validation suites (for example `npm run test`, `npm run lint`, `npm run build`, `npm run docs:check`, `npm run docs:freshness`) during this pass.',
      '- Do not launch direct validation runners (for example `npx vitest`, `npm exec jest`) or nested review/pipeline/delegation flows during this pass.',
      '- If broader validation would improve confidence, list follow-up commands instead of executing them.'
    );
  }

  return {
    promptLines,
    reviewTaskContext,
    activeCloseoutBundleRoots
  };
}
