# Task Checklist - linear-4b6dd62c-dd51-4edc-89e3-24c773d93124

- Linear Issue: `CO-242` / `4b6dd62c-dd51-4edc-89e3-24c773d93124`
- MCP Task ID: `linear-4b6dd62c-dd51-4edc-89e3-24c773d93124`
- Primary PRD: `docs/PRD-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`
- Task spec: `tasks/specs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, and the saved workpad source were drafted or refreshed for `CO-242`. Evidence: `docs/PRD-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `docs/TECH_SPEC-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `docs/ACTION_PLAN-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `tasks/specs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `tasks/tasks-linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `.agent/task/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/workpad.md`.
- [x] Standalone pre-implementation self-review notes were captured in the task spec before coding. Evidence: `tasks/specs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124.md`.
- [x] docs-review approval captured for `linear-4b6dd62c-dd51-4edc-89e3-24c773d93124`, or a truthful manual fallback recorded if the child stream stops on an existing repo baseline. Evidence: `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/20260418T0548Z-docs-review-fallback.md`, `.runs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/cli/2026-04-18T05-48-25-732Z-f5e259ca/manifest.json`, `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/docs-freshness-maintenance.json`.

## Workflow
- [x] Issue is in the live started state (`In Progress`) before active coding. Evidence: packaged `linear issue-context` followed by packaged `linear transition --state "In Progress"` on `2026-04-18`.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: packaged `linear upsert-workpad` created comment `4250dafd-5ed6-47d2-9577-a0d0069decc8`, `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/workpad.md`.
- [x] Exactly one explicit same-turn parallelization decision was recorded for the active turn. Evidence: packaged `linear parallelization` recorded `parallelize_now` / `independent_scope_available` for `CO-242` on `2026-04-18`.
- [x] Same-turn same-issue child-lane evidence is captured, or the runtime blocker is recorded truthfully when the provider-worker manifest cannot satisfy the child-lane provenance contract. Evidence: current launch attempt `co-242-docs` failed closed with `provider_worker_child_lane_provenance_invalid`, and the same direct docs-review helper attempt failed closed with `provider_worker_child_stream_provenance_invalid`, because the parent manifest lacks `provider_control_host_*` provenance; see `.runs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/cli/2026-04-18T05-35-22-749Z-3e368e6f/provider-linear-worker-linear-audit.jsonl`, `.runs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/cli/2026-04-18T05-35-22-749Z-3e368e6f/manifest.json`, and `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/20260418T0548Z-docs-review-fallback.md`.
- [x] Work is isolated in the issue worktree `linear/co-242-startup-anchor-standalone-review`. Evidence: `/Users/kbediako/Code/CO/.workspaces/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124`.

## Investigation
- [x] Fresh startup-anchor / pre-anchor-meta-surface evidence is reproduced and cited beyond the issue description. Evidence: `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/20260418T1616Z-startup-anchor-audit.json`, `.runs/linear-5570250a-1361-4af0-857c-119649b902ab/cli/2026-04-18T02-46-06-691Z-d566012b/review/telemetry.json`, `.runs/linear-5570250a-1361-4af0-857c-119649b902ab/cli/2026-04-18T02-46-06-691Z-d566012b/review/output.log`.
- [x] The touched startup-anchor seam is narrowed before implementation so the fix stays distinct from the older command-intent lineage. Evidence: `scripts/lib/review-meta-surface-normalization.ts`, `tests/review-meta-surface-normalization.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`.

## Implementation
- [x] The smallest truthful startup-anchor fix is landed without weakening boundary accounting. Evidence: `scripts/lib/review-meta-surface-normalization.ts`, `tests/review-meta-surface-normalization.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`.
- [x] Focused regressions cover the touched startup-anchor seam and adjacent telemetry truth. Evidence: `tests/review-meta-surface-normalization.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, `npm run test`.
- [x] Before/after evidence shows reduced residual `startup-anchor` / `pre-anchor-meta-surface` recurrence. Evidence: `.runs/linear-5570250a-1361-4af0-857c-119649b902ab/cli/2026-04-18T02-46-06-691Z-d566012b/review/telemetry.json`, `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/20260418T1616Z-startup-anchor-audit.json`, `.runs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/cli/2026-04-18T05-35-22-749Z-3e368e6f/review/telemetry.json`.

## Validation
- [x] Docs-review evidence captured before implementation, with a truthful direct-run fallback when the original parent manifest lacked child provenance; the continuation run also captured a valid workspace-scoped docs-review child-stream manifest. Evidence: `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/20260418T0548Z-docs-review-fallback.md`, `.runs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/cli/2026-04-18T05-48-25-732Z-f5e259ca/manifest.json`, `.runs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124-docs-review/cli/2026-04-18T15-54-42-548Z-b8fdf93e/manifest.json`.
- [x] Focused review-wrapper regressions pass for the bounded seam. Evidence: `tests/review-meta-surface-normalization.spec.ts`, `tests/review-execution-state.spec.ts`, `tests/run-review.spec.ts`, `npm run test`.
- [x] Repo validation floor is run for the non-trivial diff on current `origin/main`. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, targeted `npx vitest run tests/review-meta-surface-normalization.spec.ts tests/review-execution-state.spec.ts tests/run-review.spec.ts`, `npm run build`, `npm run lint`, `npm run test` (rerun green after one isolated Doctor timeout also passed in isolation), `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `npm run pack:smoke`.
- [ ] Final parent standalone review wrapper and explicit elegance/minimality pass complete before handoff. Evidence: prior review `.runs/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/cli/2026-04-18T05-35-22-749Z-3e368e6f/review/telemetry.json`, prior elegance `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/20260418T1633Z-elegance-review.md`; current merged-head review/elegance pending.

## Handoff
- [x] Workpad refreshed after docs, after implementation, after continuation branch sync, and before handoff validation. Evidence: `out/linear-4b6dd62c-dd51-4edc-89e3-24c773d93124/manual/workpad.md`, packaged `linear upsert-workpad` for comment `4250dafd-5ed6-47d2-9577-a0d0069decc8`.
- [ ] PR attached to the Linear issue before any review-state transition. Evidence: pending.
- [ ] PR checks are green, actionable review feedback is handled or explicitly pushed back, `pr ready-review` drains cleanly, and the issue moves to `In Review` only after coding stops. Evidence: pending.
- [ ] Review handoff completed after final parent review, PR attachment, green PR checks, and clean ready-review drain. Evidence: current `docs:freshness` passes with `CO-175` retained as in-policy rolling debt; PR/drain pending.
