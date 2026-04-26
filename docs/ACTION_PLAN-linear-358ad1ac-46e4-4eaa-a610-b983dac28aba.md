# ACTION_PLAN - CO: promote resident app-server seam to authoritative provider-worker control plane

## Added by Docs Child Lane 2026-04-26

## Summary

- Goal: give the parent lane a bounded implementation plan for promoting the resident app-server seam to the authoritative provider-worker control plane.
- Scope: this child lane creates the CO-389 docs-first packet and `tasks/index.json` registration only; parent owns implementation, tests, docs-review, validation, Linear state, workpad evidence, PR lifecycle, and wider docs mirrors outside the declared file scope.
- Assumptions:
  - the parent-provided issue prompt and verified shared source payload are the authoritative issue-shaping sources
  - normal provider-worker control should move to resident app-server authority
  - `codex exec` / `codex exec resume` stay available only as break-glass or legacy fallback
  - migration must be proven by canaries, not by narrative claims

## Issue Readiness Gate

- Intent checksum / protected terms carried forward:
  - `resident app-server seam`
  - `authoritative provider-worker control plane`
  - `provider-worker control paths`
  - `control-host read models`
  - `runtime proof`
  - `codex exec / codex exec resume as break-glass or legacy fallback`
  - `drain, restart, resume, and state/read-model continuity`
  - `manifests, CO STATUS/control-host, and workpad evidence derive provider-worker truth from the same authority`
  - `migration canaries proving continuity, failure semantics, and rollback behavior`
- Not done if:
  - provider-worker control remains split across multiple normal authorities
  - control-host read models can disagree with runtime proof or manifests about provider-worker authority
  - continuity across drain, restart, resume, or state/read-model reads is asserted without migration canary evidence
  - fallback `codex exec` / `codex exec resume` is routine, unlabelled, or hidden as normal authority
  - the design claims unsafe mid-turn hot reload, BEAM rewrite, distributed scheduling, SSH worker pool, or default remote shell/watch expansion
- Pre-implementation issue-quality review:
  - 2026-04-26: child-lane review confirms CO-389 is broader than a CO STATUS renderer or manifest-field rename and narrower than runtime replacement, BEAM, distributed scheduling, or remote shell/watch expansion. The correctness contract depends on exact protected terms, authority provenance, continuity canaries, and explicit fallback posture, so the micro-task path is ineligible.

## Milestones & Sequencing

1. Child lane drafts the PRD, TECH_SPEC mirror pair, ACTION_PLAN, task spec, task checklist, and `tasks/index.json` entry inside the declared file scope.
2. Parent accepts or adjusts the packet in the authoritative issue workspace and handles any wider mirrors such as `.agent/task`, `docs/TASKS.md`, or docs-freshness registry entries.
3. Parent inspects the current provider-worker control paths, resident app-server seam, control-host read models, manifest/proof writers, and fallback exec/resume seams.
4. Parent defines the resident app-server authority boundary for provider-worker start/admit, drain, restart, resume, status/state reads, and runtime proof.
5. Parent implements authority provenance so manifests, provider-worker proof, CO STATUS/control-host, and workpad-ready evidence derive provider-worker truth from the same authority.
6. Parent keeps `codex exec` / `codex exec resume` as explicitly labeled break-glass or legacy fallback.
7. Parent adds focused regressions and migration canaries for drain, restart, resume, state/read-model continuity, failure semantics, and rollback behavior.
8. Parent runs scoped then full required validation and review gates according to authoritative workspace policy.

## Dependencies

- Shared source anchor: `ctx:sha256:1d9326aedeb79238be318d1be827130d7e533ba7c4b559c24f7f31873770193c#chunk:c000001`
- Origin manifest: `../../.runs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba/cli/2026-04-26T03-48-02-269Z-9be693a5/manifest.json`
- Source payload: `../../.runs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba/cli/2026-04-26T03-48-02-269Z-9be693a5/memory/source-0/source.txt`
- Source availability note: the parent lane verified the shared source payload and reconciled the accepted child packet to that source anchor.
- Candidate parent-owned source seams:
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

## Validation

- Child-lane checks:
  - `jq empty tasks/index.json`
  - protected-term grep across the five packet/checklist files
  - `git diff --check -- docs/PRD-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md docs/TECH_SPEC-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md docs/ACTION_PLAN-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md tasks/specs/linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md tasks/tasks-linear-358ad1ac-46e4-4eaa-a610-b983dac28aba.md tasks/index.json`
- Parent implementation checks:
  - focused provider-worker authority tests
  - focused runtime-proof tests
  - focused control-host read-model and CO STATUS authority-provenance tests
  - migration canary for drain continuity
  - migration canary for restart continuity
  - migration canary for resume continuity
  - failure-semantics canary
  - rollback canary for labeled `codex exec` / `codex exec resume`
  - `node scripts/spec-guard.mjs --dry-run`
  - parent-owned docs-review and implementation-gate manifests
- Rollback plan:
  - preserve existing break-glass/legacy `codex exec` / `codex exec resume` path
  - if resident app-server authority fails migration canaries, parent reverts the authority promotion while preserving docs evidence and fallback provenance
  - rollback proof must confirm that CO STATUS/control-host and manifests do not falsely claim resident authority after rollback

## Risks & Mitigations

- Risk: the implementation changes only CO STATUS/read models while provider-worker control remains exec-authoritative.
  - Mitigation: require control-path tests and authority provenance in runtime proof.
- Risk: app-server authority is asserted without proving active state/read-model continuity.
  - Mitigation: require drain, restart, and resume migration canaries.
- Risk: fallback becomes hidden normal behavior.
  - Mitigation: require explicit fallback reason/provenance fields and a rollback canary.
- Risk: the scope expands into distributed scheduling or remote shell/watch authority.
  - Mitigation: preserve explicit non-goals and stop if parent needs a wider issue.

## Approvals

- Reviewer: pending parent implementation and docs-review.
- Date: 2026-04-26.
