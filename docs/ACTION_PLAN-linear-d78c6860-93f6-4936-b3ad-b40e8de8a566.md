# ACTION_PLAN - CO-427 re-home docs:freshness:maintain owner after terminal CO-425

## Summary
- Goal: re-home the live `docs:freshness:maintain` owner from terminal CO-425, and the post-#728 terminal CO-430 integration owner, to active same-project CO-427 while preserving the retained March 28 rolling cohort.
- Scope: packet docs, task mirrors, `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - CO-427 is the intended live same-project owner follow-up for canonical owner key `docs:freshness:maintain`.
  - CO-430 is now terminal `Done` and must be kept as historical owner evidence only.
  - Terminal owner metadata must remain fail-closed evidence, not a usable live owner.
  - This implementation re-homes owner metadata only; stale-row review, archive, or policy reclassification remains future owner work before `expires_after`.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - `docs:freshness`
  - `docs/docs-freshness-registry.json`
  - `docs/docs-catalog.json`
  - rolling March 28 task-packet/mirror cohort
  - canonical owner key `docs:freshness:maintain`
  - `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`
  - terminal owner `CO-425`
  - `freshness_decision=block_unowned_repo_debt`
  - `blocking_changed_paths=[]`
  - CO-330 source maintenance report path
- Not done if:
  - the packet hides the terminal `CO-425` owner blocker
  - protected terms or exact file surfaces are missing
  - source code, package files, validation scripts, or CO-330 behavior are changed
  - stale packet/mirror rows are deleted, hidden, or blindly refreshed
- Pre-implementation issue-quality review:
  - 2026-04-29: CO-427 is the active owner-rehome implementation lane for terminal CO-425 owner metadata.
  - 2026-04-30: after PR #728 merged, live Linear shows CO-430 is also terminal `Done`; keep CO-430 as historical evidence and make CO-427 the live owner.
  - 2026-04-29: the micro-task path is unavailable because correctness depends on exact protected terms, exact surfaces, canonical owner marker compatibility, and Not Done If guardrails.
  - 2026-04-29: the worker owns owner metadata, policy guide, task mirrors, validation, PR update, and review handoff gates.
- Fallback / refactor decision: re-home live owner metadata without adding a fallback seam or extending rolling cohort lifetime.

## Milestones & Sequencing
1. Read live Linear context for CO-427 and move the issue to the team started state.
2. Sweep attached PR #727 feedback before implementation.
3. Reproduce current `docs:freshness:maintain` terminal-owner baseline for CO-425 and the post-#728 terminal CO-430 owner state.
4. Re-home `docs/docs-catalog.json` owner metadata to CO-427 and update the cohort guide lineage for CO-425 and CO-430.
5. Update `tasks/index.json`, `docs/TASKS.md`, and CO-427 packet/mirrors with the active owner-rehome evidence.
6. Run focused docs freshness and maintenance validation.
7. Run required review/elegance gates for the non-trivial docs/config diff.
8. Push the existing attached PR branch, run `pr ready-review`, and hand off only after checks and feedback drain are clean.

## Dependencies
- Linear issue `CO-427` / `d78c6860-93f6-4936-b3ad-b40e8de8a566`.
- Source issue `CO-330` / `ac7cefc8-ed87-4591-86cf-63b07bc20c2c`.
- `docs:freshness`.
- `docs:freshness:maintain`.
- `tasks/index.json`.
- `docs/TASKS.md`.
- `docs/docs-freshness-registry.json`.

## Validation
- Required focused validation:
  - JSON parse for `tasks/index.json`, `docs/docs-catalog.json`, and `docs/docs-freshness-registry.json`
  - targeted owner/path/protected-term scan
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
- Rollback plan:
  - revert only the CO-427 owner metadata, policy-guide, packet/mirror, and registry/task metadata edits if the owner re-home path changes before handoff.

## Risks & Mitigations
- Risk: owner re-home hides terminal owner evidence.
  - Mitigation: keep terminal `CO-425`, terminal `CO-430`, `configured_owner_terminal`, and `blocking_changed_paths=[]` in the packet, guide, workpad, and validation notes.
- Risk: owner re-home is mistaken for stale-row review.
  - Mitigation: preserve the March 28 row dates and cohort identity, and describe this as owner metadata only.
- Risk: helper label projection is stale.
  - Mitigation: treat live issue title/body/state as authoritative for packet setup and record that label absence from older helper output is not scope evidence.

## Approvals
- Docs-first packet and owner-rehome worker: 2026-04-29
- Current-main rebase evidence update: 2026-04-30
- Parent owner re-home / implementation approval: active provider-worker lane
