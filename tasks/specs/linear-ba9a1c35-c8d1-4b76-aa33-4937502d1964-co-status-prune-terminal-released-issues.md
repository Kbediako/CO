---
id: 20260414-linear-ba9a1c35-c8d1-4b76-aa33-4937502d1964
title: CO: prune terminal released provider rows from CO STATUS JSON active counts
status: done
relates_to: docs/PRD-linear-ba9a1c35-c8d1-4b76-aa33-4937502d1964.md
risk: high
owners:
  - Codex
last_review: 2026-05-16
review_notes:
  - 2026-05-16: CO-545 strict spec-guard audit reclassified this stale Apr 14/15 row as inactive done; live `node bin/codex-orchestrator.js linear issue-context --issue-id ba9a1c35-c8d1-4b76-aa33-4937502d1964 --format json` verified CO-182 is Linear Done/completed and attached/related PR evidence https://github.com/Kbediako/CO/pull/480. No completed_at was inferred or fabricated.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-ba9a1c35-c8d1-4b76-aa33-4937502d1964-co-status-prune-terminal-released-issues.md`
- PRD: `docs/PRD-linear-ba9a1c35-c8d1-4b76-aa33-4937502d1964.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ba9a1c35-c8d1-4b76-aa33-4937502d1964.md`
- Task checklist: `tasks/tasks-linear-ba9a1c35-c8d1-4b76-aa33-4937502d1964.md`

## Traceability
- Linear issue: `CO-182` / `ba9a1c35-c8d1-4b76-aa33-4937502d1964`
- Linear URL: https://linear.app/asabeko/issue/CO-182
- Source anchor: `ctx:sha256:ddc8b844aa6fd96468f0605623c78dfe076675be14125ded964fd2c95ebefff2#chunk:c000001`
- Origin manifest: `.runs/linear-ba9a1c35-c8d1-4b76-aa33-4937502d1964-docs-packet/cli/2026-04-14T22-43-57-801Z-005c917c/manifest.json`

## Summary
- Objective: make `CO STATUS` JSON active counts and rows prune terminal released completed provider rows when live Linear truth says the issue is Done/completed or canceled terminal.
- Scope:
  - docs-first registration for `CO-182`
  - active JSON projection semantics for `co-status --format json`
  - pruning from `counts.issues`, active `issues[]`, and active-looking `provider_debug_snapshot.claim`
  - compatibility with retained `provider-intake-state.json` rows and `merge_closeout` evidence
- Constraints:
  - child lane owns docs packet and registry entry only
  - parent owns implementation, source/test edits, Linear state, workpad, validation, and PR lifecycle
  - do not solve by destructively clearing local intake history
  - do not treat unknown live Linear state as terminal

## Issue-Shaping Contract
- User-request translation carried forward: `CO STATUS` JSON must stop counting retained terminal released provider rows as active once live Linear state proves the issue is Done/completed or canceled terminal.
- Protected terms / exact artifact and surface names: `CO STATUS`, `co-status --format json`, `provider-intake-state.json`, `provider_debug_snapshot.claim`, `provider_issue_released:not_active`, `merge_closeout`, `counts.issues`, `issues[]`.
- Nearby wrong interpretations to reject: deleting all retained intake rows, changing Linear workflow state, hiding all debug history, inferring terminal state from unavailable live reads, broad `CO STATUS` renderer redesign, or provider scheduler/pickup policy changes.
- Explicit non-goals carried forward: no Linear mutation from this child lane, no implementation/test edits from this child lane, no destructive local state cleanup, and no non-JSON terminal UI redesign.

## Parity / Alignment Matrix
- Current truth:
  - retained provider rows can remain in `provider-intake-state.json` after provider release/completion.
  - rows with `provider_issue_released:not_active` can represent non-active retained claims.
  - `CO STATUS` JSON active projection can still count or display terminal retained rows when live Linear truth is Done/completed or canceled terminal.
  - `merge_closeout` may carry useful terminal evidence that should remain available for debug/audit.
- Reference truth:
  - `counts.issues` should count active work only.
  - active `issues[]` should contain active or otherwise relevant live work, not completed/canceled terminal rows.
  - `provider_debug_snapshot.claim` should not contradict active count pruning by presenting a terminal retained row as active.
  - retained local state and active operator projection are different surfaces.
- Target truth / intended delta:
  - terminal released completed provider rows are pruned from active JSON projection when live Linear issue state is Done/completed or canceled terminal.
  - `counts.issues`, active `issues[]`, and active `provider_debug_snapshot.claim` use one shared terminal/non-active classification.
  - retained `provider-intake-state.json` rows and `merge_closeout` evidence remain durable and backward compatible.
- Explicitly out-of-scope differences:
  - changing Linear labels, states, or workpad contents
  - changing provider worker admission or scheduler behavior
  - clearing state-file history as the main fix
  - broad renderer or dashboard redesign

## Readiness Gate
- Not done if:
  - `counts.issues` still counts a terminal released completed provider row after live Linear truth is Done/completed or canceled terminal
  - `issues[]` still lists that row as active
  - `provider_debug_snapshot.claim` still makes the terminal row look active
  - `provider_issue_released:not_active` plus terminal live Linear truth remains active in `CO STATUS` JSON
  - `merge_closeout` evidence is deleted or used to reactivate terminal rows
  - the fix relies on destructive `provider-intake-state.json` cleanup or Linear mutation
  - unknown live Linear state is assumed terminal
- Pre-implementation issue-quality review evidence:
  - 2026-04-14: child lane self-review confirms the issue is a status JSON projection correctness lane, not a provider admission, Linear workflow, state cleanup, or terminal UI redesign lane. The micro-task path is ineligible because correctness depends on exact surfaces and protected wording.
- Safeguard ownership split:
  - child lane owns only the listed docs/task files and the canonical `tasks/index.json` entry
  - parent lane owns any docs mirrors outside this file scope, implementation, focused tests, validation, Linear integration, and PR lifecycle

## Technical Requirements
- Functional requirements:
  - classify a retained provider row as terminal/non-active for status projection when live Linear state is Done/completed or canceled terminal and the local row is released/completed.
  - prune that terminal row from `counts.issues`.
  - prune that terminal row from active `issues[]`.
  - ensure `provider_debug_snapshot.claim` cannot present the pruned terminal row as an active claim.
  - handle `provider_issue_released:not_active` rows as non-active when live terminal state corroborates the row.
  - preserve retained `provider-intake-state.json` evidence and `merge_closeout` data unless the parent lane deliberately adds a separate, audited cleanup path.
  - keep active/non-terminal provider rows counted and visible.
  - treat unavailable live Linear state conservatively instead of assuming terminal completion/cancellation.
- Non-functional requirements:
  - keep the change local to existing status/read-model projection seams.
  - avoid widening request burn or adding new unbounded live Linear reads.
  - keep JSON output backward compatible except for corrected active count/row pruning.
  - do not leak private Linear payloads, tokens, or raw auth data through debug snapshots.
- Interfaces / contracts:
  - `co-status --format json`
  - `counts.issues`
  - `issues[]`
  - `provider_debug_snapshot.claim`
  - `provider-intake-state.json`
  - `provider_issue_released:not_active`
  - `merge_closeout`

## Architecture & Data
- Architecture / design adjustments:
  - add or reuse one shared active-status classifier so `counts.issues`, `issues[]`, and `provider_debug_snapshot.claim` cannot drift.
  - base terminal pruning on explicit live Linear terminal state plus local released/completed provider row evidence.
  - keep pruning at projection time unless the parent lane finds an existing safe cleanup seam already meant for terminal local rows.
  - preserve debug/audit data in retained intake state while preventing that data from entering active JSON counts.
- Data model changes / migrations:
  - no migration expected.
  - no required change to `provider-intake-state.json` schema.
  - optional additive debug markers are acceptable only if they remain backward compatible and do not inflate active rows.
- External dependencies / integrations:
  - live Linear issue workflow state for Done/completed or canceled terminal truth
  - existing provider intake state snapshots
  - existing CO STATUS JSON output path

## Acceptance Criteria
1. `co-status --format json` excludes a terminal released completed provider row from `counts.issues` when live Linear state is Done/completed.
2. `co-status --format json` excludes a terminal released completed provider row from `counts.issues` when live Linear state is canceled terminal.
3. The same terminal rows are absent from active `issues[]`.
4. `provider_debug_snapshot.claim` does not show those terminal rows as active provider claims.
5. Rows with `provider_issue_released:not_active` plus terminal live Linear truth are treated as non-active in active JSON projection.
6. `provider-intake-state.json` can retain the local terminal/released row for audit, and `merge_closeout` data remains available where relevant.
7. Non-terminal live issues and genuinely active provider rows remain counted and visible.
8. The validation command from the issue, `co-status --format json`, proves the corrected `counts.issues`, `issues[]`, and `provider_debug_snapshot.claim` behavior.

## Validation Plan
- Tests / checks:
  - parent-owned focused coverage for status JSON projection with a retained `provider_issue_released:not_active` provider row and live Done/completed Linear truth
  - parent-owned focused coverage for the canceled terminal variant
  - parent-owned focused coverage proving active/non-terminal provider rows still appear
  - parent-owned focused coverage proving `merge_closeout` evidence is preserved but does not reactivate a terminal row
  - parent runs `node scripts/spec-guard.mjs --dry-run` after accepting the docs packet
- Validation command from the issue:
  - `co-status --format json`
- Manual/fixture verification:
  - inspect `counts.issues`
  - inspect `issues[]`
  - inspect `provider_debug_snapshot.claim`
  - inspect `provider-intake-state.json` only to confirm retained audit evidence remains compatible
- Rollout verification:
  - with a retained terminal provider row present locally, run `co-status --format json` and confirm the active JSON projection excludes it while active rows remain visible.
- Monitoring / alerts:
  - no new alerting system required; rely on existing CO STATUS and provider intake state inspection.

## Open Questions
- Which status projection helper currently owns the final active issue list and should host the shared terminal-row classifier?
- Should a terminal row ever appear in a debug-only JSON subsection after pruning from active `issues[]`, or should this slice keep debug output aligned to active-only projection?
- What exact live Linear terminal vocabulary should the implementation normalize for canceled terminal states beyond Done/completed?

## Approvals
- Reviewer: pending parent docs-review and implementation validation
- Date: 2026-04-14
