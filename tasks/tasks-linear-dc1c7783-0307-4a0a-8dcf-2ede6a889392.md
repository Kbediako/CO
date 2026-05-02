# Task Checklist - linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392

- Linear Issue: `CO-473` / `dc1c7783-0307-4a0a-8dcf-2ede6a889392`
- Task registry id: `20260502-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392`
- MCP Task ID: `linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392`
- Primary PRD: `docs/PRD-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`
- TECH_SPEC: `tasks/specs/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`
- Child lane manifest: `.runs/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392-docs-packet/cli/2026-05-02T10-13-30-750Z-22643d24/manifest.json`
- Expected child patch: `.runs/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392-docs-packet/cli/2026-05-02T10-13-30-750Z-22643d24/provider-linear-child-lane.patch`
- Source anchor: `ctx:sha256:8605482f091c307d8fc7505b7287a4a4315a06964f7bd7a1789d330806a70534#chunk:c000001`

## Docs-First
- [x] PRD drafted with intent checksum, parity matrix, explicit non-goals, Not Done If, current evidence, and fallback/refactor decisions. Evidence: `docs/PRD-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, readiness gate, technical requirements, fallback/refactor decisions, and validation plan. Evidence: `tasks/specs/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`, `docs/TECH_SPEC-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`.
- [x] ACTION_PLAN drafted for parent closeout sequencing. Evidence: `docs/ACTION_PLAN-linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392.md`.
- [x] Task registration mirrors updated in declared scope. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Parent docs-review or equivalent packet review completed. Evidence: manifest-backed standalone review succeeded with `review_outcome=bounded-success` in `.runs/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392/cli/2026-05-02T10-08-57-509Z-30f2a4c9/review/telemetry.json`.

## Protected Issue Terms
- [x] `CODEX_REVIEW_AUTHORITATIVE_GATE=1`
- [x] `FORCE_CODEX_REVIEW=1`
- [x] `prompt-only noninteractive review handoff`
- [x] `command-surface regression`
- [x] `tests/cli-command-surface.spec.ts`
- [x] `review wrapper authoritative gate`
- [x] `provider-worker environment`
- [x] `clean-main repro`

## Child Lane Scope
- [x] Stayed docs-only. Evidence: no source, tests, package metadata, Linear, PR lifecycle, or workpad files were edited by this child lane.
- [x] Source payload absence recorded. Evidence: source payload path from the parent brief was not present in this child checkout; packet is anchored on source anchor `ctx:sha256:8605482f091c307d8fc7505b7287a4a4315a06964f7bd7a1789d330806a70534#chunk:c000001` and parent-provided issue contract.
- [x] Fallback-expiry decisions recorded. Evidence: packet records `remove fallback` for ambient authoritative-gate env leaking into the command-surface regression and `justify retaining fallback` for non-authoritative prompt-only handoff plus authoritative execution via `FORCE_CODEX_REVIEW=1`.

## Parent-Owned Implementation / Closeout
- [x] Decide whether current-main focused pass evidence is sufficient for docs/evidence-only closeout. Evidence: parent inspection found current main already pins `FORCE_CODEX_REVIEW=0`, `CODEX_REVIEW_AUTHORITATIVE_GATE=0`, and noninteractive review env in `tests/cli-command-surface.spec.ts`; no source/test patch was needed.
- [x] Preserve equivalent `tests/cli-command-surface.spec.ts` regression coverage. Evidence: focused command-surface test passed under ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1`.
- [x] Preserve review wrapper authoritative gate fail-closed semantics. Evidence: `npx vitest run tests/run-review.spec.ts -t "rejects prompt-only non-interactive handoff under the authoritative review gate"` passed, and `npx vitest run tests/review-non-interactive-handoff.spec.ts` passed.
- [x] Keep CO-468 recovery behavior out of scope. Evidence: staged diff is docs/task metadata only; no CO-468 recovery files changed.

## Validation
- [x] Focused current-main repro passed under ambient authoritative gate. Evidence: `CODEX_REVIEW_AUTHORITATIVE_GATE=1 npx vitest run tests/cli-command-surface.spec.ts -t "launches review via the CLI shell in non-interactive handoff mode"` passed with 1 test passed and 120 skipped on 2026-05-02.
- [x] JSON parse check for `tasks/index.json` and `docs/docs-freshness-registry.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8')); console.log('json ok')"` returned `json ok`.
- [x] Scoped whitespace check. Evidence: `git diff --check -- <tracked mirror files>` returned clean and `rg -n "[[:blank:]]+$" <declared files>` found no trailing whitespace.
- [x] Protected-term coverage scan. Evidence: scoped scan found all protected terms across packet files and mirrors.
- [x] Scoped status review confirms edits stayed inside declared file scope. Evidence: `git status --short` shows only the declared docs packet and registry mirror files.
- [x] Full provider-worker validation no longer fails this baseline. Evidence: `npm run test` passed after child patch acceptance with 359 files and 5250 tests; `tests/cli-command-surface.spec.ts` passed.
- [x] Repo validation gates passed. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `git diff --check`, and JSON parse checks passed.
- [x] Standalone review completed. Evidence: review telemetry `status=succeeded`, `review_outcome=bounded-success`, `termination_boundary.kind=command-intent`, no actionable regressions.
- [x] Elegance/minimality pass completed. Evidence: direct `codex review` prompt-only elegance pass session `019de846-3377-7953-8da5-ddd4176ebb65` found no actionable minimality findings; artifact `out/linear-dc1c7783-0307-4a0a-8dcf-2ede6a889392/manual/elegance-review.md`.

## Progress Log
- 2026-05-02: Bounded same-issue docs child lane created the CO-473 docs-first packet and declared mirrors only. The packet preserves `CODEX_REVIEW_AUTHORITATIVE_GATE=1`, `FORCE_CODEX_REVIEW=1`, `prompt-only noninteractive review handoff`, `command-surface regression`, `tests/cli-command-surface.spec.ts`, `review wrapper authoritative gate`, `provider-worker environment`, and `clean-main repro`.
- 2026-05-02: Focused current-main repro passed under ambient `CODEX_REVIEW_AUTHORITATIVE_GATE=1`, proving the command-surface test isolates gate env for the prompt-only handoff case while preserving fail-closed production semantics as an explicit non-goal.
- 2026-05-02: Child lane scoped validation passed: JSON parse, tracked-file `git diff --check`, full declared-file trailing whitespace scan, protected-term scan, and scoped status review.
- 2026-05-02: Parent accepted the docs child patch, confirmed no source/test change was required, ran focused and full provider-worker validation green, completed manifest-backed standalone review as `bounded-success`, and completed an explicit elegance review with no simplification patch.

## Notes
- NOTES: Goal: Complete CO-473 docs/evidence closeout for review-wrapper command-surface authoritative-gate env isolation. | Summary: Current main already isolates the focused command-surface subprocess env; the branch adds traceability packet and mirrors only, with focused/full validation, standalone review, and elegance review green. | Risks: Do not weaken authoritative-gate fail-closed semantics, do not treat prompt-only handoff as success under authoritative gate, do not delete equivalent regression coverage, and do not widen into CO-468 recovery changes.
