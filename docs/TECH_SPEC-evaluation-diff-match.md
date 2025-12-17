# Technical Spec — Evaluation Harness `diff-match` Assertions (Task 0907)

## Objective
Make `diff-match` pattern assertions real (validated and test-covered) and ensure evaluation scenarios/fixtures are aligned so assertions provide meaningful signals instead of silently no-op’ing.

## Validation Report (current state)

### 1) `diff-match` is a silent no-op today
- Scenario declares `diff-match`: `evaluation/scenarios/backend-api-opt.json`.
- Harness type system excludes it: `evaluation/harness/types.ts` only defines `file-exists` / `file-contains`.
- Runtime evaluator ignores unknown types: `evaluation/harness/index.ts` only pushes results for `file-exists` and `file-contains` and has no `else` branch, so unknown assertion types yield no `PatternAssertionResult`.
- Scenario loader does not validate `patternAssertions` shape/types: `evaluation/harness/scenario-loader.ts` only validates required top-level fields.

Observed behavior (manual run):
- Running the scenario produces `patternAssertions: []` even though the scenario declares a `diff-match` assertion.

Repro command + excerpted output:
- Command:
  - `node --loader ts-node/esm -e "import { runScenario } from './evaluation/harness/index.ts'; const result = await runScenario('backend-api-opt', { mode: 'mcp' }); console.log(JSON.stringify({ goals: result.goals.map(g => ({ goal: g.goal, status: g.status, exitCode: g.exitCode, error: g.error })), patternAssertions: result.patternAssertions }, null, 2));"`
- Output excerpt:
  - `patternAssertions: []`

### 2) `agentTask` exists in the scenario but is unused
- `backend-api-opt` declares an `agentTask`, but the harness does not read or apply it.
- There are no references to `agentTask` in `evaluation/harness/**` today.

### 3) `backend-api-opt` fixture is incomplete for the adapter goal
- `backend-api-opt` uses adapter `typescript-default` with goal `test`, which runs `npm run test` inside the fixture.
- `evaluation/fixtures/node-api-nplus1` contains only `src/**` and no `package.json`, so `npm run test` fails with ENOENT.

Fixture contents today:
- `evaluation/fixtures/node-api-nplus1/src/db.ts`
- `evaluation/fixtures/node-api-nplus1/src/routes/users.ts`

### 4) Scenario intent vs fixture content are misaligned
- The `backend-api-opt` `expectedDiff` describes removing an N+1 loop and adding a “fetch all posts then map/filter” implementation.
- The fixture file `evaluation/fixtures/node-api-nplus1/src/routes/users.ts` already contains the “fetch all posts then map/filter” implementation, so the diff described by `expectedDiff` cannot be produced against the current fixture baseline.
- The scenario `agentTask` writes a file that differs from the fixture’s current module/style conventions (e.g., `../db` vs `../db.js`, lack of TypeScript request/response types).

### 5) `npm run eval:test` does not currently exercise `diff-match`
- `npm run eval:test` passes today, but the existing suite does not assert that `patternAssertions` are evaluated for `backend-api-opt`.
- This allows `diff-match` to silently regress (or remain unimplemented) without test coverage.

## Proposed Semantics

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

Execution order inside `runScenario` (planned):
1) Prepare fixture working directory (copy if needed).
2) Capture baseline file snapshot(s) needed for `diff-match` assertions.
3) Apply `agentTask` (if present).
4) Execute adapter goals (build/test/lint/etc).
5) Evaluate `patternAssertions` (including `diff-match`) against final state + baseline snapshot.

## Backward Compatibility + Failure Policy
Current behavior silently skips unknown assertion types. This is unsafe for evaluation correctness.

Proposed policy:
- Unknown assertion types fail loudly.
  - Preferred: include a `PatternAssertionResult` with `status: 'failed'` and `details: unknown assertion type`.
  - Alternative: fail fast during scenario load with a clear error (stricter; may break existing scenario files sooner).

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
  - unknown assertion type yields a failure result
- Integration:
  - run `backend-api-opt` end-to-end in `evaluation/tests` once fixture/scenario are aligned.

## Implementation Notes (future PR)
- Prefer a pure TypeScript diff generator (or a well-scoped dependency) to avoid shelling out to `git diff`.
- Keep diff output truncation consistent with existing harness STDIO truncation patterns.
