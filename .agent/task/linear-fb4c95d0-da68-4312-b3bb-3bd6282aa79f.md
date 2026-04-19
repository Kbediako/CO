# Task Checklist - linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f

- Linear Issue: `CO-223` / `fb4c95d0-da68-4312-b3bb-3bd6282aa79f`
- MCP Task ID: `linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f`
- Canonical task id: `20260418-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f`
- Primary PRD: `docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- TECH_SPEC: `tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- Source anchor: `ctx:sha256:ff78d09226d759620c87d1f1ae2de5782e81e7eda07b01112ef35807344be9b1#chunk:c000001`

## Docs-First
- [x] PRD drafted with the verbatim CO-223 issue prompt and bounded stale top-level tracked fallback framing. Evidence: `docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`.
- [x] TECH_SPEC drafted with the issue-shaping contract, protected seams, readiness gate, and parent-owned validation requirements. Evidence: `tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`, `docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`.
- [x] ACTION_PLAN drafted for parent implementation and closeout. Evidence: `docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`.
- [x] Task checklist and `.agent` mirror drafted within child-lane scope. Evidence: `tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`, `.agent/task/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`.
- [x] Canonical registry mirrors updated within this docs lane. Evidence: `tasks/index.json`, `docs/docs-freshness-registry.json`.
- [x] Parent added the CO-223 `docs/TASKS.md` active-task snapshot row once current `origin/main` had headroom below the cap. Evidence: `docs/TASKS.md` line count `445`.
- [x] Pre-implementation issue-quality review recorded in the TECH_SPEC readiness gate. Evidence: `tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`, `docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`.

## Source / Assumptions
- [x] Shared source anchor recorded. Evidence: `ctx:sha256:ff78d09226d759620c87d1f1ae2de5782e81e7eda07b01112ef35807344be9b1#chunk:c000001`.
- [x] Child lane recorded that the expected shared source payload path is absent in this checkout. Evidence: `docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`, `tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`.
- [x] Child lane recovered the verbatim CO-223 issue prompt via read-only Linear fetch instead of mutating Linear state. Evidence: `docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`, `tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`.
- [x] Exact seams preserved: `tracked.linear`, `controlRuntime.ts`, `selectedRunProjection.ts`, `observabilityReadModel.ts`, `linear-advisory-state.json`, `co-status`, `/api/v1/state`, and `/ui/data.json`. Evidence: `docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`, `tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`.
- [x] Parent/child ownership split recorded. Evidence: the PRD, TECH_SPEC, and ACTION_PLAN.

## Parent Implementation Acceptance
- [x] Reproduce the shape where live dispatch and provider-intake truth are current but persisted advisory fallback still points at an older tracked issue. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/ControlServer.test.ts orchestrator/tests/SelectedRunProjection.test.ts` passed `264/264`, including new CO-223 reproductions in `ControlRuntime.test.ts` and `ControlServer.test.ts` that pin current `CO-196` truth against stale advisory `CO-1`.
- [x] Top-level `tracked.linear` no longer projects stale advisory fallback truth when current dispatch/intake truth is available. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlServer.test.ts`, and the focused `264/264` Vitest run.
- [x] If no authoritative tracked truth is available, the surface fails closed to a truthful empty/null shape instead of leaking stale advisory state. Evidence: `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/tests/ControlRuntime.test.ts`, and the focused `264/264` Vitest run.
- [x] `co-status`, `/api/v1/state`, and `/ui/data.json` stay aligned for this surface. Evidence: `orchestrator/tests/ControlRuntime.test.ts`, `orchestrator/tests/ControlServer.test.ts`, and the focused `264/264` Vitest run.
- [x] Regression coverage distinguishes this bug from `CO-219`, `CO-220`, and `CO-222`. Evidence: new CO-223 regressions in `orchestrator/tests/ControlRuntime.test.ts` and `orchestrator/tests/ControlServer.test.ts`, plus adjacent unchanged boundary coverage in `orchestrator/tests/ControlRuntime.test.ts` and `orchestrator/tests/ProviderIssueHandoff.test.ts`.

## Validation
- [x] Docs child lane scoped JSON syntax check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json` exits `0`.
- [x] Docs child lane scoped whitespace check. Evidence: `git diff --check -- docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md .agent/task/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/index.json docs/docs-freshness-registry.json` exits `0`.
- [x] Docs child lane protected-term check. Evidence: `rg -n "tracked\\.linear|tracked\\.linear\\.identifier|tracked_issue\\.identifier|linear-advisory-state\\.json|controlRuntime\\.ts|selectedRunProjection\\.ts|observabilityReadModel\\.ts|co-status|/api/v1/state|/ui/data\\.json|CO-196|CO-1|CO-219|CO-220|CO-222" docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md .agent/task/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md` exits `0`.
- [x] Parent focused `orchestrator/tests/ControlRuntime.test.ts`. Evidence: 2026-04-19 `npx vitest run --config vitest.config.core.ts orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/ControlServer.test.ts` passed `195/195`.
- [x] Parent focused `orchestrator/tests/ControlServer.test.ts`. Evidence: 2026-04-19 `npx vitest run --config vitest.config.core.ts orchestrator/tests/ControlRuntime.test.ts orchestrator/tests/ControlServer.test.ts` passed `195/195`.
- [x] Parent focused `orchestrator/tests/SelectedRunProjection.test.ts`. Evidence: 2026-04-19 `npx vitest run --config vitest.config.core.ts orchestrator/tests/SelectedRunProjection.test.ts` passed `69/69`.
- [x] Parent aligned `co-status`, `/api/v1/state`, and `/ui/data.json` verification. Evidence: new state and UI assertions in `orchestrator/tests/ControlServer.test.ts`, plus the focused `264/264` Vitest run.
- [ ] Parent docs-review evidence captured before implementation. Evidence: pending parent manifest.
- [x] Parent post-patch `node scripts/spec-guard.mjs --dry-run` captured. Evidence: `node scripts/spec-guard.mjs --dry-run` exits `0` in dry-run mode while reporting unrelated stale `last_review` specs dated `2026-03-19`.
- [x] Parent `node scripts/delegation-guard.mjs`. Evidence: `Delegation guard: OK (1 subagent manifest(s) found).`
- [x] Parent `npm run build`. Evidence: command exits `0`.
- [x] Parent `npm run lint`. Evidence: command exits `0` with unrelated warnings only in `orchestrator/tests/DelegationMcpHealth.test.ts`.
- [ ] Parent `npm run test`. Evidence: 2026-04-19 `npm run test` fails with `6` full-suite 5s timeouts (`5` in `orchestrator/tests/Doctor.test.ts`, `1` in `orchestrator/tests/SelectedRunProjection.test.ts`) after `4082/4088` tests passed; both affected files pass in isolation (`Doctor.test.ts` `47/47`, `SelectedRunProjection.test.ts` `69/69`).
- [x] Parent `npm run docs:check`. Evidence: command exits `0`.
- [ ] Parent `npm run docs:freshness`. Evidence: 2026-04-19 command fails with repo-wide stale-doc debt (`117` stale docs; rolling cohort `CO-175` overdue `6/7` days; no missing registry entries).
- [x] Parent `npm run repo:stewardship`. Evidence: `repo:stewardship OK - 5128 tracked files, 0 action-required`.
- [x] Parent `node scripts/diff-budget.mjs`. Evidence: `✅ Diff budget: OK (scope=working-tree, files=9/25, lines=972/1200, +942/-30)`.
- [x] Parent `npm run pack:smoke`. Evidence: 2026-04-19 `✅ pack smoke passed`.

## Handoff Status
- [x] Child lane leaves packet and registry changes in place for patch export. Evidence: dirty working tree in this child workspace.
- [x] Parent imports or accepts this child-lane patch into the authoritative issue workspace. Evidence: the CO-223 docs packet files and registry mirror updates are present in this workspace and remain part of the working tree.
- [x] Parent handled `docs/TASKS.md` snapshot insertion without archive movement because the refreshed file was below the line cap. Evidence: `docs/TASKS.md`.
- [x] Parent updates Linear workpad with current validation and blocker status. Evidence: Linear workpad comment `2479346c-8844-4e8a-b60d-94dc647bd53a`.
- [x] Parent opened and attached PR and started review lifecycle artifacts. Evidence: PR `#556`, Linear attachment `f24a8e93-aecb-4ae2-b37c-c56551235369`, and CodeRabbit review threads addressed in the parent lane.

## Progress Log
- 2026-04-18: Recovered the verbatim CO-223 issue body via read-only Linear fetch because the expected shared source payload is absent in this checkout.
- 2026-04-18: Preserved the exact seams `tracked.linear`, `controlRuntime.ts`, `selectedRunProjection.ts`, `observabilityReadModel.ts`, `linear-advisory-state.json`, `co-status`, `/api/v1/state`, and `/ui/data.json`.
- 2026-04-18: Captured current repo truth that `controlRuntime.ts` falls back from `selected?.tracked` to advisory-state `tracked_issue`, and that `selectedRunProjection.ts` can seed tracked issue context from advisory snapshots.
- 2026-04-18: Docs child lane left `docs/TASKS.md` untouched because that checkout reported a `450`-line cap constraint; parent lane later added the row once current `origin/main` had headroom.
- 2026-04-18: Transitioned the Linear issue from `Ready` back to `In Progress`, refreshed the single workpad, and recorded `forbid_parallel` / `parent_only_mutation` because the implementation, test, and docs packet files were already dirty and parent-owned in this workspace.
- 2026-04-18: Focused CO-223 validation passed with `264/264` across `ControlRuntime.test.ts`, `ControlServer.test.ts`, and `SelectedRunProjection.test.ts`.
- 2026-04-18: Guardrail/build/docs checks passed for `delegation-guard`, `spec-guard --dry-run`, `build`, `lint`, `docs:check`, `repo:stewardship`, and `diff-budget`.
- 2026-04-18: Validation floor remains blocked by unrelated failures outside the CO-223 diff: isolated `Doctor.test.ts` provider-readiness timeouts, isolated `SelectedRunProjection.test.ts` child-lane reservation proof refresh timeout, and repo-wide `docs:freshness` stale-doc debt. Created follow-up `CO-249` for the SelectedRunProjection timeout; the Doctor timeout cluster remains covered by existing follow-up `CO-232`.
- 2026-04-19: Resumed after the issue was moved back to `Ready`; re-read live Linear context, moved `Ready` -> `In Progress`, refreshed the single workpad, and recorded the active-turn parallelization decision as `stay_serial` / `review_or_validation_only`.
- 2026-04-19: Focused CO-223 validation remains green: `ControlRuntime.test.ts` + `ControlServer.test.ts` passed `195/195`, and `SelectedRunProjection.test.ts` passed `69/69` in isolation.
- 2026-04-19: Full validation floor is still blocked outside the CO-223 diff: `npm run test` fails with `6` full-suite timeout cases while the affected files pass in isolation, and `npm run docs:freshness` fails on repo-wide CO-175 stale-doc debt. No PR opened.
- 2026-04-19: Parent merged current `origin/main`, reran validation green, opened/attached PR `#556`, added the CO-223 `docs/TASKS.md` snapshot row while the file had line-count headroom, and addressed CodeRabbit review feedback on authoritative tracked identity matching plus explicit `/ui/data.json` null assertions.

## Relevant Files
- `docs/PRD-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `docs/TECH_SPEC-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `docs/ACTION_PLAN-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `tasks/specs/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `tasks/tasks-linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `.agent/task/linear-fb4c95d0-da68-4312-b3bb-3bd6282aa79f.md`
- `tasks/index.json`
- `docs/docs-freshness-registry.json`
- `docs/TASKS.md`

## Notes
- Do not broaden into generic dispatch selection redesign unless the parent proves that is the minimal required seam.
- Do not reopen `CO-219`, `CO-220`, or `CO-222` under this issue.
- Do not hide the bug by deleting useful current tracked data.
- Do not treat stale advisory fallback truth as acceptable current queue truth.
