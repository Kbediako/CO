# Task Checklist: CO-378 docs hygiene baseline repair

## Scope

- Task id: `linear-7da2cd4d-977e-450a-b056-307edf560fe0`
- Registry id: `20260426-linear-7da2cd4d-977e-450a-b056-307edf560fe0`
- Linear issue: `CO-378` / `7da2cd4d-977e-450a-b056-307edf560fe0`
- Source issue: `CO-376` / `612a3dc3-f66f-4ba3-aea9-1282b54d93fe`
- Child lane: docs packet only
- Created: `2026-04-26`
- Last review: `2026-04-26`
- Parent lane owns implementation, registry mirror updates, validation, Linear state, workpad, PR lifecycle, and merge.

## Owned Files

- `docs/PRD-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`
- `docs/TECH_SPEC-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`
- `docs/ACTION_PLAN-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`
- `tasks/specs/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`
- `tasks/tasks-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`
- `.agent/task/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`

## Out Of Scope For This Child Lane

- `docs/TASKS.md`
- `tasks/index.json`
- `docs/docs-freshness-registry.json`
- any `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` files
- any `linear-df2bd49b-2dd6-413f-8d90-af40d033dace` files
- source code or tests
- Linear mutations, PR lifecycle, validation gates, and merge

## Protected Terms

- `docs/TASKS.md`
- `docs:check`
- `docs:freshness`
- `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
- missing registry entries
- registry references missing files
- stale docs
- `tasks/index.json`

## Issue-Quality Review

- [x] Issue preserves exact docs surfaces: `docs/TASKS.md`, `docs:check`, `docs:freshness`, and `tasks/index.json`.
- [x] Issue names freshness drift classes: missing registry entries, registry references missing files, and stale docs.
- [x] Issue names protected prior packet surface: `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`.
- [x] Issue rejects the nearby wrong interpretation that this is `CO-376` runtime/status behavior.
- [x] Issue has a clear parent/child split: this child lane owns packet creation only; parent owns implementation, registry mirrors, validation, Linear state, PR, and merge.

## Docs Checklist

- [x] PRD created at `docs/PRD-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`.
- [x] TECH_SPEC mirror created at `docs/TECH_SPEC-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`.
- [x] ACTION_PLAN created at `docs/ACTION_PLAN-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`.
- [x] Task spec created at `tasks/specs/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`.
- [x] Task checklist created at `tasks/tasks-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`.
- [x] Agent task mirror created at `.agent/task/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md`.
- [ ] Parent registry entry added to `tasks/index.json`.
- [ ] Parent snapshot entry added to `docs/TASKS.md`.
- [ ] Parent freshness entries added to `docs/docs-freshness-registry.json`.

## Parent Implementation Checklist

- [ ] Reproduce current `docs:check` failure shape for missing `docs/TASKS.md` references.
- [ ] Reproduce current `docs:freshness` failure shape for missing registry entries, registry references missing files, and stale docs.
- [ ] Repair required `docs/TASKS.md` references.
- [ ] Repair missing registry entries.
- [ ] Repair registry references missing files through restore/update/removal with evidence.
- [ ] Review stale docs before refreshing `last_review`.
- [ ] Keep `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` aligned.
- [ ] Prove `docs:check` and `docs:freshness` pass without gate weakening.

## Source Notes

- Source anchor: `ctx:sha256:d5f97254034d50966075bb4a608873c35be50bef85c842aeaee6c8d48694c132#chunk:c000001`
- Declared source payload: `.runs/linear-7da2cd4d-977e-450a-b056-307edf560fe0-docs-packet/cli/2026-04-26T00-18-48-548Z-109bd4df/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-7da2cd4d-977e-450a-b056-307edf560fe0-docs-packet/cli/2026-04-26T00-18-48-548Z-109bd4df/manifest.json`
- Caveat: the declared payload was not present in this child workspace. The packet preserves the launch prompt as source truth; no Linear mutation was performed.

## Validation Commands

Child lane only:

```bash
git diff --check -- docs/PRD-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md docs/TECH_SPEC-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md docs/ACTION_PLAN-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md tasks/specs/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md tasks/tasks-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md .agent/task/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md
rg -n "docs/TASKS\\.md|docs:check|docs:freshness|linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb|missing registry entries|registry references missing files|stale docs|tasks/index\\.json|CO-376|CO-378" docs/PRD-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md docs/TECH_SPEC-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md docs/ACTION_PLAN-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md tasks/specs/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md tasks/tasks-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md .agent/task/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md
perl -ne 'if (/[ \t]$/) { print "$ARGV:$.: trailing whitespace\n"; $bad=1 } END { exit($bad ? 1 : 0) }' docs/PRD-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md docs/TECH_SPEC-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md docs/ACTION_PLAN-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md tasks/specs/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md tasks/tasks-linear-7da2cd4d-977e-450a-b056-307edf560fe0.md .agent/task/linear-7da2cd4d-977e-450a-b056-307edf560fe0.md
```

## Progress Log

- 2026-04-26: Bounded child lane created the `CO-378` docs-first packet only. Registry mirrors, baseline repair, validation, Linear state, PR lifecycle, and merge remain parent-owned.
