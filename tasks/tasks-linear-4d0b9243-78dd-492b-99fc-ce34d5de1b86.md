# Task Checklist - linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86

- Linear Issue: `CO-407` / `4d0b9243-78dd-492b-99fc-ce34d5de1b86`
- MCP Task ID: `linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86`
- Primary PRD: `docs/PRD-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md`
- TECH_SPEC: `tasks/specs/linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86-co-status-healthy-ui-timeout.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md`

## Docs-First
- [x] PRD drafted with protected terms and non-goals. Evidence: `docs/PRD-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, parity matrix, fallback decision table, Not Done If, and validation plan. Evidence: `tasks/specs/linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86-co-status-healthy-ui-timeout.md`.
- [x] ACTION_PLAN drafted for parent-owned implementation sequencing. Evidence: `docs/ACTION_PLAN-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md`.
- [x] Task registration mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`.

## Protected Issue Terms
- [x] `co-status --format json`
- [x] `healthy control host`
- [x] `provider intake fresh`
- [x] `slow /ui/data.json`
- [x] `control-host ui request timeout after 15000ms`
- [x] `stale endpoint/dead-port recovery`
- [x] `CO-246`
- [x] `CO-404`
- [x] `CO-406`

## Evidence Gates
- [x] Issue-quality review captured - Evidence: scoped TECH_SPEC carries user-request translation, protected terms, wrong interpretations, non-goals, parity matrix, and `Not done if` clauses.
- [x] Fallback / refactor decision captured - Evidence: scoped TECH_SPEC removes same-endpoint slow-read-as-dead-endpoint behavior and justifies retaining stale/dead endpoint recovery only for stale/dead endpoints.
- [x] Durable retention evidence captured - Evidence: scoped TECH_SPEC records `stale endpoint/dead-port recovery` as a durable recovery contract with a CO-407 negative boundary.
- [x] Standalone review approval captured - Evidence: `FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 npm run review -- --uncommitted` produced `review_outcome=bounded-success` in `../../.runs/linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86/cli/2026-04-28T03-36-30-568Z-9921d792/review/telemetry.json` with no actionable findings.
- [x] Docs-review manifest captured - Evidence: `.runs/linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86-docs-review/cli/2026-04-28T04-00-54-422Z-c41e56c9/manifest.json`; `delegation-guard` and `docs:check` passed, packet-local missing registry rows were fixed in `docs/docs-freshness-registry.json`, and out-of-scope terminal owner debt was filed as CO-413.
- [x] Implementation review manifest captured - Evidence: `../../.runs/linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86/cli/2026-04-28T03-36-30-568Z-9921d792/manifest.json` and review telemetry above.

## Parent-Owned Implementation
1. [x] Verify live CO-407 issue text and related `CO-246`, `CO-404`, and `CO-406` boundaries. Evidence: live `issue-context` read before transition plus scoped packet preserved related boundaries.
2. [x] Locate the direct `co-status --format json` `/ui/data.json` timeout classification path. Evidence: `orchestrator/src/cli/coStatusCliShell.ts` delegates direct JSON reads through `readUiDatasetWithEndpointRecovery` with same-endpoint timeout recovery.
3. [x] Preserve `healthy control host` and `provider intake fresh` evidence when `/ui/data.json` is slow. Evidence: focused slow-live regression expects degraded local provider-intake projection after current endpoint timeout.
4. [x] Emit `control-host ui request timeout after 15000ms` as an auditable timeout/degraded-read reason. Evidence: direct JSON timeout messages still resolve to `degraded_read.reason=ui_request_timeout`; the default request budget is shortened so the degraded payload returns before 15s monitors expire.
5. [x] Keep `stale endpoint/dead-port recovery` scoped to stale/dead endpoint cases. Evidence: focused attach suite still passes, and slow-live regression asserts stale endpoint guidance is absent.
6. [x] Add focused healthy-host slow UI read, stale/dead endpoint boundary, and related issue boundary validation. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/CoStatusCliShell.test.ts` and `npx vitest run --config vitest.config.core.ts orchestrator/tests/CoStatusAttachCliShell.test.ts`.

## Validation
- [x] JSON parse check for `tasks/index.json`. Evidence: `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('tasks/index.json','utf8')); console.log('tasks/index.json ok')"` returned `tasks/index.json ok`.
- [x] Protected-term coverage check over touched docs. Evidence: fixed-string check for `co-status --format json`, `healthy control host`, `provider intake fresh`, `slow /ui/data.json`, `control-host ui request timeout after 15000ms`, `stale endpoint/dead-port recovery`, `CO-246`, `CO-404`, and `CO-406` returned `protected terms ok`.
- [x] `git diff --check` over touched files. Evidence: temporary-index `git add -N` plus `git diff --check -- <touched files>` exited 0, covering new untracked packet files without staging them in the real index.
- [x] Parent-owned focused implementation tests. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/CoStatusCliShell.test.ts` passed 24 tests; `npx vitest run --config vitest.config.core.ts orchestrator/tests/CoStatusAttachCliShell.test.ts` passed 17 tests.
- [x] Required build/lint/test gates. Evidence: `node scripts/delegation-guard.mjs` passed; `node scripts/spec-guard.mjs --dry-run` passed; `npm run build` passed; `npm run lint` exited 0 with three unrelated `DelegationMcpHealth.test.ts` warnings; `npm run test` passed 357 files / 5028 tests.
- [x] Docs/stewardship/diff gates recorded. Evidence: `npm run docs:check` passed; `npm run docs:freshness` passed after the external freshness owner repair landed on `origin/main`; `npm run repo:stewardship` passed with 0 action-required; `node scripts/diff-budget.mjs` passed.
- [x] Pack smoke completed for CLI surface. Evidence: `npm run pack:smoke` exited 0.
- [x] Elegance/minimality pass completed. Evidence: explicit post-review pass kept the solution to one direct JSON timeout constant plus focused tests and avoided a broader status payload/cache refactor.
- [x] Parent-owned review and PR handoff gates. Evidence: manifest-backed review `.runs/linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86/cli/2026-04-29T16-05-52-615Z-c1d6a099/review/telemetry.json` reported clean success after the earlier P2 test-timing finding was fixed; PR attachment and ready-review drain are tracked in the Linear workpad.

## Progress Log
- 2026-04-28: Created docs-first packet from child prompt protected terms. The exact source payload at `../../.runs/linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86-docs-packet-v2/cli/2026-04-28T03-51-01-395Z-61ba3248/memory/source-0/source.txt` existed but contained run metadata rather than the full CO-407 issue body.
- 2026-04-28: Registered scoped TECH_SPEC path, task checklist, `.agent` mirror, `tasks/index.json`, and `docs/TASKS.md` snapshot. No Linear/GitHub/PR lifecycle surfaces were mutated.
- 2026-04-29: Parent lane merged current `origin/main`, revalidated the implementation after external docs-freshness owner debt was cleared, fixed the standalone-review P2 test timing concern, and recorded clean post-fix review evidence.

## Relevant Files
- docs/PRD-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md
- tasks/specs/linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86-co-status-healthy-ui-timeout.md
- docs/ACTION_PLAN-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md
- tasks/tasks-linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md
- .agent/task/linear-4d0b9243-78dd-492b-99fc-ce34d5de1b86.md
- tasks/index.json
- docs/TASKS.md

## Notes
- No `docs/TECH_SPEC...` mirror was created because it is outside this child lane's declared file scope.
- Source anchor from parent prompt: `ctx:sha256:0469f0fce87dca2b1ef6b83b99569cf3463b6cf58d7dabd117e4d82cec619071#chunk:c000001`.
- Subagent usage: This is already a bounded same-issue child lane; no nested delegation was launched from this docs-only packet scope.
