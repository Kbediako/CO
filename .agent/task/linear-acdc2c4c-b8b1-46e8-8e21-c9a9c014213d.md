# Task Checklist - linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d

- Linear Issue: `CO-180` / `acdc2c4c-b8b1-46e8-8e21-c9a9c014213d`
- MCP Task ID: `linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d`
- Primary PRD: `docs/PRD-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md`
- Task spec: `tasks/specs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` drafted for `CO-180`. Evidence: docs packet paths above.
- [x] Pre-implementation issue-quality review notes captured before implementation. Evidence: `tasks/specs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d.md`.
- [x] Docs-review evidence captured before implementation. Evidence: `.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d-co-180-docs-review-r2/cli/2026-04-14T10-06-30-092Z-440706ce/manifest.json` (docs guard, docs freshness, and forced review clean-success).

## Workflow
- [x] `linear issue-context` inspected live team states before transition. Evidence: packaged `linear issue-context --issue-id acdc2c4c-b8b1-46e8-8e21-c9a9c014213d`.
- [x] Issue moved from live `Ready` to live started state `In Progress` before active work. Evidence: packaged `linear transition --issue-id acdc2c4c-b8b1-46e8-8e21-c9a9c014213d --state "In Progress" --format json`.
- [x] Exactly one explicit same-turn parallelization decision recorded. Evidence: packaged `linear parallelization --decision parallelize_now --reason independent_scope_available`.
- [x] Same-issue child lane `audit-evidence` completed successfully before turn end and parent recorded artifact handling. Evidence: `.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d-audit-evidence/cli/2026-04-14T09-58-07-253Z-7f9a7fdb/manifest.json`; zero-byte patch rejected with parent-owned evidence collection.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current on the issue. Evidence: Linear comment `d3f7bff9-1e36-4e3d-8e7f-6bbcaa932297`.

## Audit
- [x] `codex --version` captured. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-0120-audit/codex-version.txt`.
- [x] `codex exec --help` captured. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-0120-audit/codex-exec-help.txt`.
- [x] `codex exec resume --help` captured. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-0120-audit/codex-exec-resume-help.txt`.
- [x] `codex review --help` captured. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-0120-audit/codex-review-help.txt`.
- [x] `codex login --help` captured. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-0120-audit/codex-login-help.txt`.
- [x] Runtime-mode canary result captured. Evidence: first run failed because `dist/bin/codex-orchestrator.js` was absent before `npm run build`; rerun passed 20/20 for every scenario in `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/runtime-mode-canary-r2/runtime-canary-summary.json`.
- [x] Required cloud canary contract result captured and blocked/waived for this provider workspace. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/cloud-canary-required/cloud-canary-required.log` and `exit-code.txt` show missing `CODEX_CLOUD_ENV_ID`, exit `1`.
- [x] Cloud fallback contract result captured and blocked/waived for this provider workspace. Evidence: wrapper log/exit in `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/cloud-canary-fallback/`; fallback manifest succeeded with `cloud_fallback.mode_used=mcp` at `.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/cli/2026-04-14T10-13-58-564Z-94eab37d/manifest.json`, while the wrapper exits `1` under required missing-env configuration.

## Implementation
- [x] Adoption posture decided: intentionally hold `0.118.0` with rationale. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-version-canary/compare/decision-go-no-go.md`.
- [x] Active truth surfaces updated consistently for the final posture. Evidence: `docs/guides/codex-version-policy.md` records the `0.120.0` candidate audit and cloud blocker while README/AGENTS/downstream target strings remain `0.118.0` because the decision is hold.
- [x] Provider-worker exec/resume and review-wrapper P0/P1 regression verdict recorded. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/codex-0120-audit/audit-summary.md`.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/01-delegation-guard.log`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/02-spec-guard.log`.
- [x] `npm run build`. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/03-build.log`.
- [x] `npm run lint`. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/04-lint.log`.
- [x] `npm run test`. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/05-test.log`.
- [x] `npm run docs:check`. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/06-docs-check.log`.
- [x] `npm run docs:freshness`. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/07-docs-freshness.log`.
- [x] `npm run repo:stewardship`. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/08-repo-stewardship.log`.
- [x] `node scripts/diff-budget.mjs`. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/09-diff-budget.log`.
- [x] Standalone review completed before review handoff. Evidence: `../../.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/cli/2026-04-14T09-55-23-458Z-4aa0e89b/review/telemetry.json` reports `status: succeeded`, `review_outcome: bounded-success`; reviewer reported no actionable issues in `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/10-standalone-review.log`.
- [x] Elegance review completed before review handoff. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/11-elegance-review.md`.
- [x] `npm run pack:smoke` considered and skipped because this lane changed docs/task/policy surfaces only, not CLI/package/skills/review-wrapper downstream packaging paths. Evidence: `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/validation/11-elegance-review.md`.

## Handoff
- [ ] Workpad refreshed after docs-first, after implementation, and immediately before review handoff. Evidence: pending.
- [ ] PR attached to Linear issue before review-state transition. Evidence: pending.
- [ ] Actionable PR feedback handled or explicitly pushed back. Evidence: pending.
- [ ] Latest `origin/main` merged, PR checks green, and `pr ready-review` drains cleanly before `In Review`. Evidence: pending.
