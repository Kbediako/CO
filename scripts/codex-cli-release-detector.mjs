#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const DEFAULT_GITHUB_REPO = 'openai/codex';
export const DEFAULT_NPM_PACKAGE = '@openai/codex';
export const DEFAULT_SOURCE_ISSUE_ID = 'b7074b86-3d38-4dfe-baa9-73b2cc8d686f';
export const RELEASE_INTAKE_OWNER_PREFIX = 'codex-cli-release-intake:stable:';

const PIN_SURFACES = [
  'docs/guides/codex-version-policy.md',
  '.github/workflows/cloud-canary.yml',
  '.github/workflows/core-lane.yml',
  '.github/workflows/release.yml',
  '.github/workflows/pack-smoke-backstop.yml',
  'tests/pack-smoke.spec.ts'
];

const RELEASE_INTAKE_TEMPLATE_PATH = '.agent/task/templates/codex-cli-release-intake-template.md';
const PRIMARY_PRERELEASE_DIST_TAGS = new Set(['alpha', 'beta', 'next', 'rc', 'canary', 'experimental', 'dev']);

export function parseSemver(version) {
  const match = String(version ?? '').match(/^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) {
    return null;
  }
  return {
    version: `${match[1]}.${match[2]}.${match[3]}${match[4] ? `-${match[4]}` : ''}`,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null
  };
}

export function compareSemver(left, right) {
  const a = parseSemver(left);
  const b = parseSemver(right);
  if (!a || !b) {
    throw new Error(`Cannot compare invalid semver values: ${left}, ${right}`);
  }
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) {
      return a[key] > b[key] ? 1 : -1;
    }
  }
  if (a.prerelease === b.prerelease) {
    return 0;
  }
  if (!a.prerelease) {
    return 1;
  }
  if (!b.prerelease) {
    return -1;
  }
  return a.prerelease.localeCompare(b.prerelease, undefined, { numeric: true });
}

export function sortVersionsDescending(versions) {
  return [...versions].sort((a, b) => compareSemver(b.version, a.version));
}

function releaseVersionFromTag(tagName) {
  const match = String(tagName ?? '').match(/^rust-v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/);
  return match?.[1] ?? null;
}

export function classifyGithubReleases(releases) {
  const normalized = [];
  for (const release of releases ?? []) {
    const tagName = release.tag_name ?? release.tagName;
    const version = releaseVersionFromTag(tagName);
    const parsed = parseSemver(version);
    if (!parsed) {
      continue;
    }
    const prerelease = Boolean(release.prerelease ?? release.isPrerelease ?? parsed.prerelease);
    normalized.push({
      source: 'github',
      tag: tagName,
      version: parsed.version,
      prerelease,
      published_at: release.published_at ?? release.publishedAt ?? null,
      url: release.html_url ?? release.url ?? null
    });
  }

  const stable = sortVersionsDescending(normalized.filter((release) => !release.prerelease))[0] ?? null;
  const prerelease = sortVersionsDescending(normalized.filter((release) => release.prerelease))[0] ?? null;
  return { releases: normalized, stable, prerelease };
}

export function classifyNpmMetadata(metadata) {
  const distTags = metadata?.['dist-tags'] ?? {};
  const time = metadata?.time ?? {};
  const latestVersion = distTags.latest ?? null;
  const latestParsed = parseSemver(latestVersion);
  const latest = latestParsed
    ? {
        source: 'npm',
        version: latestParsed.version,
        tag: 'latest',
        prerelease: Boolean(latestParsed.prerelease),
        published_at: time[latestParsed.version] ?? null
      }
    : null;
  const prereleaseTags = Object.entries(distTags)
    .filter(([tag, version]) => PRIMARY_PRERELEASE_DIST_TAGS.has(tag) || (tag === 'latest' && parseSemver(version)?.prerelease))
    .map(([tag, version]) => {
      const parsed = parseSemver(version);
      if (!parsed || !parsed.prerelease) {
        return null;
      }
      return {
        source: 'npm',
        tag,
        version: parsed.version,
        prerelease: true,
        published_at: time[parsed.version] ?? null
      };
    })
    .filter(Boolean);
  return {
    package: metadata?.name ?? DEFAULT_NPM_PACKAGE,
    dist_tags: distTags,
    time_modified: time.modified ?? null,
    latest,
    prerelease: sortVersionsDescending(prereleaseTags)[0] ?? null
  };
}

function rateLimitFromHeaders(headers) {
  const get = (name) => {
    if (!headers) {
      return null;
    }
    if (typeof headers.get === 'function') {
      return headers.get(name);
    }
    return headers[name] ?? headers[name.toLowerCase()] ?? null;
  };
  const remainingRaw = get('x-ratelimit-remaining');
  const limitRaw = get('x-ratelimit-limit');
  const resetRaw = get('x-ratelimit-reset');
  return {
    remaining: remainingRaw === null ? null : Number(remainingRaw),
    limit: limitRaw === null ? null : Number(limitRaw),
    reset_epoch_seconds: resetRaw === null ? null : Number(resetRaw),
    uncertain: remainingRaw === null || Number.isNaN(Number(remainingRaw)) || Number(remainingRaw) <= 0
  };
}

async function fetchJson(fetchImpl, url, headers) {
  const response = await fetchImpl(url, { headers });
  if (!response?.ok) {
    const status = response?.status ?? 'unknown';
    throw new Error(`Fetch failed for ${url}: HTTP ${status}`);
  }
  return {
    json: await response.json(),
    rate_limit: rateLimitFromHeaders(response.headers)
  };
}

function mergeRateLimits(rateLimits) {
  const remainingValues = rateLimits.map((limit) => limit.remaining).filter((value) => value !== null);
  const limitValues = rateLimits.map((limit) => limit.limit).filter((value) => value !== null);
  const resetValues = rateLimits.map((limit) => limit.reset_epoch_seconds).filter((value) => value !== null);
  return {
    remaining: remainingValues.length > 0 ? Math.min(...remainingValues) : null,
    limit: limitValues.length > 0 ? Math.max(...limitValues) : null,
    reset_epoch_seconds: resetValues.length > 0 ? Math.max(...resetValues) : null,
    uncertain: rateLimits.some((limit) => limit.uncertain)
  };
}

async function fetchGithubReleases(fetchImpl, githubRepo, headers) {
  const releases = [];
  const rateLimits = [];
  const perPage = 100;
  const maxPages = 10;

  for (let page = 1; page <= maxPages; page += 1) {
    const url = `https://api.github.com/repos/${githubRepo}/releases?per_page=${perPage}&page=${page}`;
    const result = await fetchJson(fetchImpl, url, headers);
    rateLimits.push(result.rate_limit);
    const pageReleases = Array.isArray(result.json) ? result.json : [];
    releases.push(...pageReleases);

    const classified = classifyGithubReleases(releases);
    if (classified.stable || pageReleases.length < perPage) {
      return {
        releases,
        rate_limit: mergeRateLimits(rateLimits)
      };
    }
  }

  return {
    releases,
    rate_limit: mergeRateLimits(rateLimits)
  };
}

export async function collectUpstreamTruth({
  fetchImpl = globalThis.fetch,
  githubRepo = DEFAULT_GITHUB_REPO,
  npmPackage = DEFAULT_NPM_PACKAGE,
  githubToken = process.env.GITHUB_TOKEN
} = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('No fetch implementation available for upstream release detection.');
  }
  const githubHeaders = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(githubToken ? { Authorization: `Bearer ${githubToken}` } : {})
  };
  const npmUrl = `https://registry.npmjs.org/${encodeURIComponent(npmPackage).replaceAll('%2F', '%2f')}`;
  const [githubResult, npmResult] = await Promise.all([
    fetchGithubReleases(fetchImpl, githubRepo, githubHeaders),
    fetchJson(fetchImpl, npmUrl, { Accept: 'application/json' })
  ]);
  return {
    github: {
      repo: githubRepo,
      ...classifyGithubReleases(githubResult.releases),
      rate_limit: githubResult.rate_limit
    },
    npm: classifyNpmMetadata(npmResult.json)
  };
}

function extractVersions(content) {
  const versions = new Set();
  const patterns = [
    /@openai\/codex@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/g,
    /Codex CLI `(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)`/g,
    /codex-cli (\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/g,
    /`rust-v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)`/g,
    /npm `@openai\/codex@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)`/g
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (parseSemver(match[1])) {
        versions.add(match[1]);
      }
    }
  }
  return [...versions];
}

function matchPolicyVersion(content, pattern) {
  const match = content.match(pattern);
  return match?.[1] ?? null;
}

function extractAuditedVersions(content) {
  const versions = new Set();
  const patterns = [
    /\baudited(?: official)? `rust-v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)`/gi,
    /\baudited[^.\n]*npm `@openai\/codex@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)`/gi,
    /\baudited[^.\n]*Codex CLI `(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)`/gi
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      if (parseSemver(match[1])) {
        versions.add(match[1]);
      }
    }
  }
  return [...versions];
}

export async function collectCurrentCoPins({ repoRoot = process.cwd(), readFileImpl = readFile } = {}) {
  const surfaces = [];
  const surfaceContents = new Map();
  const missing = [];
  for (const surface of PIN_SURFACES) {
    try {
      const content = await readFileImpl(join(repoRoot, surface), 'utf8');
      surfaceContents.set(surface, content);
      surfaces.push({
        path: surface,
        versions: extractVersions(content),
        install_pins: [...content.matchAll(/npm install --global @openai\/codex@(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)/g)].map(
          (match) => match[1]
        )
      });
    } catch (error) {
      missing.push({ path: surface, error: error instanceof Error ? error.message : String(error) });
    }
  }

  let releaseTemplate = null;
  try {
    releaseTemplate = await readFileImpl(join(repoRoot, RELEASE_INTAKE_TEMPLATE_PATH), 'utf8');
  } catch {
    missing.push({ path: RELEASE_INTAKE_TEMPLATE_PATH, error: 'missing release-intake template' });
  }

  const policy = surfaces.find((surface) => surface.path === 'docs/guides/codex-version-policy.md');
  const policyContent = policy ? (surfaceContents.get(policy.path) ?? '') : '';
  const policyVersions = extractAuditedVersions(policyContent).filter((version) => !parseSemver(version)?.prerelease);
  const lastAuditedVersion = sortVersionsDescending(policyVersions.map((version) => ({ version })))[0]?.version ?? null;
  const installPins = surfaces.flatMap((surface) =>
    surface.install_pins.map((version) => ({ path: surface.path, version }))
  );
  const distinctPins = [...new Set(installPins.map((pin) => pin.version))].sort(compareSemver);

  return {
    policy: {
      current_local_cli: matchPolicyVersion(
        policyContent,
        /Current CO-local ChatGPT-auth\/appserver model posture is `gpt-[^`]+` \/ `[^`]+` on Codex CLI `([^`]+)`/
      ),
      release_facing_target: matchPolicyVersion(
        policyContent,
        /Current release-facing package\/downstream-smoke compatibility target is Codex CLI `([^`]+)`/
      ),
      cloud_execution_candidate: matchPolicyVersion(
        policyContent,
        /Current cloud execution candidate remains Codex CLI `([^`]+)`/
      ),
      last_audited_version: lastAuditedVersion
    },
    surfaces,
    install_pins: installPins,
    distinct_install_pins: distinctPins,
    split_pin_versions: distinctPins.length > 1,
    missing_surfaces: missing,
    release_intake_template_path: RELEASE_INTAKE_TEMPLATE_PATH,
    release_intake_template_present: Boolean(releaseTemplate),
    release_intake_template_content: releaseTemplate
  };
}

function versionsMatch(left, right) {
  return Boolean(left && right && compareSemver(left, right) === 0);
}

function isPrereleaseNewerThanStable(prerelease, stable) {
  return Boolean(prerelease && stable && compareSemver(prerelease, stable) > 0);
}

function findTruthBlocker(upstreamTruth) {
  if (upstreamTruth.github.rate_limit?.uncertain) {
    return {
      state: 'blocked_rate_limit_uncertain',
      reason: 'GitHub API rate-limit remaining header is missing, invalid, or exhausted.'
    };
  }
  const githubStable = upstreamTruth.github.stable?.version ?? null;
  const npmStable = upstreamTruth.npm.latest?.version ?? null;
  if (!githubStable || !npmStable) {
    return {
      state: 'blocked_upstream_ambiguous',
      reason: 'Stable release truth is missing from GitHub releases or npm latest dist-tag.'
    };
  }
  if (!versionsMatch(githubStable, npmStable)) {
    return {
      state: 'blocked_upstream_mismatch',
      reason: `GitHub stable ${githubStable} does not match npm latest ${npmStable}.`
    };
  }
  const githubPrerelease = upstreamTruth.github.prerelease?.version ?? null;
  const npmPrerelease = upstreamTruth.npm.prerelease?.version ?? null;
  const githubPrereleaseRelevant = isPrereleaseNewerThanStable(githubPrerelease, githubStable);
  const npmPrereleaseRelevant = isPrereleaseNewerThanStable(npmPrerelease, npmStable);
  if ((githubPrereleaseRelevant || npmPrereleaseRelevant) && !versionsMatch(githubPrerelease, npmPrerelease)) {
    return {
      state: 'blocked_upstream_mismatch',
      reason: `GitHub prerelease ${githubPrerelease ?? 'missing'} does not match npm prerelease ${npmPrerelease ?? 'missing'}.`
    };
  }
  return null;
}

export function buildReleaseDecision({ upstreamTruth, currentCo }) {
  const truthBlocker = findTruthBlocker(upstreamTruth);
  if (truthBlocker) {
    return {
      decision_state: truthBlocker.state,
      candidate: null,
      selected_issue: null,
      no_op_reason: null,
      blocker_reason: truthBlocker.reason,
      mutation_required: false
    };
  }
  if (currentCo.missing_surfaces.length > 0) {
    return {
      decision_state: 'blocked_current_truth_unavailable',
      candidate: upstreamTruth.github.stable,
      selected_issue: null,
      no_op_reason: null,
      blocker_reason: `Current CO truth is incomplete: ${currentCo.missing_surfaces
        .map((surface) => surface.path)
        .join(', ')}`,
      mutation_required: false
    };
  }

  const stableCandidate = upstreamTruth.github.stable;
  const lastAudited = currentCo.policy.last_audited_version;
  if (!lastAudited || compareSemver(stableCandidate.version, lastAudited) > 0) {
    return {
      decision_state: 'new_audit_required',
      candidate: stableCandidate,
      selected_issue: {
        canonical_owner_key: `${RELEASE_INTAKE_OWNER_PREFIX}${stableCandidate.version}`
      },
      no_op_reason: null,
      blocker_reason: null,
      mutation_required: true
    };
  }

  const prerelease = upstreamTruth.github.prerelease;
  if (prerelease && compareSemver(prerelease.version, stableCandidate.version) > 0) {
    return {
      decision_state: 'prerelease_observed',
      candidate: prerelease,
      selected_issue: null,
      no_op_reason: `Latest stable ${stableCandidate.version} is represented by policy last-audited ${lastAudited}; prerelease ${prerelease.version} is recorded without intake mutation.`,
      blocker_reason: null,
      mutation_required: false
    };
  }

  return {
    decision_state: 'no_new_audit_required',
    candidate: stableCandidate,
    selected_issue: null,
    no_op_reason: `Latest stable ${stableCandidate.version} is already represented by policy last-audited ${lastAudited}.`,
    blocker_reason: null,
    mutation_required: false
  };
}

function hasLinearAuth(env) {
  return [env.CO_LINEAR_API_TOKEN, env.CO_LINEAR_API_KEY, env.LINEAR_API_KEY].some(hasEnvValue);
}

function hasEnvValue(value) {
  return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
}

function releaseTemplateContent(currentCo) {
  return (
    currentCo.release_intake_template_content?.trim() ??
    [
      '# Codex CLI Release-Intake Issue Template',
      '',
      '## Release Evidence Axes',
      '- [ ] local CLI evidence',
      '- [ ] package/downstream smoke evidence',
      '- [ ] cloud-canary evidence',
      '- [ ] workflow pins evidence',
      '- [ ] model posture evidence',
      '- [ ] docs surfaces evidence',
      '- [ ] release notes evidence',
      '',
      '## Supersedes / Holds Matrix',
      '| Surface | Prior release evidence page or posture surface | Classification | Reason | Evidence | Follow-up |',
      '| --- | --- | --- | --- | --- | --- |',
      '',
      '## Closure Gate',
      '- [ ] No stale current-facing docs remain unclassified.',
      '- [ ] No workflow pins remain unclassified.'
    ].join('\n')
  );
}

function quoteTemplateForWorkpad(templateContent) {
  return templateContent
    .split(/\r?\n/u)
    .map((line) => `> ${line}`)
    .join('\n');
}

function buildCreateFollowUpPacket({ candidate, sourceIssueId, currentCo, upstreamTruth }) {
  const version = candidate.version;
  const canonicalOwnerKey = `${RELEASE_INTAKE_OWNER_PREFIX}${version}`;
  const marker = `codex-orchestrator:canonical-owner-key=${canonicalOwnerKey}`;
  const templateContent = releaseTemplateContent(currentCo);
  const description = [
    `## Context`,
    ``,
    `Automated upstream Codex CLI release detection found a new stable candidate: \`${version}\`.`,
    ``,
    `- Canonical owner marker: \`${marker}\``,
    ``,
    `## Upstream Truth`,
    ``,
    `- GitHub release: \`${upstreamTruth.github.stable.tag}\` published \`${upstreamTruth.github.stable.published_at ?? 'unknown'}\`.`,
    `- npm latest: \`${upstreamTruth.npm.latest.version}\` published \`${upstreamTruth.npm.latest.published_at ?? 'unknown'}\`.`,
    `- npm dist-tags: \`${JSON.stringify(upstreamTruth.npm.dist_tags)}\`.`,
    ``,
    `## Current CO Posture`,
    ``,
    `- Last audited version: \`${currentCo.policy.last_audited_version ?? 'unknown'}\`.`,
    `- Release-facing target: \`${currentCo.policy.release_facing_target ?? 'unknown'}\`.`,
    `- Cloud candidate: \`${currentCo.policy.cloud_execution_candidate ?? 'unknown'}\`.`,
    `- Workflow/test install pins: \`${currentCo.distinct_install_pins.join(', ') || 'none'}\`.`,
    ``,
    `## CO-386 Release-Intake Checklist`,
    ``,
    `Source template: \`${RELEASE_INTAKE_TEMPLATE_PATH}\`.`,
    ``,
    templateContent
  ].join('\n');
  const intentChecksum = [
    `Protected terms: upstream Codex CLI release detection, canonical release-intake triggering, GitHub release truth, npm @openai/codex dist-tags/time, CO version-policy target, workflow pins, one canonical Linear intake issue, CO-386 release-intake template, candidate ${version}.`,
    `Reject wrong interpretations: do not promote Codex CLI ${version} automatically; do not create one issue per surface; do not skip cloud/model/docs evidence; do not duplicate an existing canonical release-intake owner.`
  ].join('\n');
  const nonGoals = [
    `Do not promote Codex CLI versions or change workflow pins by detection alone.`,
    `Do not run adoption canaries as part of detection.`,
    `Do not replace the CO-386 release-intake structure, CO-387 posture enforcement, or CO-388 stale-checkout visibility.`
  ].join('\n');
  const notDoneIf = [
    `GitHub release truth and npm dist-tags disagree without a fail-closed state.`,
    `The issue omits any CO-386 release evidence axis or supersedes/holds matrix row.`,
    `Workflow pins or current-facing docs remain unclassified at closeout.`,
    `A duplicate release-intake issue exists for canonical owner key ${canonicalOwnerKey}.`
  ].join('\n');
  const acceptanceCriteria = [
    `- [ ] Fill every CO-386 release evidence axis for Codex CLI ${version}.`,
    `- [ ] Record GitHub release truth and npm @openai/codex dist-tags/time.`,
    `- [ ] Compare local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes.`,
    `- [ ] Complete the supersedes/holds matrix for prior release evidence and posture surfaces.`,
    `- [ ] Close out with adopt/latest, intentionally-hold, and demote/archive-only classifications.`
  ].join('\n');
  const workpadBody = [
    `## Codex Workpad`,
    ``,
    `### Environment / Workspace Stamp`,
    `Created or refreshed by the CO-390 upstream Codex CLI release detector from source issue \`${sourceIssueId}\`. Candidate stable release: \`${version}\`.`,
    ``,
    `### Plan`,
    `Run the canonical CO-386 release-intake workflow for \`${version}\`, preserving local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, release notes, supersession, and closeout classifications.`,
    ``,
    `### Acceptance Criteria`,
    acceptanceCriteria,
    ``,
    `### Validation`,
    `- [ ] GitHub release truth and npm dist-tags/time captured.`,
    `- [ ] Current CO pins/posture captured before any promotion decision.`,
    `- [ ] CO-386 closure gate satisfied before Done.`,
    ``,
    `### Notes`,
    `Canonical owner key: \`${canonicalOwnerKey}\`. Detector mutation path must reuse this workpad/issue instead of creating duplicates.`,
    ``,
    `CO-386 template content copied from \`${RELEASE_INTAKE_TEMPLATE_PATH}\`:`,
    ``,
    quoteTemplateForWorkpad(templateContent)
  ].join('\n');
  return {
    title: `CO: Codex CLI ${version} release-intake and posture audit`,
    description,
    intentChecksum,
    nonGoals,
    notDoneIf,
    acceptanceCriteria,
    canonicalOwnerKey,
    workpadBody
  };
}

function parseLinearIssueFromResult(result) {
  const issue = result.follow_up_issue ?? result.selected_issue ?? result.created_issue ?? result.issue ?? null;
  return {
    id: issue?.id ?? result.issue_id ?? result.id ?? null,
    identifier: issue?.identifier ?? result.identifier ?? null,
    url: issue?.url ?? result.url ?? null
  };
}

function parseLinearJson(stdout, stderr, commandName) {
  try {
    return JSON.parse(stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stdoutSnippet = String(stdout ?? '').slice(0, 200);
    const stderrSnippet = String(stderr ?? '').slice(0, 200);
    throw new Error(`${commandName} returned invalid JSON: ${message}; stdout=${stdoutSnippet}; stderr=${stderrSnippet}`);
  }
}

export function defaultLinearRunner({ nodePath = process.execPath, scriptPath = join(process.cwd(), 'dist/bin/codex-orchestrator.js') } = {}) {
  return async (args, options = {}) => {
    const { stdout, stderr } = await execFileAsync(nodePath, [scriptPath, 'linear', ...args], {
      cwd: options.cwd ?? process.cwd(),
      env: options.env ?? process.env,
      timeout: options.timeout ?? 120_000,
      maxBuffer: 10 * 1024 * 1024
    });
    return { stdout, stderr };
  };
}

async function writeTempFields(fields) {
  const dir = await mkdtemp(join(tmpdir(), 'codex-cli-release-detector-'));
  const paths = {};
  await Promise.all(
    Object.entries(fields).map(async ([key, value]) => {
      const path = join(dir, `${key}.md`);
      await writeFile(path, value, 'utf8');
      paths[key] = path;
    })
  );
  return { dir, paths };
}

export async function runLinearMutation({
  decision,
  upstreamTruth,
  currentCo,
  sourceIssueId,
  repoRoot,
  env = process.env,
  linearRunner = defaultLinearRunner()
}) {
  if (!decision.mutation_required) {
    return { action: 'skipped', reason: decision.no_op_reason ?? decision.blocker_reason ?? 'mutation not required' };
  }
  const packet = buildCreateFollowUpPacket({
    candidate: decision.candidate,
    sourceIssueId,
    currentCo,
    upstreamTruth
  });
  const temp = await writeTempFields({
    description: packet.description,
    intentChecksum: packet.intentChecksum,
    nonGoals: packet.nonGoals,
    notDoneIf: packet.notDoneIf,
    acceptanceCriteria: packet.acceptanceCriteria,
    workpad: packet.workpadBody
  });
  try {
    const createArgs = [
      'create-follow-up',
      '--issue-id',
      sourceIssueId,
      '--title',
      packet.title,
      '--description-file',
      temp.paths.description,
      '--intent-checksum-file',
      temp.paths.intentChecksum,
      '--non-goals-file',
      temp.paths.nonGoals,
      '--not-done-if-file',
      temp.paths.notDoneIf,
      '--acceptance-criteria-file',
      temp.paths.acceptanceCriteria,
      '--canonical-owner-key',
      packet.canonicalOwnerKey,
      '--format',
      'json'
    ];
    const createResultRaw = await linearRunner(createArgs, { cwd: repoRoot, env });
    const createResult = parseLinearJson(createResultRaw.stdout, createResultRaw.stderr, 'Linear create-follow-up');
    const selectedIssue = parseLinearIssueFromResult(createResult);
    if (!selectedIssue.id && !selectedIssue.identifier) {
      throw new Error('Linear create-follow-up did not return a selected issue id or identifier.');
    }

    const issueRef = selectedIssue.id ?? selectedIssue.identifier;
    const upsertResultRaw = await linearRunner(
      ['upsert-workpad', '--issue-id', issueRef, '--body-file', temp.paths.workpad, '--format', 'json'],
      { cwd: repoRoot, env }
    );
    const upsertResult = parseLinearJson(upsertResultRaw.stdout, upsertResultRaw.stderr, 'Linear upsert-workpad');
    return {
      action: createResult.action ?? createResult.operation ?? 'created_or_reused',
      canonical_owner_key: packet.canonicalOwnerKey,
      selected_issue: selectedIssue,
      create_follow_up: createResult,
      upsert_workpad: upsertResult
    };
  } finally {
    await rm(temp.dir, { recursive: true, force: true });
  }
}

export async function runCodexCliReleaseDetector({
  repoRoot = process.cwd(),
  artifactPath = join(process.cwd(), 'out/codex-cli-release-detection/detection.json'),
  dryRun = false,
  sourceIssueId = DEFAULT_SOURCE_ISSUE_ID,
  githubRepo = DEFAULT_GITHUB_REPO,
  npmPackage = DEFAULT_NPM_PACKAGE,
  fetchImpl = globalThis.fetch,
  readFileImpl = readFile,
  writeFileImpl = writeFile,
  mkdirImpl = mkdir,
  env = process.env,
  now = () => new Date().toISOString(),
  linearRunner = defaultLinearRunner()
} = {}) {
  let upstreamTruth;
  let currentCo;
  let decision;
  let mutationResult = { action: 'not_attempted' };
  let exitCode = 0;

  try {
    upstreamTruth = await collectUpstreamTruth({
      fetchImpl,
      githubRepo,
      npmPackage,
      githubToken: env.GITHUB_TOKEN
    });
    currentCo = await collectCurrentCoPins({ repoRoot, readFileImpl });
    decision = buildReleaseDecision({ upstreamTruth, currentCo });
    if (decision.mutation_required) {
      if (dryRun) {
        mutationResult = {
          action: 'dry_run',
          canonical_owner_key: decision.selected_issue.canonical_owner_key,
          reason: 'Dry run requested; Linear mutation skipped.'
        };
      } else if (!hasLinearAuth(env)) {
        decision = {
          ...decision,
          decision_state: 'blocked_missing_linear_auth',
          blocker_reason: 'Linear auth is required to create or refresh the canonical release-intake issue.'
        };
        mutationResult = { action: 'skipped', reason: decision.blocker_reason };
        exitCode = 2;
      } else {
        mutationResult = await runLinearMutation({
          decision,
          upstreamTruth,
          currentCo,
          sourceIssueId,
          repoRoot,
          env,
          linearRunner
        });
      }
    } else if (decision.decision_state.startsWith('blocked_')) {
      mutationResult = { action: 'skipped', reason: decision.blocker_reason };
      exitCode = 2;
    } else {
      mutationResult = { action: 'skipped', reason: decision.no_op_reason };
    }
  } catch (error) {
    exitCode = 2;
    upstreamTruth = upstreamTruth ?? null;
    currentCo = currentCo ?? null;
    decision = {
      decision_state: 'blocked_detector_error',
      candidate: null,
      selected_issue: null,
      no_op_reason: null,
      blocker_reason: error instanceof Error ? error.message : String(error),
      mutation_required: false
    };
    mutationResult = { action: 'failed', reason: decision.blocker_reason };
  }

  const artifact = {
    schema_version: 1,
    generated_at: now(),
    dry_run: dryRun,
    source_issue_id: sourceIssueId,
    decision_state: decision.decision_state,
    candidate: decision.candidate,
    upstream_truth: upstreamTruth,
    current_co: currentCo,
    last_audited_version: currentCo?.policy?.last_audited_version ?? null,
    selected_issue: mutationResult.selected_issue ?? decision.selected_issue,
    no_op_reason: decision.no_op_reason,
    blocker_reason: decision.blocker_reason,
    mutation_result: mutationResult
  };

  if (artifactPath) {
    await mkdirImpl(dirname(resolve(repoRoot, artifactPath)), { recursive: true });
    await writeFileImpl(resolve(repoRoot, artifactPath), `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  }

  return { artifact, exitCode };
}

function parseArgs(argv) {
  const parsed = {
    repoRoot: process.cwd(),
    artifactPath: 'out/codex-cli-release-detection/detection.json',
    dryRun: false,
    sourceIssueId: DEFAULT_SOURCE_ISSUE_ID,
    githubRepo: DEFAULT_GITHUB_REPO,
    npmPackage: DEFAULT_NPM_PACKAGE,
    linearNode: process.execPath,
    linearScript: process.env.CODEX_ORCHESTRATOR_LINEAR_SCRIPT ?? join(process.cwd(), 'dist/bin/codex-orchestrator.js')
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) {
        throw new Error(`Missing value for ${arg}`);
      }
      return argv[index];
    };
    if (arg === '--repo-root') parsed.repoRoot = next();
    else if (arg === '--artifact') parsed.artifactPath = next();
    else if (arg === '--dry-run') parsed.dryRun = true;
    else if (arg === '--source-issue-id') parsed.sourceIssueId = next();
    else if (arg === '--github-repo') parsed.githubRepo = next();
    else if (arg === '--npm-package') parsed.npmPackage = next();
    else if (arg === '--linear-node') parsed.linearNode = next();
    else if (arg === '--linear-script') parsed.linearScript = next();
    else if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function printHelp() {
  console.log(`Usage: node scripts/codex-cli-release-detector.mjs [options]

Options:
  --repo-root <path>       Repository root to inspect. Defaults to cwd.
  --artifact <path>        Artifact path relative to repo root. Defaults to out/codex-cli-release-detection/detection.json.
  --dry-run                Evaluate and emit artifact without Linear mutation.
  --source-issue-id <id>   Source Linear issue id for related-link creation. Defaults to CO-390 UUID.
  --github-repo <owner/repo>
  --npm-package <name>
  --linear-node <path>     Node executable for the Linear helper.
  --linear-script <path>   Built codex-orchestrator script used for Linear helper calls.
`);
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? '')) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help) {
      printHelp();
      process.exit(0);
    }
    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: args.repoRoot,
      artifactPath: args.artifactPath,
      dryRun: args.dryRun,
      sourceIssueId: args.sourceIssueId,
      githubRepo: args.githubRepo,
      npmPackage: args.npmPackage,
      linearRunner: defaultLinearRunner({ nodePath: args.linearNode, scriptPath: args.linearScript })
    });
    console.log(JSON.stringify({ decision_state: artifact.decision_state, artifact: args.artifactPath }, null, 2));
    process.exitCode = exitCode;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 2;
  }
}
