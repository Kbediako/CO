# PRD — Evaluation Harness `diff-match` Assertions (Task 0907)

## Summary
- Problem Statement: `evaluation/scenarios/backend-api-opt.json` declares a `diff-match` pattern assertion (and an `agentTask`), but the evaluation harness only validates `file-exists` / `file-contains`. Unknown assertion types are silently skipped, so `diff-match` is currently a no-op. Separately, the referenced fixture (`evaluation/fixtures/node-api-nplus1`) is missing the minimal scaffolding expected by the `typescript-default` adapter, so the scenario’s `test` goal fails immediately.
- Desired Outcome: The evaluation harness validates `diff-match` assertions (and fails loudly on unknown types), with aligned scenario + fixture inputs so `backend-api-opt` is meaningful and deterministic.

## Goals
- Add first-class `diff-match` assertion support to the evaluation harness.
- Define and document `diff-match` semantics (diff format + matching policy + normalization rules).
- Decide how/if `agentTask` should be applied to the fixture to make diff assertions meaningful.
- Align `backend-api-opt` + `node-api-nplus1` so adapter goals run and assertions are actually evaluated.
- Add tests that prevent future regressions (unknown assertion types silently skipping).

## Non‑Goals
- AST-aware diffs or language-semantic matching (start with normalized unified diffs).
- Running a full Codex agent loop inside the harness (unless explicitly required later).
- Broad refactors of the evaluation harness unrelated to assertion validation.

## Stakeholders
- Engineering: Orchestrator + evaluation harness maintainers
- Consumers: TF‑GRPO / eval pipelines that rely on scenario assertions to be meaningful

## Metrics & Guardrails
- `backend-api-opt` produces a non-empty `patternAssertions` result for `diff-match` (pass/fail) instead of being skipped.
- Unknown assertion types fail loudly (no silent no-op).
- Fixture scaffolding matches adapter expectations (`typescript-default` can run `npm run test` inside the fixture).
- New unit/integration tests cover `diff-match` and unknown-type behavior.

## Technical Considerations
- Diff strategy: normalized unified diffs are stable and human-auditable, but require careful normalization (hunk headers, line endings).
- Backward compatibility: decide whether unknown assertion types should hard-fail scenario loading vs return a failed assertion result.

## Documentation & Evidence
- Task checklist: `tasks/tasks-0907-evaluation-diff-match.md`
- Tech Spec: `docs/TECH_SPEC-evaluation-diff-match.md`
- Action Plan: `docs/ACTION_PLAN-evaluation-diff-match.md`
- Mini-spec: `tasks/specs/0907-evaluation-diff-match.md`
- Run Manifest: `.runs/0907-evaluation-diff-match/cli/2025-12-17T01-06-46-905Z-070fcac1/manifest.json`

## Open Questions
- Should `diff-match` be “exact unified diff” or “contains these hunks” (substring) by default?
- Should unknown assertion types fail fast at load time, or fail as an assertion result during evaluation?

## Approvals
- Engineering: _(pending)_
- Reviewer: _(pending)_
