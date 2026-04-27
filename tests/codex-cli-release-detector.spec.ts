import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { load } from 'js-yaml';
import { afterEach, describe, expect, it } from 'vitest';

import { parseArgs, runCodexCliReleaseDetector } from '../scripts/codex-cli-release-detector.mjs';

const createdDirs: string[] = [];

afterEach(async () => {
  while (createdDirs.length > 0) {
    const dir = createdDirs.pop();
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

type UpstreamFixture = {
  stable: string;
  prerelease?: string | null;
};

async function writeFixtureRepo({
  releasePin = '0.125.0',
  cloudPin = '0.124.0',
  policyStable = '0.125.0',
  auditedStable = policyStable,
  extraPolicyLines = []
}: {
  releasePin?: string;
  cloudPin?: string;
  policyStable?: string;
  auditedStable?: string;
  extraPolicyLines?: string[];
} = {}): Promise<string> {
  const repo = await mkdtemp(join(tmpdir(), 'codex-cli-release-detector-'));
  createdDirs.push(repo);
  await mkdir(join(repo, 'docs', 'guides'), { recursive: true });
  await mkdir(join(repo, '.github', 'workflows'), { recursive: true });
  await mkdir(join(repo, 'tests'), { recursive: true });
  await mkdir(join(repo, '.agent', 'task', 'templates'), { recursive: true });
  await writeFile(
    join(repo, 'docs', 'guides', 'codex-version-policy.md'),
    [
      '# Codex Version Policy (CO)',
      '',
      `- Current CO-local ChatGPT-auth/appserver model posture is \`gpt-5.5\` / \`xhigh\` on Codex CLI \`${policyStable}\` when live access smoke passes.`,
      `- Current release-facing package/downstream-smoke compatibility target is Codex CLI \`${releasePin}\`.`,
      `- Current cloud execution candidate remains Codex CLI \`${cloudPin}\`.`,
      `- 2026-04-24: CO-355 audited \`rust-v${auditedStable}\` and npm \`@openai/codex@${auditedStable}\`.`,
      ...extraPolicyLines
    ].join('\n'),
    'utf8'
  );
  await writeFile(join(repo, '.github', 'workflows', 'cloud-canary.yml'), `run: npm install --global @openai/codex@${cloudPin}\n`, 'utf8');
  await writeFile(join(repo, '.github', 'workflows', 'core-lane.yml'), `run: npm install --global @openai/codex@${releasePin}\n`, 'utf8');
  await writeFile(join(repo, '.github', 'workflows', 'release.yml'), `run: npm install --global @openai/codex@${releasePin}\n`, 'utf8');
  await writeFile(
    join(repo, '.github', 'workflows', 'pack-smoke-backstop.yml'),
    `run: npm install --global @openai/codex@${releasePin}\n`,
    'utf8'
  );
  await writeFile(
    join(repo, 'tests', 'pack-smoke.spec.ts'),
    [
      `const marketplaceCodexInstallCommand = 'npm install --global @openai/codex@${releasePin}';`,
      `const cloudCanaryCodexInstallCommand = 'npm install --global @openai/codex@${cloudPin}';`
    ].join('\n'),
    'utf8'
  );
  await writeFile(
    join(repo, '.agent', 'task', 'templates', 'codex-cli-release-intake-template.md'),
    [
      '# Codex CLI Release-Intake Issue Template',
      '',
      '## Release Evidence Axes',
      '- [ ] local CLI evidence',
      '- [ ] package/downstream smoke evidence',
      '',
      '## Supersedes / Holds Matrix',
      '| Surface | Prior release evidence page or posture surface | Classification | Reason | Evidence | Follow-up |',
      '| --- | --- | --- | --- | --- | --- |',
      '',
      '## Closure Gate',
      '- [ ] No stale current-facing docs remain unclassified.',
      '- [ ] No workflow pins remain unclassified.',
      ''
    ].join('\n'),
    'utf8'
  );
  return repo;
}

function mockFetch({ stable, prerelease = null }: UpstreamFixture) {
  const githubReleases = [
    {
      tag_name: `rust-v${stable}`,
      prerelease: false,
      published_at: '2026-04-26T00:00:00Z',
      html_url: `https://github.com/openai/codex/releases/tag/rust-v${stable}`
    },
    ...(prerelease
      ? [
          {
            tag_name: `rust-v${prerelease}`,
            prerelease: true,
            published_at: '2026-04-26T01:00:00Z',
            html_url: `https://github.com/openai/codex/releases/tag/rust-v${prerelease}`
          }
        ]
      : [])
  ];
  const npmMetadata = {
    name: '@openai/codex',
    'dist-tags': {
      latest: stable,
      ...(prerelease
        ? {
            alpha: prerelease,
            'alpha-linux-x64': `${prerelease}-linux-x64`,
            'alpha-win32-x64': `${prerelease}-win32-x64`
          }
        : {})
    },
    time: {
      [stable]: '2026-04-26T00:01:00.000Z',
      ...(prerelease ? { [prerelease]: '2026-04-26T01:01:00.000Z' } : {}),
      modified: '2026-04-26T01:01:00.000Z'
    }
  };
  return async (url: string) => ({
    ok: true,
    status: 200,
    headers: {
      get(name: string) {
        const normalized = name.toLowerCase();
        if (normalized === 'x-ratelimit-remaining') return '4999';
        if (normalized === 'x-ratelimit-limit') return '5000';
        if (normalized === 'x-ratelimit-reset') return '1770000000';
        return null;
      }
    },
    async json() {
      return url.includes('api.github.com') ? githubReleases : npmMetadata;
    }
  });
}

function mismatchFetch() {
  const base = mockFetch({ stable: '0.126.0' });
  return async (url: string) => {
    const response = await base(url);
    if (!url.includes('api.github.com')) {
      return {
        ...response,
        async json() {
          return {
            name: '@openai/codex',
            'dist-tags': { latest: '0.125.0' },
            time: { '0.125.0': '2026-04-26T00:01:00.000Z', modified: '2026-04-26T00:01:00.000Z' }
          };
        }
      };
    }
    return response;
  };
}

function mismarkedGithubPrereleaseFetch() {
  const base = mockFetch({ stable: '0.125.0', prerelease: '0.126.0-alpha.2' });
  return async (url: string) => {
    const response = await base(url);
    if (url.includes('api.github.com')) {
      return {
        ...response,
        async json() {
          const releases = await response.json();
          return releases.map((release: { tag_name?: string; prerelease?: boolean }) =>
            release.tag_name?.includes('-alpha.')
              ? {
                  ...release,
                  prerelease: false
                }
              : release
          );
        }
      };
    }
    return response;
  };
}

function stalePrereleaseMismatchFetch() {
  const stable = '0.126.0';
  const githubReleases = [
    {
      tag_name: `rust-v${stable}`,
      prerelease: false,
      published_at: '2026-04-26T00:00:00Z',
      html_url: `https://github.com/openai/codex/releases/tag/rust-v${stable}`
    },
    {
      tag_name: 'rust-v0.125.0-alpha.1',
      prerelease: true,
      published_at: '2026-04-25T00:00:00Z',
      html_url: 'https://github.com/openai/codex/releases/tag/rust-v0.125.0-alpha.1'
    }
  ];
  const npmMetadata = {
    name: '@openai/codex',
    'dist-tags': { latest: stable },
    time: {
      [stable]: '2026-04-26T00:01:00.000Z',
      modified: '2026-04-26T00:01:00.000Z'
    }
  };
  return async (url: string) => ({
    ok: true,
    status: 200,
    headers: {
      get(name: string) {
        const normalized = name.toLowerCase();
        if (normalized === 'x-ratelimit-remaining') return '4999';
        if (normalized === 'x-ratelimit-limit') return '5000';
        if (normalized === 'x-ratelimit-reset') return '1770000000';
        return null;
      }
    },
    async json() {
      return url.includes('api.github.com') ? githubReleases : npmMetadata;
    }
  });
}

function paginatedGithubFetch() {
  const calls: string[] = [];
  const stable = '0.126.0';
  const prerelease = '0.127.0-alpha.100';
  const pageOne = Array.from({ length: 100 }, (_, index) => ({
    tag_name: `rust-v0.127.0-alpha.${100 - index}`,
    prerelease: true,
    published_at: `2026-04-26T01:${String(index).padStart(2, '0')}:00Z`,
    html_url: `https://github.com/openai/codex/releases/tag/rust-v0.127.0-alpha.${100 - index}`
  }));
  const pageTwo = [
    {
      tag_name: `rust-v${stable}`,
      prerelease: false,
      published_at: '2026-04-26T00:00:00Z',
      html_url: `https://github.com/openai/codex/releases/tag/rust-v${stable}`
    }
  ];
  const npmMetadata = {
    name: '@openai/codex',
    'dist-tags': {
      latest: stable,
      alpha: prerelease
    },
    time: {
      [stable]: '2026-04-26T00:01:00.000Z',
      [prerelease]: '2026-04-26T01:01:00.000Z',
      modified: '2026-04-26T01:01:00.000Z'
    }
  };
  const fetchImpl = async (url: string) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      headers: {
        get(name: string) {
          const normalized = name.toLowerCase();
          if (normalized === 'x-ratelimit-remaining') return '4999';
          if (normalized === 'x-ratelimit-limit') return '5000';
          if (normalized === 'x-ratelimit-reset') return '1770000000';
          return null;
        }
      },
      async json() {
        if (!url.includes('api.github.com')) {
          return npmMetadata;
        }
        return url.includes('page=2') ? pageTwo : pageOne;
      }
    };
  };
  return { fetchImpl, calls };
}

function laterPageHigherStableFetch() {
  const calls: string[] = [];
  const firstPageStable = '0.125.1';
  const latestStable = '0.126.0';
  const pageOne = [
    {
      tag_name: `rust-v${firstPageStable}`,
      prerelease: false,
      published_at: '2026-04-26T00:00:00Z',
      html_url: `https://github.com/openai/codex/releases/tag/rust-v${firstPageStable}`
    },
    ...Array.from({ length: 99 }, (_, index) => ({
      tag_name: `rust-v0.126.0-alpha.${99 - index}`,
      prerelease: true,
      published_at: `2026-04-26T01:${String(index).padStart(2, '0')}:00Z`,
      html_url: `https://github.com/openai/codex/releases/tag/rust-v0.126.0-alpha.${99 - index}`
    }))
  ];
  const pageTwo = [
    {
      tag_name: `rust-v${latestStable}`,
      prerelease: false,
      published_at: '2026-04-26T02:00:00Z',
      html_url: `https://github.com/openai/codex/releases/tag/rust-v${latestStable}`
    }
  ];
  const npmMetadata = {
    name: '@openai/codex',
    'dist-tags': {
      latest: latestStable
    },
    time: {
      [latestStable]: '2026-04-26T02:01:00.000Z',
      modified: '2026-04-26T02:01:00.000Z'
    }
  };
  const fetchImpl = async (url: string) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      headers: {
        get(name: string) {
          const normalized = name.toLowerCase();
          if (normalized === 'x-ratelimit-remaining') return '4999';
          if (normalized === 'x-ratelimit-limit') return '5000';
          if (normalized === 'x-ratelimit-reset') return '1770000000';
          return null;
        }
      },
      async json() {
        if (!url.includes('api.github.com')) {
          return npmMetadata;
        }
        return url.includes('page=2') ? pageTwo : pageOne;
      }
    };
  };
  return { fetchImpl, calls };
}

function stableAfterTenGithubPagesFetch() {
  const calls: string[] = [];
  const stable = '0.126.0';
  const prerelease = '0.127.0-alpha.1100';
  const npmMetadata = {
    name: '@openai/codex',
    'dist-tags': {
      latest: stable,
      alpha: prerelease
    },
    time: {
      [stable]: '2026-04-26T00:01:00.000Z',
      [prerelease]: '2026-04-26T01:01:00.000Z',
      modified: '2026-04-26T01:01:00.000Z'
    }
  };
  const fetchImpl = async (url: string) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      headers: {
        get(name: string) {
          const normalized = name.toLowerCase();
          if (normalized === 'x-ratelimit-remaining') return '4999';
          if (normalized === 'x-ratelimit-limit') return '5000';
          if (normalized === 'x-ratelimit-reset') return '1770000000';
          return null;
        }
      },
      async json() {
        if (!url.includes('api.github.com')) {
          return npmMetadata;
        }
        const pageMatch = /[?&]page=(\d+)/.exec(url);
        const page = pageMatch ? Number(pageMatch[1]) : 1;
        if (page <= 10) {
          return Array.from({ length: 100 }, (_, index) => ({
            tag_name: `rust-v0.127.0-alpha.${1100 - ((page - 1) * 100 + index)}`,
            prerelease: true,
            published_at: `2026-04-26T01:${String(index).padStart(2, '0')}:00Z`,
            html_url: `https://github.com/openai/codex/releases/tag/rust-v0.127.0-alpha.${1100 - ((page - 1) * 100 + index)}`
          }));
        }
        return [
          {
            tag_name: `rust-v${stable}`,
            prerelease: false,
            published_at: '2026-04-26T00:00:00Z',
            html_url: `https://github.com/openai/codex/releases/tag/rust-v${stable}`
          }
        ];
      }
    };
  };
  return { fetchImpl, calls };
}

function createLinearRunner(action = 'created') {
  const calls: string[][] = [];
  const descriptions: string[] = [];
  const workpads: string[] = [];
  const runner = async (args: string[]) => {
    calls.push(args);
    if (args[0] === 'create-follow-up') {
      const descriptionPath = args[args.indexOf('--description-file') + 1];
      descriptions.push(await readFile(descriptionPath, 'utf8'));
      return {
        stdout: JSON.stringify({
          ok: true,
          action,
          issue: {
            id: 'source-linear-id',
            identifier: 'CO-390',
            url: 'https://linear.app/asabeko/issue/CO-390'
          },
          follow_up_issue: {
            id: action === 'reused' ? 'existing-linear-id' : 'created-linear-id',
            identifier: action === 'reused' ? 'CO-401' : 'CO-400',
            url: action === 'reused'
              ? 'https://linear.app/asabeko/issue/CO-401'
              : 'https://linear.app/asabeko/issue/CO-400'
          }
        }),
        stderr: ''
      };
    }
    if (args[0] === 'upsert-workpad') {
      const bodyPath = args[args.indexOf('--body-file') + 1];
      workpads.push(await readFile(bodyPath, 'utf8'));
      return { stdout: JSON.stringify({ ok: true, action: 'updated' }), stderr: '' };
    }
    throw new Error(`unexpected linear command: ${args.join(' ')}`);
  };
  return { runner, calls, descriptions, workpads };
}

describe('codex CLI release detector', () => {
  it('no-ops when the latest stable release is already represented', async () => {
    const repo = await writeFixtureRepo();

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.125.0' }),
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('no_new_audit_required');
    expect(artifact.no_op_reason).toContain('0.125.0');
    expect(artifact.mutation_result.action).toBe('skipped');
  });

  it('creates one canonical intake for a new stable release', async () => {
    const repo = await writeFixtureRepo();
    const { runner, calls, descriptions, workpads } = createLinearRunner('created');

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.126.0' }),
      env: { CO_LINEAR_API_TOKEN: 'test-token' },
      linearRunner: runner
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('new_audit_required');
    expect(artifact.mutation_result.action).toBe('created');
    expect(artifact.mutation_result.selected_issue.id).toBe('created-linear-id');
    expect(calls.filter((args) => args[0] === 'create-follow-up')).toHaveLength(1);
    expect(calls.filter((args) => args[0] === 'upsert-workpad')).toHaveLength(1);
    expect(calls.some((args) => args[0] === 'upsert-workpad' && args.includes('created-linear-id'))).toBe(true);
    expect(descriptions[0]).toContain('## CO-386 Release-Intake Checklist');
    expect(descriptions[0]).toContain('## Supersedes / Holds Matrix');
    expect(descriptions[0]).toContain('## Closure Gate');
    expect(workpads[0]).toContain('CO-386 template content copied from');
    expect(workpads[0]).toContain('> ## Supersedes / Holds Matrix');
    expect(workpads[0]).toContain('> ## Closure Gate');
  });

  it('records prerelease-only movement without Linear mutation', async () => {
    const repo = await writeFixtureRepo();

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.125.0', prerelease: '0.126.0-alpha.2' }),
      env: { LINEAR_API_KEY: 'test-token' }
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('prerelease_observed');
    expect(artifact.candidate.version).toBe('0.126.0-alpha.2');
    expect(artifact.mutation_result.action).toBe('skipped');
  });

  it('treats semver prerelease GitHub tags as prerelease truth even when the flag is false', async () => {
    const repo = await writeFixtureRepo();

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mismarkedGithubPrereleaseFetch(),
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('prerelease_observed');
    expect(artifact.upstream_truth.github.stable.version).toBe('0.125.0');
    expect(artifact.upstream_truth.github.prerelease.version).toBe('0.126.0-alpha.2');
  });

  it('ignores draft GitHub releases when classifying stable truth', async () => {
    const repo = await writeFixtureRepo({ auditedStable: '0.125.0' });
    const baseFetch = mockFetch({ stable: '0.125.0' });
    const draftFetch = async (url: string) => {
      const response = await baseFetch(url);
      if (!url.includes('api.github.com')) {
        return response;
      }
      return {
        ...response,
        async json() {
          const releases = await response.json();
          return [
            {
              tag_name: 'rust-v0.126.0',
              draft: true,
              prerelease: false,
              published_at: '2026-04-26T02:00:00Z',
              html_url: 'https://github.com/openai/codex/releases/tag/rust-v0.126.0'
            },
            ...releases
          ];
        }
      };
    };

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: draftFetch,
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('no_new_audit_required');
    expect(artifact.upstream_truth.github.stable.version).toBe('0.125.0');
    expect(artifact.upstream_truth.github.releases.some((release: { version: string }) => release.version === '0.126.0')).toBe(false);
  });

  it('ignores stale historical prerelease mismatches when stable truth agrees', async () => {
    const repo = await writeFixtureRepo({
      releasePin: '0.126.0',
      cloudPin: '0.126.0',
      policyStable: '0.126.0',
      auditedStable: '0.126.0'
    });

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: stalePrereleaseMismatchFetch(),
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('no_new_audit_required');
    expect(artifact.upstream_truth.github.prerelease.version).toBe('0.125.0-alpha.1');
    expect(artifact.upstream_truth.npm.prerelease).toBeNull();
  });

  it('refreshes an existing canonical owner instead of creating duplicate issue truth', async () => {
    const repo = await writeFixtureRepo();
    const { runner, calls } = createLinearRunner('reused');

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.126.0' }),
      env: { LINEAR_API_KEY: 'test-token' },
      linearRunner: runner
    });

    expect(exitCode).toBe(0);
    expect(artifact.mutation_result.action).toBe('reused');
    expect(artifact.mutation_result.selected_issue.id).toBe('existing-linear-id');
    expect(calls.some((args) => args[0] === 'upsert-workpad' && args.includes('existing-linear-id'))).toBe(true);
  });

  it('keeps stale split pins visible in the artifact when a newer stable requires intake', async () => {
    const repo = await writeFixtureRepo({ releasePin: '0.125.0', cloudPin: '0.124.0' });

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.126.0' }),
      dryRun: true,
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('new_audit_required');
    expect(artifact.current_co.split_pin_versions).toBe(true);
    expect(artifact.current_co.distinct_install_pins).toEqual(['0.124.0', '0.125.0']);
    expect(artifact.mutation_result.action).toBe('dry_run');
  });

  it('fails closed when a required test pin surface has no versioned pin', async () => {
    const repo = await writeFixtureRepo();
    await writeFile(
      join(repo, 'tests', 'pack-smoke.spec.ts'),
      "const marketplaceCodexInstallCommand = 'npm install --global other-package';\n",
      'utf8'
    );

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.125.0' }),
      env: {}
    });

    expect(exitCode).toBe(2);
    expect(artifact.decision_state).toBe('blocked_current_truth_unavailable');
    expect(artifact.blocker_reason).toContain('tests/pack-smoke.spec.ts');
    expect(artifact.current_co.missing_surfaces).toContainEqual({
      path: 'tests/pack-smoke.spec.ts',
      error: 'missing versioned @openai/codex install pin'
    });
  });

  it('fails closed when a required pin surface also has an unversioned install', async () => {
    const repo = await writeFixtureRepo();
    await writeFile(
      join(repo, 'tests', 'pack-smoke.spec.ts'),
      [
        "const marketplaceCodexInstallCommand = 'npm install --global @openai/codex@0.125.0';",
        "const driftProneCodexInstallCommand = 'npm install --global @openai/codex';"
      ].join('\n'),
      'utf8'
    );

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.125.0' }),
      env: {}
    });

    expect(exitCode).toBe(2);
    expect(artifact.decision_state).toBe('blocked_current_truth_unavailable');
    expect(artifact.current_co.missing_surfaces).toContainEqual({
      path: 'tests/pack-smoke.spec.ts',
      error: 'found unversioned @openai/codex install pin'
    });
  });

  it('fails closed when a required pin surface uses an unversioned npm install alias', async () => {
    const repo = await writeFixtureRepo();
    await writeFile(
      join(repo, 'tests', 'pack-smoke.spec.ts'),
      [
        "const marketplaceCodexInstallCommand = 'npm i -g @openai/codex@0.125.0';",
        "const driftProneCodexInstallCommand = 'npm i -g @openai/codex';"
      ].join('\n'),
      'utf8'
    );

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.125.0' }),
      env: {}
    });

    expect(exitCode).toBe(2);
    expect(artifact.decision_state).toBe('blocked_current_truth_unavailable');
    expect(artifact.current_co.missing_surfaces).toContainEqual({
      path: 'tests/pack-smoke.spec.ts',
      error: 'found unversioned @openai/codex install pin'
    });
  });

  it('accepts versioned npm install aliases as required pins', async () => {
    const repo = await writeFixtureRepo();
    await writeFile(
      join(repo, 'tests', 'pack-smoke.spec.ts'),
      [
        "const marketplaceCodexInstallCommand = 'npm i -g @openai/codex@0.125.0';",
        "const cloudCanaryCodexInstallCommand = 'npm add --global @openai/codex@0.124.0';"
      ].join('\n'),
      'utf8'
    );

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.125.0' }),
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.current_co.missing_surfaces).toEqual([]);
    expect(artifact.current_co.install_pins).toEqual(
      expect.arrayContaining([
        { path: 'tests/pack-smoke.spec.ts', version: '0.125.0' },
        { path: 'tests/pack-smoke.spec.ts', version: '0.124.0' }
      ])
    );
  });

  it('defaults the Linear helper script to the inspected repo root', () => {
    const priorLinearScript = process.env.CODEX_ORCHESTRATOR_LINEAR_SCRIPT;
    delete process.env.CODEX_ORCHESTRATOR_LINEAR_SCRIPT;
    try {
      const args = parseArgs(['--repo-root', '/tmp/co-release-detector']);
      expect(args.linearScript).toBe('/tmp/co-release-detector/dist/bin/codex-orchestrator.js');
    } finally {
      if (priorLinearScript === undefined) {
        delete process.env.CODEX_ORCHESTRATOR_LINEAR_SCRIPT;
      } else {
        process.env.CODEX_ORCHESTRATOR_LINEAR_SCRIPT = priorLinearScript;
      }
    }
  });

  it('accepts complete GitHub truth when the successful response consumes the last rate-limit quota', async () => {
    const repo = await writeFixtureRepo({ auditedStable: '0.125.0' });
    const baseFetch = mockFetch({ stable: '0.126.0' });
    const zeroRemainingFetch = async (url: string) => {
      const response = await baseFetch(url);
      if (!url.includes('api.github.com')) {
        return response;
      }
      return {
        ...response,
        headers: {
          get(name: string) {
            const normalized = name.toLowerCase();
            if (normalized === 'x-ratelimit-remaining') return '0';
            if (normalized === 'x-ratelimit-limit') return '5000';
            if (normalized === 'x-ratelimit-reset') return '1770000000';
            return null;
          }
        }
      };
    };

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: zeroRemainingFetch,
      dryRun: true,
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('new_audit_required');
    expect(artifact.upstream_truth.github.rate_limit).toMatchObject({
      remaining: 0,
      uncertain: false
    });
  });

  it('derives the last audited version from explicit audit evidence only', async () => {
    const repo = await writeFixtureRepo({
      releasePin: '0.126.0',
      cloudPin: '0.126.0',
      policyStable: '0.126.0',
      auditedStable: '0.125.0'
    });

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.126.0' }),
      dryRun: true,
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('new_audit_required');
    expect(artifact.current_co.policy.last_audited_version).toBe('0.125.0');
    expect(artifact.mutation_result.action).toBe('dry_run');
  });

  it('ignores control-seam-only Codex CLI audits when deriving release-intake coverage', async () => {
    const repo = await writeFixtureRepo({
      releasePin: '0.126.0',
      cloudPin: '0.126.0',
      policyStable: '0.126.0',
      auditedStable: '0.125.0',
      extraPolicyLines: [
        '- 2026-04-24: CO-351 audited Codex CLI `0.126.0` app-server control-seam surfaces without release-intake closeout.'
      ]
    });

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.126.0' }),
      dryRun: true,
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('new_audit_required');
    expect(artifact.current_co.policy.last_audited_version).toBe('0.125.0');
    expect(artifact.mutation_result.action).toBe('dry_run');
  });

  it('paginates GitHub releases until the latest stable release is found', async () => {
    const repo = await writeFixtureRepo();
    const { fetchImpl, calls } = paginatedGithubFetch();

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl,
      dryRun: true,
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('new_audit_required');
    expect(artifact.upstream_truth.github.stable.version).toBe('0.126.0');
    expect(calls.some((url) => url.includes('page=2'))).toBe(true);
  });

  it('continues GitHub pagination when the first page already has a lower stable release', async () => {
    const repo = await writeFixtureRepo();
    const { fetchImpl, calls } = laterPageHigherStableFetch();

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl,
      dryRun: true,
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('new_audit_required');
    expect(artifact.upstream_truth.github.stable.version).toBe('0.126.0');
    expect(calls.some((url) => url.includes('page=2'))).toBe(true);
  });

  it('continues GitHub pagination beyond ten full prerelease pages', async () => {
    const repo = await writeFixtureRepo();
    const { fetchImpl, calls } = stableAfterTenGithubPagesFetch();

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl,
      dryRun: true,
      env: {}
    });

    expect(exitCode).toBe(0);
    expect(artifact.decision_state).toBe('new_audit_required');
    expect(artifact.upstream_truth.github.stable.version).toBe('0.126.0');
    expect(calls.some((url) => url.includes('page=11'))).toBe(true);
  });

  it('fails closed when Linear auth is missing for a required mutation', async () => {
    const repo = await writeFixtureRepo();

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.126.0' }),
      env: {}
    });

    expect(exitCode).toBe(2);
    expect(artifact.decision_state).toBe('blocked_missing_linear_auth');
    expect(artifact.mutation_result.action).toBe('skipped');
  });

  it('passes the canonical owner key to the helper for duplicate prevention', async () => {
    const repo = await writeFixtureRepo();
    const { runner, calls, descriptions } = createLinearRunner('reused');

    await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.126.0' }),
      env: { LINEAR_API_KEY: 'test-token' },
      linearRunner: runner
    });

    const createCall = calls.find((args) => args[0] === 'create-follow-up');
    expect(createCall).toBeTruthy();
    expect(createCall).toContain('--canonical-owner-key');
    expect(createCall).toContain('codex-cli-release-intake:stable:0.126.0');
    expect(descriptions[0]).toContain('- Canonical owner marker: `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.126.0`');
  });

  it('fails closed on GitHub and npm stable mismatch', async () => {
    const repo = await writeFixtureRepo();

    const { artifact, exitCode } = await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mismatchFetch(),
      env: { LINEAR_API_KEY: 'test-token' }
    });

    expect(exitCode).toBe(2);
    expect(artifact.decision_state).toBe('blocked_upstream_mismatch');
    expect(artifact.blocker_reason).toContain('does not match');
  });

  it('writes a machine-readable artifact with decision and mutation result', async () => {
    const repo = await writeFixtureRepo();

    await runCodexCliReleaseDetector({
      repoRoot: repo,
      artifactPath: 'out/detection.json',
      fetchImpl: mockFetch({ stable: '0.125.0' }),
      env: {}
    });

    const artifact = JSON.parse(await readFile(join(repo, 'out', 'detection.json'), 'utf8'));
    expect(artifact).toMatchObject({
      schema_version: 1,
      decision_state: 'no_new_audit_required',
      current_co: { policy: { last_audited_version: '0.125.0' } },
      mutation_result: { action: 'skipped' }
    });
  });

  it('wires the detector workflow for schedule and manual dry-run dispatch', async () => {
    const workflow = load(await readFile('.github/workflows/codex-cli-release-detector.yml', 'utf8')) as {
      on?: {
        schedule?: Array<{ cron: string }>;
        workflow_dispatch?: { inputs?: Record<string, { type?: string; default?: boolean }> };
      };
      jobs?: Record<string, { steps?: Array<{ name?: string; env?: Record<string, string>; run?: string }> }>;
      concurrency?: { group?: string; 'cancel-in-progress'?: boolean };
    };

    expect(workflow.on?.schedule?.[0]?.cron).toBe('37 8 * * *');
    expect(workflow.on?.workflow_dispatch?.inputs?.dry_run).toMatchObject({
      type: 'boolean',
      default: false
    });
    expect(workflow.concurrency).toMatchObject({
      group: 'codex-cli-release-detector',
      'cancel-in-progress': false
    });
    const detectStep = workflow.jobs?.detect?.steps?.find((step) => step.name === 'Detect upstream release truth');
    expect(detectStep?.env).toMatchObject({
      GITHUB_TOKEN: '${{ github.token }}',
      LINEAR_API_KEY: '${{ secrets.LINEAR_API_KEY }}'
    });
    expect(detectStep?.run).toContain('npm run codex:release-detect');
    expect(detectStep?.run).toContain('--source-issue-id b7074b86-3d38-4dfe-baa9-73b2cc8d686f');
    expect(detectStep?.run).toContain('--dry-run');
  });
});
