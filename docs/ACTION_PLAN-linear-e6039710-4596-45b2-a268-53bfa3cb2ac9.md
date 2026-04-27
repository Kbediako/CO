# ACTION_PLAN - CO-401 docs freshness maintenance owner verification

## Summary
- Goal: create the CO-401 docs-first packet and task registration mirrors for the `docs:freshness` / `docs:freshness:maintain` maintenance lane.
- Scope: packet files, task checklist mirrors, `tasks/index.json`, and `docs/TASKS.md` only.
- Assumptions:
  - the parent handoff and live Linear issue context carry the authoritative protected issue terms
  - the child lane's stale-base patch was rejected and adapted by the parent on current `origin/main`
  - parent owns stale cohort review, owner verification, docs-freshness registry edits, validation, Linear state, workpad, and PR lifecycle

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-401`
  - `docs:freshness`
  - `docs:freshness:maintain`
  - `last_review=2026-03-27`
  - `30 stale docs`
  - `blocking_changed_paths=[]`
  - `CO-343 owner verification failed`
  - `docs:freshness:maintain canonical owner key`
- Not done if:
  - the docs packet omits or renames any protected term
  - the docs packet suggests this child lane should edit stale Mar 27 cohort files or `docs/docs-freshness-registry.json`
  - the plan changes the canonical owner key away from `docs:freshness:maintain`
  - the issue is narrowed to only stale docs or only owner verification
  - validation commands omit `npm run docs:freshness` or `npm run docs:freshness:maintain`
- Pre-implementation issue-quality review:
  - 2026-04-27: the issue is not plausibly just a zero-change no-op despite `blocking_changed_paths=[]`; CO-401 still records stale freshness and owner-verification failures.
  - 2026-04-27: micro-task path is unavailable because correctness depends on exact protected wording and canonical owner-key preservation.

## Milestones & Sequencing
1. Reconcile the child docs-packet output against the live Linear issue context and current `origin/main`.
2. Create the CO-401 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
3. Register the canonical task id in `tasks/index.json`.
4. Add a current CO-401 snapshot to `docs/TASKS.md`.
5. Validate edited JSON and protected-term coverage.
6. Leave changes uncommitted for parent patch export.

## Parent-Owned Follow-On Plan
1. Parent reproduces the baseline with `npm run docs:freshness`.
2. Parent reproduces or verifies maintenance owner state with `npm run docs:freshness:maintain`.
3. Parent classifies the exact `30 stale docs` at `last_review=2026-03-27`.
4. Parent repairs the stale cohort, records the invalid `CO-343` owner evidence, and re-homes the live `docs/docs-catalog.json` owner issue to same-project `CO-401` while preserving the `docs:freshness:maintain canonical owner key`.
5. Parent updates required `docs/docs-freshness-registry.json` rows, the freshness cohort guide, and stale TECH_SPEC/task-spec frontmatter after review.
6. Parent reruns validation and owns PR/review lifecycle.

## Dependencies
- Linear issue `CO-401`
- Source anchor `ctx:sha256:59e2417b10419f81edc5b5394c8ed53b584f71012609edf951815cfd26cdea85#chunk:c000001`
- `npm run docs:freshness`
- `npm run docs:freshness:maintain`
- `tasks/index.json`
- `docs/TASKS.md`

## Validation
- Checks / tests:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index ok')"`
  - `rg -n "docs:freshness|docs:freshness:maintain|last_review=2026-03-27|30 stale docs|blocking_changed_paths=\\[\\]|CO-343 owner verification failed|docs:freshness:maintain canonical owner key" docs/PRD-linear-e6039710-4596-45b2-a268-53bfa3cb2ac9.md docs/TECH_SPEC-linear-e6039710-4596-45b2-a268-53bfa3cb2ac9.md docs/ACTION_PLAN-linear-e6039710-4596-45b2-a268-53bfa3cb2ac9.md tasks/specs/linear-e6039710-4596-45b2-a268-53bfa3cb2ac9.md tasks/tasks-linear-e6039710-4596-45b2-a268-53bfa3cb2ac9.md .agent/task/linear-e6039710-4596-45b2-a268-53bfa3cb2ac9.md docs/TASKS.md`
  - `git diff --name-only`
- Parent-owned validation commands:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain`
- Rollback plan:
  - revert only the CO-401 packet, task-registration mirror, and freshness metadata edits if validation shows the reviewed cohort was not the active blocker

## Risks & Mitigations
- Risk: stale-base child packet drift.
  - Mitigation: parent rejected the non-applicable child patch, adapted packet content on current `origin/main`, and records the child manifest as evidence rather than blindly applying the stale patch.
- Risk: `blocking_changed_paths=[]` is misread as no required work.
  - Mitigation: packet explicitly treats it as maintenance-state evidence alongside stale docs and owner verification failure.
- Risk: owner repair renames the canonical owner key.
  - Mitigation: packet repeatedly requires preserving `docs:freshness:maintain`.
- Risk: child patch drifts into implementation.
  - Mitigation: file scope is limited to packet and task registration mirrors.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-27
- Parent docs-review / implementation approval: pending
