import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { promisify } from 'node:util';

import Ajv from 'ajv';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildReviewContractProposalRouting,
  buildReviewContractTelemetry,
  prepareReviewContractInputBundles,
  validateReviewContract,
  type ReviewContractEvidenceRef
} from '../scripts/lib/review-contract.js';

const sandboxes: string[] = [];
const execFileAsync = promisify(execFile);
const THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE =
  'codex_core::session: failed to record rollout items: thread 019de1d2-3b27-7193-8330-0ed726e28044 not found';
const WARN_THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE = `warn ${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}`;
const AVAILABLE_SPEC_BUNDLE = `${JSON.stringify({ schema_version: 'co.review.input-bundle.v1', bundle: 'spec', canonical_original_spec: { available: true, required_paths: { prd: 'docs/PRD-test.md', tech_spec: 'docs/TECH_SPEC-test.md', action_plan: 'docs/ACTION_PLAN-test.md' }, missing_paths: [] }, task_documents: [] })}\n`;
const UNAVAILABLE_SPEC_BUNDLE = `${JSON.stringify({ schema_version: 'co.review.input-bundle.v1', bundle: 'spec', canonical_original_spec: { available: false, required_paths: { prd: null, tech_spec: null, action_plan: null }, missing_paths: ['PRD', 'TECH_SPEC', 'ACTION_PLAN'] }, task_documents: [] })}\n`;

async function makeSandbox(): Promise<string> {
  const sandbox = await mkdtemp(join(tmpdir(), 'review-contract-'));
  sandboxes.push(sandbox);
  return sandbox;
}

afterEach(async () => {
  await Promise.all(sandboxes.splice(0).map((sandbox) => rm(sandbox, { recursive: true, force: true })));
});

describe('review contract v1', () => {
  it('validates a fully clean contract with explicit clean signals and evidence hashes', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);

    await expect(validateReviewContract(contract, { repoRoot: sandbox })).resolves.toEqual({
      valid: true,
      errors: []
    });

    const telemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n${JSON.stringify(contract)}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract.json')
    });

    expect(telemetry.contract_validation.status).toBe('valid');
    expect(telemetry.review_verdict).toBe('clean');
    expect(telemetry.axis_verdicts.spec_conformance).toBe('clean');
    expect(telemetry.review_intent_matrix?.original_spec.verdict).toBe('clean');
    expect(telemetry.review_intent_matrix?.code_change_proposals.proposed_fixes).toEqual([
      'No change proposed; Code changes checked.'
    ]);
    await expect(readFile(join(sandbox, 'review', 'contract.json'), 'utf8')).resolves.toContain(
      '"schema_version": "co.review.contract.v1"'
    );

    const lastMessageContractPath = join(sandbox, 'review', 'contract-last-message.json');
    await writeFile(lastMessageContractPath, `${JSON.stringify(contract)}\n`, 'utf8');
    const lastMessageTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n${JSON.stringify(contract)}\nhook: Stop\nhook: Stop Completed\n`,
      repoRoot: sandbox,
      contractPath: lastMessageContractPath,
      source: 'last-message-file'
    });

    expect(lastMessageTelemetry.contract_validation.status).toBe('valid');
    expect(lastMessageTelemetry.review_verdict).toBe('clean');
  });

  it('ignores contract-shaped JSON outside the final reviewer response', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);
    const inspectedTranscript = [
      'exec',
      "/bin/zsh -lc 'cat review/contract.json' in /repo",
      JSON.stringify(contract)
    ].join('\n');

    const transcriptOnlyTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: inspectedTranscript,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-transcript-only.json')
    });

    expect(transcriptOnlyTelemetry.contract_validation.status).toBe('missing');
    expect(transcriptOnlyTelemetry.review_verdict).toBe('unknown');

    const finalProseTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `${inspectedTranscript}\ncodex\nI found no actionable issues.\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-final-prose.json')
    });

    expect(finalProseTelemetry.contract_validation.status).toBe('missing');
    expect(finalProseTelemetry.review_verdict).toBe('unknown');

    const inspectedReviewOutput = [
      'exec',
      "/bin/zsh -lc 'cat review/output.log' in /repo",
      ' succeeded in 0ms:',
      'codex',
      JSON.stringify(contract)
    ].join('\n');
    const inspectedReviewOutputTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: inspectedReviewOutput,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-inspected-review-output.json')
    });

    expect(inspectedReviewOutputTelemetry.contract_validation.status).toBe('missing');
    expect(inspectedReviewOutputTelemetry.review_verdict).toBe('unknown');

    const finalContractAfterInspectedOutputTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `${inspectedReviewOutput}\ncodex\n${JSON.stringify(contract)}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-final-after-inspection.json')
    });

    expect(finalContractAfterInspectedOutputTelemetry.contract_validation.status).toBe('missing');
    expect(finalContractAfterInspectedOutputTelemetry.review_verdict).toBe('unknown');

    const finalContractAfterTopLevelProgressTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `${inspectedReviewOutput}\nthinking\ncodex\n${JSON.stringify(contract)}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-final-after-progress.json')
    });

    expect(finalContractAfterTopLevelProgressTelemetry.contract_validation.status).toBe('missing');
    expect(finalContractAfterTopLevelProgressTelemetry.review_verdict).toBe('unknown');

    const inspectedProgressTailedOutputTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: [
        'exec',
        "/bin/zsh -lc 'tail -80 review/output.log' in /repo",
        ' succeeded in 0ms:',
        'thinking',
        'codex',
        JSON.stringify(contract)
      ].join('\n'),
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-inspected-progress-tailed-output.json')
    });

    expect(inspectedProgressTailedOutputTelemetry.contract_validation.status).toBe('missing');
    expect(inspectedProgressTailedOutputTelemetry.review_verdict).toBe('unknown');

    const inspectedMultiCodexTailedOutputTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: [
        'exec',
        "/bin/zsh -lc 'tail -80 review/output.log' in /repo",
        ' succeeded in 0ms:',
        'codex',
        'Earlier assistant prose.',
        'thinking',
        'codex',
        JSON.stringify(contract)
      ].join('\n'),
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-inspected-multi-codex-tailed-output.json')
    });

    expect(inspectedMultiCodexTailedOutputTelemetry.contract_validation.status).toBe('missing');
    expect(inspectedMultiCodexTailedOutputTelemetry.review_verdict).toBe('unknown');

    const finalContractAfterPlainJsonInspectionTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: [
        'exec',
        "/bin/zsh -lc 'cat review/contract.json' in /repo",
        ' succeeded in 0ms:',
        JSON.stringify(contract),
        'codex',
        JSON.stringify(contract)
      ].join('\n'),
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-final-after-plain-json-inspection.json')
    });

    expect(finalContractAfterPlainJsonInspectionTelemetry.contract_validation.status).toBe('valid');
    expect(finalContractAfterPlainJsonInspectionTelemetry.review_verdict).toBe('clean');

    const inspectedNestedTranscript = [
      'exec',
      "/bin/zsh -lc 'cat review/output.log' in /repo",
      ' succeeded in 0ms:',
      'OpenAI Codex v0.130.0',
      '--------',
      'workdir: /repo',
      'model: gpt-5.5',
      'user',
      'Review this diff.',
      'codex',
      JSON.stringify(contract)
    ].join('\n');
    const inspectedNestedTranscriptTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: inspectedNestedTranscript,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-inspected-nested-transcript.json')
    });

    expect(inspectedNestedTranscriptTelemetry.contract_validation.status).toBe('missing');
    expect(inspectedNestedTranscriptTelemetry.review_verdict).toBe('unknown');

    const inspectedMultiTurnNestedTranscript = [
      'exec',
      "/bin/zsh -lc 'cat review/output.log' in /repo",
      ' succeeded in 0ms:',
      'OpenAI Codex v0.130.0',
      '--------',
      'workdir: /repo',
      'model: gpt-5.5',
      'user',
      'Review this diff.',
      'codex',
      'Earlier assistant prose.',
      'user',
      'Return the final contract.',
      'codex',
      JSON.stringify(contract)
    ].join('\n');
    const inspectedMultiTurnNestedTranscriptTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: inspectedMultiTurnNestedTranscript,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-inspected-multi-turn-nested-transcript.json')
    });

    expect(inspectedMultiTurnNestedTranscriptTelemetry.contract_validation.status).toBe('missing');
    expect(inspectedMultiTurnNestedTranscriptTelemetry.review_verdict).toBe('unknown');

    const inlineHeaderInspectedTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: [
        "exec /bin/zsh -lc 'tail -80 review/output.log' in /repo succeeded in 0ms:",
        'codex',
        JSON.stringify(contract)
      ].join('\n'),
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-inspected-inline-header.json')
    });

    expect(inlineHeaderInspectedTelemetry.contract_validation.status).toBe('missing');
    expect(inlineHeaderInspectedTelemetry.review_verdict).toBe('unknown');

    const stalePriorContractThenInspectedOutputTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: [
        'codex',
        JSON.stringify(contract),
        'exec',
        "/bin/zsh -lc 'cat review/output.log' in /repo",
        ' succeeded in 0ms:',
        'codex',
        JSON.stringify(contract)
      ].join('\n'),
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-stale-prior-then-inspected-output.json')
    });

    expect(stalePriorContractThenInspectedOutputTelemetry.contract_validation.status).toBe('missing');
    expect(stalePriorContractThenInspectedOutputTelemetry.review_verdict).toBe('unknown');

    const bareJsonTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `${JSON.stringify(contract)}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-bare-json.json')
    });

    expect(bareJsonTelemetry.contract_validation.status).toBe('valid');
    expect(bareJsonTelemetry.review_verdict).toBe('clean');
  });

  it('rejects trailing content after the final contract JSON object', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);

    const trailingProseTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n${JSON.stringify(contract)}\nReview comment: hidden contradictory finding.\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-trailing-prose.json')
    });

    expect(trailingProseTelemetry.contract_validation.status).toBe('invalid');
    expect(trailingProseTelemetry.review_verdict).toBe('unknown');
    expect(trailingProseTelemetry.contract_validation.errors.join('\n')).toContain('no trailing content');

    const secondObjectTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n${JSON.stringify(contract)}\n${JSON.stringify({
        findings: [{ priority: 'P1', title: 'must not be ignored' }]
      })}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-trailing-second-object.json')
    });

    expect(secondObjectTelemetry.contract_validation.status).toBe('invalid');
    expect(secondObjectTelemetry.contract_validation.errors.join('\n')).toContain('no trailing content');

    const fencedTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n\`\`\`json\n${JSON.stringify(contract)}\n\`\`\`\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-fenced-json.json')
    });

    expect(fencedTelemetry.contract_validation.status).toBe('valid');
    expect(fencedTelemetry.review_verdict).toBe('clean');

    const trailingRuntimeNoiseTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n${JSON.stringify(contract)}\n${WARN_THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-trailing-runtime-noise.json')
    });

    expect(trailingRuntimeNoiseTelemetry.contract_validation.status).toBe('valid');
    expect(trailingRuntimeNoiseTelemetry.review_verdict).toBe('clean');

    const fencedTrailingRuntimeNoiseTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n\`\`\`json\n${JSON.stringify(contract)}\n\`\`\`\n${THREAD_NOT_FOUND_ROLLOUT_NOISE_LINE}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-fenced-trailing-runtime-noise.json')
    });

    expect(fencedTrailingRuntimeNoiseTelemetry.contract_validation.status).toBe('valid');
    expect(fencedTrailingRuntimeNoiseTelemetry.review_verdict).toBe('clean');

    const fencedTrailingTelemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n\`\`\`json\n${JSON.stringify(contract)}\n\`\`\`\nextra prose\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-fenced-trailing.json')
    });

    expect(fencedTrailingTelemetry.contract_validation.status).toBe('invalid');
    expect(fencedTrailingTelemetry.contract_validation.errors.join('\n')).toContain('no trailing content');
  });

  it('rejects missing axes and clean verdicts without explicit clean signals', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const missingAxis = buildCleanContract(evidenceRef);
    delete (missingAxis.axes as Record<string, unknown>).agent_loop;

    const missingAxisResult = await validateReviewContract(missingAxis, { repoRoot: sandbox });
    expect(missingAxisResult.valid).toBe(false);
    expect(missingAxisResult.errors.join('\n')).toContain("must have required property 'agent_loop'");

    const ambiguousClean = buildCleanContract(evidenceRef);
    delete ambiguousClean.axes.spec_conformance.clean_signal;
    const ambiguousResult = await validateReviewContract(ambiguousClean, { repoRoot: sandbox });
    expect(ambiguousResult.valid).toBe(false);
    expect(ambiguousResult.errors.join('\n')).toContain('clean_signal');
  });

  it('requires a structured review_intent_matrix with all governed intent axes', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const missingMatrix = buildCleanContract(evidenceRef) as Record<string, unknown>;
    delete missingMatrix.review_intent_matrix;

    const missingMatrixResult = await validateReviewContract(missingMatrix, { repoRoot: sandbox });
    expect(missingMatrixResult.valid).toBe(false);
    expect(missingMatrixResult.errors.join('\n')).toContain("must have required property 'review_intent_matrix'");

    const missingIntentAxis = buildCleanContract(evidenceRef);
    delete (missingIntentAxis.review_intent_matrix as Record<string, unknown>).agent_loop_change_proposals;
    const missingIntentAxisResult = await validateReviewContract(missingIntentAxis, { repoRoot: sandbox });
    expect(missingIntentAxisResult.valid).toBe(false);
    expect(missingIntentAxisResult.errors.join('\n')).toContain(
      "must have required property 'agent_loop_change_proposals'"
    );
  });

  it('fails closed when original_spec is marked clean without canonical PRD TECH_SPEC ACTION_PLAN evidence', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', UNAVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);

    const result = await validateReviewContract(contract, { repoRoot: sandbox });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('expected unknown when canonical PRD/TECH_SPEC/ACTION_PLAN evidence is unavailable');

    const telemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n${JSON.stringify(contract)}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-missing-original-spec.json')
    });
    expect(telemetry.contract_validation.status).toBe('invalid');
    expect(telemetry.review_verdict).toBe('unknown');

    const unavailableUnknown = buildCleanContract(evidenceRef);
    unavailableUnknown.review_intent_matrix.original_spec = {
      required: true,
      verdict: 'unknown',
      evidence: ['Canonical PRD/TECH_SPEC/ACTION_PLAN evidence was unavailable.'],
      proposed_fixes: ['Provide canonical original spec evidence before claiming original_spec clean.']
    };
    await expect(validateReviewContract(unavailableUnknown, { repoRoot: sandbox })).resolves.toEqual({
      valid: true,
      errors: []
    });
  });

  it('fails closed when original_spec clean has no positive canonical original-spec evidence', async () => {
    const sandbox = await makeSandbox();
    const legacySpecBundle = `${JSON.stringify({
      schema_version: 'co.review.input-bundle.v1',
      bundle: 'spec',
      task_key: 'linear-missing-canonical',
      task_documents: []
    })}\n`;
    const legacyEvidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', legacySpecBundle);
    const legacyContract = buildCleanContract(legacyEvidenceRef);

    const legacyResult = await validateReviewContract(legacyContract, { repoRoot: sandbox });
    expect(legacyResult.valid).toBe(false);
    expect(legacyResult.errors.join('\n')).toContain('canonical_original_spec');

    const datePrefixedSpecBundle = `${JSON.stringify({
      schema_version: 'co.review.input-bundle.v1',
      bundle: 'spec',
      task_key: '20260531-linear-missing-canonical',
      task_documents: []
    })}\n`;
    const datePrefixedEvidenceRef = await writeEvidence(
      sandbox,
      'review/inputs/date-prefixed-spec-bundle.json',
      datePrefixedSpecBundle
    );
    const datePrefixedContract = buildCleanContract(datePrefixedEvidenceRef);

    const datePrefixedResult = await validateReviewContract(datePrefixedContract, { repoRoot: sandbox });
    expect(datePrefixedResult.valid).toBe(false);
    expect(datePrefixedResult.errors.join('\n')).toContain('canonical_original_spec');

    const nonSpecEvidenceRef = await writeEvidence(sandbox, 'review/inputs/standards-bundle.json', 'standards\n');
    const noSpecBundleContract = buildCleanContract(nonSpecEvidenceRef);

    const noSpecBundleResult = await validateReviewContract(noSpecBundleContract, { repoRoot: sandbox });
    expect(noSpecBundleResult.valid).toBe(false);
    expect(noSpecBundleResult.errors.join('\n')).toContain('missing_paths unavailable');
  });

  it('binds original_spec clean evidence to the current review spec bundle', async () => {
    const sandbox = await makeSandbox();
    const currentRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', UNAVAILABLE_SPEC_BUNDLE);
    const staleRef = await writeEvidence(
      sandbox,
      '.runs/old-review/cli/run/review/inputs/spec-bundle.json',
      AVAILABLE_SPEC_BUNDLE
    );
    const contract = buildCleanContract(staleRef);
    for (const axis of Object.values(contract.axes)) {
      axis.evidence_refs = [staleRef, currentRef];
    }

    const result = await validateReviewContract(contract, {
      repoRoot: sandbox,
      currentSpecBundlePath: join(sandbox, 'review', 'inputs', 'spec-bundle.json')
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('expected unknown when canonical PRD/TECH_SPEC/ACTION_PLAN evidence is unavailable');
    expect(result.errors.join('\n')).toContain('PRD, TECH_SPEC, ACTION_PLAN');
  });

  it('fails closed when original-spec bundle evidence is ambiguous without a current bundle', async () => {
    const sandbox = await makeSandbox();
    const currentRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const staleRef = await writeEvidence(
      sandbox,
      '.runs/old-review/cli/run/review/inputs/spec-bundle.json',
      AVAILABLE_SPEC_BUNDLE
    );
    const contract = buildCleanContract(currentRef);
    for (const axis of Object.values(contract.axes)) {
      axis.evidence_refs = [currentRef, staleRef];
    }

    const result = await validateReviewContract(contract, { repoRoot: sandbox });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('ambiguous_spec_bundle');
  });

  it('rejects original-spec bundle evidence outside the repository root', async () => {
    const sandbox = await makeSandbox();
    const outsideRoot = await makeSandbox();
    const outsidePath = join(outsideRoot, 'spec-bundle.json');
    await writeFile(outsidePath, AVAILABLE_SPEC_BUNDLE, 'utf8');
    const outsideRef = {
      path: relative(sandbox, outsidePath).split(sep).join('/'),
      sha256: createHash('sha256').update(AVAILABLE_SPEC_BUNDLE).digest('hex')
    };
    const contract = buildCleanContract(outsideRef);

    const result = await validateReviewContract(contract, { repoRoot: sandbox });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('evidence path must stay within the repository root');
  });

  it('fails closed when current original-spec bundle evidence is malformed', async () => {
    const sandbox = await makeSandbox();
    const currentRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', 'not json\n');
    const contract = buildCleanContract(currentRef);

    const result = await validateReviewContract(contract, {
      repoRoot: sandbox,
      currentSpecBundlePath: join(sandbox, 'review', 'inputs', 'spec-bundle.json')
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('expected unknown when canonical PRD/TECH_SPEC/ACTION_PLAN evidence is unavailable');
    expect(result.errors.join('\n')).toContain('current_spec_bundle_malformed');
  });

  it('rejects stale or missing evidence refs', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const staleRef = { ...evidenceRef, sha256: '0'.repeat(64) };
    const contract = buildCleanContract(staleRef);

    const result = await validateReviewContract(contract, { repoRoot: sandbox });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('stale or mismatched');
  });

  it('rejects whitespace-only required strings before evidence refs are trusted', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const blankPathRef = { ...evidenceRef, path: ' ' };
    const contract = buildCleanContract(blankPathRef);

    const result = await validateReviewContract(contract, { repoRoot: sandbox });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('/path: must NOT have fewer than 1 characters');
  });

  it('reports non-file evidence refs as invalid contracts instead of telemetry failures', async () => {
    const sandbox = await makeSandbox();
    await mkdir(join(sandbox, 'docs'), { recursive: true });
    const directoryRef = {
      path: 'docs',
      sha256: 'a'.repeat(64)
    };
    const contract = buildCleanContract(directoryRef);

    const result = await validateReviewContract(contract, { repoRoot: sandbox });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('evidence path must be a readable file');

    const telemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n${JSON.stringify(contract)}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract.json')
    });
    expect(telemetry.contract_validation.status).toBe('invalid');
    expect(telemetry.contract_validation.errors.join('\n')).toContain('evidence path must be a readable file');
    expect(telemetry.review_verdict).toBe('unknown');
  });

  it('allows trusted shared run artifact evidence refs but rejects unrelated parent paths', async () => {
    const sandbox = await makeSandbox();
    const repoRoot = join(sandbox, '.workspaces', 'linear-abc');
    const runRoot = join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review', 'inputs');
    await mkdir(repoRoot, { recursive: true });
    await mkdir(runRoot, { recursive: true });
    const artifactPath = join(runRoot, 'spec-bundle.json');
    const artifactContent = AVAILABLE_SPEC_BUNDLE;
    await writeFile(artifactPath, artifactContent, 'utf8');
    const artifactRef = {
      path: relative(repoRoot, artifactPath),
      sha256: createHash('sha256').update(artifactContent).digest('hex')
    };

    await expect(validateReviewContract(buildCleanContract(artifactRef), { repoRoot })).resolves.toEqual({
      valid: true,
      errors: []
    });

    const secretPath = join(sandbox, 'secret.txt');
    const secretContent = 'not an allowed artifact root\n';
    await writeFile(secretPath, secretContent, 'utf8');
    const secretRef = {
      path: relative(repoRoot, secretPath),
      sha256: createHash('sha256').update(secretContent).digest('hex')
    };
    const secretResult = await validateReviewContract(buildCleanContract(secretRef), { repoRoot });
    expect(secretResult.valid).toBe(false);
    expect(secretResult.errors.join('\n')).toContain('trusted run artifact roots');
  });

  it('trusts generated review-dir evidence refs for external explicit run manifests', async () => {
    const sandbox = await makeSandbox();
    const repoRoot = join(sandbox, 'repo');
    const externalReviewDir = join(sandbox, 'external-runs', 'linear-abc', 'cli', 'run-1', 'review');
    await mkdir(repoRoot, { recursive: true });
    await mkdir(join(externalReviewDir, 'inputs'), { recursive: true });
    const artifactPath = join(externalReviewDir, 'inputs', 'spec-bundle.json');
    const artifactContent = AVAILABLE_SPEC_BUNDLE;
    await writeFile(artifactPath, artifactContent, 'utf8');
    const externalArtifactRef = {
      path: relative(repoRoot, artifactPath).split(sep).join('/'),
      sha256: createHash('sha256').update(artifactContent).digest('hex')
    };
    const contract = buildCleanContract(externalArtifactRef);

    const directValidation = await validateReviewContract(contract, { repoRoot });
    expect(directValidation.valid).toBe(false);
    expect(directValidation.errors.join('\n')).toContain('trusted run artifact roots');

    const telemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n${JSON.stringify(contract)}\n`,
      repoRoot,
      contractPath: join(externalReviewDir, 'contract.json')
    });

    expect(telemetry.contract_validation.status).toBe('valid');
    expect(telemetry.review_verdict).toBe('clean');
  });

  it('rejects malformed code and agent-loop proposals', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);
    contract.code_change_proposals.push({
      id: 'code-1',
      title: 'Patch parser',
      rationale: 'Needs exact patch proposal.',
      tests: ['npm run test -- review-contract'],
      risk: 'low',
      evidence_refs: [evidenceRef]
    });
    contract.agent_loop_proposals.push({
      id: 'loop-1',
      title: 'Improve handoff',
      rationale: 'Loop evidence should route separately.',
      routing: {
        default_route: 'comment',
        follow_up_kind: 'agent_loop',
        intent_checksum: 'loop-1',
        non_goals: ['Do not change code behavior.'],
        not_done_if: ['No typed follow-up route.'],
        acceptance_criteria: ['Route is typed.']
      },
      evidence_refs: [evidenceRef]
    });

    const result = await validateReviewContract(contract, { repoRoot: sandbox });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('must match a schema in anyOf');
    expect(result.errors.join('\n')).toContain('must be equal to constant');
  });

  it('keeps the structured-output schema in parity with canonical optional proposal fields', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);
    markCodeChangesFinding(contract, evidenceRef);
    markAgentLoopFinding(contract, evidenceRef);
    contract.code_change_proposals.push({
      id: 'code-target-only',
      title: 'Patch target without inline diff',
      rationale: 'Reviewers may describe a patchable target without emitting a full unified diff.',
      target: {
        path: 'scripts/lib/review-contract.ts'
      },
      tests: ['npm run test:core -- tests/review-contract.spec.ts'],
      risk: 'low',
      evidence_refs: [evidenceRef]
    });
    contract.agent_loop_proposals.push({
      id: 'loop-no-owner',
      title: 'Capture loop feedback without canonical owner',
      rationale: 'A valid agent-loop follow-up may not have a known canonical owner key yet.',
      routing: {
        default_route: 'linear_follow_up',
        follow_up_kind: 'agent_loop',
        intent_checksum: 'loop-no-owner-checksum',
        non_goals: ['Do not force artificial owner metadata.'],
        not_done_if: ['The proposal requires a bogus canonical owner key.'],
        acceptance_criteria: ['The proposal routes with canonical_owner_key null.']
      },
      evidence_refs: [evidenceRef]
    });

    await expect(validateReviewContract(contract, { repoRoot: sandbox })).resolves.toEqual({
      valid: true,
      errors: []
    });
    const structuredContract = withStructuredOutputNulls(contract);
    await expect(validateStructuredOutputSchema(structuredContract)).resolves.toEqual({
      valid: true,
      errors: []
    });
    const telemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n${JSON.stringify(structuredContract)}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-output-parity.json')
    });
    expect(telemetry.contract_validation.status).toBe('valid');
    expect(telemetry.review_verdict).toBe('findings');
    expect(telemetry.review_intent_matrix?.code_change_proposals.verdict).toBe('findings');
    const persisted = JSON.parse(
      await readFile(join(sandbox, 'review', 'contract-output-parity.json'), 'utf8')
    ) as {
      code_change_proposals?: Array<Record<string, unknown>>;
      agent_loop_proposals?: Array<{ blocking?: unknown; routing?: { canonical_owner_key?: unknown } }>;
    };
    expect(persisted.code_change_proposals?.[0]?.unified_diff).toBeUndefined();
    expect(persisted.code_change_proposals?.[0]?.target).toEqual({
      path: 'scripts/lib/review-contract.ts'
    });
    expect(persisted.agent_loop_proposals?.[0]?.blocking).toBeUndefined();
    expect(persisted.agent_loop_proposals?.[0]?.routing?.canonical_owner_key).toBeUndefined();
  });

  it('maps blocked and findings axes to fail-closed semantic findings', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);
    contract.overall_verdict = 'blocked';
    contract.axes.agent_loop = {
      verdict: 'blocked',
      summary: 'Required review loop evidence is absent.',
      evidence_refs: [evidenceRef],
      findings: [
        {
          id: 'loop-blocked',
          priority: 'P1',
          title: 'Agent-loop evidence missing',
          evidence_refs: [evidenceRef]
        }
      ]
    };
    contract.review_intent_matrix.agent_loop_change_proposals = {
      required: true,
      verdict: 'findings',
      evidence: ['Required review loop evidence is absent.'],
      proposed_fixes: ['Restore the missing agent-loop evidence before handoff.']
    };

    const telemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `codex\n${JSON.stringify(contract)}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract.json')
    });

    expect(telemetry.contract_validation.status).toBe('valid');
    expect(telemetry.contract_overall_verdict).toBe('blocked');
    expect(telemetry.review_verdict).toBe('findings');
    expect(telemetry.finding_count).toBe(1);
    expect(telemetry.highest_finding_priority).toBe('P1');
  });

  it('rejects blocking agent-loop proposals when the agent-loop axis is clean', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);
    contract.agent_loop_proposals.push({
      id: 'loop-blocking',
      title: 'Missing handoff proof',
      rationale: 'A blocking loop proposal must be represented by the agent-loop axis verdict.',
      blocking: true,
      routing: {
        default_route: 'linear_follow_up',
        follow_up_kind: 'agent_loop',
        intent_checksum: 'loop-blocking-checksum',
        non_goals: ['Do not block unrelated code findings.'],
        not_done_if: ['The clean agent-loop axis hides blocking feedback.'],
        acceptance_criteria: ['The blocking proposal is paired with a non-clean agent-loop axis.']
      },
      evidence_refs: [evidenceRef]
    });

    const result = await validateReviewContract(contract, { repoRoot: sandbox });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain(
      'blocking agent-loop proposals require the agent_loop axis to be findings or blocked'
    );
  });

  it('rejects code-change proposals when the code-changes axis is clean', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);
    contract.code_change_proposals.push(buildCodeChangeProposal(evidenceRef));

    const result = await validateReviewContract(contract, { repoRoot: sandbox });
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain(
      'code-change proposals require the code_changes axis to be findings or blocked'
    );

    const telemetry = await buildReviewContractTelemetry({
      mode: 'enforce',
      outputText: `${JSON.stringify(contract)}\n`,
      repoRoot: sandbox,
      contractPath: join(sandbox, 'review', 'contract-code-proposal-clean.json')
    });
    expect(telemetry.contract_validation.status).toBe('invalid');
    expect(telemetry.review_verdict).toBe('unknown');
  });

  it('routes code-change and agent-loop proposals separately for Linear follow-up handling', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);
    markCodeChangesFinding(contract, evidenceRef);
    markAgentLoopFinding(contract, evidenceRef);
    contract.code_change_proposals.push(buildCodeChangeProposal(evidenceRef));
    contract.agent_loop_proposals.push({
      id: 'loop-1',
      title: 'Add missing review handoff checklist item',
      rationale: 'The producing loop skipped a review-handoff checklist update.',
      routing: {
        default_route: 'linear_follow_up',
        follow_up_kind: 'agent_loop',
        intent_checksum: 'loop-1-checksum',
        canonical_owner_key: 'review-agent-loop:handoff-checklist',
        non_goals: ['Do not change the reviewed product diff.'],
        not_done_if: ['The feedback is mixed into code findings.'],
        acceptance_criteria: ['A typed Linear follow-up is created or reused.']
      },
      evidence_refs: [evidenceRef]
    });

    const routing = await buildReviewContractProposalRouting({
      contract,
      repoRoot: sandbox,
      issueId: '991643b6-0043-49b8-9411-33b6de78e421'
    });

    expect(routing.ok).toBe(true);
    if (!routing.ok) {
      return;
    }
    expect(routing.code_change_proposals).toEqual([
      expect.objectContaining({
        proposal_id: 'code-1',
        unified_diff: expect.stringContaining('diff --git')
      })
    ]);
    expect(routing.agent_loop_follow_ups).toEqual([
      expect.objectContaining({
        proposal_id: 'loop-1',
        intent_checksum: 'loop-1-checksum',
        canonical_owner_key: 'review-agent-loop:handoff-checklist',
        non_goals: '- Do not change the reviewed product diff.',
        not_done_if: '- The feedback is mixed into code findings.',
        acceptance_criteria: '- A typed Linear follow-up is created or reused.',
        create_follow_up_args: expect.arrayContaining([
          'create-follow-up',
          '--issue-id',
          '991643b6-0043-49b8-9411-33b6de78e421',
          '--canonical-owner-key',
          'review-agent-loop:handoff-checklist'
        ])
      })
    ]);
    expect(routing.agent_loop_follow_ups[0]?.description).toContain('follow_up_kind: `agent_loop`');
    expect(routing.agent_loop_memory_entries).toEqual([]);
  });

  it('exports memory entries only for accepted validated agent-loop proposals', async () => {
    const sandbox = await makeSandbox();
    const evidenceRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const contract = buildCleanContract(evidenceRef);
    markAgentLoopFinding(contract, evidenceRef);
    contract.agent_loop_proposals.push({
      id: 'loop-1',
      title: 'Capture accepted loop learning',
      rationale: 'Only accepted loop feedback should reach memory.',
      routing: {
        default_route: 'linear_follow_up',
        follow_up_kind: 'agent_loop',
        intent_checksum: 'loop-1-checksum',
        non_goals: ['Do not ingest raw review suggestions.'],
        not_done_if: ['Unaccepted feedback appears in prompt memory.'],
        acceptance_criteria: ['Accepted feedback becomes a validated memory entry.']
      },
      evidence_refs: [evidenceRef]
    });

    const acceptedRouting = await buildReviewContractProposalRouting({
      contract,
      repoRoot: sandbox,
      issueId: '991643b6-0043-49b8-9411-33b6de78e421',
      acceptedAgentLoopProposalIds: ['loop-1']
    });

    expect(acceptedRouting.ok).toBe(true);
    if (!acceptedRouting.ok) {
      return;
    }
    expect(acceptedRouting.agent_loop_memory_entries).toEqual([
      {
        schema_version: 'co.review.agent_loop_memory_entry.v1',
        proposal_id: 'loop-1',
        title: 'Capture accepted loop learning',
        rationale: 'Only accepted loop feedback should reach memory.',
        source_contract_schema: 'co.review.contract.v1',
        evidence_refs: [evidenceRef]
      }
    ]);

    const rawSuggestionRouting = await buildReviewContractProposalRouting({
      contract,
      repoRoot: sandbox,
      issueId: '991643b6-0043-49b8-9411-33b6de78e421',
      acceptedAgentLoopProposalIds: ['raw-review-suggestion']
    });

    expect(rawSuggestionRouting).toEqual({
      ok: false,
      errors: ['accepted agent-loop proposal raw-review-suggestion is not present in the validated contract.']
    });
  });

  it('writes the four governed input bundles and prompt evidence refs', async () => {
    const sandbox = await makeSandbox();
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await mkdir(join(sandbox, 'docs'), { recursive: true });
    await writeFile(
      join(sandbox, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: 'linear-abc',
            relates_to: 'tasks/tasks-linear-abc.md',
            paths: {
              task: 'tasks/tasks-linear-abc.md',
              docs: 'docs/TECH_SPEC-linear-abc.md',
              prd: 'docs/PRD-linear-abc.md',
              action_plan: 'docs/ACTION_PLAN-linear-abc.md'
            }
          }
        ]
      }),
      'utf8'
    );
    await writeFile(join(sandbox, 'tasks', 'tasks-linear-abc.md'), '# Task\n', 'utf8');
    await writeFile(join(sandbox, 'docs', 'TECH_SPEC-linear-abc.md'), '# Spec\n', 'utf8');
    await writeFile(join(sandbox, 'docs', 'PRD-linear-abc.md'), '# PRD\n', 'utf8');
    await writeFile(join(sandbox, 'docs', 'ACTION_PLAN-linear-abc.md'), '# Plan\n', 'utf8');
    const manifestPath = join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'manifest.json');
    await mkdir(join(manifestPath, '..'), { recursive: true });
    await writeFile(manifestPath, '{"status":"in_progress"}\n', 'utf8');

    const result = await prepareReviewContractInputBundles({
      repoRoot: sandbox,
      reviewDir: join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review'),
      manifestPath,
      taskKey: 'linear-abc',
      taskLabel: 'linear-abc',
      reviewSurface: 'diff',
      scopePaths: ['docs/TECH_SPEC-linear-abc.md'],
      notes: 'Goal: test',
      mode: 'shadow'
    });

    expect(result).not.toBeNull();
    expect(result?.bundleRefs.map((ref) => ref.path)).toEqual([
      '.runs/linear-abc/cli/run-1/review/inputs/spec-bundle.json',
      '.runs/linear-abc/cli/run-1/review/inputs/standards-bundle.json',
      '.runs/linear-abc/cli/run-1/review/inputs/change-bundle.json',
      '.runs/linear-abc/cli/run-1/review/inputs/agent-loop-bundle.json'
    ]);
    expect(result?.promptLines.join('\n')).toContain('Required axes: `spec_conformance`');
    expect(result?.promptLines.join('\n')).toContain('review_intent_matrix');
    expect(result?.promptLines.join('\n')).toContain(
      'shadow mode: telemetry records the contract for audit while legacy semantic parsing remains authoritative'
    );
    await expect(
      readFile(join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review', 'inputs', 'spec-bundle.json'), 'utf8')
    ).resolves.toContain('docs/TECH_SPEC-linear-abc.md');
  });

  it('uses review-owned immutable snapshots for active agent-loop manifest and runner-log refs', async () => {
    const sandbox = await makeSandbox();
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await writeFile(join(sandbox, 'tasks', 'index.json'), JSON.stringify({ items: [] }), 'utf8');
    const runRoot = join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1');
    const reviewDir = join(runRoot, 'review');
    const manifestPath = join(runRoot, 'manifest.json');
    const runnerLogPath = join(runRoot, 'runner.log');
    const manifestContent = '{"status":"in_progress","run_id":"run-1"}\n';
    const runnerLogContent = 'runner started\nreview in progress\n';
    await mkdir(runRoot, { recursive: true });
    await writeFile(manifestPath, manifestContent, 'utf8');
    await writeFile(runnerLogPath, runnerLogContent, 'utf8');

    await prepareReviewContractInputBundles({
      repoRoot: sandbox,
      reviewDir,
      manifestPath,
      runnerLogPath,
      runnerLogExists: true,
      taskKey: 'linear-abc',
      taskLabel: 'linear-abc',
      reviewSurface: 'diff',
      scopePaths: [],
      notes: 'Goal: snapshot active agent-loop evidence',
      mode: 'shadow'
    });

    const agentLoopBundle = JSON.parse(
      await readFile(join(reviewDir, 'inputs', 'agent-loop-bundle.json'), 'utf8')
    ) as { source_refs?: ReviewContractEvidenceRef[] };
    const sourceRefs = agentLoopBundle.source_refs ?? [];
    const sourcePaths = sourceRefs.map((ref) => ref.path);
    const liveManifestRef = {
      path: relative(sandbox, manifestPath).split(sep).join('/'),
      sha256: createHash('sha256').update(manifestContent).digest('hex')
    };
    const liveRunnerLogRef = {
      path: relative(sandbox, runnerLogPath).split(sep).join('/'),
      sha256: createHash('sha256').update(runnerLogContent).digest('hex')
    };

    expect(sourceRefs).toHaveLength(2);
    expect(sourcePaths).not.toContain(liveManifestRef.path);
    expect(sourcePaths).not.toContain(liveRunnerLogRef.path);
    expect(sourcePaths.every((entry) => entry.startsWith('.runs/linear-abc/cli/run-1/review/inputs/'))).toBe(true);
    expect(new Set(sourceRefs.map((ref) => ref.sha256))).toEqual(
      new Set([liveManifestRef.sha256, liveRunnerLogRef.sha256])
    );

    await writeFile(manifestPath, '{"status":"complete","run_id":"run-1"}\n', 'utf8');
    await writeFile(runnerLogPath, 'runner completed\n', 'utf8');

    const specRef = await writeEvidence(sandbox, 'review/inputs/spec-bundle.json', AVAILABLE_SPEC_BUNDLE);
    const snapshotContract = buildCleanContract(specRef);
    for (const axis of Object.values(snapshotContract.axes)) {
      axis.evidence_refs = [specRef, ...sourceRefs];
    }
    await expect(validateReviewContract(snapshotContract, { repoRoot: sandbox })).resolves.toEqual({
      valid: true,
      errors: []
    });

    const liveContract = buildCleanContract(specRef);
    for (const axis of Object.values(liveContract.axes)) {
      axis.evidence_refs = [specRef, liveManifestRef, liveRunnerLogRef];
    }
    const liveValidation = await validateReviewContract(liveContract, { repoRoot: sandbox });
    expect(liveValidation.valid).toBe(false);
    expect(liveValidation.errors.join('\n')).toMatch(/evidence sha256 is stale or mismatched|trusted run artifact roots/u);
  });

  it('skips task bundle document paths that escape the repository root', async () => {
    const sandbox = await makeSandbox();
    const repoRoot = join(sandbox, 'repo');
    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await writeFile(join(sandbox, 'secret.txt'), 'super secret content\n', 'utf8');
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: 'linear-abc',
            relates_to: 'tasks/tasks-linear-abc.md',
            paths: {
              docs: '../secret.txt'
            }
          }
        ]
      }),
      'utf8'
    );
    await writeFile(join(repoRoot, 'tasks', 'tasks-linear-abc.md'), '# Task\n', 'utf8');
    const manifestPath = join(repoRoot, '.runs', 'linear-abc', 'cli', 'run-1', 'manifest.json');
    await mkdir(join(manifestPath, '..'), { recursive: true });
    await writeFile(manifestPath, '{"status":"in_progress"}\n', 'utf8');

    await prepareReviewContractInputBundles({
      repoRoot,
      reviewDir: join(repoRoot, '.runs', 'linear-abc', 'cli', 'run-1', 'review'),
      manifestPath,
      taskKey: 'linear-abc',
      taskLabel: 'linear-abc',
      reviewSurface: 'diff',
      scopePaths: [],
      notes: 'Goal: test',
      mode: 'shadow'
    });

    const specBundle = JSON.parse(
      await readFile(join(repoRoot, '.runs', 'linear-abc', 'cli', 'run-1', 'review', 'inputs', 'spec-bundle.json'), 'utf8')
    ) as { skipped_task_document_paths?: string[]; task_documents?: Array<{ content?: string }> };
    expect(specBundle.skipped_task_document_paths).toEqual(['../secret.txt']);
    expect(JSON.stringify(specBundle.task_documents)).not.toContain('super secret content');
    expect(specBundle.canonical_original_spec).toEqual(
      expect.objectContaining({
        available: false
      })
    );
  });

  it('counts paths.tech_spec as canonical original-spec TECH_SPEC evidence', async () => {
    const sandbox = await makeSandbox();
    const repoRoot = join(sandbox, 'repo');
    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: 'linear-abc',
            relates_to: 'tasks/tasks-linear-abc.md',
            paths: {
              prd: 'docs/PRD-linear-abc.md',
              tech_spec: 'tasks/specs/linear-abc.md',
              action_plan: 'docs/ACTION_PLAN-linear-abc.md'
            }
          }
        ]
      }),
      'utf8'
    );
    await mkdir(join(repoRoot, 'tasks', 'specs'), { recursive: true });
    await writeFile(join(repoRoot, 'tasks', 'tasks-linear-abc.md'), '# Task\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'PRD-linear-abc.md'), '# PRD\n', 'utf8');
    await writeFile(join(repoRoot, 'tasks', 'specs', 'linear-abc.md'), '# TECH_SPEC\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'ACTION_PLAN-linear-abc.md'), '# ACTION_PLAN\n', 'utf8');
    const manifestPath = join(repoRoot, '.runs', 'linear-abc', 'cli', 'run-1', 'manifest.json');
    await mkdir(join(manifestPath, '..'), { recursive: true });
    await writeFile(manifestPath, '{"status":"in_progress"}\n', 'utf8');

    await prepareReviewContractInputBundles({
      repoRoot,
      reviewDir: join(repoRoot, '.runs', 'linear-abc', 'cli', 'run-1', 'review'),
      manifestPath,
      taskKey: 'linear-abc',
      taskLabel: 'linear-abc',
      reviewSurface: 'diff',
      scopePaths: [],
      notes: 'Goal: test',
      mode: 'shadow'
    });

    const specBundle = JSON.parse(
      await readFile(join(repoRoot, '.runs', 'linear-abc', 'cli', 'run-1', 'review', 'inputs', 'spec-bundle.json'), 'utf8')
    ) as { canonical_original_spec?: { available?: boolean }; task_documents?: Array<{ path?: string }> };
    expect(specBundle.canonical_original_spec?.available).toBe(true);
    expect(specBundle.task_documents?.map((entry) => entry.path)).toContain('tasks/specs/linear-abc.md');
  });

  it('includes canonical original-spec evidence for date-prefixed Linear task ids', async () => {
    const sandbox = await makeSandbox();
    const repoRoot = join(sandbox, 'repo');
    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: '20260531-linear-abc',
            relates_to: 'tasks/tasks-linear-abc.md',
            paths: {
              prd: 'docs/PRD-linear-abc.md',
              tech_spec: 'docs/TECH_SPEC-linear-abc.md',
              action_plan: 'docs/ACTION_PLAN-linear-abc.md'
            }
          }
        ]
      }),
      'utf8'
    );
    await writeFile(join(repoRoot, 'tasks', 'tasks-linear-abc.md'), '# Task\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'PRD-linear-abc.md'), '# PRD\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'TECH_SPEC-linear-abc.md'), '# TECH_SPEC\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'ACTION_PLAN-linear-abc.md'), '# ACTION_PLAN\n', 'utf8');
    const manifestPath = join(repoRoot, '.runs', '20260531-linear-abc', 'cli', 'run-1', 'manifest.json');
    await mkdir(join(manifestPath, '..'), { recursive: true });
    await writeFile(manifestPath, '{"status":"in_progress"}\n', 'utf8');

    await prepareReviewContractInputBundles({
      repoRoot,
      reviewDir: join(repoRoot, '.runs', '20260531-linear-abc', 'cli', 'run-1', 'review'),
      manifestPath,
      taskKey: '20260531-linear-abc',
      taskLabel: '20260531-linear-abc',
      reviewSurface: 'diff',
      scopePaths: [],
      notes: 'Goal: test',
      mode: 'shadow'
    });

    const specBundle = JSON.parse(
      await readFile(
        join(repoRoot, '.runs', '20260531-linear-abc', 'cli', 'run-1', 'review', 'inputs', 'spec-bundle.json'),
        'utf8'
      )
    ) as { canonical_original_spec?: { available?: boolean } };
    expect(specBundle.canonical_original_spec?.available).toBe(true);
  });

  it('uses the longest matching task-index alias when provider task keys overlap', async () => {
    const sandbox = await makeSandbox();
    const repoRoot = join(sandbox, 'repo');
    await mkdir(join(repoRoot, 'tasks'), { recursive: true });
    await mkdir(join(repoRoot, 'docs'), { recursive: true });
    await writeFile(
      join(repoRoot, 'tasks', 'index.json'),
      JSON.stringify({
        items: [
          {
            id: '20260531-linear-abc-parent-longer-than-child-key',
            relates_to: 'tasks/tasks-linear-abc.md',
            notes: {
              provider_issue_task_key: 'linear-abc'
            },
            paths: {
              prd: 'docs/PRD-parent.md',
              tech_spec: 'docs/TECH_SPEC-parent.md',
              action_plan: 'docs/ACTION_PLAN-parent.md'
            }
          },
          {
            id: 'linear-abc-review-pass',
            relates_to: 'tasks/tasks-linear-abc-review-pass.md',
            paths: {
              prd: 'docs/PRD-child.md',
              tech_spec: 'docs/TECH_SPEC-child.md',
              action_plan: 'docs/ACTION_PLAN-child.md'
            }
          }
        ]
      }),
      'utf8'
    );
    await writeFile(join(repoRoot, 'tasks', 'tasks-linear-abc-review-pass.md'), '# Task\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'PRD-child.md'), '# PRD\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'TECH_SPEC-child.md'), '# TECH_SPEC\n', 'utf8');
    await writeFile(join(repoRoot, 'docs', 'ACTION_PLAN-child.md'), '# ACTION_PLAN\n', 'utf8');
    const manifestPath = join(repoRoot, '.runs', 'linear-abc-review-pass-extra', 'cli', 'run-1', 'manifest.json');
    await mkdir(join(manifestPath, '..'), { recursive: true });
    await writeFile(manifestPath, '{"status":"in_progress"}\n', 'utf8');

    await prepareReviewContractInputBundles({
      repoRoot,
      reviewDir: join(repoRoot, '.runs', 'linear-abc-review-pass-extra', 'cli', 'run-1', 'review'),
      manifestPath,
      taskKey: 'linear-abc-review-pass-extra',
      taskLabel: 'linear-abc-review-pass-extra',
      reviewSurface: 'diff',
      scopePaths: [],
      notes: 'Goal: test',
      mode: 'shadow'
    });

    const specBundle = JSON.parse(
      await readFile(
        join(repoRoot, '.runs', 'linear-abc-review-pass-extra', 'cli', 'run-1', 'review', 'inputs', 'spec-bundle.json'),
        'utf8'
      )
    ) as { canonical_original_spec?: { available?: boolean }; task_index_entry?: { id?: string } };
    expect(specBundle.task_index_entry?.id).toBe('linear-abc-review-pass');
    expect(specBundle.canonical_original_spec?.available).toBe(true);
  });

  it('includes staged and untracked files in the governed change bundle', async () => {
    const sandbox = await makeSandbox();
    await git(sandbox, ['init']);
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await writeFile(join(sandbox, 'tasks', 'index.json'), JSON.stringify({ items: [] }), 'utf8');
    await writeFile(join(sandbox, 'staged.txt'), 'staged\ncontent\n', 'utf8');
    await git(sandbox, ['add', 'staged.txt']);
    await writeFile(join(sandbox, 'untracked.txt'), 'untracked\ncontent\n', 'utf8');
    const manifestPath = join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'manifest.json');
    await mkdir(join(manifestPath, '..'), { recursive: true });
    await writeFile(manifestPath, '{"status":"in_progress"}\n', 'utf8');

    await prepareReviewContractInputBundles({
      repoRoot: sandbox,
      reviewDir: join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review'),
      manifestPath,
      taskKey: 'linear-abc',
      taskLabel: 'linear-abc',
      reviewSurface: 'diff',
      scopePaths: ['staged.txt', 'untracked.txt'],
      notes: 'Goal: staged and untracked scope',
      mode: 'shadow'
    });

    const changeBundle = JSON.parse(
      await readFile(join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review', 'inputs', 'change-bundle.json'), 'utf8')
    ) as { git_diff_name_status?: string; git_diff_stat?: string; git_diff_patch?: string };
    expect(changeBundle.git_diff_name_status).toContain('A\tstaged.txt');
    expect(changeBundle.git_diff_name_status).toContain('??\tuntracked.txt');
    expect(changeBundle.git_diff_stat).toContain('staged.txt');
    expect(changeBundle.git_diff_stat).toContain('untracked.txt');
    expect(changeBundle.git_diff_patch).toContain('diff --git a/untracked.txt b/untracked.txt');
    expect(changeBundle.git_diff_patch).toContain('+untracked');
  });

  it('keeps large governed diff evidence in the change bundle', async () => {
    const sandbox = await makeSandbox();
    await git(sandbox, ['init']);
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await writeFile(join(sandbox, 'tasks', 'index.json'), JSON.stringify({ items: [] }), 'utf8');
    const largeContent = Array.from(
      { length: 7_000 },
      (_, index) => `line-${index.toString().padStart(4, '0')} ${'x'.repeat(48)}`
    ).join('\n');
    await writeFile(join(sandbox, 'large.txt'), `${largeContent}\n`, 'utf8');
    await git(sandbox, ['add', 'large.txt']);
    const manifestPath = join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'manifest.json');
    await mkdir(join(manifestPath, '..'), { recursive: true });
    await writeFile(manifestPath, '{"status":"in_progress"}\n', 'utf8');

    await prepareReviewContractInputBundles({
      repoRoot: sandbox,
      reviewDir: join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review-large'),
      manifestPath,
      taskKey: 'linear-abc',
      taskLabel: 'linear-abc',
      reviewSurface: 'diff',
      scopePaths: ['large.txt'],
      notes: 'Goal: large diff scope',
      mode: 'shadow'
    });

    const changeBundle = JSON.parse(
      await readFile(join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review-large', 'inputs', 'change-bundle.json'), 'utf8')
    ) as { git_diff_patch?: string };
    expect(changeBundle.git_diff_patch).not.toContain('[git command failed:');
    expect(changeBundle.git_diff_patch).toContain('diff --git a/large.txt b/large.txt');
    expect(changeBundle.git_diff_patch).toContain('+line-6999');
  });

  it('builds governed change bundles from explicit base and commit scopes', async () => {
    const sandbox = await makeSandbox();
    await git(sandbox, ['init']);
    await git(sandbox, ['config', 'user.email', 'review-contract-tests@example.com']);
    await git(sandbox, ['config', 'user.name', 'review-contract-tests']);
    await mkdir(join(sandbox, 'tasks'), { recursive: true });
    await writeFile(join(sandbox, 'tasks', 'index.json'), JSON.stringify({ items: [] }), 'utf8');
    await writeFile(join(sandbox, 'tracked.txt'), 'baseline\n', 'utf8');
    await git(sandbox, ['add', '.']);
    await git(sandbox, ['commit', '-m', 'baseline']);
    await writeFile(join(sandbox, 'tracked.txt'), 'updated\n', 'utf8');
    await git(sandbox, ['add', 'tracked.txt']);
    await git(sandbox, ['commit', '-m', 'update tracked']);
    const manifestPath = join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'manifest.json');
    await mkdir(join(manifestPath, '..'), { recursive: true });
    await writeFile(manifestPath, '{"status":"in_progress"}\n', 'utf8');

    await prepareReviewContractInputBundles({
      repoRoot: sandbox,
      reviewDir: join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review-base'),
      manifestPath,
      taskKey: 'linear-abc',
      taskLabel: 'linear-abc',
      reviewSurface: 'diff',
      scopePaths: ['tracked.txt'],
      scopeMode: 'base',
      scopeBase: 'HEAD~1',
      notes: 'Goal: base scope',
      mode: 'shadow'
    });

    const baseBundle = JSON.parse(
      await readFile(join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review-base', 'inputs', 'change-bundle.json'), 'utf8')
    ) as { scope_mode?: string; git_diff_name_status?: string; git_diff_patch?: string };
    expect(baseBundle.scope_mode).toBe('base');
    expect(baseBundle.git_diff_name_status).toContain('M\ttracked.txt');
    expect(baseBundle.git_diff_patch).toContain('+updated');

    await prepareReviewContractInputBundles({
      repoRoot: sandbox,
      reviewDir: join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review-commit'),
      manifestPath,
      taskKey: 'linear-abc',
      taskLabel: 'linear-abc',
      reviewSurface: 'diff',
      scopePaths: ['tracked.txt'],
      scopeMode: 'commit',
      scopeCommit: 'HEAD',
      notes: 'Goal: commit scope',
      mode: 'shadow'
    });

    const commitBundle = JSON.parse(
      await readFile(join(sandbox, '.runs', 'linear-abc', 'cli', 'run-1', 'review-commit', 'inputs', 'change-bundle.json'), 'utf8')
    ) as { scope_mode?: string; git_diff_name_status?: string; git_diff_patch?: string };
    expect(commitBundle.scope_mode).toBe('commit');
    expect(commitBundle.git_diff_name_status).toContain('M\ttracked.txt');
    expect(commitBundle.git_diff_patch).toContain('+updated');
  });

  it('keeps sanitized eval fixtures for the required governed-review scenarios', async () => {
    const raw = await readFile(join(process.cwd(), 'evaluation', 'fixtures', 'review-contract', 'fixtures.json'), 'utf8');
    const parsed = JSON.parse(raw) as {
      fixtures?: Array<{
        id?: string;
        expected_contract?: {
          overall_verdict?: string;
          proposal_counts?: {
            code_change?: number;
            agent_loop?: number;
          };
        };
      }>;
    };
    const fixtures = parsed.fixtures ?? [];

    expect(fixtures.map((fixture) => fixture.id)).toEqual([
      'spec-violation-green-tests',
      'coding-standard-fallback-violation',
      'real-code-bug-with-patch-proposal',
      'skipped-agent-loop-step',
      'agent-loop-snapshot-evidence',
      'legacy-prose-clean-output'
    ]);
    expect(fixtures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'real-code-bug-with-patch-proposal',
          expected_contract: expect.objectContaining({
            proposal_counts: { code_change: 1, agent_loop: 0 }
          })
        }),
        expect.objectContaining({
          id: 'skipped-agent-loop-step',
          expected_contract: expect.objectContaining({
            proposal_counts: { code_change: 0, agent_loop: 1 }
          })
        }),
        expect.objectContaining({
          id: 'agent-loop-snapshot-evidence',
          source_ref_expectations: expect.objectContaining({
            bundle: 'agent_loop',
            live_mutation_outcome: 'deterministically-invalid'
          })
        }),
        expect.objectContaining({
          id: 'legacy-prose-clean-output',
          expected_contract: expect.objectContaining({
            overall_verdict: 'unknown'
          })
        })
      ])
    );
  });
});

async function writeEvidence(
  sandbox: string,
  repoPath: string,
  content: string
): Promise<ReviewContractEvidenceRef> {
  const absolutePath = join(sandbox, repoPath);
  await mkdir(join(absolutePath, '..'), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
  return {
    path: repoPath,
    sha256: createHash('sha256').update(content).digest('hex')
  };
}

function buildCleanContract(evidenceRef: ReviewContractEvidenceRef) {
  const cleanAxis = (summary: string) => ({
    verdict: 'clean' as const,
    summary,
    clean_signal: summary,
    evidence_refs: [evidenceRef],
    findings: []
  });
  const cleanIntentAxis = (summary: string) => ({
    required: true,
    verdict: 'clean' as const,
    evidence: [summary],
    proposed_fixes: [`No change proposed; ${summary}`]
  });
  return {
    schema_version: 'co.review.contract.v1',
    generated_at: '2026-05-14T00:00:00.000Z',
    overall_verdict: 'clean' as const,
    axes: {
      spec_conformance: cleanAxis('Spec conformance checked.'),
      coding_standards: cleanAxis('Coding standards checked.'),
      code_changes: cleanAxis('Code changes checked.'),
      agent_loop: cleanAxis('Agent loop checked.')
    },
    review_intent_matrix: {
      original_spec: cleanIntentAxis('Spec conformance checked.'),
      coding_standards: cleanIntentAxis('Coding standards checked.'),
      code_change_proposals: cleanIntentAxis('Code changes checked.'),
      agent_loop_change_proposals: cleanIntentAxis('Agent loop checked.')
    },
    code_change_proposals: [] as Array<Record<string, unknown>>,
    agent_loop_proposals: [] as Array<Record<string, unknown>>
  };
}

function buildCodeChangeProposal(evidenceRef: ReviewContractEvidenceRef): Record<string, unknown> {
  return {
    id: 'code-1',
    title: 'Patch contract parser',
    rationale: 'Parser should reject malformed proposal diffs.',
    unified_diff: 'diff --git a/scripts/lib/review-contract.ts b/scripts/lib/review-contract.ts\n',
    tests: ['npm run test:core -- tests/review-contract.spec.ts'],
    risk: 'low',
    evidence_refs: [evidenceRef]
  };
}

function markCodeChangesFinding(
  contract: ReturnType<typeof buildCleanContract>,
  evidenceRef: ReviewContractEvidenceRef
): void {
  (contract as Record<string, unknown>).overall_verdict = 'findings';
  (contract.axes as Record<string, unknown>).code_changes = {
    verdict: 'findings',
    summary: 'Code-change proposal requires parent action.',
    evidence_refs: [evidenceRef],
    findings: [
      {
        id: 'code-change-proposal-1',
        priority: 'P2',
        title: 'Patchable code change proposed.',
        evidence_refs: [evidenceRef]
      }
    ]
  };
  contract.review_intent_matrix.code_change_proposals = {
    required: true,
    verdict: 'findings',
    evidence: ['Code-change proposal requires parent action.'],
    proposed_fixes: ['Apply or explicitly reject the patchable code change proposal.']
  };
}

function markAgentLoopFinding(
  contract: ReturnType<typeof buildCleanContract>,
  evidenceRef: ReviewContractEvidenceRef
): void {
  (contract as Record<string, unknown>).overall_verdict = 'findings';
  (contract.axes as Record<string, unknown>).agent_loop = {
    verdict: 'findings',
    summary: 'Agent-loop proposal requires parent action.',
    evidence_refs: [evidenceRef],
    findings: [
      {
        id: 'agent-loop-proposal-1',
        priority: 'P2',
        title: 'Agent-loop follow-up proposed.',
        evidence_refs: [evidenceRef]
      }
    ]
  };
  contract.review_intent_matrix.agent_loop_change_proposals = {
    required: true,
    verdict: 'findings',
    evidence: ['Agent-loop proposal requires parent action.'],
    proposed_fixes: ['Route or explicitly reject the agent-loop change proposal before handoff.']
  };
}

function withStructuredOutputNulls(contract: ReturnType<typeof buildCleanContract>): Record<string, unknown> {
  const structured = JSON.parse(JSON.stringify(contract)) as Record<string, unknown>;
  const axes = structured.axes as Record<string, Record<string, unknown>>;
  for (const axis of Object.values(axes)) {
    axis.clean_signal ??= null;
    addEvidenceDescriptions(axis.evidence_refs);
    if (Array.isArray(axis.findings)) {
      for (const finding of axis.findings) {
        if (!isTestRecord(finding)) {
          continue;
        }
        finding.body ??= null;
        addEvidenceDescriptions(finding.evidence_refs);
      }
    }
  }

  if (Array.isArray(structured.code_change_proposals)) {
    for (const proposal of structured.code_change_proposals) {
      if (!isTestRecord(proposal)) {
        continue;
      }
      proposal.unified_diff ??= null;
      if (proposal.target === undefined) {
        proposal.target = null;
      } else if (isTestRecord(proposal.target)) {
        proposal.target.section ??= null;
        proposal.target.function ??= null;
      }
      addEvidenceDescriptions(proposal.evidence_refs);
    }
  }

  if (Array.isArray(structured.agent_loop_proposals)) {
    for (const proposal of structured.agent_loop_proposals) {
      if (!isTestRecord(proposal)) {
        continue;
      }
      proposal.blocking ??= null;
      if (isTestRecord(proposal.routing)) {
        proposal.routing.canonical_owner_key ??= null;
      }
      addEvidenceDescriptions(proposal.evidence_refs);
    }
  }

  return structured;
}

function addEvidenceDescriptions(value: unknown): void {
  if (!Array.isArray(value)) {
    return;
  }
  for (const evidenceRef of value) {
    if (isTestRecord(evidenceRef)) {
      evidenceRef.description ??= null;
    }
  }
}

function isTestRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function validateStructuredOutputSchema(
  candidate: unknown
): Promise<{ valid: boolean; errors: string[] }> {
  const schema = JSON.parse(
    await readFile(join(process.cwd(), 'schemas', 'review-contract.v1.output.schema.json'), 'utf8')
  ) as Record<string, unknown>;
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const valid = validate(candidate);
  return {
    valid,
    errors: valid ? [] : (validate.errors ?? []).map((error) => `${error.instancePath}: ${error.message}`)
  };
}

async function git(cwd: string, args: string[]): Promise<void> {
  await execFileAsync('git', args, { cwd });
}
