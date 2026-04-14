# ACTION_PLAN - CO: prune terminal released provider rows from CO STATUS JSON active counts

## Added by Bootstrap 2026-04-14

## Summary
- Goal: close `CO-182` by making `CO STATUS` JSON active projection prune terminal released completed provider rows from `counts.issues`, active `issues[]`, and active-looking `provider_debug_snapshot.claim` when live Linear state is Done/completed or canceled terminal.
- Scope: docs-first packet and task registration in this child lane; parent-owned implementation in the status/read-model projection, focused regressions, validation, review, and PR lifecycle.
- Assumptions:
  - `provider-intake-state.json` can retain terminal provider history for audit.
  - `co-status --format json` is the issue's validation command and the primary proof surface.
  - Terminal live Linear truth should correct active JSON projection without deleting `merge_closeout` evidence.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - preserve `CO STATUS`, `co-status --format json`, `provider-intake-state.json`, `provider_debug_snapshot.claim`, `provider_issue_released:not_active`, `merge_closeout`, `counts.issues`, and `issues[]`.
- Not done if:
  - terminal released completed provider rows still inflate `counts.issues`
  - terminal rows still appear in active `issues[]`
  - `provider_debug_snapshot.claim` makes terminal rows look active
  - the fix deletes `provider-intake-state.json` history or drops `merge_closeout`
  - unknown live Linear state is treated as Done/completed or canceled terminal
  - the lane broadens into provider scheduling, Linear mutation, or terminal UI redesign
- Pre-implementation issue-quality review:
  - keep the lane bounded to status JSON active projection semantics
  - parent owns source/test edits, validation, Linear state, and PR lifecycle
  - this child lane owns only the listed docs/task files and leaves changes uncommitted for patch export

## Milestones & Sequencing
1. Draft and register the `CO-182` docs-first packet inside the child-lane file scope.
2. Parent accepts or adjusts the docs packet and handles any parent-owned mirrors outside this child scope.
3. Parent identifies the shared status projection seam that computes `counts.issues`, active `issues[]`, and `provider_debug_snapshot.claim`.
4. Parent implements one shared terminal/non-active classifier for retained released completed provider rows with live Done/completed or canceled terminal Linear truth.
5. Parent adds focused regressions for Done/completed, canceled terminal, non-terminal active rows, `provider_issue_released:not_active`, and `merge_closeout` preservation.
6. Parent validates with focused tests and the issue command `co-status --format json`, then runs required guard/review/elegance gates before PR lifecycle.

## Dependencies
- `co-status --format json`
- `provider-intake-state.json`
- `provider_debug_snapshot.claim`
- `provider_issue_released:not_active`
- `merge_closeout`
- `counts.issues`
- `issues[]`
- live Linear Done/completed or canceled terminal workflow truth

## Validation
- Checks / tests:
  - child lane: scoped docs/JSON parse checks only, no full repo validation suites
  - parent lane: focused tests for status JSON projection and terminal-row pruning
  - parent lane: `node scripts/spec-guard.mjs --dry-run`
  - parent lane: required repo validation, standalone review, and elegance pass before PR handoff
- Validation command from the issue:
  - `co-status --format json`
- Rollback plan:
  - revert the projection classifier if it hides genuinely active/non-terminal work
  - preserve existing `provider-intake-state.json` and `merge_closeout` history as the rollback baseline

## Risks & Mitigations
- Risk: terminal pruning accidentally hides active provider rows.
  - Mitigation: require live Done/completed or canceled terminal truth plus local released/completed evidence before pruning.
- Risk: `counts.issues`, `issues[]`, and `provider_debug_snapshot.claim` drift because each surface implements its own filter.
  - Mitigation: implement one shared classifier and reuse it across the status JSON projection.
- Risk: retained `merge_closeout` evidence is lost while fixing active counts.
  - Mitigation: keep retained state durable and prune only active projection unless a separate audited cleanup seam is explicitly chosen by the parent.
- Risk: unavailable live Linear state is misclassified as terminal.
  - Mitigation: fail conservatively on unknown state and surface existing status/debug truth rather than inferring completion.

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-14
