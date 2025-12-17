# Technical Spec — Evaluation Harness `diff-match` Assertions (Task 0907)

## Objective
Make `diff-match` pattern assertions real (validated and test-covered) and ensure evaluation scenarios/fixtures are aligned so assertions provide meaningful signals instead of silently no-op’ing.

## Validation Report

### Pre‑implementation (baseline)

#### 1) `diff-match` was a silent no-op
- Scenario declares `diff-match`: `evaluation/scenarios/backend-api-opt.json`.
- Harness type system excluded it: `evaluation/harness/types.ts` only defined `file-exists` / `file-contains`.
- Runtime evaluator ignored unknown types: `evaluation/harness/index.ts` only pushed results for `file-exists` and `file-contains` and had no `else` branch, so unknown assertion types yielded no `PatternAssertionResult`.
- Scenario loader did not validate `patternAssertions` shape/types: `evaluation/harness/scenario-loader.ts` only validated required top-level fields.

Observed behavior (manual run):
- Running the scenario produces `patternAssertions: []` even though the scenario declares a `diff-match` assertion.

Repro command + excerpted output:
- Command:
  - `node --loader ts-node/esm -e "import { runScenario } from './evaluation/harness/index.ts'; const result = await runScenario('backend-api-opt', { mode: 'mcp' }); console.log(JSON.stringify({ goals: result.goals.map(g => ({ goal: g.goal, status: g.status, exitCode: g.exitCode, error: g.error })), patternAssertions: result.patternAssertions }, null, 2));"`
- Output excerpt:
  - `patternAssertions: []`

#### 2) `agentTask` existed in the scenario but was unused
- `backend-api-opt` declares an `agentTask`, but the harness does not read or apply it.
- There are no references to `agentTask` in `evaluation/harness/**` today.

#### 3) `backend-api-opt` fixture was incomplete for the adapter goal
- `backend-api-opt` uses adapter `typescript-default` with goal `test`, which runs `npm run test` inside the fixture.
- `evaluation/fixtures/node-api-nplus1` contains only `src/**` and no `package.json`, so `npm run test` fails with ENOENT.

#### 4) Scenario intent vs fixture content were misaligned
- The `backend-api-opt` `expectedDiff` describes removing an N+1 loop and adding a “fetch all posts then map/filter” implementation.
- The fixture implementation and the scenario `agentTask` were out of sync, so the diff described by `expectedDiff` could not be produced against the fixture baseline.
- The scenario `agentTask` writes a file that differs from the fixture’s current module/style conventions (e.g., `../db` vs `../db.js`, lack of TypeScript request/response types).

#### 5) `npm run eval:test` did not exercise `diff-match`
- `npm run eval:test` passes today, but the existing suite does not assert that `patternAssertions` are evaluated for `backend-api-opt`.
- This allows `diff-match` to silently regress (or remain unimplemented) without test coverage.

### Post‑implementation (this PR)
- `diff-match` assertions are validated and evaluated in `evaluation/harness/types.ts`, `evaluation/harness/index.ts`, and `evaluation/harness/scenario-loader.ts`.
- `backend-api-opt` is runnable and deterministic: `evaluation/fixtures/node-api-nplus1` now includes a minimal `package.json` + a test that fails on the baseline N+1 implementation and passes after the scenario `agentTask` is applied.
- `npm run eval:test` exercises `backend-api-opt` and asserts a non-empty `patternAssertions` result for `diff-match`.

## Semantics

### `diff-match` assertion
Add a new `PatternAssertion` variant:
- `type: 'diff-match'`
- `path: string`
- `expectedDiff: string`
- `scope?: 'fixture' | 'repo'`
- `note?: string` (optional parity with other assertion types)

Interpretation:
1) Capture a “baseline” snapshot of the target file contents before any scenario edits are applied.
2) At evaluation time, compute a unified diff between the baseline snapshot and the final file contents.
3) Normalize the diff to reduce false negatives:
   - normalize line endings to `\n`
   - strip file header lines (`---` / `+++`)
   - replace hunk headers `@@ -a,b +c,d @@` with `@@ ... @@` so scenarios can use stable placeholders
4) Match policy:
   - default: `expectedDiff` must be a substring of the normalized diff output (supports asserting a single hunk within a larger patch)
   - (optional later): `match: 'exact'` to require full normalized diff equality

Failure modes:
- If the target file is missing in both baseline and final → fail with “file missing”.
- If the diff is empty but `expectedDiff` is non-empty → fail.
- If the diff is non-empty but does not contain `expectedDiff` → fail with a truncated diff preview for debugging.

### `agentTask` application (to make diffs meaningful)
Extend `EvaluationScenario` to include:
- `agentTask?: { instruction: string }`

Minimal interpreter (phase 1):
- Support `WRITE|<relativePath>|<fileContents>`
- Apply inside the scenario fixture working directory, creating parent directories as needed.

Execution order inside `runScenario`:
1) Prepare fixture working directory (copy if needed).
2) Capture baseline file snapshot(s) needed for `diff-match` assertions.
3) Apply `agentTask` (if present).
4) Execute adapter goals (build/test/lint/etc).
5) Evaluate `patternAssertions` (including `diff-match`) against final state + baseline snapshot.

## Backward Compatibility + Failure Policy
Current behavior silently skips unknown assertion types. This is unsafe for evaluation correctness.

Policy:
- Unknown assertion types fail loudly:
  - scenario loader rejects unknown types with an actionable error (`scenario id` + `sourcePath`)
  - runtime throws if an unknown type is encountered (e.g., via an inline scenario)

## Fixture + Scenario Alignment (required for meaningful coverage)

### `evaluation/fixtures/node-api-nplus1`
Bring fixture to minimum viability for `typescript-default`:
- Add `package.json` with `npm run test` (and optionally `build` / `lint`) scripts.
- Add tests that detect the N+1 behavior in the baseline and pass after optimization.
  - Example approach: instrument `db.getPostsForUser` calls and assert it is not called per-user in the optimized implementation.

### `evaluation/scenarios/backend-api-opt.json`
Align to the fixture:
- Ensure the fixture baseline starts with an N+1 implementation.
- Ensure `agentTask` writes the optimized implementation consistent with the fixture’s module conventions.
- Ensure `expectedDiff` matches the diff produced by applying the `agentTask` to the baseline file (after normalization rules).

## Acceptance Criteria
- A `diff-match` assertion yields a pass/fail result; it is never silently skipped.
- Unknown assertion types fail loudly (no silent no-op).
- `backend-api-opt` is runnable and deterministic:
  - fixture contains adapter-required scaffolding
  - scenario produces a `diff-match` result
  - tests pass once the `agentTask` edit is applied
- Unit tests cover diff normalization/matching and unknown assertion types.
- `npm run eval:test` includes coverage that would fail if `diff-match` regresses to a no-op.

## Test Plan
- Unit:
  - diff normalization transforms `@@ -1,2 +3,4 @@` → `@@ ... @@`
  - substring match passes/fails as expected
  - unknown assertion type fails loudly (throws)
- Integration:
  - run `backend-api-opt` end-to-end in `evaluation/tests` once fixture/scenario are aligned.

## Implementation Notes
- Use a pure TypeScript diff generator (no `git diff`) to keep output deterministic and cross-platform.
- Keep diff output truncation consistent with existing harness STDIO truncation patterns.
