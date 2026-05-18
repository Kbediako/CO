import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewExecutionState } from '../scripts/lib/review-execution-state.js';
import {
  formatReviewOutcomeSummary,
  getEnforceContractReviewFailureReason,
  logReviewTelemetrySummary,
  writeReviewExecutionTelemetry
} from '../scripts/lib/review-execution-telemetry.js';

const createdSandboxes: string[] = [];
const THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE =
  'codex_core::session: failed to record rollout items: thread 019de1d2-3b27-7193-8330-0ed726e28044 not found';
const WARN_THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE = `warn ${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}`;
const CO474_REVIEW_OUTPUT_FIXTURE = new URL('./fixtures/review-execution/co474-review-output-with-findings.log', import.meta.url);

type WriteTelemetryOptions = Parameters<typeof writeReviewExecutionTelemetry>[0];
type TelemetryFixtureOptions = Partial<Pick<WriteTelemetryOptions, 'status' | 'terminationBoundary' | 'error' | 'includeRawTelemetry' | 'logPersistFailure' | 'launchContext' | 'contractMode' | 'contractPath'>> & {
  outputName?: string; state?: ReviewExecutionState; telemetryName?: string;
};

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-execution-telemetry-'));
  createdSandboxes.push(sandbox);
  return sandbox;
}

async function writeTelemetryForOutput(sandbox: string, outputText: string, options: TelemetryFixtureOptions = {}) {
  const reviewDir = join(sandbox, 'review');
  await mkdir(reviewDir, { recursive: true });
  const outputLogPath = join(reviewDir, options.outputName ?? 'output.log');
  await writeFile(outputLogPath, outputText, 'utf8');
  const telemetryOptions: WriteTelemetryOptions = {
    state: options.state ?? new ReviewExecutionState({ repoRoot: sandbox }),
    status: options.status ?? 'succeeded',
    error: options.error,
    outputLogPath,
    repoRoot: sandbox,
    telemetryPath: join(reviewDir, options.telemetryName ?? 'telemetry.json'),
    includeRawTelemetry: options.includeRawTelemetry ?? false,
    telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
    launchContext: options.launchContext,
    contractMode: options.contractMode,
    contractPath: options.contractPath,
    logPersistFailure: options.logPersistFailure
  };
  if (Object.prototype.hasOwnProperty.call(options, 'terminationBoundary')) {
    telemetryOptions.terminationBoundary = options.terminationBoundary;
  }
  return writeReviewExecutionTelemetry(telemetryOptions);
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    createdSandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true }))
  );
});

async function writeContractEvidence(
  sandbox: string,
  repoPath: string,
  content: string
): Promise<{ path: string; sha256: string }> {
  const absolutePath = join(sandbox, repoPath);
  await mkdir(join(absolutePath, '..'), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
  return {
    path: repoPath,
    sha256: createHash('sha256').update(content).digest('hex')
  };
}

function buildTelemetryCleanContract(evidence: { path: string; sha256: string }) {
  const axis = (summary: string) => ({
    verdict: 'clean' as const,
    summary,
    clean_signal: summary,
    evidence_refs: [evidence],
    findings: []
  });
  return {
    schema_version: 'co.review.contract.v1',
    generated_at: '2026-05-14T00:00:00.000Z',
    overall_verdict: 'clean' as const,
    axes: {
      spec_conformance: axis('Spec checked.'),
      coding_standards: axis('Standards checked.'),
      code_changes: axis('Code checked.'),
      agent_loop: axis('Loop checked.')
    },
    code_change_proposals: [],
    agent_loop_proposals: []
  };
}

function structuredOutputLaunchContext(): NonNullable<WriteTelemetryOptions['launchContext']> {
  return {
    scope_flag_mode: null,
    prompt_delivery: 'stdin',
    reviewer_visible_context_transport: 'stdin-prompt',
    reviewer_visible_title_source: null,
    transport: 'codex-exec-output-schema',
    output_schema_path: 'review/review-contract-output.schema.json',
    output_last_message_path: 'review/last-message.json'
  };
}

describe('review-execution-telemetry', () => {
  it('persists success telemetry built from the provided state helper', async () => {
    const sandbox = await makeSandbox();
    const payload = await writeTelemetryForOutput(sandbox, '');

    expect(payload).not.toBeNull();
    expect(payload?.status).toBe('succeeded');
    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
    expect(payload?.termination_boundary).toBeNull();
    await expect(readFile(join(sandbox, 'review', 'telemetry.json'), 'utf8')).resolves.toContain('"status": "succeeded"');
  });

  it('persists clean semantic review verdicts separately from wrapper execution state', async () => {
    const cleanOutputs = ['I found no actionable issues in the uncommitted diff.', 'Read-only inspection of the uncommitted diff found no actionable correctness issues.', 'Read-only diff inspection found no actionable correctness regressions in the changed telemetry parser.', 'No actionable issues.', 'No actionable correctness regressions.', 'I did not identify a discrete regression.', 'I did not find a concrete regression in the changed telemetry parser.', 'The diff stays focused. I did not find a concrete regression in the changed area or an introduced mismatch.', JSON.stringify({ review_verdict: 'clean', highest_finding_priority: null, finding_count: 0 })];

    for (const cleanOutput of cleanOutputs) {
      const sandbox = await makeSandbox();
      const payload = await writeTelemetryForOutput(sandbox, `${cleanOutput}\n`);

      expect(payload?.review_outcome).toBe('clean-success');
      expect(payload?.review_verdict).toBe('clean');
      expect(payload?.highest_finding_priority).toBeNull();
      expect(payload?.finding_count).toBe(0);
    }
  });

  it.each(
    [
      'No actionable defects were found in the changed telemetry parser.',
      'No actionable defect was found in the changed telemetry parser.',
      'No concrete correctness regressions were found in the changed telemetry parser.',
      'No concrete correctness regression was found in the changed telemetry parser.',
      'No actionable defects were found in scripts/lib/review-execution-telemetry.ts.',
      'No concrete correctness regressions were found in tests/review-execution-telemetry.spec.ts:91.',
      'No actionable defects were found in .agent/task/linear-1e25073c-5587-4732-89ec-e27e5d167747.md.',
      'No concrete correctness regressions were found in ./scripts/lib/review-execution-telemetry.ts.',
      'No actionable defects were found in docs/exception-handling.md.',
      'No actionable defects were found in tests/exceptions/foo.ts.',
      'No actionable defects were found in exception-handler.ts.',
      'Read-only inspection of the uncommitted diff did not identify actionable regressions in the telemetry parser changes or focused tests.'
    ]
  )('recognizes CO-492 clean semantic review wording: %s', async (cleanOutput) => {
    const sandbox = await makeSandbox();
    const payload = await writeTelemetryForOutput(sandbox, `${cleanOutput}\n`);

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('clean');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);
  });

  it.each([
    {
      name: 'keeps P-prioritized findings ahead of clean wording',
      output: [
        'No actionable defects were found in the broad review summary.',
        '- [P1] Clean-looking wording must not hide an actionable parser finding'
      ].join('\n'),
      expectedVerdict: 'findings',
      expectedPriority: 'P1',
      expectedCount: 1
    },
    {
      name: 'keeps structured findings ahead of clean wording',
      output: `${JSON.stringify({
        review_verdict: 'clean',
        summary: 'No concrete correctness regressions were found in the broad review summary.',
        findings: [
          {
            title: '[P2] Structured findings still take precedence',
            priority: 2
          }
        ]
      })}\n`,
      expectedVerdict: 'findings',
      expectedPriority: 'P2',
      expectedCount: 1
    },
    {
      name: 'keeps explicit actionable defect prose ahead of clean wording',
      output: [
        'No actionable defects were found in the broad review summary.',
        'Actionable defect: clean wording must not hide natural-language defect prose'
      ].join('\n'),
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps same-line actionable defect prose ahead of clean wording',
      output: 'No actionable defects were found in the parser. Actionable defect: it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps same-line actionable defects prose ahead of clean wording',
      output: 'No concrete correctness regressions were found in the parser. Actionable defects: it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'preserves inline priorities in actionable defect summaries',
      output: 'Actionable defect: [P1] It drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: 'P1',
      expectedCount: 1
    },
    {
      name: 'preserves inline priorities in neutral-prefixed actionable defect summaries',
      output: 'Summary: Actionable defects: [P1] It drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: 'P1',
      expectedCount: 1
    },
    {
      name: 'keeps neutral-prefixed actionable defect prose as findings',
      output: 'Final verdict: Actionable defects: it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps split actionable defect prose as findings',
      output: 'Actionable defects:\nThe parser drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'preserves priorities in split actionable defect prose',
      output: 'Actionable defects:\n- [P1] The parser drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: 'P1',
      expectedCount: 1
    },
    {
      name: 'preserves priorities in split actionable defect summary bodies',
      output: 'Actionable defects:\nSummary: [P1] The parser drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: 'P1',
      expectedCount: 1
    },
    {
      name: 'keeps multiple split actionable defect bullets as findings',
      output: 'Actionable defects:\n- cache corrupts output\n- parser drops errors\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 2
    },
    {
      name: 'keeps split actionable defect bullets after blank section spacing as findings',
      output: 'Actionable defects:\n\n- cache corrupts output\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'skips bare nested summary headings before split actionable defect bodies',
      output: 'Actionable defects:\nSummary:\n[P1] The parser drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: 'P1',
      expectedCount: 1
    },
    {
      name: 'skips bare nested findings headings before split actionable defect bodies',
      output: 'Actionable defects:\nFindings:\nThe parser drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'leaves empty split actionable section before recommendation heading unknown without findings',
      output: 'Actionable defects:\nRecommendations:\nNo changes.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves empty split actionable section before recommendation body unknown without findings',
      output: 'Actionable defects:\nRecommendations: consider refactoring.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps Markdown-wrapped actionable defect labels as findings',
      output: '**Actionable defects:** it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'preserves priorities in Markdown-wrapped actionable defect labels',
      output: '**Actionable defects:** [P1] it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: 'P1',
      expectedCount: 1
    },
    {
      name: 'preserves Markdown-wrapped inline priorities in actionable defect summaries',
      output: 'Actionable defects: **[P1]** it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: 'P1',
      expectedCount: 1
    },
    {
      name: 'keeps Markdown heading actionable defect labels as findings',
      output: '### Actionable defects: it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps semicolon-separated actionable defect prose ahead of clean wording',
      output: 'No actionable defects were found in the parser; actionable defect: it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps comma-separated actionable defect prose ahead of clean wording',
      output: 'No actionable defects were found in the parser, actionable defect: it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps unsafe comma-separated no-op actionable defect labels as findings',
      output: 'The parser drops errors, actionable defects: none found.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps unsafe semicolon-separated no-op actionable defect labels as findings',
      output: 'The parser drops errors; actionable defects: none found.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps comma-spliced defect clauses in no-op actionable defect summaries as findings',
      output: 'Actionable defects: No actionable defects were found in the parser, it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps colon-spliced defect clauses in no-op actionable defect summaries as findings',
      output: 'Actionable defects: No actionable defects were found in the parser: it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps dash-spliced defect clauses in no-op actionable defect summaries as findings',
      output: 'Actionable defects: No actionable defects were found in the parser - it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps coordinated defect clauses in no-op actionable defect summaries as findings',
      output: 'Actionable defects: No actionable defects were found in the parser and it corrupts output.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps relative defect clauses in no-op actionable defect summaries as findings',
      output: 'Actionable defects: No actionable defects were found in the parser where it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps unsafe state clauses in no-op actionable defect summaries as findings',
      output: 'Actionable defects: No actionable defects were found in the parser which is incorrect.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'recognizes clean-prefixed comma-separated no-op actionable defect labels',
      output: 'I found no actionable issues in the parser, actionable defects: none found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes numbered no-op actionable defect labels',
      output: '1. Actionable defects: none found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes Markdown-wrapped no-op actionable defect labels',
      output: '**Actionable defects:** none found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes Markdown heading no-op actionable defect labels',
      output: '### Actionable defects: none found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes there-are-no no-op actionable defect labels',
      output: 'Actionable defects: There are no actionable defects.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes no-defects-found no-op actionable defect labels',
      output: 'Actionable defects: No defects found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes split no-issues-found no-op actionable defect labels',
      output: 'Actionable defects:\nNo issues found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes numbered no-op actionable defect labels with dotted paths and validation notes',
      output: '2) Actionable defects: none found in scripts/lib/foo.ts. Tests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes numbered clean verdicts',
      output: '1. No actionable defects were found in the parser.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes detected actionable defect clean wording',
      output: 'No actionable defects detected.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes seen actionable defect clean wording',
      output: 'No actionable defects seen.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes numbered clean-prefixed comma-separated no-op actionable defect labels',
      output: '1. I found no actionable issues in the parser, actionable defects: none found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps numbered unsafe comma-separated no-op actionable defect labels as findings',
      output: '1. The parser drops errors, actionable defects: none found.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'ignores no-op actionable defect summaries',
      output: [
        'No actionable defects were found in the broad review summary.',
        'Actionable defects: none found'
      ].join('\n'),
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'ignores was/were no-op actionable defect summaries',
      output: [
        'No actionable defects were found in the broad review summary.',
        'Actionable defects: none were found'
      ].join('\n'),
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'ignores scoped no-op actionable defect summaries',
      output: [
        'No actionable defects were found in the broad review summary.',
        'Actionable defects: none found in the diff'
      ].join('\n'),
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'ignores dotted-path scoped no-op actionable defect summaries',
      output: [
        'No actionable defects were found in the broad review summary.',
        'Actionable defects: none found in scripts/lib/review-execution-telemetry.ts.'
      ].join('\n'),
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'ignores no-op actionable defect summaries with validation-only notes',
      output: [
        'No actionable defects were found in the broad review summary.',
        'Actionable defects: none found; validation was not run'
      ].join('\n'),
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes standalone no-op actionable defect summaries with validation-only notes',
      output: 'Actionable defects: none found; validation was not run\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes period-separated no-op actionable defect summaries with validation-only notes',
      output: 'Actionable defects: none found. I did not run tests.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes no-op actionable defect summaries with tests-not-run shorthand',
      output: 'Actionable defects: none found. Tests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes no-op actionable defect summaries with no-tests-run shorthand',
      output: 'Actionable defects: none found; no tests run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes no-op actionable defect summaries with parenthesized validation-only notes',
      output: 'Actionable defects: none found (tests not run).\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes no-op actionable defect summaries with dotted paths before validation-only notes',
      output: 'Actionable defects: none found in scripts/lib/foo.ts. Tests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes no-op actionable defect summaries with benign follow-up prose',
      output: 'Actionable defects: none found. The implementation is sound.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes no-op actionable defect summaries with dotted paths before benign follow-up prose',
      output: 'Actionable defects: none found in scripts/lib/foo.ts. The implementation is sound.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps no-op actionable defect summaries with dotted paths before unsafe follow-up prose as findings',
      output: 'Actionable defects: none found in scripts/lib/foo.ts. I saw it drop errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'recognizes no-op actionable defect summaries before terminal clean verdicts',
      output: 'Actionable defects: none found. No concrete correctness regressions were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes no-op actionable defect summaries with benign prefaces before terminal clean verdicts',
      output:
        'Actionable defects: none found. The implementation is sound. No concrete correctness regressions were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps no-op actionable defect summaries with unsafe prefaces before terminal clean verdicts as findings',
      output:
        'Actionable defects: none found. The implementation is sound. I saw it drop errors. No concrete correctness regressions were found.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps no-op actionable defect summaries with unsafe follow-up prose as findings',
      output: 'Actionable defects: none found. I saw it drop errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'recognizes labeled no-op actionable defect clean wording',
      output: 'Actionable defects: No actionable defects were found in the changed telemetry parser.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes labeled no-op actionable defect clean wording scoped to a dot-prefixed file path',
      output: 'Actionable defects: No actionable defects were found in .github/workflows/review.yml.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'recognizes active-voice labeled no-op actionable defect wording',
      output: 'Actionable defects: I did not find any actionable defects in the diff.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves contrasting defect clause unknown instead of clean',
      output: 'No actionable defects were found in the parser, but it drops [P1] findings.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves exception-style defect clause unknown instead of clean',
      output: 'No actionable defects were found in the parser except it drops errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves colon-spliced defect clause unknown instead of clean',
      output: 'No actionable defects were found in the parser: it drops errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves dash-spliced defect clause unknown instead of clean',
      output: 'No actionable defects were found in the parser - it drops errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves coordinating defect clause unknown instead of clean',
      output: 'No actionable defects were found in the parser and it drops errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves explanatory defect clause unknown instead of clean',
      output: 'No actionable defects were found in the parser because it drops errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves relative defect clause unknown instead of clean',
      output: 'No actionable defects were found in the parser where it drops errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves unsafe relative state clause unknown instead of clean',
      output: 'No actionable defects were found in the parser where it is broken.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves contrasting correctness regression clause unknown instead of clean',
      output: 'No concrete correctness regressions were found in the parser, but it drops [P1] findings.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves novel contrastive defect caveats unknown instead of clean',
      output: 'No actionable defects were found, but it leaks credentials.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves explicit defect caveat clauses unknown instead of clean',
      output: 'No actionable defects were found with one caveat: it drops review findings.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves same-line split clean plus contrasting warning unknown',
      output:
        'No actionable defects were found. No concrete correctness regressions were found, but it drops [P1] findings.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves multi-line contrasting warning unknown',
      output: 'No actionable defects were found.\nHowever, it drops [P1] findings.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves nevertheless contrastive defect caveats unknown instead of clean',
      output: 'No actionable defects were found.\nNevertheless, it leaks credentials.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves that-said contrastive defect caveats unknown instead of clean',
      output: 'No actionable defects were found.\nThat said, it leaks credentials.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves on-the-other-hand contrastive defect caveats unknown instead of clean',
      output: 'No actionable defects were found.\nOn the other hand, it leaks credentials.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves in-contrast defect caveats unknown instead of clean',
      output: 'No actionable defects were found. In contrast, it leaks credentials.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when unrelated caveat mentions validation only',
      output: 'No actionable defects were found.\nHowever, I did not run validation.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when same-line caveat mentions validation only',
      output: 'No actionable defects were found, but I did not run validation.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when same-line validation-only note is semicolon-separated',
      output: 'No actionable defects were found; validation was not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when validation caveat and benign follow-up share a line',
      output: 'No actionable defects were found, but tests not run. The implementation is sound.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op summaries when validation caveat and benign follow-up share a line',
      output: 'Actionable defects: none found, but tests not run. The implementation is sound.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when validation-only shorthand omits auxiliary verb',
      output: 'No actionable defects were found; tests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when labeled validation shorthand follows',
      output: 'No actionable defects were found.\nValidation: tests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when split validation shorthand follows',
      output: 'No actionable defects were found.\nValidation:\nTests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when labeled validation not-run shorthand follows',
      output: 'No actionable defects were found.\nValidation: not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when labeled tests not-run shorthand follows',
      output: 'No actionable defects were found.\nTests: not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves split no-op actionable section with failed validation unknown',
      output: 'Actionable defects:\nnone found\nValidation:\nnpm test failed.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when split empty actionable section precedes labeled validation',
      output: 'No actionable defects were found.\nActionable defects:\n\nValidation: tests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves empty split actionable section before labeled validation unknown without a clean verdict',
      output: 'Actionable defects:\n\nValidation: tests not run.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when validation-only shorthand reverses no-tests-run wording',
      output: 'No actionable defects were found; no tests run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when validation-only shorthand uses no-tests-were-run wording',
      output: 'No actionable defects were found; no tests were run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op actionable defect summaries with no-tests-were-run shorthand',
      output: 'Actionable defects: none found; no tests were run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when validation-only shorthand is dash-separated',
      output: 'No actionable defects were found — tests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op actionable defect summaries with dash-separated validation shorthand',
      output: 'Actionable defects: none found — tests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when validation-only shorthand uses did-not contraction',
      output: "No actionable defects were found. I didn't run tests.\n",
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op summaries when validation-only shorthand uses have-not contraction',
      output: "Actionable defects: none found. I haven't run tests.\n",
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when benign follow-up is semicolon-separated',
      output: 'No actionable defects were found; the implementation is sound.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op summaries when benign follow-up is semicolon-separated',
      output: 'Actionable defects: none found; the implementation is sound.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when followed by benign positive prose',
      output: 'I found no actionable issues in the diff. The implementation is sound.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict with dotted paths before benign positive prose',
      output: 'I found no actionable issues in scripts/lib/foo.ts. The implementation is sound.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when terminal split sentence is clean',
      output: 'No actionable defects were found. No concrete correctness regressions were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when benign middle prose precedes terminal clean sentence',
      output: 'No actionable defects were found. The implementation is sound. No concrete correctness regressions were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when validation-only middle prose precedes terminal clean sentence',
      output: 'No actionable defects were found. Tests not run. No concrete correctness regressions were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when benign and validation middle prose precede terminal clean sentence',
      output:
        'No actionable defects were found. The implementation is sound. Tests not run. No concrete correctness regressions were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when followed by benign prose and validation-only shorthand',
      output: 'No actionable defects were found. The implementation is sound. Tests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when followed by validation-only shorthand and benign prose',
      output: 'No actionable defects were found. Tests not run. The implementation is sound.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op actionable defect summary with benign and validation follow-ups clean',
      output: 'Actionable defects: none found. The implementation is sound. Tests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op actionable defect summary with validation and benign follow-ups clean',
      output: 'Actionable defects: none found. Tests not run. The implementation is sound.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps review-subject clean verdicts clean',
      output: 'Review found no actionable diff-local docs/task packet or registry metadata issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps article-prefixed reviewer clean verdicts clean',
      output: 'The reviewer found no actionable issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps bounded retry clean verdicts clean',
      output: 'The bounded retry found no actionable regressions.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps read-only retry did-not-find clean verdicts clean',
      output: 'Read-only retry did not identify any actionable diff-local regressions.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op followed by terminal review-subject clean sentence clean',
      output: 'Actionable defects: none found. Review found no actionable issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op followed by bare standalone review clean sentence clean',
      output: 'Actionable defects: none found. Standalone review found no actionable issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op followed by bare bounded review clean sentence clean',
      output: 'Actionable defects: none found. Bounded review found no actionable issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op followed by bare read-only review clean sentence clean',
      output: 'Actionable defects: none found. Read-only review found no actionable issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op followed by terminal Codex clean sentence clean',
      output: 'Actionable defects: none found. Codex found no actionable issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op followed by terminal bounded retry clean sentence clean',
      output: 'Actionable defects: none found. The bounded retry found no actionable regressions.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps direct clean followed by terminal review-subject clean sentence clean',
      output: 'No actionable defects were found. Review found no actionable issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op followed by article-prefixed reviewer clean sentence clean',
      output: 'Actionable defects: none found. The reviewer found no actionable issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps direct clean followed by article-prefixed reviewer clean sentence clean',
      output: 'No actionable defects were found. The reviewer found no actionable issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps review lead-in clean verdicts clean',
      output: 'I reviewed the changes and found no actionable issues.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps review lead-in clean verdicts scoped to the diff clean',
      output: 'I inspected the diff and found no actionable defects.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict with leading thread-not-found runtime noise clean',
      output: `${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\nI found no actionable issues.\n`,
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict with warn-prefixed thread-not-found runtime noise clean',
      output: `${WARN_THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\nI found no actionable issues.\n`,
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict with trailing thread-not-found runtime noise clean',
      output: `I found no actionable issues.\n${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`,
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps neutral review preamble before clean verdict clean',
      output: 'Reviewing CO-510 telemetry parser.\n\nNo actionable defects were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps same-line neutral review preamble before clean verdict clean',
      output: 'Reviewing CO-510 telemetry parser. No actionable defects were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps neutral review summary heading before clean verdict clean',
      output: 'Review summary:\nNo actionable defects were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps no-finding headings before clean verdicts clean',
      output: 'Findings: none.\nNo actionable defects were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps Markdown no-finding headings before clean verdicts clean',
      output: '## Findings\nNo actionable defects were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps bold Markdown no-finding headings before clean verdicts clean',
      output: '**Findings:** none.\nNo actionable defects were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps underlined Markdown no-finding headings before clean verdicts clean',
      output: '__Findings__: none.\nNo actionable defects were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps split no-finding headings before clean verdicts clean',
      output: 'Findings:\nNone.\nNo actionable defects were found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps split no-finding headings clean without a second clean sentence',
      output: 'Findings:\nNone.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps split actionable defect no-op headings clean',
      output: 'Actionable defects:\nnone found\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdicts followed by no-finding headings clean',
      output: 'No actionable defects were found.\nFindings: none.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps inline summary clean verdicts clean',
      output: 'Summary: no actionable defects found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps inline final verdict clean labels clean',
      output: 'Final verdict: Actionable defects: none found.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps multi-line benign and validation clean follow-ups clean',
      output: 'No actionable defects were found.\nThe implementation is sound.\nTests not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves clean verdict plus unsafe period-separated prose unknown',
      output: 'I found no actionable issues in the diff. The parser drops errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves unsafe review preamble before clean verdict unknown',
      output: 'Reviewing CO-510 parser drops errors.\nNo actionable defects were found.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves defect-prose review preamble before same-line clean verdict unknown',
      output: 'Reviewing CO-510 parser crashes on empty logs. No actionable defects were found.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves neutral preamble plus unsafe middle sentence before clean verdict unknown',
      output: 'Reviewing CO-510 telemetry parser.\nI saw it drop errors.\nNo actionable defects were found.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves clean verdict plus benign prose plus trailing unsafe sentence unknown',
      output: 'I found no actionable issues in the diff. The implementation is sound. I saw it drop errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op actionable defect summary plus unsafe suffix as a finding',
      output: 'Actionable defects: none found. The implementation is sound. I saw it drop errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps labeled no-op with unsafe middle before review-subject clean sentence as a finding',
      output: 'Actionable defects: none found. The parser drops errors. Review found no actionable issues.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'leaves clean verdict followed by unsafe newline prose unknown',
      output: 'No actionable defects were found.\nI saw it drop errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves labeled no-op followed by unsafe newline prose unknown',
      output: 'Actionable defects: none found.\nI saw it drop errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves unsafe newline preface before review-subject clean wording unknown',
      output: 'The parser drops errors.\nReview found no actionable issues.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves review-subject clean verdict with exception wording unknown',
      output: 'Review found no actionable issues with one exception: it drops errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled no-op plus exception wording as a finding',
      output: 'Actionable defects: none found. Review found no actionable issues with one exception: it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'leaves clean verdict plus I-prefixed unsafe suffix unknown',
      output: 'No actionable defects were found. I saw it drop errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves clean verdict plus No-prefixed unsafe suffix unknown',
      output: 'No actionable defects were found. No, it drops errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves clean verdict plus read-only unsafe suffix unknown',
      output: 'No actionable defects were found. Read-only inspection saw it drop errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves prefixed clean verdict plus unsafe suffix unknown',
      output:
        'Read-only inspection of the uncommitted diff did not identify actionable regressions. I saw it drop errors.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves unsafe same-line clause before prefixed did-not clean wording unknown',
      output:
        'The parser drops errors; read-only inspection did not identify actionable regressions.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves unsafe period-separated preface before prefixed did-not clean wording unknown',
      output:
        'The parser drops errors. Read-only inspection did not identify actionable regressions.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves unsafe same-line clause before prefixed found-no clean wording unknown',
      output:
        'The parser drops errors; read-only inspection found no actionable correctness issues.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves unsafe period-separated preface before prefixed found-no clean wording unknown',
      output:
        'The parser drops errors. Read-only inspection found no actionable correctness issues.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves question-mark clean prefix before validation shorthand unknown',
      output: 'No actionable defects were found? Tests not run.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves question-mark clean prefix before review-subject clean wording unknown',
      output: 'No actionable defects were found? Review found no actionable issues.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps question-mark no-op actionable summary before review-subject clean wording as a finding',
      output: 'Actionable defects: none found? Review found no actionable issues.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'leaves pure validation actionable defect summaries unknown without findings',
      output: 'Actionable defects: tests not run.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves priority-tagged validation actionable defect summaries unknown without findings',
      output: 'Actionable defects: [P2] tests not run.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves pure benign actionable defect summaries unknown without findings',
      output: 'Actionable defects: the patch looks sound.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves priority-tagged benign actionable defect summaries unknown without findings',
      output: 'Actionable defects: [P3] the patch looks sound.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdicts scoped to caveat-word path segments clean',
      output: 'No actionable defects were found in packages/except/foo.ts.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled clean verdicts scoped to caveat-word path segments clean',
      output: 'Actionable defects: none found in packages/but/foo.ts.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when same-line caveat mentions validation suite only',
      output: 'No actionable defects were found, but I did not run the validation suite.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps clean verdict when separate caveat says validation suite was not run',
      output: 'No actionable defects were found.\nHowever, validation suite was not run.\n',
      expectedVerdict: 'clean',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'keeps labeled contrasting actionable defect prose as a finding',
      output: 'Actionable defects: No actionable defects were found in the parser, but it drops [P1] findings.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'keeps active-voice labeled contrasting actionable defect prose as a finding',
      output: 'Actionable defects: I did not find any actionable defects in the parser, but it drops errors.\n',
      expectedVerdict: 'findings',
      expectedPriority: null,
      expectedCount: 1
    },
    {
      name: 'leaves generic non-finding text unknown',
      output: 'The review completed with general notes about scope and formatting only.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves unqualified defect wording unknown',
      output: 'No defects were found in the changed telemetry parser.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves unqualified active-voice defect wording unknown',
      output: 'I did not find any defects in the changed telemetry parser.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    },
    {
      name: 'leaves unqualified regression wording unknown',
      output: 'No regressions were found in the changed telemetry parser.\n',
      expectedVerdict: 'unknown',
      expectedPriority: null,
      expectedCount: 0
    }
  ])('$name', async ({ output, expectedVerdict, expectedPriority, expectedCount }) => {
    const sandbox = await makeSandbox();
    const payload = await writeTelemetryForOutput(sandbox, output);

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe(expectedVerdict);
    expect(payload?.highest_finding_priority).toBe(expectedPriority);
    expect(payload?.finding_count).toBe(expectedCount);
  });

  it('requires explicit structured clean evidence when findings are empty', async () => {
    const sandbox = await makeSandbox();
    const payload = await writeTelemetryForOutput(sandbox, `${JSON.stringify({ findings: [] })}\n`);

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.highest_finding_priority).toBeNull();
    expect(payload?.finding_count).toBe(0);

    const cleanSandbox = await makeSandbox();
    const cleanPayload = await writeTelemetryForOutput(cleanSandbox, `${JSON.stringify({
      findings: [],
      overall_correctness: 'patch is correct'
    })}\n`);

    expect(cleanPayload?.review_outcome).toBe('clean-success');
    expect(cleanPayload?.review_verdict).toBe('clean');
    expect(cleanPayload?.highest_finding_priority).toBeNull();
    expect(cleanPayload?.finding_count).toBe(0);

    const incorrectSandbox = await makeSandbox();
    const incorrectPayload = await writeTelemetryForOutput(incorrectSandbox, `${JSON.stringify({
      findings: [],
      overall_correctness: 'patch is incorrect'
    })}\n`);

    expect(incorrectPayload?.review_outcome).toBe('clean-success');
    expect(incorrectPayload?.review_verdict).toBe('unknown');
    expect(incorrectPayload?.highest_finding_priority).toBeNull();
    expect(incorrectPayload?.finding_count).toBe(0);
  });

  it('derives enforce-mode semantic telemetry from the governed contract only', async () => {
    const sandbox = await makeSandbox();
    const payload = await writeTelemetryForOutput(
      sandbox,
      'codex\nI found no actionable issues in the uncommitted diff.\n',
      {
        contractMode: 'enforce',
        contractPath: join(sandbox, 'review', 'contract.json')
      }
    );

    expect(payload?.review_outcome).toBe('clean-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.contract_mode).toBe('enforce');
    expect(payload?.contract_validation?.status).toBe('missing');
    expect(payload?.contract_path).toBe('review/contract.json');

    const contractSandbox = await makeSandbox();
    const evidence = await writeContractEvidence(contractSandbox, 'review/inputs/spec-bundle.json', '{"bundle":"spec"}\n');
    const contract = buildTelemetryCleanContract(evidence);
    const contractPayload = await writeTelemetryForOutput(
      contractSandbox,
      `codex\n${JSON.stringify(contract)}\n`,
      {
        contractMode: 'enforce',
        contractPath: join(contractSandbox, 'review', 'contract.json'),
        launchContext: structuredOutputLaunchContext()
      }
    );

    expect(contractPayload?.review_verdict).toBe('clean');
    expect(contractPayload?.contract_validation?.status).toBe('valid');
    expect(contractPayload?.contract_overall_verdict).toBe('clean');
    expect(contractPayload?.axis_verdicts?.agent_loop).toBe('clean');
    expect(contractPayload?.proposal_counts).toEqual({ code_change: 0, agent_loop: 0 });
    expect(getEnforceContractReviewFailureReason(contractPayload)).toBeNull();
    expect(getEnforceContractReviewFailureReason(payload)).toBe('review contract validation is missing');
    expect(getEnforceContractReviewFailureReason(null, 'enforce')).toBe('review contract telemetry is missing');
    expect(
      getEnforceContractReviewFailureReason({
        ...contractPayload,
        contract_overall_verdict: 'blocked',
        review_verdict: 'findings'
      })
    ).toBe('review contract overall verdict is blocked');
    expect(
      getEnforceContractReviewFailureReason({
        ...contractPayload,
        launch_context: null
      })
    ).toBe('review launch context is missing');
    expect(
      getEnforceContractReviewFailureReason({
        ...contractPayload,
        review_outcome: undefined
      })
    ).toBe('review outcome is missing or invalid');
    expect(
      getEnforceContractReviewFailureReason({
        ...contractPayload,
        review_outcome: 'fallback-clean' as never
      })
    ).toBe('review outcome is missing or invalid');
    expect(
      getEnforceContractReviewFailureReason({
        ...contractPayload,
        review_outcome: 'bounded-success'
      })
    ).toBe('review outcome is missing or invalid');
    expect(
      getEnforceContractReviewFailureReason({
        ...contractPayload,
        proposal_counts: {
          code_change: 0,
          agent_loop: 1
        }
      })
    ).toBe('agent-loop proposals require routing before handoff');

    const boundedContractSandbox = await makeSandbox();
    const boundedEvidence = await writeContractEvidence(
      boundedContractSandbox,
      'review/inputs/spec-bundle.json',
      '{"bundle":"spec"}\n'
    );
    const boundedContract = buildTelemetryCleanContract(boundedEvidence);
    const boundedPayload = await writeTelemetryForOutput(
      boundedContractSandbox,
      `codex\n${JSON.stringify(boundedContract)}\n`,
      {
        contractMode: 'enforce',
        contractPath: join(boundedContractSandbox, 'review', 'contract.json'),
        terminationBoundary: {
          kind: 'command-intent',
          provenance: 'post-startup-anchor',
          reason: 'bounded review command-intent boundary preserved for audit',
          sample: 'npm run test'
        }
      }
    );

    expect(boundedPayload?.review_outcome).toBe('bounded-success');
    expect(boundedPayload?.review_verdict).toBe('clean');
    expect(boundedPayload?.contract_validation?.status).toBe('valid');
    expect(getEnforceContractReviewFailureReason(boundedPayload)).toBe('review outcome is bounded-success');
    expect(
      getEnforceContractReviewFailureReason({
        ...contractPayload,
        launch_context: {
          legacy_fallback_attempt: 'review-wrapper-read-only-sandbox-compatibility'
        }
      })
    ).toBe('review launch used legacy fallback review-wrapper-read-only-sandbox-compatibility');

    const shadowSandbox = await makeSandbox();
    const shadowEvidence = await writeContractEvidence(shadowSandbox, 'review/inputs/spec-bundle.json', '{"bundle":"spec"}\n');
    const shadowContract = buildTelemetryCleanContract(shadowEvidence);
    const shadowPayload = await writeTelemetryForOutput(
      shadowSandbox,
      `codex\n${JSON.stringify(shadowContract)}\n`,
      {
        contractMode: 'shadow',
        contractPath: join(shadowSandbox, 'review', 'contract.json')
      }
    );

    expect(shadowPayload?.contract_mode).toBe('shadow');
    expect(shadowPayload?.contract_validation?.status).toBe('valid');
    expect(shadowPayload?.review_verdict).toBe('unknown');
  });

  it('derives semantic verdicts from final reviewer output, not inspected transcripts', async () => {
    const cases = [
      {
        name: 'ignores inspected fixture findings when the final verdict is clean',
        output: [
          'user',
          'Review this fixture.',
          'exec',
          '/bin/zsh -lc "sed -n 1,20p tests/fixtures/review-execution/co474-review-output-with-findings.log"',
          ' succeeded in 0ms:',
          '- [P1] Fixture content should not become the reviewer verdict',
          '- [P2] Another inspected fixture finding',
          '',
          'codex',
          'I found no actionable issues.'
        ].join('\n'),
        expectedVerdict: 'clean'
      },
      {
        name: 'does not promote newer nested markers by timestamp recency alone',
        output: [
          'OpenAI Codex v0.128.0 (research preview)',
          '--------',
          '2026-05-06T08:30:00.000000Z  WARN codex_core_plugins::manifest: current warning',
          'user',
          'current changes',
          'exec',
          '/bin/zsh -lc "tail -n 40 ../../.runs/task/review/output.log"',
          ' succeeded in 0ms:',
          '[run-review] waiting on codex review (6m 30s elapsed, 1m 33s idle).',
          '2026-05-06T08:45:00.000000Z  WARN codex_core::session::turn: nested future warning',
          'codex',
          'I found no actionable issues.'
        ].join('\n'),
        expectedVerdict: 'unknown'
      },
      {
        name: 'does not promote inspected transcript verdicts after blank separators',
        output: 'exec\n/bin/zsh -lc "tail -n 80 review/output.log"\n succeeded in 0ms:\ncodex\nNested clean verdict.\n\ncodex\n- [P2] Inspected transcript finding should not become the current verdict',
        expectedVerdict: 'unknown'
      },
      {
        name: 'does not promote transcript markers after nested command headers',
        output: [
          'exec',
          '/bin/zsh -lc "tail -n 80 review/output.log"',
          ' succeeded in 0ms:',
          'user',
          'nested review turn',
          'exec',
          '/bin/zsh -lc "rg P2 scripts/lib/review-execution-telemetry.ts"',
          ' succeeded in 0ms:',
          '- [P2] Nested inspected transcript finding',
          'codex',
          '- [P2] Nested inspected transcript finding should remain non-authoritative'
        ].join('\n'),
        expectedVerdict: 'unknown'
      },
      {
        name: 'does not promote inline cwd command-result transcript verdicts',
        output: [
          'exec',
          '/bin/zsh -lc "tail -n 20 review/output.log" in /repo succeeded in 0ms:',
          'codex',
          'I found no actionable issues.'
        ].join('\n'),
        expectedVerdict: 'unknown'
      },
      {
        name: 'does not promote decimal-duration transcript verdicts',
        output: [
          'exec',
          '/bin/zsh -lc "tail -n 20 review/output.log"',
          ' succeeded in 1.55s:',
          'codex',
          'I found no actionable issues.'
        ].join('\n'),
        expectedVerdict: 'unknown'
      },
      {
        name: 'keeps source-inspection markers as final verdict boundaries',
        output: [
          'OpenAI Codex v0.128.0 (research preview)',
          '--------',
          'user',
          'current changes',
          'exec',
          '/bin/zsh -lc "sed -n 1,20p scripts/lib/review-execution-telemetry.ts"',
          ' succeeded in 0ms:',
          'const promptRole = "user";',
          'const runtimeName = "OpenAI Codex v0.128.0";',
          'codex',
          'export function analyzeReviewOutput() {',
          '  return null;',
          '}',
          'codex',
          'I found no actionable issues.'
        ].join('\n'),
        expectedVerdict: 'clean'
      }
    ] as const;

    for (const testCase of cases) {
      const sandbox = await makeSandbox();
      const payload = await writeTelemetryForOutput(sandbox, `${testCase.output}\n`);

      expect(payload?.review_outcome, testCase.name).toBe('clean-success');
      expect(payload?.review_verdict, testCase.name).toBe(testCase.expectedVerdict);
      expect(payload?.highest_finding_priority, testCase.name).toBeNull();
      expect(payload?.finding_count, testCase.name).toBe(0);
    }
  });

  it('persists semantic findings without migrating wrapper outcome semantics', async () => {
    const boundedTermination = { kind: 'relevant-reinspection-dwell', provenance: 'post-startup-anchor', reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.', sample: null } as const;
    const failedBoundary = { kind: 'stall', provenance: 'output-stall', reason: 'review stalled', sample: null } as const;
    const cases = [
      {
        name: 'CO-474 successful raw output',
        output: await readFile(CO474_REVIEW_OUTPUT_FIXTURE, 'utf8'),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P1',
        expectedCount: 2
      },
      {
        name: 'structured JSON verdict titles',
        output: [
          'exec',
          '/bin/zsh -lc "rg P1 tests"',
          ' succeeded in 0ms:',
          '- [P1] Inspected command output should be ignored once JSON verdict is present',
          '',
          'codex',
          JSON.stringify({
            findings: [
              { title: '[P2] Structured title finding is actionable', priority: 2 },
              { title: '[P1] Structured higher priority finding is actionable', priority: 1 }
            ],
            overall_correctness: 'patch is incorrect'
          })
        ].join('\n'),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P1',
        expectedCount: 2
      },
      {
        name: 'structured JSON verdict after codex cleanup noise',
        output: [
          'codex',
          THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE,
          JSON.stringify({
            findings: [
              {
                title: '[P1] Cleanup noise must not hide structured findings',
                priority: 1
              }
            ],
            overall_correctness: 'patch is incorrect'
          })
        ].join('\n'),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P1',
        expectedCount: 1
      },
      {
        name: 'structured JSON verdict after log-level codex cleanup noise',
        output: [
          'codex',
          WARN_THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE,
          JSON.stringify({
            findings: [
              {
                title: '[P2] Log-level cleanup noise must not hide structured findings',
                priority: 2
              }
            ],
            overall_correctness: 'patch is incorrect'
          })
        ].join('\n'),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P2',
        expectedCount: 1
      },
      { name: 'summary-shaped structured JSON verdict', output: JSON.stringify({ review_verdict: 'findings', highest_finding_priority: 'P2', finding_count: 2 }), expectedOutcome: 'clean-success', expectedPriority: 'P2', expectedCount: 2 },
      {
        name: 'structured findings dominate clean summary verdict',
        output: JSON.stringify({
          review_verdict: 'clean',
          highest_finding_priority: null,
          finding_count: 0,
          findings: [
            {
              title: '[P1] Summary verdict must not hide an actionable finding',
              body: 'The structured findings array is the authoritative actionable signal.',
              priority: 1
            }
          ]
        }),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P1',
        expectedCount: 1
      },
      {
        name: 'markerless structured JSON verdict after runtime noise',
        output: [
          '2026-05-06T07:49:22.913222Z  WARN codex_core::session::turn: after_agent hook failed; continuing',
          JSON.stringify({
            findings: [
              {
                title: '[P1] Markerless JSON finding remains actionable',
                body: 'The parser should skip runtime noise before the final JSON verdict.',
                priority: 1
              }
            ],
            overall_correctness: 'patch is incorrect'
          })
        ].join('\n'),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P1',
        expectedCount: 1
      },
      {
        name: 'duplicated finding blocks',
        output: 'Findings:\n- [P2] Review telemetry summary drops actionable findings\nFindings:\n- [P2] Review telemetry summary drops actionable findings',
        expectedOutcome: 'clean-success',
        expectedPriority: 'P2',
        expectedCount: 1
      },
      {
        name: 'current finding after cat-v rendered inspected review log',
        output: [
          'exec',
          '/bin/zsh -lc "tail -n 40 review/output.log | cat -vet"',
          ' succeeded in 0ms:',
          'codex$',
          'Nested clean verdict.$',
          '',
          'codex',
          '- [P1] Current final verdict remains actionable'
        ].join('\n'),
        expectedOutcome: 'clean-success',
        expectedPriority: 'P1',
        expectedCount: 1
      },
      {
        name: 'bounded success with unknown verdict after inspected transcript findings',
        output: 'exec\n/bin/zsh -lc "tail -n 80 review/output.log"\n succeeded in 0ms:\ncodex\nNested clean verdict.\n\ncodex\n- [P2] Bounded review still found a handoff blocker',
        terminationBoundary: boundedTermination,
        expectedOutcome: 'bounded-success',
        expectedVerdict: 'unknown',
        expectedPriority: null,
        expectedCount: 0
      },
      {
        name: 'failed-boundary with findings',
        output: '- [P3] Failed review output still carried a low-priority finding\n',
        status: 'failed' as const,
        error: 'review stalled',
        terminationBoundary: failedBoundary,
        expectedOutcome: 'failed-boundary',
        expectedPriority: 'P3',
        expectedCount: 1
      }
    ] as const;

    for (const testCase of cases) {
      const sandbox = await makeSandbox();
      const payload = await writeTelemetryForOutput(sandbox, testCase.output, {
        status: testCase.status,
        error: testCase.error,
        terminationBoundary: testCase.terminationBoundary
      });

      expect(payload?.review_outcome, testCase.name).toBe(testCase.expectedOutcome);
      expect(payload?.review_verdict, testCase.name).toBe(testCase.expectedVerdict ?? 'findings');
      expect(payload?.highest_finding_priority, testCase.name).toBe(testCase.expectedPriority);
      expect(payload?.finding_count, testCase.name).toBe(testCase.expectedCount);
    }
  });

  it('persists success telemetry with an explicit termination boundary when the review ended via bounded completion', async () => {
    const sandbox = await makeSandbox();
    const terminationBoundary = {
      kind: 'relevant-reinspection-dwell',
      provenance: 'post-startup-anchor',
      reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
      sample: 'sed -n 1,20p file-1.py'
    } as const;
    const payload = await writeTelemetryForOutput(sandbox, '', { terminationBoundary });

    expect(payload?.review_outcome).toBe('bounded-success');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.termination_boundary).toEqual({
      kind: 'relevant-reinspection-dwell',
      provenance: 'post-startup-anchor',
      reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
      sample:
        '[redacted relevant-reinspection-dwell sample; set CODEX_REVIEW_DEBUG_TELEMETRY=1 to persist raw sample]'
    });
    await expect(readFile(join(sandbox, 'review', 'telemetry.json'), 'utf8')).resolves.toContain('"kind": "relevant-reinspection-dwell"');
  });

  it('persists failure telemetry with an explicit termination boundary', async () => {
    const sandbox = await makeSandbox();
    const terminationBoundary = {
      kind: 'stall',
      provenance: 'output-stall',
      reason: 'review stalled',
      sample: null
    } as const;
    const payload = await writeTelemetryForOutput(sandbox, '', {
      status: 'failed',
      error: 'review stalled',
      terminationBoundary
    });

    expect(payload?.review_outcome).toBe('failed-boundary');
    expect(payload?.review_verdict).toBe('unknown');
    expect(payload?.termination_boundary).toEqual(terminationBoundary);
    await expect(readFile(join(sandbox, 'review', 'telemetry.json'), 'utf8')).resolves.toContain('"kind": "stall"');
  });

  it('preserves omitted termination-boundary inference for failed telemetry', async () => {
    const sandbox = await makeSandbox();
    const payload = await writeTelemetryForOutput(sandbox, '', {
      status: 'failed',
      error: 'codex review timed out after 30s'
    });

    expect(payload?.review_outcome).toBe('failed-boundary');
    expect(payload?.termination_boundary?.kind).toBe('timeout');
    await expect(readFile(join(sandbox, 'review', 'telemetry.json'), 'utf8')).resolves.toContain('"kind": "timeout"');
  });

  it('logs and suppresses persistence failures', async () => {
    const sandbox = await makeSandbox();
    const state = new ReviewExecutionState({ repoRoot: sandbox });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const payload = await writeReviewExecutionTelemetry({
      state,
      status: 'succeeded',
      outputLogPath: join(sandbox, 'review', 'output.log'),
      repoRoot: sandbox,
      telemetryPath: join(sandbox, 'missing', 'telemetry.json'),
      includeRawTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(payload).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[run-review] failed to persist review telemetry:')
    );
  });

  it('describes failed-other telemetry as an unclassified review-command failure', () => {
    expect(
      formatReviewOutcomeSummary({
        status: 'failed',
        review_outcome: 'failed-other',
        termination_boundary: null
      })
    ).toBe(
      'review command failed without termination-boundary classification; not an explicit wrapper-boundary failure'
    );
  });

  it('surfaces unknown semantic review verdicts in generic outcome summaries', () => {
    expect(
      formatReviewOutcomeSummary({
        status: 'succeeded',
        review_outcome: 'clean-success',
        termination_boundary: null,
        review_verdict: 'unknown',
        highest_finding_priority: null,
        finding_count: 0
      })
    ).toBe('clean success; semantic review verdict: unknown');
  });

  it('prints command-intent aggregate counts in telemetry summaries', async () => {
    const sandbox = await makeSandbox();
    const state = new ReviewExecutionState({ repoRoot: sandbox });
    state.observeChunk(
      Buffer.from(
        [
          'thinking',
          'exec',
          "/bin/zsh -lc 'npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts' in /Users/kbediako/Code/CO"
        ].join('\n') + '\n'
      ),
      'stdout'
    );
    const terminationBoundary = state.getTerminationBoundaryRecordForKind('command-intent', 1_000);
    const payload = await writeTelemetryForOutput(sandbox, '', {
      status: 'failed',
      error: 'codex review crossed the bounded command-intent boundary (direct validation runner launch).',
      terminationBoundary,
      state
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logReviewTelemetrySummary(payload!, 'review/telemetry.json', {
      debugTelemetry: false,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY'
    });

    expect(errorSpy).toHaveBeenCalledWith(
      '[run-review] command-intent violations detected: 1 sample(s) across validation-runner.'
    );
  });

  it('ignores inconsistent explicit review outcomes and falls back to the status-plus-boundary contract', () => {
    expect(
      formatReviewOutcomeSummary({
        status: 'failed',
        review_outcome: 'clean-success',
        termination_boundary: null
      })
    ).toBe(
      'review command failed without termination-boundary classification; not an explicit wrapper-boundary failure'
    );
  });

  it('requires successful telemetry before thread-not-found rollout log noise is non-blocking', async () => {
    const sandbox = await makeSandbox();
    const successCases = [
      {
        name: 'clean',
        terminationBoundary: null,
        expectedOutcome: 'clean-success',
        expectedSummary: 'clean success; semantic review verdict: unknown'
      },
      {
        name: 'bounded',
        terminationBoundary: {
          kind: 'relevant-reinspection-dwell',
          provenance: 'post-startup-anchor',
          reason: 'bounded review relevant-reinspection dwell boundary violated after 1s.',
          sample: 'sed -n 1,20p file-1.py'
        } as const,
        expectedOutcome: 'bounded-success',
        expectedSummary:
          'bounded success via relevant-reinspection-dwell; not a wrapper failure; semantic review verdict: unknown'
      }
    ] as const;

    for (const successCase of successCases) {
      const state = new ReviewExecutionState({ repoRoot: sandbox });
      state.observeChunk(`${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`, 'stderr');
      const payload = await writeTelemetryForOutput(sandbox, '', {
        state,
        terminationBoundary: successCase.terminationBoundary,
        includeRawTelemetry: true,
        outputName: `${successCase.name}-output.log`,
        telemetryName: `${successCase.name}-telemetry.json`
      });

      expect(payload?.status).toBe('succeeded');
      expect(payload?.review_outcome).toBe(successCase.expectedOutcome);
      expect(payload?.error).toBeNull();
      expect(payload?.summary.lastLines).toContain(THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE);
      expect(formatReviewOutcomeSummary(payload!)).toBe(successCase.expectedSummary);
    }

    const failedState = new ReviewExecutionState({ repoRoot: sandbox });
    failedState.observeChunk(`${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`, 'stderr');
    const failedPayload = await writeTelemetryForOutput(sandbox, '', {
      state: failedState,
      status: 'failed',
      error: 'codex review exited with code 2',
      includeRawTelemetry: true,
      outputName: 'failed-output.log',
      telemetryName: 'failed-telemetry.json'
    });

    expect(failedPayload?.status).toBe('failed');
    expect(failedPayload?.review_outcome).toBe('failed-other');
    expect(failedPayload?.summary.lastLines).toContain(THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE);
    expect(formatReviewOutcomeSummary(failedPayload!)).toBe(
      'review command failed without termination-boundary classification; not an explicit wrapper-boundary failure; semantic review verdict: unknown'
    );

    const missingTelemetryState = new ReviewExecutionState({ repoRoot: sandbox });
    missingTelemetryState.observeChunk(`${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`, 'stderr');
    const missingTelemetryPayload = await writeReviewExecutionTelemetry({
      state: missingTelemetryState,
      status: 'succeeded',
      outputLogPath: join(sandbox, 'review', 'missing-output.log'),
      repoRoot: sandbox,
      telemetryPath: join(sandbox, 'missing', 'telemetry.json'),
      includeRawTelemetry: true,
      telemetryDebugEnvKey: 'CODEX_REVIEW_DEBUG_TELEMETRY',
      logPersistFailure: () => {}
    });

    expect(missingTelemetryPayload).toBeNull();
  });
});
