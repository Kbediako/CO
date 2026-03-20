# Task Checklist - 1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment

- MCP Task ID: `1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment`
- Primary PRD: `docs/PRD-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md`
- TECH_SPEC: `tasks/specs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md`

## Docs-first
- [x] PRD drafted for the full parity truthfulness rebaseline. Evidence: `docs/PRD-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md`.
- [x] TECH_SPEC drafted with the bounded fix scope and explicit larger architectural divergences, and the current parity matrix is captured in the findings doc. Evidence: `tasks/specs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md`, `docs/findings/1310-symphony-full-parity-audit-and-closure-truthfulness-reassessment-deliberation.md`.
- [x] ACTION_PLAN drafted for the audit-plus-bounded-fix lane. Evidence: `docs/ACTION_PLAN-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md`.
- [x] Deliberation/findings captured with the parity matrix. Evidence: `docs/findings/1310-symphony-full-parity-audit-and-closure-truthfulness-reassessment-deliberation.md`.
- [x] `tasks/index.json` updated with the new TECH_SPEC entry and review date. Evidence: `tasks/index.json`.
- [x] `docs/TASKS.md` updated with the new truthful snapshot. Evidence: `docs/TASKS.md`.
- [x] Checklist mirrored to `.agent/task/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md`. Evidence: `.agent/task/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md`.
- [x] `docs/docs-freshness-registry.json` updated for the new docs/task artifacts. Evidence: `docs/docs-freshness-registry.json`.
- [x] Delegation scout evidence preserved for the umbrella lane. Evidence: subagent streams `019d09f1-8746-75c0-a983-d39b5ad7ad1f`, `019d09f1-8bf9-7291-b262-0f3a794a89d3`, `019d09f1-906e-73f0-bdf0-45e2a7bdb7d5`, `019d09f1-94ca-76d1-bd55-7997f732ba4e`, `019d09f1-992e-7a90-a2e9-cca6524551e6`.
- [x] docs-review approval or explicit waiver captured for `1310`. Evidence: `.runs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/cli/2026-03-20T07-01-33-456Z-4d336e2b/manifest.json`.

## Implementation
- [x] Full parity matrix recorded and any over-broad prior parity wording updated. Evidence: `docs/findings/1310-symphony-full-parity-audit-and-closure-truthfulness-reassessment-deliberation.md`, `docs/TASKS.md`.
- [x] Fresh accepted active-issue events are no longer hard-blocked only because the latest child run previously succeeded. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `.runs/local-mcp/cli/control-host/provider-intake-state.json`, `.runs/linear-856c1318-524f-4db3-8d4a-b357ec51c304/cli/2026-03-20T07-29-36-397Z-acb7e8c2/manifest.json`, `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/13-live-provider-proof.md`.
- [x] Failed relaunch claims no longer suppress same-timestamp retries when only completed evidence should gate duplicate accepted events. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`, `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/05-targeted-tests.log`.
- [x] Selected-run/status rendering no longer surfaces stale failure summaries for a now-succeeded child manifest. Evidence: `orchestrator/src/cli/control/selectedRunProjection.ts`, `orchestrator/tests/SelectedRunProjection.test.ts`, `.runs/linear-856c1318-524f-4db3-8d4a-b357ec51c304/cli/2026-03-19T11-53-42-683Z-10f53643/manifest.json`, `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/13-live-provider-proof.md`.
- [x] Larger architecture-level gaps remain explicitly documented instead of being misreported as closed. Evidence: `docs/findings/1310-symphony-full-parity-audit-and-closure-truthfulness-reassessment-deliberation.md`, `tasks/specs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment.md`, `docs/TASKS.md`.

## Validation
- [x] Targeted provider-intake and observability regressions pass. Evidence: `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/05-targeted-tests.log`.
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/03-build.log`.
- [x] `npm run lint`. Evidence: `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/04-lint.log`.
- [x] `npm run test`. Evidence: `.runs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/cli/2026-03-20T08-26-40-772Z-86354197/manifest.json`.
- [x] `npm run docs:check`. Evidence: `.runs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/cli/2026-03-20T08-26-40-772Z-86354197/manifest.json`.
- [x] `npm run docs:freshness`. Evidence: `.runs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/cli/2026-03-20T08-26-40-772Z-86354197/manifest.json`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `.runs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/cli/2026-03-20T08-26-40-772Z-86354197/manifest.json`, `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/09-diff-budget-override.md`.
- [x] `npm run review`. Evidence: `.runs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/cli/2026-03-20T08-26-40-772Z-86354197/manifest.json`, `.runs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/cli/2026-03-20T08-26-40-772Z-86354197/review/telemetry.json`, `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/14-review-waiver.md`.
- [x] `npm run pack:smoke` if required by touched surfaces. Evidence: `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/11-pack-smoke.log`.
- [x] Live provider proof against the existing control host captured. Evidence: `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/13-live-provider-proof.md`.
- [x] Explicit elegance review pass recorded. Evidence: `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/12-elegance-review.md`.
- [x] Final implementation-gate rerun reached terminal state and is recorded, with the only failed stage being the documented review-wrapper dwell boundary. Evidence: `.runs/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/cli/2026-03-20T08-26-40-772Z-86354197/manifest.json`, `out/1310-coordinator-symphony-full-parity-audit-and-closure-truthfulness-reassessment/manual/20260320T072319Z-closeout/14-review-waiver.md`.
- [ ] Unresolved actionable review threads verified as `0`, or waiver recorded with evidence, before merge. Evidence: pending.
