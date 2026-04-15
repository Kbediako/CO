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
  loadDocsCatalog,
  readCurrentCodexPosture,
  resolveDocsCatalogEntry
} from './lib/docs-catalog.js';
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
  | 'spark-policy-overbroad'
  | 'bundled-skill-roster-drift'
  | 'front-door-budget-exceeded'
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

const SPARK_POLICY_FILE_SEARCH_PATTERN =
  /(?:file[-/ ]search|codebase[-/ ]search|file\/codebase search|file search|codebase search)/i;
const SPARK_POLICY_LIMITING_APPOSITIVE_PATTERN =
  /^\s*(?:and\s+)?(?:(?:confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|limit(?:ed|s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|scop(?:e|ed|es|ing))\b|only[- ](?:as|for|to|search)\b|\bsearch[- ]only\b)/i;
const SPARK_POLICY_NEXT_ASSERTION_BOUNDARY_PATTERN =
  /\s+\b(?:and|but|or|while|whereas)\b\s+(?:(?:(?:can|could|may|might|must|should)\s+)?(?:allow(?:ed|s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|keep(?:s|ing)?|leav(?:e|es|ing)|limit(?:ed|s|ing)?|mak(?:e|es|ing)|permit(?:s|ted|ting)?|prefer(?:s|ring)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:e|ed|es|ing)|select(?:s|ing)?|support(?:ed|s|ing)?|us(?:e|ed|es|ing))\s+(?:(?:the|a|an)\s+)?[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?\b|(?:(?:the|a|an)\s+)?[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?\s+(?:are|is|can|could|should|must|may|might|remain(?:s|ing)?|stay(?:s|ing)?|be(?:ing)?|become(?:s|ing)?|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|limit(?:ed|s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|scop(?:e|ed|es|ing)|support(?:ed|s|ing)?)\b)/i;
const SPARK_POLICY_SCOPE_REQUIRED_PATTERN =
  /\b(?:allow(?:ed|s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|except(?:ion|ions)?|keep(?:s|ing)?|leav(?:e|es|ing)|limit(?:ed|s|ing)?|mak(?:e|es|ing)|only|permitted?|permits?|prefer(?:s|ring)?|remain(?:s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:e|ed|es|ing)|select(?:s|ing)?|should|support(?:ed|s|ing)?|us(?:e|ed|es|ing)|must)\b/i;
const SPARK_POLICY_GENERIC_SCOPE_ASSERTION_PATTERN =
  /\b(?:allow(?:ed|s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|except(?:ion|ions)?|file[-/ ]?search|codebase[-/ ]?search|(?:image|visual)\s+(?:inputs?|tasks?)|limit(?:ed|s|ing)?|only|only[- ]search|permitted?|permits?|prefer(?:s|ring)?|remain(?:s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:ed|es|ing)|search[- ]only|select(?:s|ing)?|stay(?:s|ing)?|support(?:ed|s|ing)?|text[- ]only|us(?:e|ed|es|ing))\b/i;
const SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN =
  /\b(?:search(?![- ]?polic(?:y|ies)\b)(?:\s+lanes?)?|search[- ]only|only[- ]search)\b/i;
const SPARK_POLICY_NEUTRAL_ASSERTION_LEAD_PATTERN =
  /^(?:(?:can|could|may|might|must|should)\s+)?(?:allow(?:ed|s|ing)?|are|available|be(?:ing)?|become(?:s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|enabl(?:e|ed|es|ing)|intended|is|limit(?:ed|s|ing)?|only\b|permit(?:s|ted|ting)?|remain(?:s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:e|ed|es|ing)|search[- ]only\b|select(?:s|ing)?|stay(?:s|ing)?|support(?:ed|s|ing)?|text[- ]only\b|us(?:e|ed|es|ing))\b/i;
const SPARK_POLICY_FORBIDDEN_USAGE_PATTERN =
  /(?:search\/synthesis|\bbroad exploration\b|\bsynthesis\b|\bplanning\b|\bimplementation\b|\breview\b|\bexploration\b)/gi;
const SPARK_POLICY_NEUTRAL_MAINTENANCE_PHRASE_PATTERN =
  /\b(?:planning|review)\s+(?:comments?|context|docs?|documentation|feedback|guidance|notes?|records?|references?|summar(?:y|ies)|updates?)\b/gi;
const SPARK_POLICY_SUPPORT_MAINTENANCE_REFERENCE_PATTERN =
  /^\s*(?:role\s+)?support\s+(?:comments?|context|docs?|documentation|feedback|guidance|notes?|records?|references?|summar(?:y|ies)|updates?)\b/i;
const SPARK_POLICY_SUPPORT_MAINTENANCE_TAIL_PATTERN =
  /^(?:\s*(?:[.;,!?]|$)|\s+(?:(?:can|could|may|might|must|should)\s+)?(?:(?:be|remain|stay)\s+)?(?:changed?|edited|kept|locked|maintained|moved|recorded|renamed|updated?)\b|\s+(?:exist|exists|link|links|live|lives|living|point|points|record|records|reference|references|reside|resides)\b|\s+(?:are|be|been|being|is|was|were)\s+(?:available|changed?|edited|kept|locked|maintained|moved|present|recorded|renamed|updated?)\b)/i;
const SPARK_POLICY_MARKER_AT_START_PATTERN =
  /^(?:[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?)/i;
const SPARK_POLICY_SUFFIX_RESTRICTION_PATTERN =
  /(?:,\s*)?\b(?:do not|don't|must not|should not|cannot|can't|never)\s+(?:(?:route)\s+(?:to\s+)?|(?:use|run|select|choose|prefer)\s+)(?:it\b|(?:(?:the|a|an)\s+)?[`*_]*(?:spark|spark roles?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?=\W|$))/;
const SPARK_POLICY_WITHOUT_FORBIDDEN_SCOPE_PATTERN =
  /\bwithout\s+(?:broad\s+exploration|exploration|implementation|planning|review|search\/synthesis|synthesis)\b/i;
const SPARK_POLICY_DISABLED_NON_USE_PATTERN =
  /(?:\b(?:keep(?:s|ing)?|leav(?:e|es|ing)|set(?:s|ting)?|mark(?:s|ing)?|configur(?:e|es|ed|ing))\s+(?:(?:the|a|an)\s+)?[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?\s+(?:disabled|inactive|off|unset|unconfigured|unavailable)\b|(?:(?:the|a|an)\s+)?[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?\s+(?:are|is|remain(?:s|ing)?|stay(?:s|ing)?|be(?:ing)?|become(?:s|ing)?)\s+(?:disabled|inactive|off|unset|unconfigured|unavailable)\b)/i;
const SPARK_POLICY_DISABLED_GENERIC_SEARCH_SCOPE_PATTERN =
  /\b(?:(?:only\s+)?(?:allow(?:ed|s|ing)?|available|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|intended|limit(?:ed|s|ing)?|permitted?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|scop(?:e|ed|es|ing))\s+(?:as|for|to)\s+search(?:\s+lanes?)?|(?:are|is|be(?:ing)?|remain(?:s|ing)?|stay(?:s|ing)?)\s+(?:only\s+)?(?:for\s+)?search(?:\s+lanes?)?|only\s+for\s+search(?:\s+lanes?)?|(?:search[- ]only|only[- ]search)(?:\s+lanes?)?|(?:unless|until|except\s+(?:when|if)|when|if|where)\s+(?:(?:a|an|the)\s+)?search(?:\s+lanes?)?\s+(?:opts?\s+in|opt\s+in|needs?\b|is\s+(?:needed|required|requested)))\b/i;
const SPARK_POLICY_NON_SPARK_REDIRECT_PATTERN =
  /\b(?:use|prefer|choose|select|route|run)\s+(?:to\s+)?(?:a\s+|an\s+)?(?:non-spark|non\s+spark|alternate|alternative|different|other)\s+(?:roles?|agents?|models?)\s+(?:instead\s+of|over|rather\s+than|before)\s+(?:(?:the|a|an)\s+)?[`*_]*(?:spark(?:\s+roles?)?|explorer_fast|gpt-5\.3-codex-spark)[`*_]*(?:\s+(?:roles?|agents?|models?))?\b/i;
const SPARK_POLICY_DISABLED_ACTIVE_USE_PATTERN =
  /\b(?:(?:and|but|or|then|when|while)\s+)?(?:(?:can|could|may|might|must|should)\s+)?(?:(?:be|being)\s+)?(?:allow(?:ed|s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|enabl(?:e|ed|es|ing)|keep(?:s|ing)?|leav(?:e|es|ing)|limit(?:ed|s|ing)?|mak(?:e|es|ing)|permit(?:s|ted|ting)?|prefer(?:s|red|ring)?|remain(?:s|ing)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:e|ed|es|ing)|select(?:ed|s|ing)?|stay(?:s|ing)?|support(?:ed|s|ing)?|us(?:e|ed|es|ing))\b/gi;

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
  const codexPostureSource =
    codexPosture?.source_path || String(docsCatalog?.policies?.codex_posture?.source_path || 'docs posture policy');
  const bundledSkillNames = docsCatalog ? await listBundledSkillNames(repoRoot) : [];
  const readmeBudget = docsCatalog?.policies?.readme_front_door ?? {};
  const rosterPolicy = docsCatalog?.policies?.bundled_skills_roster ?? {};
  if (docsCatalog) {
    errors.push(...checkTrackedRuntimeArtifacts(repoRoot, docsCatalog.policies?.release_surface_paths));
    errors.push(...(await checkTopLevelDocsSprawl(repoRoot, docsCatalog.policies?.top_level_docs)));
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
        const hasCurrentMention = versionMentions.includes(codexPosture.cli_version);
        const staleMentions = versionMentions.filter((version: string) => version !== codexPosture.cli_version);
        if (!hasCurrentMention || staleMentions.length > 0) {
          errors.push({
            file,
            rule: 'doc-posture-stale',
            reference:
              versionMentions.length === 0
                ? `missing Codex CLI version ${codexPosture.cli_version}`
                : `Codex CLI version(s) ${staleMentions.join(', ')} != current policy ${codexPosture.cli_version}`
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

  const errors: DocsCheckError[] = [];
  const lines = input.content.split('\n');
  for (const [index, line] of lines.entries()) {
    const markerIndexes = findSparkPolicyMarkerIndexes(line);
    if (markerIndexes.length === 0) {
      continue;
    }

    const lineNumber = index + 1;
    for (const markerIndex of markerIndexes) {
      const lineContext = buildSparkPolicyLineContext(lines, index, markerIndex);
      if (isNeutralSparkSupportMaintenanceReference(lineContext.text, lineContext.markerIndex)) {
        continue;
      }
      if (
        isNeutralSparkPolicyReference(lineContext.text, lineContext.markerIndex) &&
        !hasNeutralSparkPolicyContinuationAssertion(lineContext.text, lineContext.markerIndex)
      ) {
        continue;
      }
      const relevantText = lineContext.text.slice(findLastClauseBoundary(lineContext.text, lineContext.markerIndex));
      if (hasOverbroadSparkUsage(relevantText) || hasNegatedSparkFileSearchScope(relevantText)) {
        errors.push({
          file: input.file,
          rule: 'spark-policy-overbroad',
          reference: `line ${lineNumber}: spark role must be file/codebase search only`
        });
        break;
      }

      if (hasMissingSparkFileSearchScope(relevantText)) {
        errors.push({
          file: input.file,
          rule: 'spark-policy-overbroad',
          reference: `line ${lineNumber}: spark role missing file/codebase search-only scope`
        });
        break;
      }
    }
  }
  return errors;
}

function hasMissingSparkFileSearchScope(relevantText: string): boolean {
  if (hasUnqualifiedActiveUseAfterDisabledNonUse(relevantText)) {
    return true;
  }

  const scopeAssertionWindows = getSparkScopeAssertionWindows(relevantText).filter((markerWindow) =>
    SPARK_POLICY_SCOPE_REQUIRED_PATTERN.test(markerWindow)
  );
  if (scopeAssertionWindows.length > 0) {
    return scopeAssertionWindows.some(
      (markerWindow) =>
        !isRestrictiveSparkPolicyStatement(markerWindow) &&
        (hasNonFileSparkScopeAssertion(markerWindow) ||
          !SPARK_POLICY_FILE_SEARCH_PATTERN.test(markerWindow) ||
          hasUnqualifiedLaterSparkScopeAssertion(markerWindow))
    );
  }
  if (isRestrictiveSparkPolicyStatement(relevantText)) {
    return false;
  }
  return SPARK_POLICY_SCOPE_REQUIRED_PATTERN.test(relevantText) && !SPARK_POLICY_FILE_SEARCH_PATTERN.test(relevantText);
}

function getSparkScopeAssertionWindows(relevantText: string): string[] {
  return findSparkPolicyMarkerIndexes(relevantText)
    .filter(
      (markerIndex) =>
        !isNeutralSparkPolicyReference(relevantText, markerIndex) &&
        !isNeutralSparkSupportMaintenanceReference(relevantText, markerIndex)
    )
    .map((markerIndex) => {
      const clauseStart = findLastClauseBoundary(relevantText, markerIndex);
      const clauseEnd = findNextClauseBoundary(relevantText, markerIndex);
      const markerClause = relevantText.slice(clauseStart, clauseEnd);
      return buildSparkPolicyMarkerWindow(markerClause, markerIndex - clauseStart);
    });
}

function buildSparkPolicyMarkerWindow(markerClause: string, markerIndex: number): string {
  const prefix = markerClause.slice(0, markerIndex);
  const suffix = markerClause.slice(markerIndex);
  const frontedQualifierStart = findSparkPolicyFrontedFileSearchQualifierStart(prefix);
  const prefixStart =
    frontedQualifierStart ?? Math.max(prefix.lastIndexOf(',') + 1, findSparkPolicyPreviousAssertionPrefixEnd(prefix));
  const suffixEnd = findSparkPolicyMarkerWindowSuffixEnd(suffix);
  const localPrefix = prefix.slice(prefixStart);
  const localSuffix = suffix.slice(0, suffixEnd);
  return `${localPrefix}${localSuffix}`;
}

function findSparkPolicyFrontedFileSearchQualifierStart(prefix: string): number | null {
  const fileSearchPattern = new RegExp(SPARK_POLICY_FILE_SEARCH_PATTERN.source, 'gi');
  let qualifierStart: number | null = null;
  for (const match of prefix.matchAll(fileSearchPattern)) {
    const fileSearchIndex = match.index ?? -1;
    if (fileSearchIndex === -1) {
      continue;
    }
    const segmentEnd = prefix.indexOf(',', fileSearchIndex);
    if (segmentEnd === -1) {
      continue;
    }
    const segmentStart = prefix.lastIndexOf(',', fileSearchIndex) + 1;
    const candidate = prefix.slice(segmentStart, segmentEnd + 1);
    if (/^\s*(?:[-*+]\s+|\d+\.\s+)?(?:only\s+)?(?:for|when|while|during|in|as)\b/i.test(candidate)) {
      qualifierStart = segmentStart;
    }
  }
  return qualifierStart;
}

function findSparkPolicyMarkerWindowSuffixEnd(suffix: string): number {
  const firstComma = suffix.indexOf(',');
  const assertionBoundary = findSparkPolicyNextAssertionBoundary(suffix);
  if (firstComma === -1) {
    return assertionBoundary === -1 ? suffix.length : assertionBoundary;
  }
  if (assertionBoundary !== -1 && assertionBoundary < firstComma) {
    return assertionBoundary;
  }
  const localSuffix = suffix.slice(0, firstComma);
  const followingText = suffix.slice(firstComma + 1);
  const trailingQualifierEnd = findSparkPolicyTrailingFileSearchQualifierEnd(followingText);
  if (trailingQualifierEnd !== -1) {
    return firstComma + 1 + trailingQualifierEnd;
  }
  if (isBareSparkPolicyMarkerWindow(localSuffix) && SPARK_POLICY_LIMITING_APPOSITIVE_PATTERN.test(followingText)) {
    const nextComma = followingText.indexOf(',');
    const followingAssertionBoundary = findSparkPolicyNextAssertionBoundary(followingText);
    const followingSuffixEnd = minPositiveIndex(followingText.length, nextComma, followingAssertionBoundary);
    return firstComma + 1 + followingSuffixEnd;
  }
  const sharedMarkerListQualifierEnd = findSparkPolicySharedMarkerListQualifierEnd(suffix);
  if (sharedMarkerListQualifierEnd !== -1) {
    return sharedMarkerListQualifierEnd;
  }
  const continuedGenericSearchAssertionEnd = findSparkPolicyContinuedGenericSearchAssertionEnd(followingText);
  if (continuedGenericSearchAssertionEnd !== -1) {
    return firstComma + 1 + continuedGenericSearchAssertionEnd;
  }
  return firstComma;
}

function findSparkPolicyNextAssertionBoundary(text: string): number {
  const match = SPARK_POLICY_NEXT_ASSERTION_BOUNDARY_PATTERN.exec(text);
  return match?.index ?? -1;
}

function findSparkPolicyTrailingFileSearchQualifierEnd(text: string): number {
  const nextComma = text.indexOf(',');
  const assertionBoundary = findSparkPolicyNextAssertionBoundary(text);
  const qualifierEnd = minPositiveIndex(text.length, nextComma, assertionBoundary);
  const qualifier = text.slice(0, qualifierEnd);
  if (
    /^\s*(?:and\s+)?(?:only\s+)?(?:as|during|for|in|when|while)\b/i.test(qualifier) &&
    SPARK_POLICY_FILE_SEARCH_PATTERN.test(qualifier)
  ) {
    return qualifierEnd;
  }
  return -1;
}

function findSparkPolicySharedMarkerListQualifierEnd(text: string): number {
  const fileSearchMatch = SPARK_POLICY_FILE_SEARCH_PATTERN.exec(text);
  if (!fileSearchMatch) {
    return -1;
  }
  const qualifierStart = fileSearchMatch.index;
  const markerListPrefix = text
    .slice(0, qualifierStart)
    .replace(/\s+(?:only\s+)?(?:as|during|for|in|when|while)\s*$/i, '');
  if (!isSparkPolicyMarkerList(markerListPrefix)) {
    return -1;
  }
  const qualifierText = text.slice(qualifierStart);
  const nextComma = qualifierText.indexOf(',');
  const assertionBoundary = findSparkPolicyNextAssertionBoundary(qualifierText);
  return qualifierStart + minPositiveIndex(qualifierText.length, nextComma, assertionBoundary);
}

function findSparkPolicyContinuedGenericSearchAssertionEnd(text: string): number {
  const clauseEnd = findNextClauseBoundary(text, 0);
  const nextComma = text.indexOf(',');
  const assertionEnd = minPositiveIndex(clauseEnd, nextComma);
  const assertion = text.slice(0, assertionEnd);
  if (
    SPARK_POLICY_GENERIC_SCOPE_ASSERTION_PATTERN.test(assertion) &&
    SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN.test(assertion) &&
    !SPARK_POLICY_FILE_SEARCH_PATTERN.test(assertion) &&
    !isRestrictiveSparkPolicyStatement(assertion)
  ) {
    return assertionEnd;
  }
  return -1;
}

function isSparkPolicyMarkerList(text: string): boolean {
  const markers = text
    .trim()
    .replace(/\s*,\s*(?:and|or)\s+/gi, ',')
    .replace(/\s+(?:and|or)\s+/gi, ',')
    .split(/\s*,\s*/)
    .filter((marker) => marker.length > 0);
  return markers.length > 1 && markers.every((marker) => isBareSparkPolicyMarkerWindow(marker));
}

function findSparkPolicyPreviousAssertionPrefixEnd(text: string): number {
  const policyVerbMatch =
    /\s+\b(?:and|but|or|while|whereas)\b\s+((?:(?:can|could|may|might|must|should)\s+)?(?:allow(?:ed|s|ing)?|choos(?:e|es|ing)|confin(?:e|ed|es|ing)|constrain(?:ed|s|ing)?|keep(?:s|ing)?|leav(?:e|es|ing)|limit(?:ed|s|ing)?|mak(?:e|es|ing)|permit(?:s|ted|ting)?|prefer(?:s|ring)?|reserv(?:e|ed|es|ing)|restrict(?:ed|s|ing)?|rout(?:e|ed|es|ing)|run(?:s|ning)?|scop(?:e|ed|es|ing)|select(?:s|ing)?|support(?:ed|s|ing)?|us(?:e|ed|es|ing))\s+(?:(?:the|a|an)\s+)?[`*_]*)$/i.exec(
      text
    );
  if (policyVerbMatch) {
    return policyVerbMatch.index + policyVerbMatch[0].length - policyVerbMatch[1].length;
  }
  const match = /\s+\b(?:and|but|or|while|whereas)\b\s+(?:(?:the|a|an)\s+)?[`*_]*$/i.exec(text);
  return match ? match.index + match[0].length : 0;
}

function minPositiveIndex(fallback: number, ...indexes: number[]): number {
  return indexes.filter((index) => index >= 0).reduce((min, index) => Math.min(min, index), fallback);
}

function isBareSparkPolicyMarkerWindow(text: string): boolean {
  const normalized = text
    .replace(/[`*]/g, '')
    .replace(/(^|[^A-Za-z0-9])_+(?=[A-Za-z0-9])/g, '$1')
    .replace(/([A-Za-z0-9])_+(?=$|[^A-Za-z0-9])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return /^(?:(?:the|a|an)\s+)?(?:spark(?:\s+roles?)?|explorer_fast(?:\s+(?:roles?|agents?|models?))?|gpt-5\.3-codex-spark(?:\s+(?:roles?|agents?|models?))?)$/.test(
    normalized
  );
}

function isRestrictiveSparkPolicyStatement(relevantText: string): boolean {
  return (
    /\b(?:do not|don't|must not|should not|cannot|can't|never)\b/i.test(relevantText) ||
    /\bnot\s+(?:available\s+for|for|intended\s+for|to\s+be\s+used\s+for|used\s+for)\b/i.test(relevantText) ||
    SPARK_POLICY_NON_SPARK_REDIRECT_PATTERN.test(relevantText) ||
    SPARK_POLICY_DISABLED_NON_USE_PATTERN.test(relevantText) ||
    SPARK_POLICY_WITHOUT_FORBIDDEN_SCOPE_PATTERN.test(relevantText) ||
    /\bno\s+(?:broad\s+exploration|exploration|implementation|planning|review|search\/synthesis|synthesis)\b/i.test(
      relevantText
    )
  );
}

function hasUnqualifiedActiveUseAfterDisabledNonUse(relevantText: string): boolean {
  const disabledPattern = new RegExp(SPARK_POLICY_DISABLED_NON_USE_PATTERN.source, 'gi');
  for (const disabledMatch of relevantText.matchAll(disabledPattern)) {
    const tail = relevantText.slice((disabledMatch.index ?? 0) + disabledMatch[0].length);
    const disabledTailClause = tail.slice(0, findNextClauseBoundary(tail, 0));
    const disabledTailSearchScopeMatch = SPARK_POLICY_DISABLED_GENERIC_SEARCH_SCOPE_PATTERN.exec(disabledTailClause);
    if (
      disabledTailSearchScopeMatch &&
      !isNegatedSparkGenericSearchScope(disabledTailClause, disabledTailSearchScopeMatch.index ?? 0) &&
      !SPARK_POLICY_FILE_SEARCH_PATTERN.test(disabledTailClause)
    ) {
      return true;
    }

    for (const activeUseMatch of tail.matchAll(SPARK_POLICY_DISABLED_ACTIVE_USE_PATTERN)) {
      if (isNegatedSparkActiveUse(tail, activeUseMatch)) {
        continue;
      }

      const activeText = tail.slice(activeUseMatch.index ?? 0);
      const activeClause = activeText.slice(0, findNextClauseBoundary(activeText, 0));
      if (SPARK_POLICY_NON_SPARK_REDIRECT_PATTERN.test(activeClause)) {
        continue;
      }

      if (
        (SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN.test(activeClause) ||
          hasNonFileSparkScopeAssertion(activeClause)) &&
        !SPARK_POLICY_FILE_SEARCH_PATTERN.test(activeClause)
      ) {
        return true;
      }
    }
  }

  return false;
}

function isNegatedSparkGenericSearchScope(text: string, matchIndex: number): boolean {
  const immediatePrefix = text.slice(Math.max(0, matchIndex - 40), matchIndex);
  return /\b(?:do not|don't|must not|should not|can(?:not|'t| not)|never|not|no|without)\s+(?:(?:be|being)\s+)?$/i.test(
    immediatePrefix
  );
}

function hasNonFileSparkScopeAssertion(text: string): boolean {
  return (
    /\b(?:(?:image|visual)\s+(?:analysis|generation|inputs?|inspection|outputs?|processing|reasoning|review|tasks?|understanding|work)|text[- ]only)\b/i.test(text) ||
    new RegExp(SPARK_POLICY_FORBIDDEN_USAGE_PATTERN.source, 'i').test(text)
  );
}

function isNegatedSparkActiveUse(text: string, activeUseMatch: RegExpExecArray): boolean {
  const activeStart = activeUseMatch.index ?? 0;
  const immediatePrefix = text.slice(Math.max(0, activeStart - 40), activeStart);
  return /\b(?:do not|don't|must not|should not|can(?:not|'t| not)|never|not|no)\s+(?:(?:be|being)\s+)?$/i.test(
    immediatePrefix
  );
}

function hasUnqualifiedLaterSparkScopeAssertion(markerWindow: string): boolean {
  const fileSearchMatch = SPARK_POLICY_FILE_SEARCH_PATTERN.exec(markerWindow);
  if (!fileSearchMatch) {
    return false;
  }

  const separatorPattern = /\s+\b(?:and|or|but|while|whereas)\b\s+/gi;
  const separators = [...markerWindow.matchAll(separatorPattern)];
  const assertionRanges = [
    { start: 0, end: separators[0]?.index ?? markerWindow.length },
    ...separators.map((separator, index) => ({
      start: separator.index ?? 0,
      end: separators[index + 1]?.index ?? markerWindow.length
    }))
  ];
  for (const { start, end } of assertionRanges) {
    const assertion = markerWindow.slice(start, end);
    if (
      SPARK_POLICY_GENERIC_SCOPE_ASSERTION_PATTERN.test(assertion) &&
      (SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN.test(assertion) || hasNonFileSparkScopeAssertion(assertion)) &&
      !SPARK_POLICY_FILE_SEARCH_PATTERN.test(assertion) &&
      !isRestrictiveSparkPolicyStatement(assertion)
    ) {
      return true;
    }
  }

  return false;
}

function hasOverbroadSparkUsage(relevantText: string): boolean {
  for (const match of relevantText.matchAll(SPARK_POLICY_FORBIDDEN_USAGE_PATTERN)) {
    if (!isRestrictiveSparkUsageMention(relevantText, match.index ?? 0)) {
      return true;
    }
  }
  return false;
}

function hasNegatedSparkFileSearchScope(relevantText: string): boolean {
  return (
    /\bnot\s+(?:exclusively|just|limited(?:\s+to)?|only|solely)\b/i.test(relevantText) &&
    SPARK_POLICY_FILE_SEARCH_PATTERN.test(relevantText)
  );
}

function isRestrictiveSparkUsageMention(relevantText: string, mentionIndex: number): boolean {
  const clauseStart = findLastClauseBoundary(relevantText, mentionIndex);
  const clauseEnd = findNextClauseBoundary(relevantText, mentionIndex);
  const clausePrefix = relevantText.slice(clauseStart, mentionIndex).toLowerCase();
  const clauseSuffix = relevantText.slice(mentionIndex, clauseEnd).toLowerCase();
  const localClausePrefix = sliceAfterLastContrast(clausePrefix);
  const localClause = `${localClausePrefix}${clauseSuffix}`;
  if (
    /\b(?:use|prefer|choose|select|route|run)\s+(?:a\s+|an\s+)?(?:non-spark|non\s+spark|alternate|alternative|different|other)\s+(?:roles?|agents?|models?)\b/.test(
      localClausePrefix
    )
  ) {
    return true;
  }
  if (/\bnot\s+(?:exclusively|just|limited\b|limited\s+to|only|solely)\b/.test(localClausePrefix)) {
    return false;
  }
  if (
    /\b(?:do not|don't|must not|should not|cannot|can't|never|not|no)\b/.test(localClausePrefix) ||
    SPARK_POLICY_WITHOUT_FORBIDDEN_SCOPE_PATTERN.test(localClause)
  ) {
    return true;
  }
  return hasSuffixRestrictionForSparkUsage(localClausePrefix, clauseSuffix);
}

function buildSparkPolicyLineContext(
  lines: string[],
  lineIndex: number,
  markerIndex: number
): { text: string; markerIndex: number } {
  const currentLine = lines[lineIndex] ?? '';
  const startLine = findSparkPolicyContextStartLine(lines, lineIndex);
  const parts: string[] = [];
  let adjustedMarkerIndex = markerIndex;
  for (let index = startLine; index < lineIndex; index += 1) {
    const previousPart = (lines[index] ?? '').trim();
    parts.push(previousPart);
    adjustedMarkerIndex += previousPart.length + 1;
  }
  parts.push(currentLine.trimEnd());
  for (let index = lineIndex + 1; index < lines.length; index += 1) {
    const nextLine = lines[index] ?? '';
    if (isSparkPolicyLineContextBoundary(nextLine)) {
      break;
    }
    parts.push(nextLine.trim());
  }
  return {
    text: parts.join(' '),
    markerIndex: adjustedMarkerIndex
  };
}

function isSparkPolicyLineContextBoundary(line: string): boolean {
  return isSparkPolicyHardContextBoundary(line) || isSparkPolicyListItemLine(line);
}

function findSparkPolicyContextStartLine(lines: string[], lineIndex: number): number {
  let startLine = lineIndex;
  while (startLine > 0) {
    const previousLine = lines[startLine - 1] ?? '';
    const currentLine = lines[startLine] ?? '';
    if (isSparkPolicyHardContextBoundary(previousLine) || isSparkPolicyListItemLine(currentLine)) {
      break;
    }
    startLine -= 1;
    if (isSparkPolicyListItemLine(previousLine)) {
      break;
    }
  }
  return startLine;
}

function isSparkPolicyHardContextBoundary(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length === 0 || /^(?:#{1,6}\s+|>\s+|```|~~~|\|)/.test(trimmed);
}

function isSparkPolicyListItemLine(line: string): boolean {
  return /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line);
}

function sliceAfterLastContrast(text: string): string {
  let lastContrastEnd = 0;
  for (const match of text.matchAll(/\b(?:but|except|unless)\b/gi)) {
    lastContrastEnd = (match.index ?? 0) + match[0].length;
  }
  return lastContrastEnd === 0 ? text : text.slice(lastContrastEnd);
}

function hasSuffixRestrictionForSparkUsage(clausePrefix: string, clauseSuffix: string): boolean {
  const restrictionMatch = SPARK_POLICY_SUFFIX_RESTRICTION_PATTERN.exec(clauseSuffix);
  if (!restrictionMatch) {
    return false;
  }
  const prefixBeforeRestriction = clauseSuffix.slice(0, restrictionMatch.index);
  if (/\b(?:but|except|unless)\b/.test(prefixBeforeRestriction)) {
    return false;
  }
  return isFrontedSparkRestrictionScope(`${clausePrefix}${prefixBeforeRestriction}`);
}

function isFrontedSparkRestrictionScope(prefixBeforeRestriction: string): boolean {
  const normalized = prefixBeforeRestriction
    .replace(/[`*_]/g, '')
    .replace(/^\s*[-+]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const frontedScope = normalized.replace(/^(?:for|when|while|during)\s+/, '');
  return isSparkForbiddenScopeList(frontedScope);
}

function isSparkForbiddenScopeList(scopeText: string): boolean {
  return /^(?:(?:broad exploration|exploration|implementation|planning|review|search\/synthesis|synthesis)(?:\s+tasks?)?\s*(?:,|\/|and|or)?\s*)+$/.test(
    scopeText
  );
}

function findLastClauseBoundary(text: string, beforeIndex: number): number {
  const boundary = Math.max(
    text.lastIndexOf('.', beforeIndex),
    text.lastIndexOf(';', beforeIndex),
    text.lastIndexOf('!', beforeIndex),
    text.lastIndexOf('?', beforeIndex)
  );
  return boundary === -1 ? 0 : boundary + 1;
}

function findNextClauseBoundary(text: string, afterIndex: number): number {
  for (let index = afterIndex; index < text.length; index += 1) {
    const char = text[index];
    if (char === ';' || char === '!' || char === '?') {
      return index;
    }
    if (char === '.' && !isInternalClausePeriod(text, index)) {
      return index;
    }
  }
  return text.length;
}

function isInternalClausePeriod(text: string, index: number): boolean {
  const previous = text[index - 1] ?? '';
  const next = text[index + 1] ?? '';
  return /[A-Za-z0-9]/.test(previous) && /[A-Za-z0-9]/.test(next);
}

function findSparkPolicyMarkerIndexes(line: string): number[] {
  const markers = [/explorer_fast/i, /gpt-5\.3-codex-spark/i];
  const indexes = markers
    .flatMap((marker) => [...line.matchAll(new RegExp(marker.source, `${marker.flags}g`))].map((match) => match.index ?? -1))
    .filter((index) => index >= 0);
  indexes.push(...findSparkWordPolicyMarkerIndexes(line));
  return [...new Set(indexes)].sort((a, b) => a - b);
}

function findSparkWordPolicyMarkerIndexes(line: string): number[] {
  const indexes: number[] = [];
  for (const match of line.matchAll(/\bspark\b/gi)) {
    const index = match.index ?? -1;
    const prefix = line.slice(Math.max(0, index - 4), index).toLowerCase();
    if (prefix === 'non-' || prefix === 'non ') {
      continue;
    }
    indexes.push(index);
  }
  return indexes;
}

function isNeutralSparkPolicyReference(text: string, markerIndex: number): boolean {
  const clauseEnd = findNextClauseBoundary(text, markerIndex);
  const afterSpark = sliceAfterSparkPolicyMarker(text, markerIndex, clauseEnd);
  const policyMatch = /^\s*[- ]?polic(?:y|ies)\b/i.exec(afterSpark);
  if (!policyMatch) {
    return false;
  }
  const afterPolicy = afterSpark.slice(policyMatch[0].length);
  const localAfterPolicy = afterPolicy.slice(
    0,
    minPositiveIndex(afterPolicy.length, afterPolicy.indexOf(','), findSparkPolicyNextAssertionBoundary(afterPolicy))
  );
  const assertionText = localAfterPolicy.replace(SPARK_POLICY_NEUTRAL_MAINTENANCE_PHRASE_PATTERN, '');
  return (
    !new RegExp(SPARK_POLICY_FORBIDDEN_USAGE_PATTERN.source, 'i').test(assertionText) &&
    !SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN.test(assertionText) &&
    !hasNonFileSparkScopeAssertion(assertionText) &&
    !/\benabl(?:e|ed|es|ing)\b/i.test(assertionText)
  );
}

function isNeutralSparkSupportMaintenanceReference(text: string, markerIndex: number): boolean {
  const clauseEnd = findNextClauseBoundary(text, markerIndex);
  const afterSpark = sliceAfterSparkPolicyMarker(text, markerIndex, clauseEnd);
  const supportMaintenanceMatch = SPARK_POLICY_SUPPORT_MAINTENANCE_REFERENCE_PATTERN.exec(afterSpark);
  if (!supportMaintenanceMatch) {
    return false;
  }
  const afterSupportMaintenance = afterSpark.slice(supportMaintenanceMatch[0].length);
  return (
    SPARK_POLICY_SUPPORT_MAINTENANCE_TAIL_PATTERN.test(afterSupportMaintenance) &&
    !hasSparkPolicyAssertionText(afterSupportMaintenance)
  );
}

function sliceAfterSparkPolicyMarker(text: string, markerIndex: number, clauseEnd: number): string {
  const markerText = text.slice(markerIndex, clauseEnd);
  const markerMatch = SPARK_POLICY_MARKER_AT_START_PATTERN.exec(markerText);
  if (!markerMatch) {
    return text.slice(markerIndex + 'spark'.length, clauseEnd);
  }
  return markerText.slice(markerMatch[0].length);
}

function hasNeutralSparkPolicyContinuationAssertion(text: string, markerIndex: number): boolean {
  const clauseEnd = findNextClauseBoundary(text, markerIndex);
  const afterSpark = sliceAfterSparkPolicyMarker(text, markerIndex, clauseEnd);
  const policyMatch = /^\s*[- ]?polic(?:y|ies)\b/i.exec(afterSpark);
  if (!policyMatch) {
    return false;
  }
  const afterPolicy = afterSpark.slice(policyMatch[0].length);
  const localEnd = minPositiveIndex(
    afterPolicy.length,
    afterPolicy.indexOf(','),
    findSparkPolicyNextAssertionBoundary(afterPolicy)
  );
  const continuation = afterPolicy.slice(localEnd);
  return (
    hasSparkPolicyAssertionText(continuation) ||
    hasNeutralSparkPolicyPostClauseAssertion(text.slice(clauseEnd))
  );
}

function hasSparkPolicyAssertionText(text: string): boolean {
  return (
    new RegExp(SPARK_POLICY_FORBIDDEN_USAGE_PATTERN.source, 'i').test(text) ||
    SPARK_POLICY_GENERIC_SEARCH_SCOPE_PATTERN.test(text) ||
    hasNonFileSparkScopeAssertion(text) ||
    /\benabl(?:e|ed|es|ing)\b/i.test(text)
  );
}

function hasNeutralSparkPolicyPostClauseAssertion(text: string): boolean {
  const tail = text.replace(/^\s*[;.!?]\s*/, '').trim();
  if (tail.length === 0) {
    return false;
  }
  const firstClause = tail.slice(0, findNextClauseBoundary(tail, 0)).trim();
  const assertionCandidate = firstClause
    .replace(/^(?:and|but|or|then)\s+/i, '')
    .replace(/^(?:(?:it|this|that|the\s+(?:spark\s+)?polic(?:y|ies))\s+)/i, '');
  return (
    SPARK_POLICY_NEUTRAL_ASSERTION_LEAD_PATTERN.test(assertionCandidate) &&
    hasSparkPolicyAssertionText(assertionCandidate)
  );
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
  const policy = JSON.parse(raw) as { max_lines?: number };
  const maxLines = Number.isFinite(policy?.max_lines) ? Number(policy.max_lines) : NaN;
  if (!Number.isInteger(maxLines) || maxLines <= 0) {
    return null;
  }

  const tasksRaw = await readFile(tasksPath, 'utf8');
  const tasksLines = tasksRaw.split('\n');
  const lineCount = tasksLines.at(-1) === '' ? tasksLines.length - 1 : tasksLines.length;
  if (lineCount <= maxLines) {
    return null;
  }

  return {
    file: 'docs/TASKS.md',
    rule: 'tasks-file-too-large',
    reference: `lines=${lineCount} max=${maxLines}`
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
