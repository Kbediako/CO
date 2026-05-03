# Task Checklist - linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51

- Linear Issue: `CO-442` / `8a453a7c-ba31-4604-a88e-2e4c6244ec51`
- Source Issue: `CO-441` / `b9e7583a-3051-40d3-a87f-0388faa9df61`
- Primary PRD: `docs/PRD-linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51.md`
- Canonical spec: `tasks/specs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51.md`
- Canonical registry id: `20260430-linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51`

## Docs-First
- [x] CO-442 packet drafted with protected log terms, non-goals, Not Done If, acceptance criteria, and parity matrix. Evidence: PRD, TECH_SPEC mirror, ACTION_PLAN, canonical spec, and mirrors above.
- [x] Telemetry authority boundary recorded. Evidence: packet states `review/telemetry.json` is authoritative only when present, parseable, successful, and not contradicted by wrapper errors.
- [x] Blocking boundary recorded. Evidence: packet states missing, unreadable, failed, or contradictory telemetry remains blocking.
- [x] Scope boundary recorded. Evidence: packet states raw logs remain visible and `CO-441` owner re-home work is out of scope.

## Registration
- [x] `tasks/index.json` registration added. Evidence: item `20260430-linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51`.
- [x] `docs/TASKS.md` snapshot added. Evidence: CO-442 top snapshot.
- [x] `docs/docs-freshness-registry.json` packet rows added. Evidence: six rows for CO-442 packet and mirror files.
- [x] Backlog hold reason recorded. Evidence: packet and registry setup clear `backlog_head_follow_up_traceability_pending`.

## Not Done If
- Successful review telemetry with this log line can still be surfaced as a failed review in CO status, workpads, or handoff guidance.
- No regression fixture, parser coverage, or operator guidance covers the log shape.
- The issue does not state when the line becomes blocking.
- Raw review output is deleted, suppressed, filtered, or hidden.
- Standalone review or review-wrapper behavior is weakened.
- The lane changes `CO-441` owner re-home surfaces.

## Acceptance Criteria
- [x] Create or update packet docs using recent provider-worker follow-up packet patterns.
- [x] Register the task in `tasks/index.json` using canonical task id format.
- [x] Add docs-freshness registry coverage for the packet/mirror docs with current `last_review` evidence.
- [x] Keep acceptance criteria and Not Done If conditions visible in packet/checklist surfaces.
- [x] Reproduce or fixture the review log shape before review handoff. Evidence: focused review telemetry and run-review fixtures include the emitted `codex_core::session: failed to record rollout items: thread ... not found` line with a log-level prefix.
- [x] Confirm wrapper telemetry remains authoritative when `status=succeeded`, `review_outcome=clean-success` or `review_outcome=bounded-success`, and `error=null`. Evidence: focused telemetry, run-review, and command-runner regressions passed.
- [x] Confirm missing or failed telemetry remains blocking. Evidence: focused telemetry, run-review, and command-runner regressions keep missing/failed telemetry unclassified or failed.
- [x] Confirm quoted or diff-shaped protected text is not classified as cleanup noise. Evidence: focused command-runner regression requires the protected text to appear as an actual log-level or timestamp-prefixed output-log line.
- [x] Preserve explanatory noise notes through terminal proof summaries. Evidence: selected-run regressions cover succeeded and failed terminal proof projections that rebuild provider-worker proof summaries.
- [x] Preserve raw review output visibility. Evidence: tests assert the raw line remains in `review/output.log` while command-runner summaries add only an explanatory status note.

## CO-382 Fallback Metadata
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required; the implementation keeps one narrow wrapper-boundary classifier and does not split review authority across additional status sources.
- Minor-seam decision: acceptable because CO owns status interpretation at the review-wrapper boundary while raw logs and successful telemetry remain independently visible.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Review-log classifier | Contract name: Codex rollout-item thread-not-found review-log classifier | `justify retaining fallback` | Owning surface: `orchestrator/src/cli/services/commandRunner.ts` | Steady-state proof: successful `review/telemetry.json` with `status=succeeded`, `review_outcome=clean-success` or `bounded-success`, and `error=null` controls status while the raw output log keeps the prefixed `codex_core::session` cleanup line visible. | 2026-04-17 | 2026-05-03 | Not governed as an expiring fallback: durable classifier retained while upstream session cleanup can appear in review logs. | Non-expiring rationale: status classification is a durable wrapper-boundary contract; removal requires upstream silence plus issue-quality review. | Tests/docs: focused command-runner, telemetry, run-review, and selected-run projection regressions plus this packet. |

- Contract name: Codex rollout-item thread-not-found review-log classifier.
- Owning surface: `orchestrator/src/cli/services/commandRunner.ts`.
- Steady-state proof: successful review telemetry remains authoritative while the emitted cleanup line remains visible in raw output logs.
- Tests/docs: focused command-runner, telemetry, run-review, selected-run projection regressions, and CO-442 packet docs.
- Non-expiring rationale: the classifier expresses the durable wrapper boundary between raw session cleanup logs and authoritative review telemetry; it is not a temporary fallback success path.

## Validation
- [x] JSON parse for `tasks/index.json`. Evidence: `json ok`.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: `json ok`.
- [x] Targeted packet path scan for `linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51` and `CO-442`. Evidence: focused `rg` scan passed.
- [x] Targeted protected-term scan for `codex_core::session`, `failed to record rollout items`, `thread not found`, `review/telemetry.json`, `review_outcome`, `clean-success`, `bounded-success`, `status=succeeded`, `error=null`, `CO-441`, and `backlog_head_follow_up_traceability_pending`. Evidence: focused `rg` scan passed.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] Manifest-backed review with explicit `TASK`, `NOTES`, and `MANIFEST`. Evidence: `.runs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51/manual/20260503T115240Z-co-442-packet-review/manifest.json` and `.runs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51/manual/20260503T115240Z-co-442-packet-review/review/telemetry.json` reported `review_outcome=clean-success`.
- [x] Independent bug-discovery audit. Evidence: Codex desktop subagent `019dedd4-2dbd-7a71-a0c4-b58c250860c7` found two P1 gaps; both were fixed by requiring `error=null` for benign log classification and preserving the note through provider-worker terminal summaries.
- [x] Manifest-backed standalone review rework. Evidence: `codex-orchestrator review` on `gpt-5.5`/`xhigh` found a P2 requiring explicit matching `review_outcome`; fixed by rejecting missing or contradictory `review_outcome` before benign log classification.
- [x] Manifest-backed standalone re-review rework. Evidence: `codex-orchestrator review` on `gpt-5.5`/`xhigh` found a P2 requiring the protected text to be anchored to actual output-log lines; fixed by matching per-line Codex session warning prefixes and adding a quoted/diff-shaped false-positive regression.
- [x] Manifest-backed projection re-review rework. Evidence: `codex-orchestrator review` on `gpt-5.5`/`xhigh` found a P2 requiring selected-run projection to preserve provider-worker review-log notes; fixed by carrying the command-stage note into terminal proof summaries and adding a selected-run projection regression.
- [x] Manifest-backed final re-review rework. Evidence: `codex-orchestrator review` on `gpt-5.5`/`xhigh` found P2s requiring bare quoted protected text to stay unclassified and failed terminal proof projections to preserve the note; fixed by requiring a log-level or timestamp-prefixed emitted line and adding a failed-projection regression.
- [x] Final clean standalone review unavailable; quota waiver recorded. Evidence: forced appserver review launched on `gpt-5.5`/`xhigh` against `.runs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51/cli/2026-05-03T14-20-00-000Z-final-review/manifest.json`, but Codex exited before findings with `You've hit your usage limit` / `try again at May 5th, 2026 5:52 PM`; waiver owner `provider worker / CO operator`, expiry `May 5th, 2026 5:52 PM` or earlier successful re-review, reason `Codex review quota exhausted`, evidence `review/telemetry.json` reports failed review command without termination-boundary classification. Manual fallback review after the quota failure inspected the merged-main diff for `commandRunner.ts`, `selectedRunProjection.ts`, provider-worker truth propagation, focused regressions, and CO-382 packet evidence; no additional correctness or minimality changes were required.
- [x] `node scripts/delegation-guard.mjs --task linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51`. Evidence: guard passed after manifest-backed diagnostics child stream `.runs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51-guard/cli/2026-05-03T12-47-47-462Z-ccae6ddd/manifest.json`.
- [x] Focused implementation regression suite. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/CommandRunnerReviewEvidenceConsistency.test.ts orchestrator/tests/SelectedRunProjection.test.ts tests/review-execution-telemetry.spec.ts tests/run-review.spec.ts` passed with 328 tests after prefixed-log and failed-projection fixes.
- [x] `npm run build`. Evidence: TypeScript build passed after prefixed-log and failed-projection fixes.
- [x] `npm run lint`. Evidence: lint passed with 0 errors and 3 pre-existing `DelegationMcpHealth.test.ts` warnings after prefixed-log and failed-projection fixes.
- [x] `npm run test`. Evidence: refreshed default core suite passed with 359 test files and 5303 tests after prefixed-log and failed-projection fixes.
- [ ] Unresolved actionable review threads = 0 before merge, or waiver recorded with owner, expiry, reason, and evidence. Evidence: final PR review-thread sweep after CodeRabbit review completes.
- [x] `npm run docs:check`. Evidence: passed after the prefixed-log, failed-projection, and task-packet mirror updates.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 5171 docs, 5174 registry entries` after final review-quota blocker note.
- [x] `npm run repo:stewardship`. Evidence: `repo:stewardship OK - 6301 tracked files, 0 action-required` after final review-quota blocker note.
- [x] `node scripts/diff-budget.mjs`. Evidence: current-main merged tree passed at `files=14/25, lines=644/1200, +590/-54`; final remote-head metadata patch passed at `files=4/25, lines=62/1200, +32/-30` with advisory stacked aggregate `files=13/25, lines=767/1200`.
- [x] `npm run pack:smoke`. Evidence: refreshed pack smoke passed after prefixed-log and failed-projection fixes.

## Notes
- This packet intentionally keeps the raw review log visible.
- This packet intentionally does not change `CO-441` docs freshness owner re-home surfaces.
- The benign classification requires successful telemetry; the log line alone is never success evidence.
- 2026-05-03 recovery note: PR #760 merged only the packet surfaces; the implementation remained dirty in the provider-worker workspace, so CO-442 was reopened and this recovery branch carries the missing implementation plus the bug-discovery fixes.
