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
- [ ] Reproduce or fixture the review log shape before review handoff.
- [ ] Confirm wrapper telemetry remains authoritative when `status=succeeded`, `review_outcome=clean-success` or `review_outcome=bounded-success`, and `error=null`.
- [ ] Confirm missing or failed telemetry remains blocking.
- [ ] Preserve raw review output visibility.

## Validation
- [x] JSON parse for `tasks/index.json`. Evidence: `json ok`.
- [x] JSON parse for `docs/docs-freshness-registry.json`. Evidence: `json ok`.
- [x] Targeted packet path scan for `linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51` and `CO-442`. Evidence: focused `rg` scan passed.
- [x] Targeted protected-term scan for `codex_core::session`, `failed to record rollout items`, `thread not found`, `review/telemetry.json`, `review_outcome`, `clean-success`, `bounded-success`, `status=succeeded`, `error=null`, `CO-441`, and `backlog_head_follow_up_traceability_pending`. Evidence: focused `rg` scan passed.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: `Spec guard: OK`.
- [x] Manifest-backed review with explicit `TASK`, `NOTES`, and `MANIFEST`. Evidence: `.runs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51/manual/20260503T115240Z-co-442-packet-review/manifest.json` and `.runs/linear-8a453a7c-ba31-4604-a88e-2e4c6244ec51/manual/20260503T115240Z-co-442-packet-review/review/telemetry.json` reported `review_outcome=clean-success`.
- [ ] Unresolved actionable review threads = 0 before merge, or waiver recorded with owner, expiry, reason, and evidence. Evidence: final PR review-thread sweep after CodeRabbit review completes.
- [x] `npm run docs:check`. Evidence: passed after compacting the new CO-442 `docs/TASKS.md` snapshot to keep reserve headroom.
- [x] `npm run docs:freshness`. Evidence: `docs:freshness OK - 5171 docs, 5174 registry entries`.

## Notes
- This packet intentionally keeps the raw review log visible.
- This packet intentionally does not change `CO-441` docs freshness owner re-home surfaces.
- The benign classification requires successful telemetry; the log line alone is never success evidence.
