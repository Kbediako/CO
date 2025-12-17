# Action Plan — Evaluation Harness `diff-match` Assertions (Task 0907)

## Phase 0 — Planning + validation (this PR)
- [ ] Draft PRD — `docs/PRD-evaluation-diff-match.md`
- [ ] Draft Tech Spec (includes validation report) — `docs/TECH_SPEC-evaluation-diff-match.md`
- [ ] Draft Action Plan — `docs/ACTION_PLAN-evaluation-diff-match.md`
- [ ] Draft task checklist — `tasks/tasks-0907-evaluation-diff-match.md`
- [ ] Draft mini-spec — `tasks/specs/0907-evaluation-diff-match.md`
- [ ] Update mirrors — `docs/TASKS.md`, `.agent/task/0907-evaluation-diff-match.md`, `tasks/index.json`

## Phase 1 — Harness support (implementation PR)
1) Extend runtime + TS types:
   - Add `diff-match` to `evaluation/harness/types.ts`.
   - Add `agentTask` to `EvaluationScenario` type.
2) Add loader validation:
   - Validate `patternAssertions` entries (including `diff-match` required fields).
   - Validate `agentTask.instruction` shape.
3) Implement evaluation:
   - Implement `diff-match` evaluation with unified diff normalization.
   - Fail loudly on unknown assertion types (no silent skip).
4) Add unit tests for normalization, matching, and unknown-type behavior.

## Phase 2 — Fixture + scenario alignment (implementation PR)
1) Update `evaluation/fixtures/node-api-nplus1`:
   - Add `package.json` and test scripts compatible with `typescript-default`.
   - Add baseline N+1 implementation and tests that enforce the optimized behavior.
2) Align `evaluation/scenarios/backend-api-opt.json`:
   - Ensure `expectedDiff` matches normalized diff produced by the scenario edit.
   - Ensure `agentTask` is consistent with fixture module conventions.

## Phase 3 — Scenario coverage + handoff
1) Extend `evaluation/tests` to exercise `backend-api-opt` and assert `diff-match` results are present.
2) Run guardrails + reviewer handoff:
   - `node scripts/spec-guard.mjs --dry-run`
   - `npm run build`
   - `npm run lint`
   - `npm run test`
   - `npm run eval:test`
   - `npm run docs:check`
   - `npm run review`

