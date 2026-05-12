# Task Checklist - linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf

- Linear Issue: `CO-514` / `2be8cd2c-f0c8-4e90-8588-fb70dc387faf`
- Task registry id: `20260512-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf`
- MCP Task ID: `linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf`
- Primary PRD: `docs/PRD-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- TECH_SPEC: `tasks/specs/linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- Source review thread: PR #793, thread `PRRT_kwDOQE1BPc6AbZTH`
- Source anchor: `ctx:sha256:6da76c74b6e004673e9366d5b3ed5e1369700ba60a983fb9104ae6fc99fa0d3a#chunk:c000001`

## Docs-First
- [x] PRD created with issue description, intent checksum, non-goals, and `Not Done If`. Evidence: `docs/PRD-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`.
- [x] TECH_SPEC created with manifest-level serialization, field-level merge, compare/retry, and advisory authority boundaries. Evidence: `tasks/specs/linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`, `docs/TECH_SPEC-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`.
- [x] ACTION_PLAN created for implementation and validation sequencing. Evidence: `docs/ACTION_PLAN-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`.
- [x] Task registration and docs freshness registry mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Protected Issue Terms
- [x] provider-worker manifest patch
- [x] `goal_evidence`
- [x] manifest-level serialization
- [x] field-level merge
- [x] compare/retry
- [x] command-runner manifest persistence
- [x] control-host manifest persistence
- [x] `advisory_only`

## Acceptance Criteria
- [ ] Manifest `goal_evidence` patching uses a shared lock, compare/retry, or equivalent field-level merge contract.
- [ ] Command-runner/control-host/provider-worker manifest writers that can race with `goal_evidence` patches participate in the same contract or are proven non-overlapping.
- [ ] Focused tests cover concurrent unrelated manifest updates surviving `goal_evidence` patching.
- [ ] Advisory-only `goal_evidence` validation and authority denial markers remain unchanged.

## Non-Goals / Not Done If
- [x] Not done if `goal_evidence` patches can overwrite concurrent unrelated manifest fields.
- [x] Not done if the fix only serializes one call site while known concurrent manifest writers remain unlocked.
- [x] Not done if stale or malformed goal evidence can be promoted.
- [x] Not done if lifecycle decisions start depending on goal state.
- [x] No Linear/workpad/PR/review/check authority change.
- [x] No broad manifest schema redesign.
- [x] No hook/resume/long-poll control integration.

## Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker `goal_evidence` patch | stale whole-manifest overwrite after reread-before-write | remove fallback | CO-514 | concurrent `goal_evidence` patch and unrelated writer | 2026-05-12 | 2026-05-12 | this issue | field-level patch runs under shared manifest lock | focused concurrency test |
| Whole manifest persistence | command-runner/control-host snapshot writes can race outside the patch path | remove fallback | CO-514 | snapshot persistence races with provider-worker patch | 2026-05-12 | 2026-05-12 | this issue | snapshot writes use shared helper or are proven non-overlapping | focused writer test |
| Linear-first lifecycle authority | goal evidence is advisory beside canonical workflow truth | justify retaining fallback | provider-worker workflow | goal evidence exists or fails closed | existing authority contract predates CO-514 | 2026-05-12 | non-expiring authority contract | separate approved authority redesign | advisory marker tests |

- Large refactor: bounded shared manifest helper is sufficient; no broad manifest schema redesign or lifecycle authority redesign is needed.
- Minor seam: stale whole-manifest overwrite is removed for goal evidence and known racing writers; the retained Linear-first authority contract is durable governance, not temporary compatibility debt.
- Contract name: Linear-first advisory goal evidence authority boundary.
- Owning surface: CO provider-worker workflow and Linear/workpad/PR/review/check lifecycle gates.
- Steady-state proof: goal evidence can be present, absent, stale, or malformed while lifecycle authority remains with Linear/workpad/PR/review/check gates.
- Tests/docs: manifest helper tests, command-runner/provider-worker goal evidence tests, and CO-514 packet docs prove advisory markers and authority denial remain intact.
- Non-expiring rationale: the authority boundary is a supported governance contract and should be removed only by a separate approved lifecycle authority redesign.

## Implementation Tasks
- [ ] Add shared serialized manifest patch/write helper.
- [ ] Route `saveManifest` / command-runner persistence through the helper.
- [ ] Route provider-worker `goal_evidence` patching through field-level helper.
- [ ] Route provider-worker runtime selection/control-host direct writes through the helper.
- [ ] Remove provider-worker-specific stale whole-manifest patch logic.
- [ ] Add focused concurrency tests.
- [ ] Confirm advisory marker generation remains unchanged.

## Validation
- [ ] Targeted manifest helper/provider-worker concurrency tests.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `npm run repo:stewardship`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] Manifest-backed standalone review and explicit elegance pass.
- [ ] PR ready-review drain before review handoff.

## Progress Log
- 2026-05-12: Parent created workpad, moved issue to `In Progress`, recorded `parallelize_now`, and launched same-issue child lanes.
- 2026-05-12: Child lanes stalled before usable patch output and were invalidated; parent recorded the runtime-contract risk and took back docs/implementation.
- 2026-05-12: Parent created the docs-first packet and mirrors.

## Notes
- Advisory persisted `/goal` evidence remains advisory-only and must not be used for lifecycle authority.
- The issue is not complete until known concurrent manifest writers share the serialization/merge contract or are proven non-overlapping.
