# PRD - CO: add operator autopilot so queue shepherding can run outside a single interactive turn

## Added by Bootstrap 2026-04-09

## Traceability
- Linear issue: `CO-118` / `0af906c6-1f6c-461b-88f7-da67656bcf1b`
- Linear URL: https://linear.app/asabeko/issue/CO-118/co-add-operator-autopilot-so-queue-shepherding-can-run-outside-a
- Related lanes:
  - `CO-116` / `a770da1f-7a08-499d-a680-7f1cd8eee4ad`
  - `CO-111` / `ff81e5d8-2760-41ec-bdbb-5509ae2faade`
  - `CO-113`
  - `CO-115` / `bf0ba9ec-47f0-45ac-be83-490df0f0b45d`

## Summary
- Problem Statement: CO already has several truthful autonomous seams, but they stop short of a full operator lane. The control-host can stay alive and launch provider workers, `CO-116` can promote clean review handoffs into `Merging`, and `CO-111` can close out merged `Merging` lanes. What still requires a human operator staying in the loop is the broader queue-shepherd policy: backlog ordering, blocker-aware queue ferrying, rework decisions for handoff lanes with actionable blockers, and explicit post-merge local rollout follow-through.
- Desired Outcome: ship a repo-tracked operator-autopilot mode that runs in the control-plane refresh loop, continuously polls queue and PR truth outside a single interactive turn, and takes bounded operator actions with explicit audit records instead of relying on a human to keep a chat turn open.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): promote CO from a set of narrow autonomous seams into a truthful operator-autopilot that can keep the queue moving for hours or days without an operator manually babysitting `co-status`, Linear state, PR readiness, mergeability, or host health.
- Success criteria / acceptance:
  - CO ships a supported non-interactive operator/autopilot mode that can keep queue shepherding alive outside a single interactive turn
  - the autopilot continuously polls queue, PR, and host state in the control-plane runtime
  - the autopilot can make bounded state transitions such as `Ready`, `Merging`, or `Rework` using explicit safety gates
  - blocker edges are respected, and backlog lanes are not promoted out of order while an active unblocker is still running
  - merge and review decisions remain auditable through manifests and logs
  - local rollout or rebuild follow-up after merge is either automated in scope or surfaced as a pending operator action
- Constraints / non-goals:
  - do not weaken merge, review, or blocker safety rules
  - do not reduce the result to a passive monitor
  - do not collapse host supervision and operator policy into one opaque background script
  - do not reopen already-landed narrow seams except where they are reused as truthful building blocks

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `operator autopilot`
  - `queue shepherding`
  - `outside a single interactive turn`
  - `backlog -> ready promotion`
  - `In Review -> Merging or Rework`
  - `blocker-aware holding behavior`
  - `post-merge sync/rebuild/restart hooks`
- Protected terms / exact artifact and surface names:
  - `control-host`
  - `providerIssueHandoff.ts`
  - `providerMergeCloseout.ts`
  - `linearDispatchSource.ts`
  - `providerLinearWorkflowStates.ts`
  - `Merging`
  - `Rework`
  - `Ready`
  - `Backlog`
  - `codex.orchestrator.json`
- Nearby wrong interpretations to reject:
  - "the existing control-host uptime loop is already the operator autopilot"
  - "just add a passive queue monitor and call that autopilot"
  - "review-handoff promotion alone already closes this issue"
  - "the fix is to let background code mutate Linear states without persisted reasoning"

## Parity / Alignment Matrix
- Current truth:
  - the control-host can poll live Linear and dispatch eligible active issues into provider workers
  - `CO-116` already covers truthful review-handoff promotion into `Merging`
  - `CO-111` already covers deterministic `Merging` closeout and shared-root reconciliation after merge
  - there is no broader repo-tracked operator policy layer for backlog ordering, review-to-rework resets, or explicit local-rollout pending actions
- Reference truth:
  - queue shepherding should continue under control-plane supervision without an operator keeping one interactive Codex turn alive
  - queue moves and review/merge decisions should reuse existing truthful classifiers instead of ad hoc heuristics
  - operator decisions should be visible in durable control-plane artifacts
- Target truth / intended delta:
  - a repo-tracked operator-autopilot policy runs continuously inside the control-plane lifecycle
  - backlog promotion uses configured queue-state names plus the existing dispatch order and blocker truth
  - review handoffs can be moved truthfully into `Merging` or `Rework`
  - post-merge local rollout follow-up is surfaced as an explicit pending operator action when it is not automated
- Explicitly out-of-scope differences:
  - reworking launchd/root-host supervision
  - replacing the current provider-worker prompt contract
  - weakening merge-closeout or review gates
  - generic dashboard redesign unrelated to operator-autopilot truth

## Not Done If
- The only way to keep queue shepherding alive is still to keep an interactive Codex turn open.
- The result only observes queue state and cannot take bounded operator actions.
- Backlog lanes are promoted while a higher-priority blocked lane is still waiting on an active unblocker.
- Review or merge state transitions happen without a durable explanation in manifests or logs.

## Goals
- Add a repo-tracked operator-autopilot policy layer that runs outside a single interactive turn.
- Reuse the existing dispatch ordering, review-promotion, and merge-closeout truth sources.
- Add truthful `Backlog` -> queued-state promotion and review-handoff -> `Rework` decisions.
- Surface pending post-merge local rollout actions explicitly when they are not automated.

## Non-Goals
- Replacing the existing provider-worker lifecycle.
- Rewriting the current merge shepherd or deterministic merge-closeout controller.
- Turning the operator lane into a general workflow engine beyond CO’s current queue semantics.
- Hiding operator decisions inside undocumented background behavior.

## Stakeholders
- Product: CO operators who need the queue to keep moving outside a single interactive turn
- Engineering: control-host, provider handoff, merge-closeout, and observability maintainers
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - backlog lanes promote into the queued team state without manual intervention when the queue head is safe to release
  - provider-owned review handoffs with actionable blockers move into `Rework` without a human operator nudging Linear manually
  - existing clean review handoffs continue into `Merging` and then merge shepherding without regression
  - post-merge local rollout follow-up is surfaced as a durable pending action instead of disappearing into tribal knowledge
- Guardrails / Error Budgets:
  - preserve existing review and merge safety gates
  - prefer one shared queue order and one shared PR truth source over duplicate heuristics
  - fail closed on missing states, missing PR truth, or ambiguous blockers

## User Experience
- Personas:
  - operator expecting CO to keep shepherding the queue while they are away
  - reviewer trying to understand why a lane stayed blocked, went to `Rework`, or advanced to `Merging`
- User Journeys:
  - the highest-ranked unblocked backlog lane is promoted into the queued state, then picked up by the existing provider-worker flow
  - a provider-owned review handoff with actionable blocker truth moves into `Rework`, resetting the lane without manual operator state edits
  - a clean provider-owned review handoff moves into `Merging`, where the existing merge shepherd and closeout path takes over
  - after a merge, the operator can inspect explicit pending local rollout actions instead of guessing whether any local rebuild or restart work remains

## Technical Considerations
- Architectural Notes:
  - keep host supervision and operator policy distinct by introducing a dedicated operator-autopilot control module that is configured from repo metadata and invoked from the control-plane refresh loop
  - backlog ordering should reuse `sortLiveLinearTrackedIssuesForDispatch(...)` rather than creating a second queue sorter
  - rework decisions should reuse existing review-promotion truth instead of inventing a separate PR blocker classifier
  - pending local rollout actions should be surfaced as structured control-plane truth even when full automation is deferred
- Dependencies / Integrations:
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/src/cli/control/providerMergeCloseout.ts`
  - `orchestrator/src/cli/control/linearDispatchSource.ts`
  - `orchestrator/src/cli/control/providerWorkflowConfigStore.ts`
  - `orchestrator/src/cli/control/observabilityReadModel.ts`
  - `orchestrator/src/cli/control/providerLinearWorkflowStates.ts`
  - `codex.orchestrator.json`

## Open Questions
- Pending audited `docs-review`: whether the shipped mode should expose operator-autopilot status only through control-plane observability JSON and logs, or also project a concise autopilot summary into the status dashboard surface in the same first slice.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending audited `docs-review`
- Design: N/A
