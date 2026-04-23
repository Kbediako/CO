# Task Checklist - CO: rerun Codex CLI 0.123 cloud gates after cloud env/auth rotation

- [x] PRD drafted for CO-335. Evidence: `docs/PRD-linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f.md`.
- [x] TECH_SPEC drafted and registered. Evidence: `docs/TECH_SPEC-linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f.md`, `tasks/specs/linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f.md`, `tasks/index.json`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f.md`.
- [x] Linear issue-context inspected and single workpad created/refreshed. Evidence: Linear workpad comment `aeac40db-4dab-4713-ba05-25541b232014`.
- [x] Parallelization decision recorded. Evidence: `stay_serial` / `single_bounded_change` for parent-owned canary classification.
- [x] Current cloud env/auth assumptions recorded without secrets. Evidence: workpad records no exported secret env var and non-secret env label `Kbediako/CO` accepted by `codex cloud list --env Kbediako/CO`.
- [x] Required cloud canary for Codex CLI `0.123.0` completed and classified pass. Evidence: `.runs/linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f-cloud-required-0123-current/cli/2026-04-23T10-07-13-661Z-02403ae9/manifest.json`; cloud task `task_e_69e9ef5628408327b88b1fcd0ab14b24`, status `ready`, environment `Kbediako/CO`, poll count `24`.
- [x] Fallback cloud contract for Codex CLI `0.123.0` completed and classified pass. Evidence: `.runs/linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f-cloud-fallback-0123-current/cli/2026-04-23T10-11-43-645Z-48d460ec/manifest.json`; fallback `mode_requested=cloud`, `mode_used=mcp`, issue `missing_environment`.
- [x] Independent manifest/run-summary validation performed. Evidence: direct `jq` inspection of both manifests and run summaries recorded required cloud execution and fallback fields.
- [x] `0.123.0` promotion decision recorded in policy and release-planning surfaces. Evidence: `docs/guides/codex-version-policy.md`, workflow pins, `tests/pack-smoke.spec.ts`, `docs/TASKS.md`.
- [x] Repository validation gates complete. Evidence: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke` passed in this workspace.
- [x] Manifest-backed standalone review and elegance pass complete. Evidence: `.runs/linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f-cloud-required-0123-current/cli/2026-04-23T10-07-13-661Z-02403ae9/review/telemetry.json` recorded `status=succeeded`, `review_outcome=bounded-success`; manual minimality pass found no removable scope.
- [ ] PR attached and `pr ready-review` drain clean before In Review.

## Notes
- CO-335 supersedes only the CO-322 stale cloud blocker. The actual release ship lane remains CO-316.
