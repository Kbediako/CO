# Task Checklist - linear-b3286a9a-9cef-45a5-bd8a-532856a1188d

- Linear Issue: `CO-127` / `b3286a9a-9cef-45a5-bd8a-532856a1188d`
- MCP Task ID: `linear-b3286a9a-9cef-45a5-bd8a-532856a1188d`
- Primary PRD: `docs/PRD-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`
- TECH_SPEC: `tasks/specs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`

## Docs
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: `docs/PRD-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `docs/TECH_SPEC-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `docs/ACTION_PLAN-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `tasks/specs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `tasks/tasks-linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`, `.agent/task/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d.md`.
- [x] docs-review child-stream evidence recorded for the CO-127 packet. Evidence: `.runs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d-co-127-docs-review/cli/2026-04-10T00-23-13-717Z-acc886f4/manifest.json`, `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/20260410T002313Z-docs-review-fallback.md`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/workpad.md`, Linear workpad comment `https://linear.app/asabeko/issue/CO-127/co-harden-run-review-direct-exec-symlink-handling-without-regressing#comment-196d492a`.

## Proof & Implementation
- [x] Supported symlinked `run-review` entrypoint posture proven for repo-local and packaged workflows. Evidence: `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/20260410T102625Z-supported-path-verdict.md`.
- [x] Supported verdict codified without widening runtime behavior: `scripts/run-review.ts` keeps the stricter direct-exec contract because no supported symlink-preserved `run-review` path exists today.
- [x] Focused regression coverage added for the resulting direct-exec contract in `tests/run-review.spec.ts`.
- [x] The existing `does not crash when stdout pipe closes early` subprocess regression remains unchanged and green in focused validation.
- [x] The diff stays bounded to the direct-exec seam, focused tests, and required docs/evidence files.

## Validation
- [x] Focused supported-path proof recorded in the remote Linear workpad comment. Evidence: `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/workpad.md`, `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/20260410T102625Z-supported-path-verdict.md`, Linear workpad comment `https://linear.app/asabeko/issue/CO-127/co-harden-run-review-direct-exec-symlink-handling-without-regressing#comment-196d492a`.
- [x] `npx vitest run --config vitest.config.core.ts orchestrator/tests/ReviewCliLaunchShell.test.ts tests/run-review.spec.ts`.
- [x] `node scripts/delegation-guard.mjs`.
- [x] `node scripts/spec-guard.mjs --dry-run` executed; only inherited repo-wide stale-spec notices were reported, and dry-run exited successfully.
- [x] `npm run build`.
- [x] `npm run lint`.
- [x] `npm run test`.
- [x] `npm run docs:check`.
- [x] `npm run docs:freshness` executed; failure remained the inherited repo-wide stale-doc baseline (`stale docs: 119`), not a CO-127 packet registration drift.
- [x] `node scripts/diff-budget.mjs`.
- [x] Standalone review recorded. Evidence: `../../.runs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/cli/2026-04-10T00-14-22-297Z-c2943bbd/review/telemetry.json`, `../../.runs/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/cli/2026-04-10T00-14-22-297Z-c2943bbd/review/output.log`.
- [x] Explicit elegance pass recorded. Evidence: `out/linear-b3286a9a-9cef-45a5-bd8a-532856a1188d/manual/20260410T005230Z-elegance-review.md`.
- [x] `npm run pack:smoke`.

## Handoff
- [ ] PR attached to the issue.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` (or explicit waiver plus evidence recorded here before handoff).
- [ ] Issue moved to `Human Review` or `In Review`.
