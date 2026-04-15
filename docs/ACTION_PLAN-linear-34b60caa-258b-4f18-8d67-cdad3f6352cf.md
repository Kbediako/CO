# ACTION_PLAN - CO STATUS: prune stale in_progress provider rows when released terminal claim has no live worker

## Added by Bootstrap 2026-04-15

## Summary
- Goal: close `CO-192` by making `co-status --format json` treat released/not-active completed provider-intake truth plus dead worker and merged PR evidence as non-active, even when stale `in_progress` manifests or proofs remain on disk.
- Scope: this child lane creates the docs-first packet and registry/task mirrors only; the parent lane owns implementation, tests, validation, Linear state, workpad, PR lifecycle, and final review.
- Assumptions:
  - `provider-intake-state.json` is the retained claim ledger and can preserve terminal history.
  - stale manifests/proofs are audit evidence, not live-worker proof when process and closeout evidence are terminal.
  - `CO-182` and `CO-189` are adjacent invariants that must remain intact.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `CO STATUS`, `co-status --format json`, `provider-intake-state.json`, `provider_issue_released:not_active`, `provider_issue_released_pending_reopen`, `issue_state_type: completed`, `in_progress`, dead worker PID, merged PR, `counts.issues`, `counts.running`, `issues[]`, and `provider_debug_snapshot.claim`
- Not done if:
  - terminal released provider-intake truth is overridden by stale `in_progress` manifest/proof data
  - a dead-worker merged-PR completed row still appears active in CO STATUS JSON
  - `provider_debug_snapshot.claim` makes the stale terminal row look active
  - the fix hides a genuinely live same-issue worker covered by `CO-189`
  - the fix regresses `CO-182` terminal-release pruning
  - the fix deletes stale manifests/proofs or retained provider-intake rows as the primary correction
- Pre-implementation issue-quality review:
  - 2026-04-15: child-lane self-review confirms the issue is a status projection precedence bug. The parent should implement it through a shared active classifier rather than artifact cleanup, display-only wording, or provider scheduling changes.

## Milestones & Sequencing
1. Child lane drafts the `CO-192` PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry entries inside the declared file scope.
2. Parent accepts or adjusts this packet and handles any workpad/Linear state updates under parent ownership.
3. Parent locates the CO STATUS JSON projection helper that combines provider-intake claims, run manifests/proofs, process liveness, issue state, and PR closeout evidence.
4. Parent implements one shared active classifier that demotes released/not-active completed no-live-worker rows before stale manifests/proofs can count as active.
5. Parent adds focused regressions for the stale `in_progress` conflict, `CO-182` terminal release pruning, and `CO-189` live same-issue worker preservation.
6. Parent validates with focused tests plus `co-status --format json`, then runs required guard/review/elegance gates before PR lifecycle.

## Dependencies
- `co-status --format json`
- `provider-intake-state.json`
- `provider_debug_snapshot.claim`
- `provider_issue_released:not_active`
- `provider_issue_released_pending_reopen`
- `issue_state_type: completed`
- stale `in_progress` run manifest/proof evidence
- worker PID/process liveness evidence
- merged PR closeout evidence

## Validation
- Checks / tests:
  - child lane: scoped docs/JSON parse checks only, no full repo validation suites
  - parent lane: focused projection test for released/not-active + completed issue + dead worker PID + merged PR + stale `in_progress` manifest/proof
  - parent lane: focused `CO-182` terminal pruning regression
  - parent lane: focused `CO-189` live same-issue worker regression
  - parent lane: `node scripts/spec-guard.mjs --dry-run`
  - parent lane: normal validation/review/elegance gates before PR handoff
- Validation command from the issue:
  - `co-status --format json`
- Rollback plan:
  - revert the classifier/projection change if it hides genuinely live work
  - preserve retained provider-intake and `.runs` artifacts as rollback/audit baseline
  - never roll back by deleting stale proofs or weakening `CO-182`/`CO-189` invariants

## Risks & Mitigations
- Risk: stale `in_progress` manifests are still treated as live because they carry familiar active fields.
  - Mitigation: require current live worker/process evidence before stale manifest/proof state can override terminal released provider-intake truth.
- Risk: `CO-189` live-worker recovery is over-pruned.
  - Mitigation: keep the exception explicit for released-pending-reopen rows with fresh started issue truth and attachable same-issue live run evidence.
- Risk: `CO-182` terminal release pruning drifts from this new conflict rule.
  - Mitigation: reuse one terminal/non-active active-classification helper across counts, rows, and debug claim projection.
- Risk: audit evidence is lost while correcting status output.
  - Mitigation: demote stale artifacts from active projection only; do not remove retained history.

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-15
