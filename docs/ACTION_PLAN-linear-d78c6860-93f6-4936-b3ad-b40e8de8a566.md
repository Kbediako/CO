# ACTION_PLAN - CO-427 re-home docs:freshness:maintain owner after terminal CO-425

## Summary
- Goal: create the prerequisite CO-427 docs-first packet and mirrors so the issue can later leave Backlog with a preserved owner-rehome contract.
- Scope: packet docs, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - CO-427 is the intended live same-project owner follow-up for canonical owner key `docs:freshness:maintain`.
  - Terminal owner metadata must remain fail-closed evidence, not a usable live owner.
  - This packet worker does not implement owner re-home, stale-row review, archive, or policy reclassification.

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
  - catalog owner metadata, cohort-guide content, source code, package files, validation scripts, or CO-330 behavior are changed
  - stale packet/mirror rows are deleted, hidden, or blindly refreshed
- Pre-implementation issue-quality review:
  - 2026-04-29: CO-427 is an owner-rehome prerequisite packet lane, not the owner-rehome implementation.
  - 2026-04-29: the micro-task path is unavailable because correctness depends on exact protected terms, exact surfaces, canonical owner marker compatibility, and Not Done If guardrails.
  - 2026-04-29: the packet worker owns branch/PR setup only; parent/provider workflow owns Linear transition and future implementation.
- Fallback / refactor decision: record the stale terminal-owner recovery path without adding a fallback seam or extending rolling cohort lifetime.

## Milestones & Sequencing
1. Create an isolated worktree from current `origin/main`.
2. Read live Linear context for CO-427 and nearby CO-425 / CO-421 issue patterns.
3. Reproduce or record current `docs:freshness:maintain` terminal-owner baseline where feasible.
4. Add the six CO-427 packet/mirror files.
5. Register CO-427 in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
6. Run focused packet validation and report any baseline failures accurately.
7. Commit, push, and open a draft PR attached to CO-427 if feasible.
8. Leave Linear state transition to the parent/provider workflow.

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
  - JSON parse for `tasks/index.json`
  - JSON parse for `docs/docs-freshness-registry.json`
  - targeted packet path scan
  - targeted protected-term scan
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json` for baseline owner evidence if feasible
- Rollback plan:
  - revert only the CO-427 packet files and their three registry/task metadata entries if the packet scope changes before active work.

## Risks & Mitigations
- Risk: packet accidentally claims owner re-home is complete.
  - Mitigation: keep implementation checkboxes open and explicitly record terminal `CO-425` as baseline debt.
- Risk: packet widens into catalog or cohort-guide changes.
  - Mitigation: keep this branch limited to packet/mirror metadata and defer owner mutation to the future active lane.
- Risk: helper label projection is stale.
  - Mitigation: treat live issue title/body/state as authoritative for packet setup and record that label absence from older helper output is not scope evidence.

## Approvals
- Docs-first packet worker: 2026-04-29
- Parent owner re-home / implementation approval: pending future CO-427 active lane
