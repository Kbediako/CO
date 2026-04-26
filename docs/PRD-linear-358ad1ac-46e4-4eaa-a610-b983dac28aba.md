# PRD - CO: promote resident app-server seam to authoritative provider-worker control plane

## Added by Docs Child Lane 2026-04-26

## Traceability
- Linear issue: `CO-389` / `358ad1ac-46e4-4eaa-a610-b983dac28aba`
- Task id: `linear-358ad1ac-46e4-4eaa-a610-b983dac28aba`
- Canonical spec: `tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md`
- Shared source 0 anchor: `ctx:sha256:1d9326aedeb79238be318d1be827130d7e533ba7c4b559c24f7f31873770193c#chunk:c000001`
- Source object id: `sha256:1d9326aedeb79238be318d1be827130d7e533ba7c4b559c24f7f31873770193c`
- Source payload: `../../.runs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba/cli/2026-04-26T03-48-02-269Z-9be693a5/memory/source-0/source.txt`
- Origin manifest: `../../.runs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba/cli/2026-04-26T03-48-02-269Z-9be693a5/manifest.json`
- Source note: the parent lane verified the shared source payload in this workspace and reconciled the child packet to that source anchor.
- Parent lane ownership: authoritative issue workspace, Linear state, workpad, implementation, validation, review, PR lifecycle, and any wider docs mirrors outside this child file scope.

## Problem

CO has a resident app-server seam, but provider-worker control still has too many non-authoritative paths for launching, resuming, restarting, draining, reading state, and proving runtime truth. `codex exec` / `codex exec resume` remain necessary as break-glass or legacy fallback, but they should not be the default authority for provider-worker control when the resident app-server can own the session, control requests, and read-model continuity.

The current posture makes operators and agents stitch together provider-worker truth from manifests, CO STATUS/control-host projections, workpad notes, and command output. CO-389 should promote the resident app-server seam to the authoritative provider-worker control plane so provider-worker control paths and control-host read models derive from the same authority, while migration canaries prove continuity, failure semantics, and rollback behavior.

## Expected

Provider-worker control uses the resident app-server seam as the authoritative provider-worker control plane. The same authority should drive:

- provider-worker control paths for start, drain, restart, resume, and status/state reads
- control-host read models used by CO STATUS and API/UI projections
- runtime proof recorded in manifests and provider-worker proof artifacts
- workpad evidence and parent-lane summaries that cite the same provider-worker truth source
- migration canaries that prove continuity, explicit failure semantics, and rollback behavior

`codex exec` / `codex exec resume` remain available as break-glass or legacy fallback, but the normal provider-worker control path must stop treating them as the authoritative control contract.

## User Request Translation

- User intent / needs: create the docs-first packet and task-index registration for the authoritative resident app-server provider-worker control contract before implementation starts.
- Success criteria / acceptance:
  - preserve `resident app-server seam` and `authoritative provider-worker control plane` as the central contract
  - define how provider-worker control paths move to app-server authority without losing drain, restart, resume, and state/read-model continuity
  - require manifests, CO STATUS/control-host, and workpad evidence to derive provider-worker truth from the same authority
  - keep `codex exec` / `codex exec resume` only as break-glass or legacy fallback
  - require migration canaries that prove continuity, failure semantics, and rollback behavior
  - reject BEAM rewrite, distributed scheduling, SSH worker pool, unsafe mid-turn hot reload claims, and widened remote shell/watch authority by default
- Constraints:
  - this child lane edits only the declared docs/task/index files
  - parent owns implementation, tests, docs-review, validation, Linear state, workpad, PR lifecycle, and any wider registry/mirror updates

## Intent Checksum

- Exact user wording / phrases to preserve:
  - `resident app-server seam`
  - `authoritative provider-worker control plane`
  - `provider-worker control paths`
  - `control-host read models`
  - `runtime proof`
  - `codex exec / codex exec resume as break-glass or legacy fallback`
  - `drain, restart, resume, and state/read-model continuity`
  - `manifests, CO STATUS/control-host, and workpad evidence derive provider-worker truth from the same authority`
  - `migration canaries proving continuity, failure semantics, and rollback behavior`
- Protected terms / exact artifact and surface names:
  - `resident app-server seam`
  - `authoritative provider-worker control plane`
  - `provider-worker control paths`
  - `control-host read models`
  - `runtime proof`
  - `manifests`
  - `CO STATUS`
  - `control-host`
  - `workpad evidence`
  - `codex exec`
  - `codex exec resume`
- Nearby wrong interpretations to reject:
  - this is a BEAM rewrite or replacement runtime architecture
  - this is a distributed scheduler or SSH worker-pool lane
  - this authorizes unsafe mid-turn hot reload of active provider work
  - this widens remote shell/watch authority by default
  - this is only a CO STATUS presentation change
  - this is only a fallback rename while `codex exec` remains authoritative
  - this can be done without migration canaries or rollback proof

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth |
| --- | --- | --- | --- |
| Provider-worker control paths | Control can still split across app-server, control-host helpers, command runners, and `codex exec` / `codex exec resume`. | A resident session authority owns provider control decisions and exposes stable request/response semantics. | The resident app-server seam is the normal authoritative provider-worker control plane; exec is break-glass or legacy fallback only. |
| Control-host read models | CO STATUS/control-host projections can be reconstructed from manifests, intake state, worker proof, and compatibility projections. | Read models should derive from the same provider authority that accepts control actions. | control-host read models expose state from the resident app-server authority and record provenance when compatibility fallbacks are used. |
| Runtime proof | Manifests and provider-worker proof artifacts can prove individual runs, but may not identify the same authority as status/workpad evidence. | Runtime proof should identify the control authority, runtime mode, continuity outcome, and fallback reason. | Manifests, provider proof, CO STATUS/control-host, and workpad evidence cite the same authority and runtime-proof fields. |
| Drain/restart/resume continuity | Restart/resume/drain flows can be validated locally but are not yet the app-server provider-control contract. | A provider-control migration must prove no lost state/read-model continuity across drain, restart, and resume. | Migration canaries prove continuity, failure semantics, rollback behavior, and no unsafe mid-turn hot reload claim. |
| Fallback posture | `codex exec` / `codex exec resume` can remain a practical path for legacy or break-glass execution. | Fallback should be explicit, rare, and machine-checkable. | Fallback is labeled as break-glass or legacy, records reason/provenance, and does not masquerade as resident app-server authority. |

## Goals

- Promote the resident app-server seam to the authoritative provider-worker control plane.
- Make provider-worker control paths route through a single authority for start, drain, restart, resume, and status/state reads.
- Make control-host read models and CO STATUS derive provider-worker truth from the same authority as control actions.
- Preserve runtime proof across manifests, provider-worker proof artifacts, CO STATUS/control-host, and workpad evidence.
- Keep `codex exec` / `codex exec resume` as explicit break-glass or legacy fallback only.
- Require migration canaries for continuity, failure semantics, and rollback behavior before parent handoff.

## Non-Goals

- No BEAM rewrite.
- No distributed scheduling or SSH worker pool.
- No unsafe mid-turn hot reload claim.
- Do not widen remote shell/watch authority by default.
- Do not redesign unrelated Linear scheduling, queue selection, or workpad lifecycle behavior.
- Do not edit source or test files in this docs child lane.

## Acceptance Criteria

- A docs-first packet exists for CO-389 with protected wording, nearby wrong interpretations, non-goals, Not Done If, parity matrix, implementation plan, and validation placeholders.
- `tasks/index.json` registers `20260426-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba` with links to the task spec, task checklist, and docs packet.
- Parent implementation plan names the provider-worker control paths and control-host read models that must derive from resident app-server authority.
- Parent validation requires migration canaries proving drain, restart, resume, state/read-model continuity, failure semantics, and rollback behavior.
- Parent validation requires proof that manifests, CO STATUS/control-host, and workpad evidence derive provider-worker truth from the same authority.
- The packet keeps `codex exec` / `codex exec resume` as break-glass or legacy fallback, not normal authority.

## Not Done If

- Provider-worker control remains split across independent app-server, command-runner, and exec/resume authorities without a single provenance contract.
- CO STATUS/control-host read models can report provider-worker truth that does not derive from the same authority used for control actions.
- Manifests and runtime proof cannot identify whether the resident app-server seam or fallback exec path owned the run.
- Drain, restart, resume, or state/read-model continuity is asserted without migration canary evidence.
- The design claims unsafe mid-turn hot reload, widens remote shell/watch authority by default, or turns CO-389 into a BEAM/distributed-scheduler rewrite.

## Stakeholders

- Operators using CO STATUS/control-host and workpad evidence to understand provider-worker truth.
- Provider-worker maintainers responsible for launch, drain, restart, resume, and runtime proof.
- Reviewers validating that the migration is evidence-backed and rollback-safe.
- Parent lane owner coordinating Linear state, implementation, validation, PR, and handoff.

## Metrics & Guardrails

- Primary success metrics:
  - provider-worker control actions and read models share one resident app-server authority
  - runtime proof records authority, fallback reason, continuity outcome, and rollback posture
  - migration canaries pass for drain, restart, resume, failure semantics, and rollback behavior
  - `codex exec` / `codex exec resume` uses are explicitly labeled as break-glass or legacy fallback
- Guardrails:
  - preserve active provider-worker state and read-model continuity during migration
  - fail closed when authority is ambiguous
  - keep remote shell/watch authority unchanged unless a separate issue explicitly widens it
  - make fallback provenance machine-checkable in manifests and workpad-ready summaries

## User Experience

- Operator reads CO STATUS/control-host and sees provider-worker truth from the same authority that can drain, restart, resume, or report state.
- Reviewer opens manifests and runtime proof and can tell whether resident app-server authority or a fallback exec path owned the run.
- Parent lane updates the workpad from the same evidence source instead of reconciling conflicting command, manifest, and status narratives.

## Technical Considerations

- Candidate implementation surfaces for parent inspection:
  - `orchestrator/src/cli/control/providerWorkerHosts.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerLinearWorkerTruth.ts`
  - `orchestrator/src/cli/control/providerLinearRuntimeProof.ts`
  - `orchestrator/src/cli/control/controlRuntime.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/uiDataController.ts`
  - `orchestrator/src/cli/coStatusCliShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - `orchestrator/src/cli/runtime/provider.ts`
  - `orchestrator/src/cli/services/execRuntime.ts`
- Candidate focused tests/canaries for parent selection:
  - `orchestrator/tests/ProviderLinearWorkerRunner.test.ts`
  - `orchestrator/tests/ProviderLinearRuntimeProof.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`
  - `orchestrator/tests/ControlRuntime.test.ts`
  - `orchestrator/tests/CoStatusCliShell.test.ts`
  - `orchestrator/tests/ControlServer.test.ts`

## Open Questions

- Which resident app-server request surface should be the first authoritative provider-worker control boundary for drain, restart, and resume?
- Which runtime-proof fields should be mandatory so manifests, CO STATUS/control-host, and workpad evidence all cite the same authority?
- What is the smallest rollback canary that proves fallback to `codex exec` / `codex exec resume` remains available without becoming the normal authority?

## Approvals

- Product: self-approved from the parent-provided CO-389 issue-shaping contract.
- Engineering: pending parent docs-review, implementation, focused validation, and migration canaries.
- Design: N/A.
