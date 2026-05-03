# PRD - CO-468 control-host accepted no-run pending revalidation recovery

## Traceability
- Linear issue: `CO-468` / `6d7e842c-b10a-42f5-a7e0-8a30a8dd9442`
- Linear URL: https://linear.app/asabeko/issue/CO-468
- Task id: `linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442`
- Canonical spec: `tasks/specs/linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`
- Task checklist: `tasks/tasks-linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`
- Agent mirror: `.agent/task/linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`
- Canonical owner key: `control-host-recovery:accepted-no-run-pending-revalidation:no-run-id-token-manifest`
- Source anchor: `ctx:sha256:104e38bfcd8ab9bf6e53beda8a47ddf80474a965ab6a27ee6635a6b0495be6af#chunk:c000001`
- Source manifest: `.runs/linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442-docs-packet/cli/2026-05-01T13-35-17-299Z-2f0bc220/manifest.json`
- Source payload note: the declared source payload path is not present inside this child lane checkout. This docs packet is anchored on the parent prompt, source anchor, and protected terms; the parent lane owns live Linear `issue-context`, docs-review, implementation, workpad, PR lifecycle, and final handoff.

## Summary
- Problem Statement: a `Ready issue` can carry an `accepted/pending revalidation` provider-intake claim after `control-host recovery/nudge/relaunch` attempts, while `run_id=null`, `launch_token=null`, `run_manifest_path=null`, and `no manifest` prove there is no active run evidence. When WIP is below cap, that no-run accepted residue should not block recovery, nudge, or relaunch, and the CLI must surface the bounded `25s CLI recovery timeout` truth without misclassifying the case as another already-owned issue family.
- Desired Outcome: parent implementation makes the no-run pending-revalidation recovery path explicit and auditable. `control-host recovery/nudge/relaunch` revalidates the Ready issue, treats accepted/no-run residue as non-WIP capacity, and either relaunches, queues truthfully, clears stale residue, or reports an actionable no-op within the 25s recovery timeout.

## User Request Translation
- User intent / needs:
  - create the CO-468 docs-first packet and registry mirrors before parent implementation
  - preserve the exact issue shape: `control-host recovery/nudge/relaunch`, `accepted/pending revalidation`, `Ready issue`, `run_id=null`, `launch_token=null`, `run_manifest_path=null`, `no manifest`, `WIP below cap`, `25s CLI recovery timeout`, and the `CO-404/CO-406 done family`
  - preserve canonical ownership under `control-host-recovery:accepted-no-run-pending-revalidation:no-run-id-token-manifest`
  - reject adjacent but different issues: `CO-455 attach timeout with healthy manifests`, `CO-459 stale provider_intake projection`, `CO-453 child-lane tracker drift`, and any request to make no-run accepted claims consume WIP
- Success criteria / acceptance:
  - PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` carry the same issue contract
  - parent implementation verifies the live issue is a Ready issue before mutating lifecycle state
  - parent implementation handles accepted/pending revalidation with `run_id=null`, `launch_token=null`, `run_manifest_path=null`, and no manifest as recovery residue, not active WIP
  - parent implementation preserves WIP below cap truth and does not make no-run accepted claims consume WIP
  - parent implementation preserves the completed CO-404/CO-406 boundaries and uses them as references, not reopened work
- Constraints / non-goals:
  - child lane owns docs packet and registry mirrors only
  - no implementation, test, Linear mutation, GitHub mutation, workpad, PR, or full validation work in this child lane
  - parent owns source inspection, docs-review, implementation, validation, review, PR lifecycle, and Linear state

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `control-host recovery/nudge/relaunch`
  - `accepted/pending revalidation`
  - `Ready issue`
  - `run_id=null`
  - `launch_token=null`
  - `run_manifest_path=null`
  - `no manifest`
  - `WIP below cap`
  - `25s CLI recovery timeout`
  - `CO-404/CO-406 done family`
  - `control-host-recovery:accepted-no-run-pending-revalidation:no-run-id-token-manifest`
- Protected terms / exact artifact and surface names:
  - `control-host recover`
  - `control-host relaunch`
  - `control-host nudge`
  - `provider-intake-state.json`
  - `provider_issue_rehydration_pending_revalidation`
  - `controlHostProviderWorkerRecoverCliShell.ts`
  - `providerIssueHandoff.ts`
  - `co-status --format json`
  - `/ui/data.json`
  - `Ready`
  - `WIP`
- Nearby wrong interpretations to reject:
  - `CO-455 attach timeout with healthy manifests`
  - `CO-459 stale provider_intake projection`
  - `CO-453 child-lane tracker drift`
  - making no-run accepted claims consume WIP
  - treating this as a generic provider-intake display refresh
  - treating this as a request to reopen CO-404 timeout acknowledgement or CO-406 capacity accounting

## Parity / Alignment Matrix

| Surface | Current Truth | Reference Truth | Target Truth | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| Linear issue state | Prompt frames CO-468 as a Ready issue needing recovery shaping. | Parent must verify live `issue-context` before lifecycle mutation. | Recovery/nudge/relaunch behavior is gated on a Ready issue with accepted no-run pending revalidation residue. | Child lane Linear mutation or workpad edits. |
| Provider-intake recovery residue | Accepted/pending revalidation may exist with `run_id=null`, `launch_token=null`, `run_manifest_path=null`, and `no manifest`. | CO-406 established no-run accepted claims are audit/revalidation truth, not WIP occupancy. | Parent revalidates or clears/relaunches the residue without making it consume WIP. | Claim deletion as a blind cleanup or WIP accounting regression. |
| CLI recovery behavior | A recovery command can hit a bounded timeout while no manifest/run evidence exists. | CO-404 established the recovery/relaunch/nudge timeout family and the operator-visible timeout budget. | `25s CLI recovery timeout` remains visible and actionable while recovery logic distinguishes no-run residue from healthy-manifest attach timeouts. | CO-455 attach timeout with healthy manifests. |
| Status/projection truth | Status surfaces may show stale accepted/pending revalidation without enough run evidence. | CO-459 owns stale provider_intake projection drift if projection itself is stale. | CO-468 focuses on the recovery path for no-run/no-manifest residue, with status only as validation evidence. | CO-459 stale provider_intake projection repair. |
| Child-lane lifecycle | Child-lane metadata can drift independently of provider-intake truth. | CO-453 owns child-lane tracker drift. | CO-468 does not use child-lane tracker state as the recovery authority. | CO-453 child-lane tracker drift. |

## Not Done If
- `control-host recovery/nudge/relaunch` still cannot make progress for an accepted/pending revalidation Ready issue with `run_id=null`, `launch_token=null`, `run_manifest_path=null`, and no manifest while WIP is below cap.
- No-run accepted claims are made to consume WIP as the fix.
- The implementation treats CO-468 as `CO-455 attach timeout with healthy manifests`.
- The implementation treats CO-468 as `CO-459 stale provider_intake projection`.
- The implementation treats CO-468 as `CO-453 child-lane tracker drift`.
- The packet or parent implementation reopens the `CO-404/CO-406 done family` instead of preserving those boundaries.
- The canonical owner key `control-host-recovery:accepted-no-run-pending-revalidation:no-run-id-token-manifest` is omitted from docs or review evidence.

## Goals
- Create the docs-first packet and registry mirrors for CO-468.
- Define the parent implementation contract for accepted/no-run pending revalidation recovery.
- Preserve WIP below cap truth and CO-406 non-occupancy semantics.
- Preserve the CO-404 25s recovery timeout boundary.
- Keep adjacent issue families out of scope.

## Non-Goals
- No implementation or test edits in this child lane.
- No Linear state, GitHub state, workpad, or PR lifecycle mutation in this child lane.
- No request to make no-run accepted claims consume WIP.
- No attach-timeout-with-healthy-manifest fix for CO-455.
- No stale provider_intake projection fix for CO-459.
- No child-lane tracker drift fix for CO-453.
- No broad provider workflow, current-state authority, or status UI redesign.

## Stakeholders
- Product: CO operators using control-host recovery, nudge, relaunch, and WIP posture to keep Ready issues moving.
- Engineering: parent CO-468 provider worker implementing recovery path handling and focused regressions.
- Review: parent lane and review agents validating that adjacent issue families remain separate.

## Metrics & Guardrails
- Primary Success Metrics:
  - protected issue terms appear in PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror
  - `tasks/index.json` and `docs/docs-freshness-registry.json` parse as JSON after registration
  - parent focused tests cover Ready issue, accepted/pending revalidation, no run id/token/manifest, WIP below cap, and 25s CLI timeout behavior
- Guardrails:
  - no accepted no-run WIP regression
  - no CO-404/CO-406 reopen
  - no CO-455/CO-459/CO-453 scope absorption
  - no child-lane lifecycle mutation

## Technical Considerations
- Architectural Notes:
  - parent implementation should inspect control-host recovery, nudge, and relaunch paths that read provider-intake claims and CLI timeout results
  - recovery should classify no-run/no-manifest accepted pending revalidation as revalidation residue
  - WIP accounting should continue to rely on run or launch evidence, not accepted state alone
  - status/read-model evidence is validation support, not the sole fix
- Dependencies / Integrations:
  - `provider-intake-state.json`
  - `control-host recover`
  - `control-host relaunch`
  - `control-host nudge`
  - `co-status --format json`
  - `/ui/data.json`
  - CO-404 timeout behavior
  - CO-406 accepted no-run capacity behavior

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision summary: remove the no-run accepted pending-revalidation recovery gap; justify retaining the accepted/no-run non-occupancy audit state; justify retaining the 25s recovery timeout as a supported operator safety contract.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host recovery/nudge/relaunch | Accepted/pending revalidation with no run id, token, or manifest cannot be recovered even when WIP is below cap. | remove fallback | CO-468 | Ready issue has `run_id=null`, `launch_token=null`, `run_manifest_path=null`, `no manifest`, and WIP below cap. | observed 2026-05-01 | 2026-05-01 | 0 days | Parent recovery path revalidates and relaunches, queues, clears residue, or reports an actionable no-op. | Focused recovery/nudge/relaunch regression with no-run pending revalidation residue. |
| Provider-intake audit state | Accepted/pending revalidation no-run claim remains visible after recovery timeout. | justify retaining fallback | CO-406 / CO-468 boundary | Recovery or launch evidence is absent but operator audit still needs the retained claim. | CO-406 done family | 2026-05-01 | Non-expiring as non-occupancy audit state | Replace only if provider-intake gains an explicit non-occupancy recovery-residue state. | Status and admission tests prove visible but not WIP. |
| Recovery CLI timeout | CLI returns bounded recovery timeout instead of waiting indefinitely. | justify retaining fallback | CO-404 / CO-468 boundary | Recovery command does not complete inside the operator budget. | CO-404 done family | 2026-05-01 | Non-expiring supported timeout contract | Replace only with a stronger streamed progress/heartbeat contract. | Focused CLI recovery timeout test proves `25s CLI recovery timeout` is actionable and does not mask no-run recovery residue. |

- Durable retention evidence: accepted/no-run pending revalidation remains an auditable provider-intake state only when it is explicitly non-WIP. The 25s recovery timeout remains a supported operator contract, not a temporary workaround.
- Large-refactor check: a large provider workflow refactor is not required for the docs packet. Parent should escalate only if recovery, WIP, and timeout truth are split across incompatible authority paths that cannot share a small predicate/classifier.

## Open Questions
- Which parent-owned recovery path should become canonical for this exact no-run residue shape: recover, relaunch, nudge, or a shared classifier feeding all three?
- Should `/ui/data.json` expose a distinct recovery-residue classification, or is provider-intake/status evidence sufficient after parent implementation?

## Approvals
- Product: CO-468 child-lane prompt, pending parent acceptance
- Engineering: bounded docs-only child lane
- Design: N/A
