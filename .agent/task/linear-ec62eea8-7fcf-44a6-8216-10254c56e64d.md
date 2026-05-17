# Task Checklist - linear-ec62eea8-7fcf-44a6-8216-10254c56e64d

- Linear Issue: `CO-205` / `ec62eea8-7fcf-44a6-8216-10254c56e64d`
- MCP Task ID: `linear-ec62eea8-7fcf-44a6-8216-10254c56e64d`
- Primary PRD: `docs/PRD-linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`
- TECH_SPEC: `tasks/specs/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`
- Source anchor: `ctx:sha256:3b4ea97b5bcc16b71fdd2942cb023f0d4031067c77a83fb0c0c36ff65ba5d8c4#chunk:c000001`

## Docs-First
- [x] PRD drafted for hanging `run-review` mock cleanup. Evidence: `docs/PRD-linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`.
- [x] TECH_SPEC drafted with temp-harness ownership, real-process safety, and process-health validation constraints. Evidence: `tasks/specs/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation. Evidence: `docs/ACTION_PLAN-linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`.
- [x] Registry and mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `.agent/task/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d.md` readiness gate.
- [x] Parent-owned docs-first/review gate completed before implementation. Evidence: accepted same-issue docs child lane `.runs/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d-docs-packet/cli/2026-04-16T10-20-19-149Z-7914bf20/manifest.json`; deterministic guards later passed with `node scripts/spec-guard.mjs --dry-run` and `npm run docs:check`.

## Analysis Evidence Required Before Implementation
- [x] Freshly reproduce the `RUN_REVIEW_MODE=hang` leak or prove the path obsolete on current code. Evidence: focused regression models the orphan path by running `RUN_REVIEW_MODE=hang` with wrapper timeouts disabled, SIGKILLing the wrapper subprocess, and asserting no sandbox `codex-mock.sh review` process remains: `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts -t "reaps hanging fake Codex subprocesses after a subprocess harness timeout"` passed.
- [x] Identify the bounded cleanup ownership seam for `run-review` temp-harness mock children. Evidence: parent implementation is limited to `tests/run-review.spec.ts`; cleanup matches the exact sandbox `codex-mock.sh review` command path and runs after subprocess timeout plus `afterEach` sandbox cleanup.
- [x] Confirm no provider admission, Linear polling, `CO-189`, `CO-203`, or `CO-204` behavior is touched unless shared cleanup path proof exists. Evidence: `git diff --name-only` implementation surface is `tests/run-review.spec.ts` plus docs/task packet files only.

## Implementation Acceptance
- [x] Hanging `RUN_REVIEW_MODE=hang` review mocks are terminated/reaped after timeout. Evidence: `tests/run-review.spec.ts` regression `reaps hanging fake Codex subprocesses after a subprocess harness timeout` passed.
- [x] Cleanup targets only test/mock children owned by the `run-review` temp harness. Evidence: `findRunReviewMockPids(codexBin)` matches only command lines containing the exact temp sandbox `codex-mock.sh review` path.
- [x] Real user review processes are not terminated or hidden. Evidence: no production review-wrapper cleanup path was added; passive `ps` scan still reports the same seven pre-existing PPID=1 mock processes instead of filtering them away.
- [x] Status/process output remains truthful and does not mask leaked processes. Evidence: passive scan command `ps -axo pid,ppid,stat,etime,command | rg '^ *[0-9]+ +1 +[^ ]+ +[^ ]+ +bash .*/run-review-.*/codex-mock\\.sh review'` continued to show the existing orphan set.
- [x] No manual host-only orphan kill is used as the fix. Evidence: the seven pre-existing PPID=1 mock processes were not killed; cleanup is limited to newly-created sandbox mock children during tests.

## Validation
- [x] `jq empty tasks/index.json docs/docs-freshness-registry.json`. Evidence: command exited `0` in the docs child lane.
- [x] Focused `run-review` regression for `RUN_REVIEW_MODE=hang`. Evidence: `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts -t "reaps hanging fake Codex subprocesses after a subprocess harness timeout"` passed (`1` passed, `165` skipped).
- [x] Relevant review-wrapper/run-review test lane. Evidence: `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts -t "fails a silent review process via stall-timeout override|persists timeout telemetry summaries|reaps hanging fake Codex subprocesses"` passed (`3` passed, `163` skipped).
- [x] Passive review drain/process-health scan showing no new orphaned PPID=1 `run-review-*` / `codex-mock.sh` review processes. Evidence: scan remained at the same seven pre-existing orphaned mock processes; no new regression sandbox process remained after focused validation.
- [x] Required standalone review/elegance gates before parent PR handoff. Evidence: `TASK=linear-ec62eea8-7fcf-44a6-8216-10254c56e64d MCP_RUNNER_TASK_ID=linear-ec62eea8-7fcf-44a6-8216-10254c56e64d FORCE_CODEX_REVIEW=1 CODEX_REVIEW_NON_INTERACTIVE=1 ... npm run review -- --uncommitted --title "CO-205 review mock cleanup"` completed with `status=succeeded`, `review_outcome=bounded-success`, and `termination_boundary.kind=command-intent` in `../../.runs/linear-ec62eea8-7fcf-44a6-8216-10254c56e64d/cli/2026-04-16T10-17-05-248Z-09e74e8e/review/telemetry.json`; explicit elegance pass kept the test-only exact-path cleanup and found no simplification needed.
- [x] Required repo validation passed. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test` (`342` files / `3961` tests), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and `DIFF_BUDGET_OVERRIDE_REASON="CO-205 requires the docs-first task packet/registry mirrors plus a bounded run-review regression; no unrelated code paths are included." node scripts/diff-budget.mjs`.
- [x] Downstream pack smoke applicability checked. Evidence: `npm run pack:smoke` not run because the implementation surface is test harness only (`tests/run-review.spec.ts`) plus docs/task packet mirrors; no CLI/package/skills/review-wrapper shipped implementation path was changed.

## Progress Log
- 2026-04-16: Same-issue docs child lane created the docs-first packet and preserved the review-wrapper/mock cleanup contract for parent-owned implementation.
- 2026-04-16: Parent implemented test-harness cleanup for hanging fake Codex children and validated the focused timeout/stall regression path without killing the pre-existing host orphans.
- 2026-04-16: Full repo validation passed, standalone review returned no actionable findings with bounded-success telemetry, and the explicit elegance pass kept the solution test-only and sandbox-path scoped.
