# ACTION_PLAN - CO-423 restore docs freshness owner truth after terminal CO-409

## Summary
- Goal: create the CO-423 docs-first packet and task mirror docs for the post-merge `docs:freshness:maintain` terminal-owner blocker.
- Scope: six packet/mirror files only.
- Assumptions:
  - post-merge `origin/main` currently reports `block_unowned_repo_debt` with `configured_owner_terminal`, `owner_issue=CO-409`, terminal `CO-409` `Done`, and `blocking_changed_paths=[]`
  - `owner_issue=CO-420`, `CO-420`, and `co-420-apr-28-march-28-task-packet-mirror` are historical-only context
  - parent owns implementation, validation, Linear state, workpad, PR lifecycle, and any catalog/registry/task-index edits
  - this child lane leaves changes uncommitted for patch export

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:freshness:maintain`
  - `block_unowned_repo_debt`
  - `configured_owner_terminal`
  - `owner_issue=CO-409`
  - `CO-409`
  - `owner_issue=CO-420`
  - `CO-420`
  - `blocking_changed_paths=[]`
  - `docs/docs-catalog.json`
  - `co-420-apr-28-march-28-task-packet-mirror`
  - `docs:freshness`
  - `canonical owner key`
- Not done if:
  - the packet omits or renames any protected term
  - the packet frames `CO-420` as current live owner truth
  - the packet frames terminal `CO-409` as a usable current owner
  - the plan treats `blocking_changed_paths=[]` as a waiver
  - the plan edits parent-owned files from this child lane
  - parent-owned reproduction and owner repair remain implicit
- Pre-implementation issue-quality review:
  - 2026-04-29: CO-423 is not plausibly a CO-420 continuation with `owner_issue=CO-420` as current truth; CO-420 is historical-only after terminal completion.
  - 2026-04-29: CO-423 is not plausibly a source-code or validation-script fix; it is a docs freshness owner-truth repair for the `canonical owner key` `docs:freshness:maintain`.
  - 2026-04-29: the micro-task path is unavailable because correctness depends on exact protected wording, exact docs freshness surfaces, and parent-owned validation.
- Fallback / refactor decision: this child docs packet does not add, retain, or touch fallback/seam behavior; stale terminal-owner evidence is documented so parent implementation preserves fail-closed owner verification.

## Milestones & Sequencing
1. Create the CO-423 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Verify protected terms and scoped diff hygiene in the child lane.
3. Parent imports the patch and performs live reproduction or inspection with `docs:freshness:maintain`.
4. Parent updates `docs/docs-catalog.json` owner metadata only after proving the live owner path.
5. Parent updates `docs/docs-freshness-registry.json`, `tasks/index.json`, and `docs/TASKS.md` only if needed for registration and validation.
6. Parent reruns `docs:freshness`, `docs:freshness:maintain`, and required review gates.
7. Parent owns Linear/GitHub lifecycle and final handoff.

## Dependencies
- Linear issue `CO-423`.
- Source anchor `ctx:sha256:4edecc88705767ae3d631a2b301196a40fa6fb16fa008b3e7cdd3edfecee2962#chunk:c000001`.
- `npm run docs:freshness`.
- `npm run docs:freshness:maintain`.
- `docs/docs-catalog.json`.
- `docs/docs-freshness-registry.json`.
- `tasks/index.json`.
- `docs/TASKS.md`.

## Validation
- Child checks:
  - `if rg -n "[[:blank:]]+$" <six scoped files>; then exit 1; else exit 0; fi`
  - `rg -n "docs:freshness:maintain|block_unowned_repo_debt|configured_owner_terminal|owner_issue=CO-409|CO-409|owner_issue=CO-420|CO-420|blocking_changed_paths=\\[\\]|docs/docs-catalog\\.json|co-420-apr-28-march-28-task-packet-mirror|docs:freshness|canonical owner key" <six scoped files>`
  - `git diff --name-only -- <six scoped files>`
  - `git status --short`
- Parent-owned validation commands:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
  - `npm run docs:check`
  - `node scripts/spec-guard.mjs --dry-run`
- Rollback plan:
  - parent can revert only the six CO-423 packet/mirror files if the patch import is not needed or the issue is relaunched with different scope

## Risks & Mitigations
- Risk: `owner_issue=CO-420` or `CO-420` is mistaken for current owner truth.
  - Mitigation: packet repeatedly frames it as historical-only context and preserves `co-420-apr-28-march-28-task-packet-mirror` only as the declared cohort marker.
- Risk: terminal `owner_issue=CO-409` is treated as still usable because `docs/docs-catalog.json` names it.
  - Mitigation: packet records `configured_owner_terminal`, terminal `CO-409` `Done`, and `block_unowned_repo_debt` as current fail-closed evidence.
- Risk: child patch drifts into parent-owned catalog, registry, task index, docs task snapshot, source code, package files, or validation scripts.
  - Mitigation: file scope is limited to six packet/mirror files and checked with `git diff --name-only`.
- Risk: validation is skipped because this child lane cannot run full suites.
  - Mitigation: child records scoped checks and parent validation responsibilities.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-29
- Parent docs-review / implementation approval: pending
