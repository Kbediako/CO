#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parseArgs as parseCliArgs } from './lib/cli-args.js';
import { collectDocFiles, normalizeTaskKey, pathExists, toPosixPath } from './lib/docs-helpers.js';
import {
  countDocumentLines,
  countHeadingLines,
  extractBundledSkillNamesFromMarkdown,
  extractCodexCliVersionMentions,
  extractCodexModelMentions,
  extractModelPostureLines,
  hasExpectedModelPostureLine,
  hasExpectedDefaultRuntimeLine,
  listBundledSkillNames,
  loadCodexPostureMatrix,
  loadDocsCatalog,
  readCurrentCodexPosture,
  resolveDocsCatalogEntry
} from './lib/docs-catalog.js';
import { getSparkPolicyViolations } from './lib/spark-policy-classifier.js';
import { resolveEnvironmentPaths } from './lib/run-manifests.js';

export type DocsCheckRule =
  | 'npm-script-missing'
  | 'pipeline-id-missing'
  | 'backticked-path-missing'
  | 'tasks-file-too-large'
  | 'tasks-index-non-canonical'
  | 'doc-posture-unresolved'
  | 'doc-posture-stale'
  | 'doc-runtime-posture-stale'
  | 'codex-posture-matrix-unresolved'
  | 'codex-posture-matrix-drift'
  | 'codex-posture-history-active'
  | 'spark-policy-overbroad'
  | 'bundled-skill-roster-drift'
  | 'front-door-budget-exceeded'
  | 'release-runbook-stale'
  | 'codex-release-intake-template-stale'
  | 'tracked-runtime-artifact'
  | 'public-doc-absolute-path'
  | 'top-level-doc-sprawl';

export interface DocsCheckError {
  file: string;
  rule: DocsCheckRule;
  reference: string;
}

const EXCLUDED_BACKTICKED_PATH_PREFIXES = [
  '.runs/',
  'out/',
  'archives/',
  'node_modules/',
  'dist/'
] as const;

const DEFAULT_PUBLIC_DOC_CLASSES = [
  'front_door',
  'public_guide',
  'shipped_skill',
  'shipped_companion',
  'seeded_template'
] as const;

const SPARK_POLICY_DOC_CLASSES = new Set([
  'front_door',
  'public_guide',
  'repo_guide',
  'agent_policy',
  'active_guide',
  'shipped_skill',
  'shipped_companion',
  'seeded_template'
]);

const RELEASE_WORKFLOW_PATH = '.github/workflows/release.yml';
const RELEASE_ADDENDUM_PATH = 'docs/release-notes-template-addendum.md';

const RELEASE_VALIDATION_COMMANDS = [
  'node scripts/delegation-guard.mjs',
  'node scripts/spec-guard.mjs --dry-run',
  'npm run build',
  'npm run lint',
  'npm run test',
  'npm run docs:check',
  'npm run docs:freshness',
  'npm run repo:stewardship',
  'node scripts/diff-budget.mjs',
  'npm run review',
  'npm run pack:audit',
  'npm run pack:smoke'
] as const;

const RELEASE_FULL_MATRIX_COMMANDS = [
  'npm run build:all',
  'npm run test:adapters',
  'npm run test:evaluation',
  'npm run eval:test'
] as const;

const DEFAULT_CODEX_RELEASE_INTAKE_TEMPLATE_PATH = '.agent/task/templates/codex-cli-release-intake-template.md';

const DEFAULT_CODEX_RELEASE_INTAKE_MARKERS = [
  'Codex CLI Release-Intake Issue Template',
  'Release Evidence Axes',
  'local CLI',
  'package/downstream smoke',
  'cloud-canary',
  'workflow pins',
  'model posture',
  'docs surfaces',
  'release notes',
  'Supersedes / Holds Matrix',
  'prior release evidence page',
  'posture surface',
  'Closeout Classification',
  'adopt latest',
  'intentionally hold',
  'demote/archive-only',
  'stale current-facing docs',
  'workflow pins remain unclassified'
] as const;

const RELEASE_LOCAL_SIGNING_REQUIREMENTS = [
  {
    label: 'local signing gate',
    patterns: [/release is blocked unless .*signing.*release machine/i, /if signing is not configured.*release machine/i]
  },
  {
    label: 'local commit signing config',
    patterns: [/git config commit\.gpgsign/i]
  },
  {
    label: 'local tag signing config',
    patterns: [/git config tag\.gpgSign/i]
  },
  {
    label: 'signed tag requirement',
    patterns: [/signed annotated tag/i, /git tag -s\b/i]
  }
] as const;

interface ReleaseWorkflowTruth {
  hasManualDispatchTagInput: boolean;
  hasSigningPublicKeys: boolean;
  hasSigningAllowedSigners: boolean;
  hasAnnotatedTagBodyOverviewOverride: boolean;
  hasOidcPublish: boolean;
  hasNpmTokenFallback: boolean;
  hasStableLatestPublish: boolean;
  hasPrereleaseDistTagPublish: boolean;
  hasCleanDistBuild: boolean;
}

function buildReleaseRunbookError(file: string, label: string, missing: string[]): DocsCheckError[] {
  if (missing.length === 0) {
    return [];
  }

  return [
    {
      file,
      rule: 'release-runbook-stale',
      reference: `${label}: ${missing.join(', ')}`
    }
  ];
}

function contentMentionsAny(content: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(content));
}

function contentMentionsReleaseCommand(content: string, command: string): boolean {
  const escaped = escapeRegExp(command);
  return new RegExp(`(^|[^A-Za-z0-9:_-])${escaped}(?![A-Za-z0-9:_-])`).test(content);
}

function releaseValidationFloorContent(content: string): string {
  const artifactSectionMatch = /(?:^|\n).*(?:validate the package artifact|package artifact validation).*/i.exec(content);
  return artifactSectionMatch?.index === undefined ? content : content.slice(0, artifactSectionMatch.index);
}

async function readReleaseWorkflowTruth(repoRoot: string): Promise<ReleaseWorkflowTruth | null> {
  const workflowPath = path.join(repoRoot, RELEASE_WORKFLOW_PATH);
  if (!(await pathExists(workflowPath))) {
    return null;
  }

  const workflow = await readFile(workflowPath, 'utf8');

  return {
    hasManualDispatchTagInput: /workflow_dispatch:[\s\S]*inputs:[\s\S]*\btag:/.test(workflow),
    hasSigningPublicKeys: workflow.includes('RELEASE_SIGNING_PUBLIC_KEYS'),
    hasSigningAllowedSigners: workflow.includes('RELEASE_SIGNING_ALLOWED_SIGNERS'),
    hasAnnotatedTagBodyOverviewOverride:
      workflow.includes('%(contents:body)') && workflow.includes('readAnnotatedTagBody'),
    hasOidcPublish: workflow.includes('--provenance') && workflow.includes('OIDC publish failed'),
    hasNpmTokenFallback: workflow.includes('NPM_TOKEN') && workflow.includes('falling back to NPM_TOKEN'),
    hasStableLatestPublish: workflow.includes('dist_tag=latest'),
    hasPrereleaseDistTagPublish: workflow.includes('prerelease=true') && workflow.includes('--tag "$DIST_TAG"'),
    hasCleanDistBuild: workflow.includes('npm run clean:dist') && workflow.includes('npm run build')
  };
}

function checkReleaseRunbookTruth(input: {
  file: string;
  content: string;
  workflowTruth: ReleaseWorkflowTruth | null;
}): DocsCheckError[] {
  const { file, content, workflowTruth } = input;
  if (!workflowTruth) {
    return [
      {
        file,
        rule: 'release-runbook-stale',
        reference: `missing source-of-truth workflow ${RELEASE_WORKFLOW_PATH}`
      }
    ];
  }

  const missing: string[] = [];

  if (file === RELEASE_ADDENDUM_PATH) {
    if (!contentMentionsAny(content, [/\*\*Overview\*\*/i])) {
      missing.push('release notes placement under Overview');
    }
    if (
      workflowTruth.hasAnnotatedTagBodyOverviewOverride &&
      !contentMentionsAny(content, [/signed annotated tag body/i, /tag body/i])
    ) {
      missing.push('signed annotated tag body overview override note');
    }
    if (!content.includes('codex-orchestrator skills install --force')) {
      missing.push('codex-orchestrator skills install --force');
    }
    if (!content.includes('docs/skills-release.md')) {
      missing.push('docs/skills-release.md link');
    }
    return buildReleaseRunbookError(file, 'missing addendum coverage', missing);
  }

  const validationFloorContent = releaseValidationFloorContent(content);
  for (const command of RELEASE_VALIDATION_COMMANDS) {
    if (!contentMentionsReleaseCommand(validationFloorContent, command)) {
      missing.push(`validation command ${command}`);
    }
  }

  for (const command of RELEASE_FULL_MATRIX_COMMANDS) {
    if (!contentMentionsReleaseCommand(content, command)) {
      missing.push(`full-matrix command ${command}`);
    }
  }

  if (workflowTruth.hasCleanDistBuild && !contentMentionsReleaseCommand(content, 'npm run clean:dist')) {
    missing.push('package artifact clean-dist validation');
  }

  if (workflowTruth.hasSigningPublicKeys && !content.includes('RELEASE_SIGNING_PUBLIC_KEYS')) {
    missing.push('RELEASE_SIGNING_PUBLIC_KEYS signer secret');
  }
  if (workflowTruth.hasSigningAllowedSigners && !content.includes('RELEASE_SIGNING_ALLOWED_SIGNERS')) {
    missing.push('RELEASE_SIGNING_ALLOWED_SIGNERS signer secret');
  }
  if (
    workflowTruth.hasSigningPublicKeys &&
    workflowTruth.hasSigningAllowedSigners &&
    !contentMentionsAny(content, [/exactly one/i, /only one/i, /one signer secret/i])
  ) {
    missing.push('exactly-one signer secret posture');
  }
  if (workflowTruth.hasManualDispatchTagInput && !content.includes('inputs.tag')) {
    missing.push('manual-dispatch inputs.tag semantics');
  }
  if (
    workflowTruth.hasAnnotatedTagBodyOverviewOverride &&
    !contentMentionsAny(content, [/signed annotated tag body/i, /tag body/i])
  ) {
    missing.push('signed annotated tag body overview override');
  }
  if (
    workflowTruth.hasOidcPublish &&
    !contentMentionsAny(content, [/\bOIDC\b/i, /trusted publishing/i])
  ) {
    missing.push('OIDC or trusted publishing posture');
  }
  if (workflowTruth.hasOidcPublish && !contentMentionsAny(content, [/--provenance/, /\bprovenance\b/i])) {
    missing.push('provenance publish note');
  }
  if (workflowTruth.hasNpmTokenFallback && !content.includes('NPM_TOKEN')) {
    missing.push('NPM_TOKEN fallback');
  }
  if (workflowTruth.hasNpmTokenFallback && !/automation token/i.test(content)) {
    missing.push('npm automation token note');
  }
  if (workflowTruth.hasStableLatestPublish && !contentMentionsAny(content, [/\blatest\b/i])) {
    missing.push('stable latest dist-tag note');
  }
  if (workflowTruth.hasPrereleaseDistTagPublish && !/\bprerelease\b/i.test(content)) {
    missing.push('prerelease publish note');
  }
  if (workflowTruth.hasPrereleaseDistTagPublish && !/dist[- ]tag/i.test(content)) {
    missing.push('dist-tag semantics');
  }

  for (const requirement of RELEASE_LOCAL_SIGNING_REQUIREMENTS) {
    if (!contentMentionsAny(content, [...requirement.patterns])) {
      missing.push(requirement.label);
    }
  }

  return buildReleaseRunbookError(file, 'missing release runbook coverage', missing);
}

const CODEX_POSTURE_CURRENT_FACING_DOC_CLASSES = new Set([
  'front_door',
  'public_guide',
  'repo_guide',
  'agent_policy',
  'active_guide',
  'shipped_skill',
  'shipped_companion',
  'seeded_template'
]);

const CODEX_POSTURE_HISTORICAL_STATUSES = new Set(['archive', 'archived', 'demoted', 'historical', 'history']);
const CODEX_POSTURE_CURRENT_STATUSES = new Set(['active', 'current', 'current-facing', 'current_facing']);
const CODEX_POSTURE_CURRENT_EVIDENCE_STATUSES = new Set([
  ...CODEX_POSTURE_CURRENT_STATUSES,
  'candidate',
  'compatibility-pin',
  'compatibility_pin'
]);
const CODEX_POSTURE_PIN_SURFACE_KINDS = new Set(['workflow_pin', 'pack_smoke_expectation']);

const MACHINE_LOCAL_PATH_PATTERNS = [
  /(?:file:\/\/)?\/Users\/[^\s`)>"]+/,
  /(?:file:\/\/)?\/home\/[^\s`)>"]+/,
  /(?:file:\/\/)?\/private\/var\/[^\s`)>"]+/,
  /[A-Za-z]:\\Users\\[^\s`)>"]+/
] as const;

interface OrchestratorConfig {
  pipelines?: Array<{ id?: string }>;
}

interface TasksIndex {
  items?: Array<{ id?: string; slug?: string; path?: string }>;
  specs?: unknown[];
}

type CodexPosture = Awaited<ReturnType<typeof readCurrentCodexPosture>>;
type CodexPostureMatrix = Awaited<ReturnType<typeof loadCodexPostureMatrix>>;
type DocsCatalogData = Awaited<ReturnType<typeof loadDocsCatalog>>;

interface CliOptions {
  mode: 'check' | 'sync' | null;
  task?: string;
}

const CANONICAL_TASKS_INDEX_KEYS = new Set(['items', 'specs']);

function isUnsupportedReviewModelLine(line: string): boolean {
  return (
    /keep delegated subagent and review surfaces on/i.test(line) ||
    /keep delegated or review surfaces on/i.test(line) ||
    /do not target delegated(?:\/review| or review)? surfaces at/i.test(line) ||
    /for chatgpt auth,\s*this means/i.test(line)
  );
}

function extractUnexpectedModelMentions(
  lines: string[],
  codexPosture: {
    model?: string | null;
    explorer_fast_model?: string | null;
    unsupported_review_model?: string | null;
  }
): string[] {
  const unexpected = new Set<string>();

  for (const line of lines) {
    const allowed = new Set<string>();
    if (codexPosture.model) {
      allowed.add(codexPosture.model);
    }
    if (/explorer_fast/i.test(line) && codexPosture.explorer_fast_model) {
      allowed.add(codexPosture.explorer_fast_model);
    }
    if (isUnsupportedReviewModelLine(line) && codexPosture.unsupported_review_model) {
      allowed.add(codexPosture.unsupported_review_model);
    }

    for (const modelMention of extractCodexModelMentions(line)) {
      if (!allowed.has(modelMention)) {
        unexpected.add(modelMention);
      }
    }
  }

  return [...unexpected].sort();
}

export async function runDocsCheck(repoRoot: string): Promise<DocsCheckError[]> {
  const [docFiles, npmScripts, pipelineIds, repoRootEntries, tasksSizeError, tasksIndexShapeError, docsCatalog] =
    await Promise.all([
      collectDocFiles(repoRoot),
      loadNpmScripts(repoRoot),
      loadOrchestratorPipelines(repoRoot),
      loadRepoRootEntries(repoRoot),
      checkTasksFileSize(repoRoot),
      checkTasksIndexCanonicalShape(repoRoot),
      loadDocsCatalog(repoRoot)
    ]);

  const errors: DocsCheckError[] = [];
  if (tasksSizeError) {
    errors.push(tasksSizeError);
  }
  if (tasksIndexShapeError) {
    errors.push(tasksIndexShapeError);
  }

  const codexPosture = docsCatalog
    ? await readCurrentCodexPosture(repoRoot, docsCatalog.policies?.codex_posture)
    : null;
  const codexPostureMatrix = docsCatalog
    ? await maybeLoadCodexPostureMatrixFromPolicy(repoRoot, docsCatalog.policies?.codex_posture)
    : null;
  const codexPostureSource =
    codexPosture?.source_path || String(docsCatalog?.policies?.codex_posture?.source_path || 'docs posture policy');
  const bundledSkillNames = docsCatalog ? await listBundledSkillNames(repoRoot) : [];
  const readmeBudget = docsCatalog?.policies?.readme_front_door ?? {};
  const rosterPolicy = docsCatalog?.policies?.bundled_skills_roster ?? {};
  const releaseWorkflowTruth = docsCatalog ? await readReleaseWorkflowTruth(repoRoot) : null;
  if (docsCatalog) {
    errors.push(...(await checkCodexReleaseIntakeTemplate(repoRoot, docsCatalog.policies?.codex_release_intake)));
    errors.push(...checkTrackedRuntimeArtifacts(repoRoot, docsCatalog.policies?.release_surface_paths));
    errors.push(...(await checkTopLevelDocsSprawl(repoRoot, docsCatalog.policies?.top_level_docs)));
  }
  if (docsCatalog && codexPosture && codexPostureMatrix) {
    errors.push(
      ...(await checkCodexPostureMatrix({
        repoRoot,
        docFiles,
        docsCatalog,
        codexPosture,
        matrix: codexPostureMatrix
      }))
    );
  }

  for (const file of docFiles) {
    const abs = path.join(repoRoot, file);
    const content = await readFile(abs, 'utf8');

    const referencedScripts = extractNpmRunScripts(content);
    for (const script of referencedScripts) {
      if (!npmScripts.has(script)) {
        errors.push({ file, rule: 'npm-script-missing', reference: `npm run ${script}` });
      }
    }

    const referencedPipelines = extractOrchestratorPipelineIds(content);
    for (const pipelineId of referencedPipelines) {
      if (!pipelineIds.has(pipelineId)) {
        errors.push({
          file,
          rule: 'pipeline-id-missing',
          reference: `codex-orchestrator start ${pipelineId}`
        });
      }
    }

    const referencedPaths = extractBacktickedPaths(content);
    for (const repoRelativePath of referencedPaths) {
      const normalized = normalizeBacktickedRepoPathForCheck(repoRelativePath);
      if (!normalized) {
        continue;
      }

      if (!isRepoRootAnchoredPath(normalized, repoRootEntries)) {
        continue;
      }

      if (isExcludedBacktickedRepoPath(normalized)) {
        continue;
      }

      const resolved = path.resolve(repoRoot, normalized);
      if (!resolved.startsWith(path.resolve(repoRoot) + path.sep)) {
        continue;
      }

      const seededTemplateFallback = resolveSeededTemplatePath(repoRoot, normalized);
      const existsOnDisk = (await pathExists(resolved)) || (seededTemplateFallback && (await pathExists(seededTemplateFallback)));
      if (!existsOnDisk) {
        errors.push({ file, rule: 'backticked-path-missing', reference: normalized });
      }
    }

    if (!docsCatalog) {
      continue;
    }

    const catalogEntry = resolveDocsCatalogEntry(file, docsCatalog);
    const truthChecks = new Set(catalogEntry?.truth_checks ?? []);

    const publicDocAbsolutePathError = checkPublicDocAbsolutePath(
      file,
      content,
      catalogEntry?.doc_class ?? null,
      docsCatalog.policies?.public_doc_hygiene
    );
    if (publicDocAbsolutePathError) {
      errors.push(publicDocAbsolutePathError);
    }

    if (truthChecks.has('codex-cli-version')) {
      if (!codexPosture?.cli_version) {
        errors.push({
          file,
          rule: 'doc-posture-unresolved',
          reference: `missing current Codex CLI version in ${codexPostureSource}`
        });
      } else {
        const versionMentions = extractCodexCliVersionMentions(content);
        const allowedVersionMentions = new Set([
          codexPosture.cli_version,
          ...(codexPosture.cli_compatibility_versions ?? [])
        ]);
        const hasCurrentMention = versionMentions.includes(codexPosture.cli_version);
        const staleMentions = versionMentions.filter((version: string) => !allowedVersionMentions.has(version));
        if (!hasCurrentMention || staleMentions.length > 0) {
          const reference =
            versionMentions.length === 0
              ? `missing Codex CLI version ${codexPosture.cli_version}`
              : staleMentions.length === 0
                ? `missing current Codex CLI version ${codexPosture.cli_version}; mentioned compatibility version(s) ${versionMentions.join(', ')}`
                : `Codex CLI version(s) ${staleMentions.join(', ')} != current policy ${codexPosture.cli_version}`;
          errors.push({
            file,
            rule: 'doc-posture-stale',
            reference
          });
        }
      }
    }

    if (truthChecks.has('model-posture')) {
      if (!codexPosture?.model) {
        errors.push({
          file,
          rule: 'doc-posture-unresolved',
          reference: `missing current model posture in ${codexPostureSource}`
        });
      } else {
        const modelPostureLines = extractModelPostureLines(content);
        const unexpectedModelMentions = extractUnexpectedModelMentions(modelPostureLines, codexPosture);
        if (!hasExpectedModelPostureLine(content, codexPosture.model)) {
          errors.push({
            file,
            rule: 'doc-posture-stale',
            reference:
              modelPostureLines.length === 0
                ? `missing model posture ${codexPosture.model}`
                : unexpectedModelMentions.length === 0
                  ? `model posture line missing current policy ${codexPosture.model}`
                  : `model mention(s) ${unexpectedModelMentions.join(', ')} missing current policy ${codexPosture.model}`
          });
        } else if (unexpectedModelMentions.length > 0) {
          errors.push({
            file,
            rule: 'doc-posture-stale',
            reference: `model mention(s) ${unexpectedModelMentions.join(', ')} missing current policy ${codexPosture.model}`
          });
        }
      }
    }

    errors.push(
      ...checkSparkFileSearchPolicy({
        file,
        content,
        catalogDocClass: catalogEntry?.doc_class ?? null,
        enabledByTruthCheck: truthChecks.has('spark-file-search-policy') || truthChecks.has('model-posture')
      })
    );

    if (truthChecks.has('default-runtime')) {
      if (!codexPosture?.default_runtime) {
        errors.push({
          file,
          rule: 'doc-posture-unresolved',
          reference: `missing current default runtime in ${codexPostureSource}`
        });
      } else if (!hasExpectedDefaultRuntimeLine(content, codexPosture.default_runtime)) {
        errors.push({
          file,
          rule: 'doc-runtime-posture-stale',
          reference: `expected default runtime ${codexPosture.default_runtime} from ${codexPosture.source_path}`
        });
      }
    }

    if (truthChecks.has('bundled-skills-roster')) {
      const documentedSkills = extractBundledSkillNamesFromMarkdown(content, rosterPolicy);
      if (!stringArraysEqual(documentedSkills, bundledSkillNames)) {
        errors.push({
          file,
          rule: 'bundled-skill-roster-drift',
          reference: `documented=[${documentedSkills.join(', ')}] shipped=[${bundledSkillNames.join(', ')}]`
        });
      }
    }

    if (truthChecks.has('front-door-budget')) {
      const maxLines = Number.isFinite(readmeBudget?.max_lines) ? Number(readmeBudget.max_lines) : null;
      const maxH2Sections = Number.isFinite(readmeBudget?.max_h2_sections)
        ? Number(readmeBudget.max_h2_sections)
        : null;
      const lineCount = countDocumentLines(content);
      const h2Count = countHeadingLines(content, '## ');
      if (
        (Number.isInteger(maxLines) && maxLines !== null && lineCount > maxLines) ||
        (Number.isInteger(maxH2Sections) && maxH2Sections !== null && h2Count > maxH2Sections)
      ) {
        errors.push({
          file,
          rule: 'front-door-budget-exceeded',
          reference: `lines=${lineCount}/${maxLines ?? 'none'} h2=${h2Count}/${maxH2Sections ?? 'none'}`
        });
      }
    }

    if (truthChecks.has('release-runbook')) {
      errors.push(
        ...checkReleaseRunbookTruth({
          file,
          content,
          workflowTruth: releaseWorkflowTruth
        })
      );
    }
  }

  return dedupeErrors(errors);
}

function checkSparkFileSearchPolicy(input: {
  file: string;
  content: string;
  catalogDocClass: string | null;
  enabledByTruthCheck: boolean;
}): DocsCheckError[] {
  const shouldCheck =
    input.enabledByTruthCheck || (input.catalogDocClass !== null && SPARK_POLICY_DOC_CLASSES.has(input.catalogDocClass));
  if (!shouldCheck) {
    return [];
  }

  return getSparkPolicyViolations(input.content).map((violation) => ({
    file: input.file,
    rule: 'spark-policy-overbroad',
    reference: `line ${violation.line}: ${violation.reason}`
  }));
}

async function maybeLoadCodexPostureMatrixFromPolicy(
  repoRoot: string,
  policy: Record<string, unknown> | undefined
): Promise<CodexPostureMatrix | null> {
  const matrixPath = typeof policy?.matrix_path === 'string' ? normalizePolicyPath(policy.matrix_path) : '';
  const sourcePath =
    matrixPath || (typeof policy?.source_path === 'string' ? normalizePolicyPath(policy.source_path) : '');
  if (!sourcePath.endsWith('.json')) {
    return null;
  }
  return loadCodexPostureMatrix(repoRoot, sourcePath);
}

async function checkCodexPostureMatrix(input: {
  repoRoot: string;
  docFiles: string[];
  docsCatalog: DocsCatalogData;
  codexPosture: CodexPosture;
  matrix: CodexPostureMatrix;
}): Promise<DocsCheckError[]> {
  const errors: DocsCheckError[] = [];
  if (input.matrix.surfaces.length === 0) {
    errors.push({
      file: input.matrix.source_path,
      rule: 'codex-posture-matrix-unresolved',
      reference: 'matrix surfaces missing'
    });
  }
  for (const surface of input.matrix.surfaces) {
    if (CODEX_POSTURE_HISTORICAL_STATUSES.has(surface.status.toLowerCase())) {
      continue;
    }
    errors.push(...(await checkCodexPostureMatrixSurface(input.repoRoot, input.codexPosture, input.matrix, surface)));
  }
  errors.push(
    ...(await checkActiveHistoricalReleaseEvidence({
      repoRoot: input.repoRoot,
      docFiles: input.docFiles,
      docsCatalog: input.docsCatalog,
      matrix: input.matrix
    }))
  );
  return errors;
}

async function checkCodexPostureMatrixSurface(
  repoRoot: string,
  codexPosture: CodexPosture,
  matrix: CodexPostureMatrix,
  surface: CodexPostureMatrix['surfaces'][number]
): Promise<DocsCheckError[]> {
  const errors: DocsCheckError[] = [];
  const surfacePath = normalizePolicyPath(surface.path);
  if (!surfacePath) {
    return [
      {
        file: matrix.source_path,
        rule: 'codex-posture-matrix-unresolved',
        reference: 'matrix surface missing path'
      }
    ];
  }
  const resolvedSurface = resolveMatrixSurfacePath(repoRoot, surfacePath);
  if (!resolvedSurface) {
    return [
      {
        file: matrix.source_path,
        rule: 'codex-posture-matrix-unresolved',
        reference: `${surfacePath}:matrix surface path escapes repository`
      }
    ];
  }
  const { absolutePath } = resolvedSurface;
  if (!(await pathExists(absolutePath))) {
    return [
      {
        file: surfacePath,
        rule: 'codex-posture-matrix-unresolved',
        reference: `matrix surface missing on disk from ${matrix.source_path}`
      }
    ];
  }

  const content = await readFile(absolutePath, 'utf8');
  if (surface.requirements.length === 0) {
    errors.push({
      file: matrix.source_path,
      rule: 'codex-posture-matrix-unresolved',
      reference: `${surfacePath}:matrix surface missing requirements`
    });
    return errors;
  }
  for (const requirement of surface.requirements) {
    if (!requirement.contains.trim()) {
      errors.push({
        file: matrix.source_path,
        rule: 'codex-posture-matrix-unresolved',
        reference: `${surfacePath}:${requirement.label} missing contains`
      });
      continue;
    }
    const resolved = resolveCodexPostureMatrixTemplate(requirement.contains, codexPosture);
    if (resolved.unresolvedTokens.length > 0) {
      errors.push({
        file: matrix.source_path,
        rule: 'codex-posture-matrix-unresolved',
        reference: `${surfacePath}:${requirement.label} unresolved token(s): ${resolved.unresolvedTokens.join(', ')}`
      });
      continue;
    }
    if (!content.includes(resolved.value)) {
      errors.push({
        file: surfacePath,
        rule: 'codex-posture-matrix-drift',
        reference: `${requirement.label}: expected "${truncateReference(resolved.value, 180)}"`
      });
    }
  }
  errors.push(...checkCodexPostureMatrixPackagePins(content, surfacePath, surface, codexPosture));
  return errors;
}

function resolveMatrixSurfacePath(repoRoot: string, surfacePath: string): { absolutePath: string; relativePath: string } | null {
  const repoRootAbs = path.resolve(repoRoot);
  const absolutePath = path.resolve(repoRootAbs, surfacePath);
  const relativeToRepoNative = path.relative(repoRootAbs, absolutePath);
  const relativePath = toPosixPath(relativeToRepoNative);
  if (relativePath === '..' || relativePath.startsWith('../') || path.isAbsolute(relativeToRepoNative)) {
    return null;
  }
  return { absolutePath, relativePath };
}

function resolveCodexPostureMatrixTemplate(
  template: string,
  codexPosture: CodexPosture
): { value: string; unresolvedTokens: string[] } {
  const tokens: Record<string, string | null | undefined> = {
    current_cli_version: codexPosture.cli_version,
    codex_cli_version: codexPosture.cli_version,
    latest_audited_candidate_cli_version: codexPosture.latest_audited_candidate_cli_version,
    marketplace_smoke_cli_version: codexPosture.marketplace_smoke_cli_version,
    cloud_canary_cli_version: codexPosture.cloud_canary_cli_version,
    current_model: codexPosture.model,
    model: codexPosture.model,
    default_runtime: codexPosture.default_runtime,
    explorer_fast_model: codexPosture.explorer_fast_model,
    unsupported_review_model: codexPosture.unsupported_review_model
  };
  const unresolvedTokens: string[] = [];
  const value = template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, token: string) => {
    const replacement = tokens[token];
    if (!replacement) {
      unresolvedTokens.push(token);
      return '';
    }
    return replacement;
  });
  return { value, unresolvedTokens: [...new Set(unresolvedTokens)].sort() };
}

function checkCodexPostureMatrixPackagePins(
  content: string,
  surfacePath: string,
  surface: CodexPostureMatrix['surfaces'][number],
  codexPosture: CodexPosture
): DocsCheckError[] {
  if (!CODEX_POSTURE_PIN_SURFACE_KINDS.has(surface.kind)) {
    return [];
  }

  const expectedPins = new Set<string>();
  for (const requirement of surface.requirements) {
    const resolved = resolveCodexPostureMatrixTemplate(requirement.contains, codexPosture);
    if (resolved.unresolvedTokens.length > 0) {
      continue;
    }
    for (const pin of extractOpenAiCodexPackagePins(resolved.value)) {
      expectedPins.add(pin);
    }
  }
  if (expectedPins.size === 0) {
    return [];
  }

  const observedPins = extractOpenAiCodexPackagePins(content);
  const unexpectedPins = observedPins.filter((pin) => !expectedPins.has(pin));
  if (unexpectedPins.length === 0) {
    return [];
  }

  return [
    {
      file: surfacePath,
      rule: 'codex-posture-matrix-drift',
      reference: `unexpected Codex package pin(s) ${unexpectedPins.join(', ')}; expected ${[...expectedPins].sort().join(', ')}`
    }
  ];
}

function extractOpenAiCodexPackagePins(content: string): string[] {
  const pins = new Set<string>();
  const pattern = /@openai\/codex@([0-9]+\.[0-9]+\.[0-9]+)/gu;
  for (const match of content.matchAll(pattern)) {
    const version = match[1];
    if (version) {
      pins.add(version);
    }
  }
  return [...pins].sort();
}

async function checkActiveHistoricalReleaseEvidence(input: {
  repoRoot: string;
  docFiles: string[];
  docsCatalog: DocsCatalogData;
  matrix: CodexPostureMatrix;
}): Promise<DocsCheckError[]> {
  const historicalPaths = new Set(
    [
      ...input.matrix.historical_release_evidence
        .filter((entry) => CODEX_POSTURE_HISTORICAL_STATUSES.has(entry.status.toLowerCase()))
        .map((entry) => normalizePolicyPath(entry.path)),
      ...input.matrix.surfaces
        .filter((surface) => CODEX_POSTURE_HISTORICAL_STATUSES.has(surface.status.toLowerCase()))
        .map((surface) => normalizePolicyPath(surface.path))
    ].filter((entry) => entry.length > 0)
  );
  const currentEvidencePaths = new Set(
    input.matrix.surfaces
      .filter(
        (surface) =>
          CODEX_POSTURE_CURRENT_EVIDENCE_STATUSES.has(surface.status.toLowerCase()) &&
          isCodexReleaseEvidenceMatrixSurface(surface)
      )
      .map((surface) => normalizePolicyPath(surface.path))
      .filter((entry) => entry.length > 0)
  );
  const errors: DocsCheckError[] = [];

  for (const file of input.docFiles) {
    const normalizedFile = normalizePolicyPath(file);
    if (historicalPaths.has(normalizedFile) || currentEvidencePaths.has(normalizedFile)) {
      continue;
    }

    const catalogEntry = resolveDocsCatalogEntry(file, input.docsCatalog);
    if (!isCurrentFacingCodexPostureDoc(catalogEntry)) {
      continue;
    }

    const content = await readFile(path.join(input.repoRoot, file), 'utf8');
    const staleVersions = new Set<string>();
    if (looksLikeCodexReleaseEvidencePage(file, content)) {
      for (const version of extractCodexReleaseEvidenceVersionMentions(content)) {
        staleVersions.add(version);
      }
    }
    for (const link of extractCodexReleaseEvidenceLinks(file, content)) {
      if (!link.path) {
        continue;
      }
      if (historicalPaths.has(link.path) || currentEvidencePaths.has(link.path)) {
        continue;
      }
      for (const version of link.versions) {
        staleVersions.add(version);
      }
    }
    if (staleVersions.size === 0) {
      continue;
    }

    errors.push({
      file,
      rule: 'codex-posture-history-active',
      reference: `active current-facing release evidence mentions Codex CLI version(s) ${[...staleVersions].sort().join(', ')} without current/historical/archive matrix status`
    });
  }

  return errors;
}

function isCodexReleaseEvidenceMatrixSurface(surface: CodexPostureMatrix['surfaces'][number]): boolean {
  const status = surface.status.toLowerCase();
  if (CODEX_POSTURE_HISTORICAL_STATUSES.has(status)) {
    return true;
  }
  if (CODEX_POSTURE_CURRENT_EVIDENCE_STATUSES.has(status) && !CODEX_POSTURE_CURRENT_STATUSES.has(status)) {
    return true;
  }
  return /(adoption|audit|canary|candidate|evidence|release)/u.test(surface.kind.toLowerCase());
}

function isCurrentFacingCodexPostureDoc(
  catalogEntry: ReturnType<typeof resolveDocsCatalogEntry>
): boolean {
  if (!catalogEntry) {
    return false;
  }
  const status = catalogEntry.status.toLowerCase();
  if (CODEX_POSTURE_HISTORICAL_STATUSES.has(status)) {
    return false;
  }
  if (!CODEX_POSTURE_CURRENT_STATUSES.has(status)) {
    return false;
  }
  return CODEX_POSTURE_CURRENT_FACING_DOC_CLASSES.has(catalogEntry.doc_class);
}

function looksLikeCodexReleaseEvidencePage(file: string, content: string): boolean {
  const firstHeading = content
    .split('\n')
    .map((line) => line.trim())
    .find((line) => /^#{1,2}\s+/.test(line));
  const haystack = `${file}\n${firstHeading ?? ''}`.toLowerCase();
  return looksLikeCodexReleaseEvidenceText(haystack);
}

function looksLikeCodexReleaseEvidenceText(value: string): boolean {
  const haystack = value.toLowerCase();
  return (
    haystack.includes('codex') &&
    /(adoption|audit|canary|candidate|evidence|posture|release)/u.test(haystack) &&
    (/(?:^|[^0-9])\d+[.-]\d+(?:[.-]\d+)?(?:[^0-9]|$)/u.test(haystack) ||
      /\bcodex[-_\s]*(?:cli[-_\s]*)?0[0-9]{3}(?:[^0-9]|$)/u.test(haystack))
  );
}

function extractCodexReleaseEvidenceLinks(file: string, content: string): Array<{ path: string; versions: string[] }> {
  const links: Array<{ path: string; versions: string[] }> = [];
  const pattern = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of content.matchAll(pattern)) {
    const text = match[1] ?? '';
    const target = match[2] ?? '';
    pushCodexReleaseEvidenceLink(links, file, text, target);
  }
  const referenceTargets = extractMarkdownReferenceTargets(content);
  const referencePattern = /\[([^\]]+)\]\[([^\]]*)\]/g;
  for (const match of content.matchAll(referencePattern)) {
    const text = match[1] ?? '';
    const label = match[2]?.trim() || text;
    const target = referenceTargets.get(normalizeMarkdownReferenceLabel(label));
    if (!target) {
      continue;
    }
    pushCodexReleaseEvidenceLink(links, file, text, target);
  }
  const shortcutReferencePattern = /\[([^\]]+)\]/g;
  for (const match of content.matchAll(shortcutReferencePattern)) {
    if (match.index && content[match.index - 1] === '!') {
      continue;
    }
    const next = content[match.index + match[0].length] ?? '';
    if (next === '(' || next === '[' || next === ':') {
      continue;
    }
    const text = match[1] ?? '';
    const target = referenceTargets.get(normalizeMarkdownReferenceLabel(text));
    if (!target) {
      continue;
    }
    pushCodexReleaseEvidenceLink(links, file, text, target);
  }
  return links;
}

function pushCodexReleaseEvidenceLink(
  links: Array<{ path: string; versions: string[] }>,
  file: string,
  text: string,
  target: string
): void {
  const haystack = `${text}\n${target}`;
  if (!looksLikeCodexReleaseEvidenceText(haystack)) {
    return;
  }
  links.push({
    path: normalizeMarkdownLinkTarget(file, target),
    versions: extractCodexReleaseEvidenceVersionMentions(haystack)
  });
}

function extractMarkdownReferenceTargets(content: string): Map<string, string> {
  const targets = new Map<string, string>();
  const pattern = /^[ \t]{0,3}\[([^\]]+)\]:[ \t]*(?:<([^>\n]+)>|([^ \t\n]+))/gm;
  for (const match of content.matchAll(pattern)) {
    const label = normalizeMarkdownReferenceLabel(match[1] ?? '');
    const target = match[2] ?? match[3] ?? '';
    if (label && target) {
      targets.set(label, target);
    }
  }
  return targets;
}

function normalizeMarkdownReferenceLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeMarkdownLinkTarget(file: string, target: string): string {
  const trimmed = target.trim().replace(/^<([^>]+)>$/u, '$1');
  if (!trimmed || trimmed.startsWith('#') || /^[A-Za-z][A-Za-z0-9+.-]*:/u.test(trimmed)) {
    return '';
  }
  const withoutFragment = trimmed.split(/[?#]/u)[0] ?? '';
  if (!withoutFragment) {
    return '';
  }
  if (withoutFragment.startsWith('/')) {
    return normalizePolicyPath(withoutFragment.replace(/^\/+/, ''));
  }
  return normalizePolicyPath(path.posix.join(path.posix.dirname(file), withoutFragment));
}

function extractCodexReleaseEvidenceVersionMentions(content: string): string[] {
  const results = new Set<string>(extractCodexCliVersionMentions(content));
  const versionPatterns = [
    /\bcodex[-_\s]*(?:cli[-_\s]*)?([0-9]+[.-][0-9]+(?:[.-][0-9]+)?)\b/giu,
    /\bcodex\s+(?:cli\s+)?([0-9]+\.[0-9]+(?:\.[0-9]+)?)\b/giu
  ];
  for (const pattern of versionPatterns) {
    for (const match of content.matchAll(pattern)) {
      const version = normalizeCodexVersionMention(match[1] ?? '');
      if (version) {
        results.add(version);
      }
    }
  }
  const zeroPaddedSlugPattern = /\bcodex[-_\s]*(?:cli[-_\s]*)?0([0-9]{3})(?=[^0-9]|$)/giu;
  for (const match of content.matchAll(zeroPaddedSlugPattern)) {
    const version = normalizeZeroPaddedCodexVersionSlug(match[1] ?? '');
    if (version) {
      results.add(version);
    }
  }
  return [...results].sort();
}

function normalizeCodexVersionMention(raw: string): string | null {
  const normalized = raw.trim().replace(/-/g, '.');
  if (!/^[0-9]+\.[0-9]+(?:\.[0-9]+)?$/.test(normalized)) {
    return null;
  }
  const parts = normalized.split('.');
  if (parts.length === 2) {
    return `${parts[0]}.${parts[1]}.0`;
  }
  return normalized;
}

function normalizeZeroPaddedCodexVersionSlug(raw: string): string | null {
  const digits = raw.trim();
  if (!/^[0-9]{3}$/.test(digits)) {
    return null;
  }
  return `0.${digits}.0`;
}


function checkTrackedRuntimeArtifacts(
  repoRoot: string,
  policy: { forbidden_tracked_prefixes?: unknown; allowlisted_paths?: unknown } | undefined
): DocsCheckError[] {
  const forbiddenPrefixes = normalizeStringArrayPolicy(policy?.forbidden_tracked_prefixes);
  if (forbiddenPrefixes.length === 0) {
    return [];
  }

  const git = spawnSync('git', ['-C', repoRoot, 'ls-files', '--', ...forbiddenPrefixes], {
    encoding: 'utf8'
  });
  if (git.status !== 0) {
    throw new Error(`git ls-files failed while checking tracked runtime artifacts: ${git.stderr || git.stdout}`);
  }

  const allowlistedPaths = normalizeStringArrayPolicy(policy?.allowlisted_paths);
  const trackedPaths = git.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const errors: DocsCheckError[] = [];

  for (const prefix of forbiddenPrefixes) {
    const offenders = trackedPaths.filter(
      (filePath) => filePath.startsWith(prefix) && !matchesAnyPolicyPath(filePath, allowlistedPaths)
    );
    if (offenders.length === 0) {
      continue;
    }
    errors.push({
      file: prefix,
      rule: 'tracked-runtime-artifact',
      reference: formatPathSample(offenders)
    });
  }

  return errors;
}

async function checkCodexReleaseIntakeTemplate(
  repoRoot: string,
  policy: { enabled?: unknown; template_path?: unknown; required_markers?: unknown } | undefined
): Promise<DocsCheckError[]> {
  const activePolicy = policy?.enabled === false ? undefined : policy;
  const configuredPath =
    typeof activePolicy?.template_path === 'string'
      ? activePolicy.template_path
      : DEFAULT_CODEX_RELEASE_INTAKE_TEMPLATE_PATH;
  const templatePath = normalizePolicyPath(configuredPath);
  if (!templatePath) {
    return [
      {
        file: configuredPath.trim() || DEFAULT_CODEX_RELEASE_INTAKE_TEMPLATE_PATH,
        rule: 'codex-release-intake-template-stale',
        reference: 'invalid template_path'
      }
    ];
  }

  const repoRootAbs = path.resolve(repoRoot);
  const absolutePath = path.resolve(repoRootAbs, templatePath);
  const relativePath = path.relative(repoRootAbs, absolutePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return [
      {
        file: templatePath,
        rule: 'codex-release-intake-template-stale',
        reference: 'invalid template_path'
      }
    ];
  }

  if (!(await pathExists(absolutePath))) {
    return [
      {
        file: templatePath,
        rule: 'codex-release-intake-template-stale',
        reference: 'missing template'
      }
    ];
  }

  const content = await readFile(absolutePath, 'utf8');
  const configuredMarkers = normalizeStringArrayPolicy(activePolicy?.required_markers);
  const requiredMarkers =
    configuredMarkers.length > 0 ? configuredMarkers : [...DEFAULT_CODEX_RELEASE_INTAKE_MARKERS];

  return requiredMarkers
    .filter((marker) => !content.includes(marker))
    .map((marker) => ({
      file: templatePath,
      rule: 'codex-release-intake-template-stale' as const,
      reference: `missing marker: ${marker}`
    }));
}

async function checkTopLevelDocsSprawl(
  repoRoot: string,
  policy: { root?: unknown; allow_files?: unknown; allow_patterns?: unknown } | undefined
): Promise<DocsCheckError[]> {
  const docsRoot = normalizePolicyPath(typeof policy?.root === 'string' ? policy.root : 'docs');
  if (!docsRoot) {
    return [];
  }

  const docsRootAbs = path.join(repoRoot, docsRoot);
  if (!(await pathExists(docsRootAbs))) {
    return [];
  }

  const allowFiles = normalizeStringArrayPolicy(policy?.allow_files);
  const allowPatterns = normalizeStringArrayPolicy(policy?.allow_patterns);
  const entries = await readdir(docsRootAbs, { withFileTypes: true });
  const errors: DocsCheckError[] = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) {
      continue;
    }
    const repoPath = toPosixPath(path.join(docsRoot, entry.name));
    if (allowFiles.includes(repoPath) || allowPatterns.some((pattern) => matchesPolicyPath(repoPath, pattern))) {
      continue;
    }
    errors.push({
      file: `${docsRoot}/`,
      rule: 'top-level-doc-sprawl',
      reference: repoPath
    });
  }

  return errors;
}

function checkPublicDocAbsolutePath(
  file: string,
  content: string,
  docClass: string | null,
  policy: { doc_classes?: unknown; allowlisted_paths?: unknown } | undefined
): DocsCheckError | null {
  const docClasses = normalizeStringArrayPolicy(policy?.doc_classes);
  const activeDocClasses = docClasses.length > 0 ? docClasses : [...DEFAULT_PUBLIC_DOC_CLASSES];
  if (!docClass || !activeDocClasses.includes(docClass)) {
    return null;
  }

  const allowlistedPaths = normalizeStringArrayPolicy(policy?.allowlisted_paths);
  if (matchesAnyPolicyPath(file, allowlistedPaths)) {
    return null;
  }

  const match = findMachineLocalPathReference(content);
  if (!match) {
    return null;
  }

  return {
    file,
    rule: 'public-doc-absolute-path',
    reference: `line ${match.line}: ${match.value}`
  };
}

async function checkTasksFileSize(repoRoot: string): Promise<DocsCheckError | null> {
  const policyPath = path.join(repoRoot, 'docs', 'tasks-archive-policy.json');
  if (!(await pathExists(policyPath))) {
    return null;
  }
  const tasksPath = path.join(repoRoot, 'docs', 'TASKS.md');
  if (!(await pathExists(tasksPath))) {
    return null;
  }

  const raw = await readFile(policyPath, 'utf8');
  const policy = JSON.parse(raw) as { max_lines?: number; reserve_lines?: number };
  const maxLines = Number.isFinite(policy?.max_lines) ? Number(policy.max_lines) : NaN;
  if (!Number.isInteger(maxLines) || maxLines <= 0) {
    return null;
  }
  const reserveLines =
    Number.isInteger(policy?.reserve_lines) && Number(policy.reserve_lines) >= 0
      ? Number(policy.reserve_lines)
      : 0;

  const tasksRaw = await readFile(tasksPath, 'utf8');
  const tasksLines = tasksRaw.split('\n');
  const lineCount = tasksLines.at(-1) === '' ? tasksLines.length - 1 : tasksLines.length;
  if (lineCount < maxLines) {
    return null;
  }

  return {
    file: 'docs/TASKS.md',
    rule: 'tasks-file-too-large',
    reference: `lines=${lineCount} max=${maxLines} reserve=${reserveLines} state=${lineCount === maxLines ? 'zero_headroom' : 'overflow'}`
  };
}

async function checkTasksIndexCanonicalShape(repoRoot: string): Promise<DocsCheckError | null> {
  const indexPath = path.join(repoRoot, 'tasks', 'index.json');
  if (!(await pathExists(indexPath))) {
    return null;
  }

  const raw = await readFile(indexPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const nonCanonicalKeys = getNonCanonicalTasksIndexKeys(parsed);
  if (nonCanonicalKeys.length === 0) {
    return null;
  }

  return {
    file: 'tasks/index.json',
    rule: 'tasks-index-non-canonical',
    reference: renderNonCanonicalTasksIndexError(nonCanonicalKeys)
  };
}

export async function runDocsSync(repoRoot: string, taskArg: string): Promise<void> {
  const { id, slug } = await resolveTaskIdentity(repoRoot, taskArg);
  const taskKey = `${id}-${slug}`;

  const sourceTasksPath = path.join(repoRoot, 'tasks', `tasks-${taskKey}.md`);
  const source = await readFile(sourceTasksPath, 'utf8');

  const agentMirrorPath = path.join(repoRoot, '.agent', 'task', `${taskKey}.md`);
  const agentMirrorContent = renderAgentTaskMirror({ id, taskKey, source });
  await writeFileIfChanged(agentMirrorPath, agentMirrorContent);

  const tasksSnapshotPath = path.join(repoRoot, 'docs', 'TASKS.md');
  const tasksSnapshotContent = await readFile(tasksSnapshotPath, 'utf8');
  const managedBlockKey = taskKey;
  const updatedTasksSnapshot = replaceManagedBlock(
    tasksSnapshotContent,
    managedBlockKey,
    renderTasksSnapshotChecklistBlock({ id, taskKey, source })
  );
  await writeFileIfChanged(tasksSnapshotPath, updatedTasksSnapshot);
}

function renderAgentTaskMirror(input: { id: string; taskKey: string; source: string }): string {
  const title = extractTaskTitle(input.source, input.id) ?? input.taskKey;
  const checklistBody = extractChecklistBody(input.source, { promoteHeadings: true });

  const lines = [
    `# Task Checklist — ${title} (${input.id})`,
    '',
    `> Set \`MCP_RUNNER_TASK_ID=${input.taskKey}\` for orchestrator commands. Mirror status with \`tasks/tasks-${input.taskKey}.md\` and \`docs/TASKS.md\`. Flip \`[ ]\` to \`[x]\` only with manifest evidence (e.g., \`.runs/${input.taskKey}/cli/<run-id>/manifest.json\`).`,
    '',
    checklistBody.trimEnd(),
    ''
  ];

  return lines.join('\n');
}

function renderTasksSnapshotChecklistBlock(input: { id: string; taskKey: string; source: string }): string {
  const checklistBody = extractChecklistBody(input.source, { promoteHeadings: false });
  const lines = [
    '## Checklist Mirror',
    `Mirror status with \`tasks/tasks-${input.taskKey}.md\` and \`.agent/task/${input.taskKey}.md\`. Keep \`[ ]\` until evidence is recorded.`,
    '',
    checklistBody.trimEnd(),
    ''
  ];
  return lines.join('\n');
}

function extractChecklistBody(source: string, options: { promoteHeadings: boolean }): string {
  const lines = source.split('\n');
  const startIndex = lines.findIndex((line) => line.trim() === '## Checklist');
  if (startIndex === -1) {
    throw new Error('Source task file is missing a "## Checklist" section.');
  }

  const bodyLines = lines.slice(startIndex + 1);

  while (bodyLines.length > 0 && bodyLines[0]?.trim() === '') {
    bodyLines.shift();
  }

  if (options.promoteHeadings) {
    return bodyLines
      .map((line) => (line.startsWith('### ') ? line.replace(/^### /, '## ') : line))
      .join('\n')
      .trimEnd();
  }

  return bodyLines.join('\n').trimEnd();
}

function extractTaskTitle(source: string, id: string): string | null {
  const firstHeading = source.split('\n')[0]?.trim() ?? '';
  const match = new RegExp(`^#\\s+Task\\s+${escapeRegExp(id)}\\s+—\\s+(.+)$`).exec(firstHeading);
  if (match?.[1]) {
    return match[1].trim();
  }
  return null;
}

function replaceManagedBlock(content: string, taskKey: string, replacementBody: string): string {
  const begin = `<!-- docs-sync:begin ${taskKey} -->`;
  const end = `<!-- docs-sync:end ${taskKey} -->`;
  const block = `${begin}\n${replacementBody.trimEnd()}\n${end}`;
  const taskId = taskKey.split('-')[0];

  const beginIndex = content.indexOf(begin);
  const endIndex = content.indexOf(end);

  if (beginIndex === -1 && endIndex === -1) {
    const updatedLegacy = replaceLegacyTaskBlock(content, taskId, block);
    if (updatedLegacy) {
      return updatedLegacy;
    }

    if (content.includes(`(${taskId})`)) {
      throw new Error(
        `docs/TASKS.md contains a task section for ${taskKey} but the checklist mirror block could not be located.`
      );
    }

    const separator = content.endsWith('\n') ? '' : '\n';
    return `${content}${separator}\n${block}\n`;
  }

  if (beginIndex === -1 || endIndex === -1 || endIndex < beginIndex) {
    throw new Error(`Managed block markers for ${taskKey} are malformed in docs/TASKS.md.`);
  }

  const afterEnd = endIndex + end.length;
  return `${content.slice(0, beginIndex)}${block}${content.slice(afterEnd)}`;
}

function replaceLegacyTaskBlock(content: string, taskId: string, block: string): string | null {
  const lines = content.split('\n');
  const sectionStart = lines.findIndex((line) => isTaskHeader(line, taskId));
  if (sectionStart === -1) {
    return null;
  }

  const sectionEnd = findNextTopLevelHeading(lines, sectionStart + 1);
  const sectionLines = lines.slice(sectionStart, sectionEnd);
  const checklistIndex = sectionLines.findIndex((line) => line.trim() === '## Checklist Mirror');
  const blockLines = block.split('\n');

  const newSectionLines =
    checklistIndex === -1 ? sectionLines.slice() : sectionLines.slice(0, checklistIndex);

  if (newSectionLines.length > 0 && newSectionLines[newSectionLines.length - 1]?.trim() !== '') {
    newSectionLines.push('');
  }
  newSectionLines.push(...blockLines);

  return [
    ...lines.slice(0, sectionStart),
    ...newSectionLines,
    ...lines.slice(sectionEnd)
  ].join('\n');
}

function isTaskHeader(line: string, taskId: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('# ')) {
    return false;
  }
  return new RegExp(`\\(${escapeRegExp(taskId)}\\)\\s*$`).test(trimmed);
}

function findNextTopLevelHeading(lines: string[], startIndex: number): number {
  for (let index = startIndex; index < lines.length; index += 1) {
    if (lines[index]?.startsWith('# ')) {
      return index;
    }
  }
  return lines.length;
}

async function resolveTaskIdentity(repoRoot: string, taskArg: string): Promise<{ id: string; slug: string }> {
  const numericId = taskArg.split('-')[0] ?? taskArg;
  if (!/^\d{4}$/.test(numericId)) {
    throw new Error(`Invalid task id "${taskArg}". Expected "0906" or "0906-some-slug".`);
  }

  const index = await loadTasksIndex(repoRoot);
  const providedSlug = taskArg.includes('-') ? taskArg.slice(numericId.length + 1) : null;
  const matches = (index.items ?? [])
    .map((entry) => ({ entry, taskKey: normalizeTaskKey(entry) }))
    .filter(
      (candidate): candidate is { entry: NonNullable<TasksIndex['items']>[number]; taskKey: string } =>
        typeof candidate.taskKey === 'string' && candidate.taskKey.startsWith(`${numericId}-`)
    );
  const match = providedSlug
    ? matches.find((candidate) => candidate.taskKey === `${numericId}-${providedSlug}`)
    : matches[0];
  if (!match) {
    throw new Error(`Task "${numericId}" not found in tasks/index.json.`);
  }

  const slug = match.taskKey.slice(numericId.length + 1);
  if (!slug) {
    throw new Error(`Task "${numericId}" not found in tasks/index.json.`);
  }
  if (providedSlug && providedSlug !== slug) {
    throw new Error(
      `Task "${taskArg}" slug mismatch. tasks/index.json declares "${numericId}-${slug}".`
    );
  }

  const canonicalTasksPath = path.join(repoRoot, 'tasks', `tasks-${numericId}-${slug}.md`);
  if (!(await pathExists(canonicalTasksPath))) {
    throw new Error(`Canonical source task file is missing: tasks/tasks-${numericId}-${slug}.md`);
  }

  return { id: numericId, slug };
}

async function loadNpmScripts(repoRoot: string): Promise<Set<string>> {
  const pkgPath = path.join(repoRoot, 'package.json');
  const raw = await readFile(pkgPath, 'utf8');
  const json = JSON.parse(raw) as { scripts?: Record<string, unknown> };
  const scripts = new Set<string>();
  for (const key of Object.keys(json.scripts ?? {})) {
    scripts.add(key);
  }
  return scripts;
}

async function loadOrchestratorPipelines(repoRoot: string): Promise<Set<string>> {
  const configPath = path.join(repoRoot, 'codex.orchestrator.json');
  const raw = await readFile(configPath, 'utf8');
  const json = JSON.parse(raw) as OrchestratorConfig;
  const ids = new Set<string>();
  for (const pipeline of json.pipelines ?? []) {
    if (typeof pipeline.id === 'string' && pipeline.id.trim().length > 0) {
      ids.add(pipeline.id);
    }
  }
  return ids;
}

async function loadTasksIndex(repoRoot: string): Promise<TasksIndex> {
  const indexPath = path.join(repoRoot, 'tasks', 'index.json');
  const raw = await readFile(indexPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const nonCanonicalKeys = getNonCanonicalTasksIndexKeys(parsed);
  if (nonCanonicalKeys.length > 0) {
    throw new Error(renderNonCanonicalTasksIndexError(nonCanonicalKeys));
  }
  return parsed as TasksIndex;
}

function getNonCanonicalTasksIndexKeys(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['<invalid-root>'];
  }
  const keys = Object.keys(value).sort();
  return keys.filter((key) => !CANONICAL_TASKS_INDEX_KEYS.has(key));
}

function renderNonCanonicalTasksIndexError(keys: string[]): string {
  const joined = keys.join(', ');
  return `non-canonical top-level keys: ${joined} (allowed: items, specs)`;
}

function normalizeStringArrayPolicy(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function normalizePolicyPath(value: string): string {
  const normalized = value.trim().replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized) {
    return '';
  }
  const collapsed = path.posix.normalize(normalized);
  return collapsed === '.' ? '' : collapsed;
}

function matchesAnyPolicyPath(filePath: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesPolicyPath(filePath, pattern));
}

function matchesPolicyPath(filePath: string, pattern: string): boolean {
  const normalizedPattern = normalizePolicyPath(pattern);
  if (!normalizedPattern) {
    return false;
  }
  if (normalizedPattern.endsWith('/')) {
    return filePath.startsWith(normalizedPattern);
  }
  if (normalizedPattern.includes('*')) {
    return new RegExp(`^${escapeRegExp(normalizedPattern).replace(/\\\*/g, '.*')}$`).test(filePath);
  }
  return filePath === normalizedPattern;
}

function formatPathSample(paths: string[]): string {
  if (paths.length === 0) {
    return 'no tracked paths';
  }
  const sample = paths.slice(0, 3).join(', ');
  if (paths.length <= 3) {
    return sample;
  }
  return `${sample} (+${paths.length - 3} more)`;
}

function findMachineLocalPathReference(content: string): { line: number; value: string } | null {
  const lines = content.split('\n');
  for (const [index, line] of lines.entries()) {
    for (const pattern of MACHINE_LOCAL_PATH_PATTERNS) {
      const match = line.match(pattern);
      if (!match?.[0]) {
        continue;
      }
      return {
        line: index + 1,
        value: truncateReference(match[0], 140)
      };
    }
  }
  return null;
}

function truncateReference(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function extractNpmRunScripts(markdown: string): string[] {
  const results = new Set<string>();
  const pattern = /\bnpm run ([A-Za-z0-9:_-]+)\b/g;
  for (const match of markdown.matchAll(pattern)) {
    const script = match[1];
    if (script) {
      results.add(script);
    }
  }
  return [...results];
}

function extractOrchestratorPipelineIds(markdown: string): string[] {
  const results = new Set<string>();
  const pattern = /\bcodex-orchestrator start ([A-Za-z0-9:_-]+)\b/g;
  for (const match of markdown.matchAll(pattern)) {
    const pipelineId = match[1];
    if (pipelineId) {
      results.add(pipelineId);
    }
  }
  return [...results];
}

function extractBacktickedPaths(markdown: string): string[] {
  const results = new Set<string>();
  const pattern = /`([^`\n]+)`/g;
  for (const match of markdown.matchAll(pattern)) {
    const raw = match[1];
    if (!raw) {
      continue;
    }
    const normalized = normalizeBacktickedValue(raw);
    if (normalized) {
      results.add(normalized);
    }
  }
  return [...results];
}

function normalizeBacktickedValue(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const withoutQuotes = trimmed.replace(/^['"]|['"]$/g, '');
  const withoutDotSlash = withoutQuotes.startsWith('./') ? withoutQuotes.slice(2) : withoutQuotes;
  return withoutDotSlash;
}

function normalizeBacktickedRepoPathForCheck(value: string): string | null {
  if (!value.includes('/')) {
    return null;
  }
  if (/\s/.test(value)) {
    return null;
  }
  if (value.startsWith('/') || value.startsWith('~')) {
    return null;
  }
  if (value.startsWith('../')) {
    return null;
  }
  if (value.includes('://')) {
    return null;
  }
  if (value.includes('<') || value.includes('>')) {
    return null;
  }
  if (value.includes('...') || value.includes('…')) {
    return null;
  }
  if (/[*?[{\]}]/.test(value)) {
    return null;
  }

  const withoutAnchor = value.split('#')[0] ?? value;
  const withoutLineHint = stripTrailingLineHint(withoutAnchor);
  const trimmed = withoutLineHint.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function isExcludedBacktickedRepoPath(value: string): boolean {
  return EXCLUDED_BACKTICKED_PATH_PREFIXES.some((prefix) => value.startsWith(prefix));
}

async function loadRepoRootEntries(repoRoot: string): Promise<Set<string>> {
  const entries = await readdir(repoRoot, { withFileTypes: true });
  const names = new Set<string>();
  for (const entry of entries) {
    names.add(entry.name);
  }
  return names;
}

function isRepoRootAnchoredPath(repoRelativePath: string, repoRootEntries: Set<string>): boolean {
  const firstSegment = repoRelativePath.split('/')[0];
  if (!firstSegment) {
    return false;
  }
  return repoRootEntries.has(firstSegment);
}

function stripTrailingLineHint(value: string): string {
  const match = /^(.*?):(\d+)(?::(\d+))?(?:-(\d+)(?::(\d+))?)?$/.exec(value);
  if (!match) {
    return value;
  }
  const base = match[1];
  return base ?? value;
}

function resolveSeededTemplatePath(repoRoot: string, repoRelativePath: string): string | null {
  if (!repoRelativePath.startsWith('.codex/')) {
    return null;
  }
  return path.resolve(repoRoot, 'templates', 'codex', repoRelativePath);
}

async function writeFileIfChanged(filePath: string, content: string): Promise<void> {
  const normalized = content.endsWith('\n') ? content : `${content}\n`;
  try {
    const current = await readFile(filePath, 'utf8');
    if (current === normalized) {
      return;
    }
  } catch {
    // Ignore missing file read errors; we will create it below.
  }
  await writeFile(filePath, normalized, 'utf8');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function dedupeErrors(errors: DocsCheckError[]): DocsCheckError[] {
  const seen = new Set<string>();
  const deduped: DocsCheckError[] = [];
  for (const error of errors) {
    const key = `${error.file}\n${error.rule}\n${error.reference}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(error);
  }
  return deduped;
}

async function main(): Promise<void> {
  const { repoRoot } = resolveEnvironmentPaths();
  const { args, entries } = parseCliArgs(process.argv.slice(2));
  const options: CliOptions = { mode: null };
  for (const entry of entries) {
    if (entry.key === 'check') {
      options.mode = 'check';
    } else if (entry.key === 'sync') {
      options.mode = 'sync';
    } else if (entry.key === 'task' && typeof entry.value === 'string') {
      options.task = entry.value;
    }
  }
  if (!options.task && typeof args.task === 'string') {
    options.task = args.task;
  }

  if (options.mode === 'check') {
    const errors = await runDocsCheck(repoRoot);
    if (errors.length === 0) {
      console.log('✅ docs:check: OK');
      return;
    }

    for (const error of errors) {
      console.error(`${error.file}: ${error.rule}: ${error.reference}`);
    }
    console.error(`❌ docs:check: ${errors.length} error(s)`);
    process.exitCode = 1;
    return;
  }

  if (options.mode === 'sync') {
    const task = options.task ?? process.env.MCP_RUNNER_TASK_ID;
    if (!task) {
      throw new Error('Missing --task <id> (or set MCP_RUNNER_TASK_ID).');
    }
    await runDocsSync(repoRoot, task);
    console.log(`✅ docs:sync: updated mirrors for ${task}`);
    return;
  }

  console.error('Usage: node --loader ts-node/esm scripts/docs-hygiene.ts --check | --sync [--task <id>]');
  process.exitCode = 1;
}

const isDirectExecution =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  main().catch((error) => {
    console.error('[docs-hygiene] failed:', error?.message ?? error);
    process.exitCode = 1;
  });
}
