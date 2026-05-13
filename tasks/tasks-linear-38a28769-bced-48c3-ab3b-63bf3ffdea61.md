# Task Checklist - linear-38a28769-bced-48c3-ab3b-63bf3ffdea61

- Linear Issue: `CO-154` / `38a28769-bced-48c3-ab3b-63bf3ffdea61`
- MCP Task ID: `linear-38a28769-bced-48c3-ab3b-63bf3ffdea61`
- Primary PRD: `docs/PRD-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md`
- TECH_SPEC: `tasks/specs/linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md`

## Docs
- [x] Live Linear workflow states were rechecked before transition. Evidence: `linear issue-context --issue-id 38a28769-bced-48c3-ab3b-63bf3ffdea61`.
- [x] Issue moved from `Ready` to `In Progress` before active coding. Evidence: `linear transition --state "In Progress"` succeeded at `2026-04-11T11:38:40.481Z`.
- [x] Required same-turn parallelization decision recorded. Evidence: `linear parallelization --decision stay_serial --reason single_bounded_change`.
- [x] Exactly one persistent Linear workpad comment is current. Evidence: remote comment `17955ff3-daf1-4ae9-b55e-4ae01adb504f`, local source `out/linear-38a28769-bced-48c3-ab3b-63bf3ffdea61/manual/workpad.md`.
- [x] Docs packet created and mirrored in `docs/`, `tasks/`, `.agent/task/`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`. Evidence: this checklist plus PRD, TECH_SPEC, ACTION_PLAN, registry updates, and workpad source.
- [x] Docs-review child-stream evidence recorded before implementation, with truthful manual fallback for a forced-review stall. Evidence: `.runs/linear-38a28769-bced-48c3-ab3b-63bf3ffdea61-co-154-docs-review/cli/2026-04-11T11-49-08-728Z-6a4be6b6/manifest.json`, `out/linear-38a28769-bced-48c3-ab3b-63bf3ffdea61/manual/20260411T1154Z-docs-review-fallback.md`.

## Investigation
- [x] Workspace moved from detached `HEAD` onto branch `linear/co-154-attach-pr-mutability-guard` before repo edits. Evidence: `git switch -c linear/co-154-attach-pr-mutability-guard`.
- [x] Fresh mutable workpad behavior was rechecked live and found green. Evidence: packaged `linear upsert-workpad --issue-id 38a28769-bced-48c3-ab3b-63bf3ffdea61 --body-file /tmp/co-154-workpad.md --format json` created comment `17955ff3-daf1-4ae9-b55e-4ae01adb504f`.
- [x] The original incident issue was re-read live and narrowed to the archived/trashed attachment seam. Evidence: packaged `linear issue-context --issue-id 9c4053e5-c4c5-4651-b436-71f7dbdf853e --format json`, packaged `linear upsert-workpad ...` on `CO-36`, packaged `linear attach-pr ...` on `CO-36`.
- [x] Pre-implementation issue-quality review captured. Evidence: `tasks/specs/linear-38a28769-bced-48c3-ab3b-63bf3ffdea61.md` review notes and readiness gate.

## Implementation
- [ ] Align `attach-pr` non-mutable issue handling with the existing `linear_issue_not_mutable` contract.
- [ ] Preserve noop behavior when the canonical-equivalent PR attachment already exists.
- [ ] Preserve existing mutable attach, workpad create/update, and transition behavior.

## Validation
- [ ] Audited docs-review child stream or truthful packet-local fallback recorded.
- [ ] Focused `ProviderLinearWorkflowFacade` regressions pass.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `npm run repo:stewardship`.
- [ ] `node scripts/diff-budget.mjs` or an explicit truthful override if required.
- [ ] Manifest-backed standalone review plus explicit elegance review before handoff.
- [ ] `npm run pack:smoke`.

## Handoff
- [ ] PR attached to the issue before review-state transition.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` or explicit pushback recorded.
- [ ] Issue moved to `In Review`. Evidence: pending.

## Progress Log
- 2026-04-11: Issue moved to `In Progress`, `stay_serial` / `single_bounded_change` was recorded, the branch was created, and the single workpad comment was created on `CO-154`.
- 2026-04-11: Live verification disproved the broad fresh-issue hypothesis; fresh `CO-154` workpad create is green on current main.
- 2026-04-11: Live incident verification narrowed the remaining defect to archived/trashed `attach-pr` classification on `CO-36`.
- 2026-04-11: The audited docs-review child stream passed delegation guard, spec guard, `docs:check`, and `docs:freshness`, then the forced review stalled without telemetry or a diff-local verdict; manual packet-local fallback was accepted instead of stalling the lane.

## Relevant Files
- `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`
- `orchestrator/tests/ProviderLinearWorkflowFacade.test.ts`

## Notes
- This lane intentionally preserves the issue's original wording while implementing only the narrower defect that still reproduces on 2026-04-11.
- `CO-153` already owns archived/trashed admission and broader mutation truth; `CO-154` stays bounded to the remaining attachment-path parity seam.
