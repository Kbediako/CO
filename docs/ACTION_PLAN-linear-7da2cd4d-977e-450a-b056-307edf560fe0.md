# ACTION_PLAN: Restore docs hygiene baseline for missing TASKS references and freshness registry drift

## Goal

Create the bounded `CO-378` docs-first packet so the parent lane can repair docs hygiene/freshness baseline drift from `CO-376`: missing `docs/TASKS.md` references, missing registry entries, registry references missing files, and stale docs. The repair must keep `docs:check`, `docs:freshness`, and `tasks/index.json` truthful.

## Constraints

- This child lane edits only the six declared packet files.
- Parent owns implementation, registry mirror updates, validation, Linear state, workpad, PR lifecycle, and merge.
- Do not edit `docs/TASKS.md`, `tasks/index.json`, or `docs/docs-freshness-registry.json` from this lane.
- Do not edit `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb` or `linear-df2bd49b-2dd6-413f-8d90-af40d033dace` files.
- Do not edit source code or tests.
- Do not run broad validation suites.
- Do not call Linear mutation helpers.

## Source Evidence

- Linear issue: `CO-378` / `7da2cd4d-977e-450a-b056-307edf560fe0`
- Source issue: `CO-376` / `612a3dc3-f66f-4ba3-aea9-1282b54d93fe`
- Source anchor: `ctx:sha256:d5f97254034d50966075bb4a608873c35be50bef85c842aeaee6c8d48694c132#chunk:c000001`
- Declared source payload: `.runs/linear-7da2cd4d-977e-450a-b056-307edf560fe0-docs-packet/cli/2026-04-26T00-18-48-548Z-109bd4df/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-7da2cd4d-977e-450a-b056-307edf560fe0-docs-packet/cli/2026-04-26T00-18-48-548Z-109bd4df/manifest.json`
- Source caveat: the declared payload path was absent in this child workspace; the launch prompt is the available issue contract.

## Issue Readiness Gate

- Intent checksum / protected terms carried forward:
  - `docs/TASKS.md`
  - `docs:check`
  - `docs:freshness`
  - `linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
  - missing registry entries
  - registry references missing files
  - stale docs
  - `tasks/index.json`
- Not done if:
  - baseline repair is conflated with `CO-376` runtime/status behavior
  - docs hygiene gates are weakened or bypassed
  - stale docs are blind-bumped without review evidence
  - parent-owned registries remain inconsistent
  - this child lane edits outside its declared packet scope
- Pre-implementation issue-quality review:
  - 2026-04-26: approved for docs-first packet creation only. The issue is specific enough for a parent implementation lane because it names the protected docs surfaces, the failure classes, the source issue, and explicit parent/child ownership split.

## Child-Lane Plan

1. Create the PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and `.agent` task mirror for `linear-7da2cd4d-977e-450a-b056-307edf560fe0`.
2. Preserve the protected issue terms, wrong interpretations, non-goals, parity/alignment matrix, `Not Done If`, immediate traceability, and acceptance criteria.
3. State the parent-owned surfaces clearly: implementation, registry mirror updates, validation, Linear state, PR, and merge.
4. Run only a lightweight syntax/readability check over the touched docs.
5. Leave changes uncommitted for parent patch export.

## Parent Implementation Plan

1. Reproduce current `docs:check` and `docs:freshness` failures in the authoritative issue workspace.
2. Classify missing `docs/TASKS.md` references and repair the snapshot only where the gate expects active packet visibility.
3. Classify missing registry entries and add accurate rows for docs that should be tracked.
4. Classify registry references missing files and either restore, update, or remove rows with evidence-backed rationale.
5. Review stale docs before updating `last_review`; record rationale and evidence.
6. Keep `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` aligned.
7. Rerun parent-owned docs validation and review gates before PR handoff.

## Validation

Child lane:

- `git diff --check -- <six owned files>`
- protected-term/readability grep over the six owned files
- trailing whitespace check over the six owned files

Parent lane:

- before reproduction for `docs:check` and `docs:freshness`
- `npm run docs:check`
- `npm run docs:freshness`
- any additional spec/freshness checks required by parent-owned touched files
- parent-owned review, PR, and merge checks

## Rollback Plan

If parent validation shows the packet is too narrow or a failure class needs additional ownership, stop and relaunch with widened file scope. Do not expand this child lane after the fact.

## Exit Criteria For This Child Lane

- Six owned packet files exist.
- Packet content preserves the issue contract and parent/child ownership split.
- No parent-owned registry, source, test, Linear, or PR state is touched.
- Lightweight docs checks pass.
