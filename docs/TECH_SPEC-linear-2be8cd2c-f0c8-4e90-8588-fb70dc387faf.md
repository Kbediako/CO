---
id: 20260512-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf
title: CO-514 serialize provider-worker goal evidence manifest patches
relates_to: docs/PRD-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md
risk: medium
owners:
  - Codex
last_review: 2026-05-12
related_action_plan: docs/ACTION_PLAN-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md
task_checklists:
  - tasks/tasks-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md
---

# TECH_SPEC - CO-514 Serialize Provider-Worker Goal Evidence Manifest Patches

## Canonical Reference
- PRD: `docs/PRD-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- TECH_SPEC mirror: `tasks/specs/linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- Task checklist: `tasks/tasks-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- Linear issue: `CO-514` / `2be8cd2c-f0c8-4e90-8588-fb70dc387faf`
- Source review thread: PR #793, thread `PRRT_kwDOQE1BPc6AbZTH`

## Summary
- Objective: serialize provider-worker advisory `goal_evidence` manifest patches with the other manifest writers that can race with them.
- Scope: provider-worker manifest patching, command-runner manifest persistence, provider-worker control-host/selected-run manifest writes, and focused concurrency tests.
- Constraints: `goal_evidence` stays advisory-only; no Linear/workpad/PR/review/check authority changes; no broad manifest schema redesign.

## Issue-Shaping Contract
- User-request translation carried forward: implement a small shared manifest patch/lock primitive, compare/retry path, or equivalent field-level merge contract so advisory goal evidence cannot overwrite unrelated manifest fields.
- Protected terms / exact artifact and surface names: provider-worker manifest patch, `goal_evidence`, manifest-level serialization, field-level merge, compare/retry, command-runner manifest persistence, control-host manifest persistence, `advisory_only`.
- Nearby wrong interpretations to reject: lifecycle authority from goal state, one-call-site-only serialization, stale/malformed goal evidence promotion, unrelated manifest schema redesign.
- Explicit non-goals carried forward: no Linear/workpad/PR/review/check authority change, no hook/resume/long-poll control integration, no proof-lock replacement without compatibility proof.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Provider-worker `goal_evidence` patch | Rereads before writing but still writes a whole manifest snapshot. | CO-492 made evidence advisory and fail-closed but did not serialize all racing manifest writers. | `goal_evidence` patch mutates the current manifest under the shared contract and writes only after merging with current file state. | Treating goal state as lifecycle authority. |
| Command-runner manifest persistence | Persister saves whole snapshots and can race with provider-worker patching. | Command-runner is a known manifest writer named in CO-514. | Whole-snapshot persistence participates in the same lock/merge contract. | Redesigning command-runner state or manifest schema. |
| Control-host/provider-worker manifest persistence | Runtime selection/backfill writes can touch control-host and selected manifests directly. | Control-host persistence is a known racing writer named in CO-514. | Direct writes use the shared helper or are proven non-overlapping. | Replacing proof locks or control-host ownership locks. |
| Advisory authority | `goal_evidence` carries `authority=advisory_only` and denial markers. | CO-492 authority boundary remains correct. | Validation and marker generation stay unchanged. | Lifecycle authorization from persisted goal state. |

## Technical Requirements
- Functional requirements:
  - Add a shared helper for run manifest JSON-object writes.
  - The helper must acquire a manifest-level lock, read the current JSON object while locked, apply a patch or field-level merge, and write atomically.
  - Field patches must mutate only the current manifest object and return the persisted object for in-memory fallback synchronization.
  - Whole-snapshot writes must merge the outgoing snapshot onto the current manifest so fields absent from a stale snapshot are not dropped.
  - Snapshot writes can preserve protected current fields such as `goal_evidence` when a stale outgoing snapshot only carries `null`; field-level patches own explicit clearing.
  - Missing manifest files in optional provider-worker patch paths stay skippable as today.
- Non-functional requirements:
  - Keep the helper small and local to run manifest persistence.
  - Fail closed on non-object JSON manifest content.
  - Reuse existing atomic write and lock-file primitives.
- Interfaces / contracts:
  - `patchRunManifestFile(path, patcher, options)` for field-level updates.
  - `writeRunManifestSnapshot(path, snapshot, options)` for serialized whole-snapshot writes.
  - Existing `saveManifest` keeps its public signature and routes through the helper.

## Architecture & Data
- Architecture / design adjustments:
  - Add a run manifest write helper under `orchestrator/src/cli/run/`.
  - Use `${manifestPath}.lock` for manifest-level serialization.
  - Keep writes atomic with the existing JSON atomic write utility.
  - Update provider-worker direct manifest writes to use the helper.
- Data model changes / migrations: none.
- External dependencies / integrations: none.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker `goal_evidence` patch | stale whole-manifest overwrite after reread-before-write | remove fallback | CO-514 | concurrent goal evidence patch and unrelated writer | 2026-05-12 | 2026-05-12 | this issue | field-level patch runs under shared manifest lock | focused concurrency test |
| Whole manifest persistence | command-runner/control-host snapshot writes can race outside the patch path | remove fallback | CO-514 | snapshot persistence races with provider-worker patch | 2026-05-12 | 2026-05-12 | this issue | snapshot writes use shared helper or are proven non-overlapping | focused writer test |
| Linear-first lifecycle authority | goal evidence is advisory beside canonical workflow truth | justify retaining fallback | provider-worker workflow | goal evidence exists or fails closed | existing authority contract predates CO-514 | 2026-05-12 | non-expiring authority contract | separate approved authority redesign | advisory marker tests |

- Large refactor: bounded shared manifest helper is sufficient; no broad manifest schema redesign or lifecycle authority redesign is needed.
- Minor seam: stale whole-manifest overwrite is removed for goal evidence and known racing writers; the retained Linear-first authority contract is durable governance, not temporary compatibility debt.
- Contract name: Linear-first advisory goal evidence authority boundary.
- Owning surface: CO provider-worker workflow and Linear/workpad/PR/review/check lifecycle gates.
- Steady-state proof: goal evidence can be present, absent, stale, or malformed while lifecycle authority remains with Linear/workpad/PR/review/check gates.
- Tests/docs: manifest helper tests, command-runner/provider-worker goal evidence tests, and CO-514 packet docs prove advisory markers and authority denial remain intact.
- Non-expiring rationale: the authority boundary is a supported governance contract and should be removed only by a separate approved lifecycle authority redesign.

## Validation Plan
- Focused tests cover concurrent unrelated manifest updates surviving `goal_evidence` patching.
- Tests cover whole-snapshot persistence preserving current `goal_evidence` when the stale outgoing snapshot omits it.
- Existing advisory marker normalization remains unchanged by tests around canonical denial markers.
- Run build, lint, test, docs checks, freshness, stewardship, diff-budget, standalone review, and elegance pass before review handoff.

## Open Questions
- None blocking. If broader manifest writers outside command-runner/control-host/provider-worker are discovered, classify them as in-scope only when they can race with provider-worker `goal_evidence` patches.

## Approvals
- Reviewer: provider worker parent
- Date: 2026-05-12
