# Task List: CO-450 Codex binary provenance in doctor

## Added by Docs Packet 2026-05-01

## Context
- MCP Task ID: `linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37`
- Primary PRD: `docs/PRD-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- TECH_SPEC: `tasks/specs/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- Summary of scope: Extend `codex-orchestrator doctor` to report active Codex executable path/version, report the Codex.app bundled CLI separately when present, and warn advisory-only on version drift.
- Source anchor: `ctx:sha256:4bb38ecfbfaf8477dbb8461eadaeea6b1f9d89470a325a5106c4cc2cc9baa533#chunk:c000001`
- Workpad: Linear comment `54e50811-73ab-4d03-bade-01519d2324e6`

### Checklist Convention
- Start every task/subtask with `[ ]` and flip it to `[x]` when the acceptance criteria are met, citing evidence.

### Evidence Gates
- [x] Issue-quality review captured (pre-implementation) - Evidence: `tasks/specs/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md` carries the intent checksum, protected terms, non-goals, wrong interpretations, and Not Done If clauses.
- [x] Fallback / refactor decision captured (pre-implementation) - Evidence: `tasks/specs/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md` removes the singular-version doctor seam and retains override/managed selection as a contract.
- [x] Standalone review approval captured - Evidence: `.runs/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37/cli/2026-05-03T03-57-11-257Z-fb1eb1a7/review/telemetry.json` reports bounded success via command-intent retry with no actionable diff-local regressions.
- [x] Implementation review manifest captured - Evidence: `.runs/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37/cli/2026-05-03T03-57-11-257Z-fb1eb1a7/manifest.json`.
- [x] Elegance review captured - Evidence: `out/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37/manual/20260503T051500Z-elegance-review.md`; the P3 cache simplification was applied.

### Progress Log
- 2026-05-01: Created docs-first packet from Linear issue context and source anchor. No source code had been edited before this packet.
- 2026-05-01: Implemented doctor binary provenance reporting and focused tests. Live doctor JSON now reports active `/opt/homebrew/bin/codex` as `codex-cli 0.128.0`, app bundle `/Applications/Codex.app/Contents/Resources/codex` as `codex-cli 0.128.0-alpha.1`, and advisory drift.
- 2026-05-01: Required validation is blocked by baseline debt reproduced on clean `origin/main`: `npm run docs:freshness` fails on CO-444 rolling docs-freshness debt, and `tests/spec-guard.spec.ts -t "external migration cap"` times out on clean main. Follow-up `CO-456` created for the spec-guard timeout.
- 2026-05-03: Resumed after CO-456 landed, fast-forwarded the branch to `origin/main` `0e71d3e13`, replayed the existing CO-450 implementation without conflict, and completed current-head validation. Live workspace doctor JSON reports active `/opt/homebrew/bin/codex` as `codex-cli 0.128.0`, app bundle `/Applications/Codex.app/Contents/Resources/codex` as `codex-cli 0.128.0-alpha.1`, and advisory drift.
- 2026-05-03: Standalone review completed with bounded-success telemetry after the command-intent retry and found no actionable diff-local regressions. The required elegance pass found one P3 simplification to remove module-level provenance probe caches; parent applied it so repeated in-process doctor calls stay fresh.
- 2026-05-03: Post-elegance validation is green, live doctor proof still shows advisory active/app-bundle drift, and final manifest-backed standalone review found no actionable diff-local regressions.

## Parent Tasks
1. Add doctor binary provenance probing.
   - Files: `orchestrator/src/cli/utils/codexCli.ts`, `orchestrator/src/cli/doctor.ts`.
   - Acceptance: active path/version and app-bundle path/version are available in doctor JSON.
   - [x] Status: Complete - Evidence: `orchestrator/src/cli/utils/codexCli.ts`, `orchestrator/src/cli/doctor.ts`, and live `codex-orchestrator doctor --format json | jq '.codex_cli'` output.
2. Add text summary output.
   - Files: `orchestrator/src/cli/doctor.ts`.
   - Acceptance: human doctor output names audited active executable and advisory drift when versions differ.
   - [x] Status: Complete - Evidence: `formatDoctorSummary` now emits active path/version, app bundle status/version, and binary provenance drift.
3. Add focused tests.
   - Files: `orchestrator/tests/Doctor.test.ts` or focused utility tests.
   - Acceptance: no app bundle, matching versions, divergent versions, and explicit `CODEX_CLI_BIN` override are covered.
   - [x] Status: Complete - Evidence: `npm run test:core -- orchestrator/tests/Doctor.test.ts orchestrator/tests/_reproIssueLogTask.test.ts` passed with 71 tests.
4. Run validation and handoff gates.
   - Files: validation/review artifacts.
   - Acceptance: required validation, standalone review, elegance review, PR attach, and ready-review drain are complete before review-state transition.
   - [ ] Status: Validation, review, and elegance gates green; PR handoff pending - Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, focused doctor/repro tests, `npm run test` (359 files / 5262 tests), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `npm run pack:smoke`, live doctor JSON proof, standalone review telemetry, and elegance artifact.

## Relevant Files
- `docs/PRD-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- `docs/TECH_SPEC-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- `docs/ACTION_PLAN-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- `tasks/specs/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- `tasks/tasks-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- `.agent/task/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- `tasks/index.json`
- `docs/docs-freshness-registry.json`
- `orchestrator/src/cli/doctor.ts`
- `orchestrator/src/cli/utils/codexCli.ts`
- `orchestrator/tests/Doctor.test.ts`

## Notes
- This follow-up links to checkout-posture and release-intake lineage by keeping binary drift as a distinct doctor advisory.
- Scope excludes binary switching, install cleanup, managed CLI mutation, and version promotion.
