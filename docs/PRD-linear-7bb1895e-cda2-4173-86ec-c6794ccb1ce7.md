# PRD - CO: Make Merging-stage merge closeout deterministic and watchdog-backed

## Added by Bootstrap 2026-04-05

## Traceability
- Linear issue: `CO-80` / `7bb1895e-cda2-4173-86ec-c6794ccb1ce7`
- Linear URL: https://linear.app/asabeko/issue/CO-80/co-make-merging-stage-merge-closeout-deterministic-and-watchdog-backed
- Source issues:
  - `CO-77` / `linear-da28812d-8367-4d94-a273-d0652535f818`
  - `CO-78` / `linear-bea56fb8-c601-4554-8ece-0a63c5fd34bc`
  - `CO-51` / `linear-d223e9f3-3708-40d9-abfe-14c305a8c3aa`
  - `CO-25` / `linear-156d7133-00ba-40be-bd35-67cd3ae46e21`

## Summary
- Problem Statement: `CO-51` and `CO-25` closed narrower seams around `Merging`, but the final `Merging -> merge -> Done` lifecycle is still not a first-class provider/control-host contract. Today the provider worker writes only generic terminal proof (`owner_status`, `end_reason`), the control-host only knows how to retry active `Merging` work generically, and the deterministic GitHub merge-readiness signals still live inside the worker-invoked `pr resolve-merge` flow instead of the control-host/provider lifecycle. As a result, a live `Merging` issue with an attached clean PR can still be reclaimed after restart yet remain parked until another operator nudge.
- Desired Outcome: make `Merging` closeout autonomous, bounded, and machine-checkable. A merge-ready issue with an attached clean PR should either merge within a bounded watchdog-backed window or fail explicitly with authoritative action-required evidence, while the provider/control-host artifacts record arming, attempt, merge result, shared-root reconciliation, and final Linear transition truthfully.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): finish the final autonomy gap for `Merging` by moving merge-closeout from prompt guidance into an explicit provider/control-host contract. Restart recovery should be sufficient to reclaim and finish merge-ready issues without another operator state flip or manual merge command, and the runtime artifacts should say exactly what happened.
- Success criteria / acceptance:
  - a live `Merging` issue with an attached clean merge-ready PR either merges autonomously within a bounded window or fails with an explicit machine-checkable action-required result
  - control-host restart or worker continuation recovery can reclaim a clean `Merging` issue without another operator state flip
  - merge-closeout artifacts record merge arming decision, merge attempt, merge result, shared-root reconciliation result or skip reason, and final Linear transition
  - a watchdog or equivalent deterministic recovery path exists when a `Merging` issue has a clean PR but the closeout worker is absent, stale, or ineffective
  - regression coverage exercises the `CO-77` / `CO-78` class: live `Merging`, clean PR, healthy host restart, autonomous closeout without manual merge commands
- Constraints / non-goals:
  - do not rework the entire Linear lifecycle or review-state model
  - do not change merge policy for intentionally non-mergeable PRs
  - do not widen into unrelated GitHub workflow redesign
  - treat `CO-25` and `CO-51` as predecessor seams, not proof that the final contract is already solved

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Merging-stage merge closeout`
  - `deterministic`
  - `watchdog-backed`
  - `Merging -> merge -> Done`
  - `merge-ready issue`
  - `machine-checkable closeout evidence`
  - `healthy host can reclaim merge-ready issues`
- Protected terms / exact artifact and surface names:
  - `Merging`
  - `Done`
  - `CO-77`
  - `CO-78`
  - `CO-51`
  - `CO-25`
  - `provider-linear-worker-proof.json`
  - `providerIssueHandoff.ts`
  - `providerLinearWorkerRunner.ts`
  - `scripts/lib/pr-watch-merge.js`
  - `codex-orchestrator pr resolve-merge`
  - `git -C "/Users/kbediako/Code/CO" status --short --branch`
  - `git -C "/Users/kbediako/Code/CO" fetch origin refs/heads/main:refs/remotes/origin/main`
  - `git -C "/Users/kbediako/Code/CO" merge --ff-only origin/main`
- Nearby wrong interpretations to reject:
  - if the issue is back in `Merging`, autonomy is fixed
  - prompting the worker to use `skills/land` is enough as the final contract
  - a clean PR can sit in `Merging` indefinitely as long as checks are green
  - operator reruns of merge commands are acceptable normal behavior for this lane
  - `CO-51` auto-resume on interrupted merge drain already solved merge-closeout determinism

## Parity / Alignment Matrix
- Current truth:
  - `providerLinearWorkerRunner.ts` writes generic worker proof and refresh callbacks, but does not persist a first-class merge-closeout contract or explicit merge arming / attempt / result payloads
  - `providerIssueHandoff.ts` can retry active `Merging` claims from generic successful worker exits such as `max_turns_reached_issue_still_active`, but it does not reason about attached PR merge readiness, bounded merge-closeout watchdogs, or explicit action-required merge failure
  - `scripts/lib/pr-watch-merge.js` already knows the exact GitHub merge-readiness inputs (`reviewDecision`, `mergeStateStatus`, required checks, unresolved threads, quiet window), but that truth is currently consumed only inside worker-invoked PR shepherd commands
  - `providerTerminalCleanup.ts` handles terminal non-merge cleanup after an issue is already inactive; it does not own active `Merging` closeout
  - `controlServerPublicLifecycle.ts` already watchdogs stuck refresh lifecycles, but not a merge-ready issue parked in `Merging` with ineffective closeout progress
- Reference truth:
  - `Merging` should behave like a first-class autonomous closeout contract, not a prompt convention
  - a merge-ready issue with an attached clean PR should either land autonomously or fail explicitly with machine-checkable action-required evidence
  - restart recovery should be enough to reclaim and continue merge-ready closeout when the host and provider lane are healthy
- Target truth / intended delta:
  - provider-worker proof includes structured merge-closeout evidence rather than only generic end reasons
  - the control-host can arm, watchdog, and relaunch `Merging` closeout deterministically using authoritative merge-readiness signals
  - merge-closeout records final merge result, shared-root reconciliation, and final Linear transition in machine-checkable artifacts
  - a clean `Merging` issue no longer sits idle until a human reruns merge commands
- Explicitly out-of-scope differences:
  - redesigning non-merge review handoff semantics
  - changing policies for intentionally blocked or unmergeable PRs
  - replacing existing PR watch/merge commands when a bounded shared helper is enough

## Not Done If
- a live `Merging` issue with an attached clean PR can still sit idle until an operator manually merges it
- host restarts can recover issue ownership but still leave the final merge-closeout path implicit or unbounded
- merge-closeout failure is still only discoverable through prompt text or ad hoc logs instead of machine-checkable runtime artifacts
- merge arming, merge attempt, merge result, shared-root reconciliation, or final Linear transition still rely on inference instead of explicit recorded state

## Goals
- Promote `Merging` closeout into an explicit provider/control-host contract with deterministic arming rules.
- Reuse or extract GitHub merge-readiness truth so the control-host can watchdog and relaunch merge-closeout intentionally.
- Persist structured merge-closeout evidence in provider-worker artifacts and operator-facing projections.
- Cover restart/recovery and clean-PR idle scenarios with focused regressions.

## Non-Goals
- Reworking broader review or dispatch workflow semantics.
- Changing merge policy for PRs that are intentionally blocked or failing.
- Building a second unrelated GitHub integration path when the existing readiness logic can be shared.

## Stakeholders
- Product: CO operators expecting merge-ready issues to finish autonomously
- Engineering: CO maintainers responsible for provider/control-host lifecycle truth and merge automation
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - merge-ready `Merging` issues do not require manual merge reruns after healthy restart/recovery
  - provider/control-host artifacts expose explicit merge-closeout state transitions and outcomes
  - bounded watchdog behavior produces either autonomous merge completion or explicit actionable failure
- Guardrails / Error Budgets:
  - preserve fail-closed behavior when the PR is not actually merge-ready
  - keep the solution metadata-driven and artifact-backed rather than prompt-only
  - avoid broad lifecycle rewrites outside the merge-closeout seam unless tests prove a hard coupling

## User Experience
- Personas:
  - provider worker owner waiting for `Merging` to finish without intervention
  - operator reading control-host/runtime artifacts after a restart
  - reviewer verifying why a merge-ready issue landed or failed to land
- User Journeys:
  - a worker reaches `Merging`, records merge-closeout arming state, and the control-host can tell whether the issue is merge-ready
  - a healthy restart reclaims the same `Merging` issue, the control-host sees merge-closeout is still armed, and it relaunches bounded closeout without another manual state change
  - if the PR becomes clean and mergeable, autonomous closeout lands it and records merge/shared-root/Linear closeout results; if not, the artifacts expose explicit action-required reasons

## Technical Considerations
- Architectural Notes:
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts` owns provider-worker proof writing, refresh requests, and worker lifecycle end reasons
  - `orchestrator/src/cli/control/providerIssueHandoff.ts` owns rehydrate/relaunch decisions and is the likely home for a merge-closeout watchdog/relaunch interpretation
  - `scripts/lib/pr-watch-merge.js` already contains the canonical GitHub merge-readiness snapshot logic that should be reused or extracted instead of duplicated ad hoc
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts` already has a refresh-lifecycle watchdog that can inform the shape of the new bounded `Merging` watchdog
  - `provider-linear-worker-proof.json` is already exposed through selected-run and compatibility read models, so extending it is the smallest path to machine-checkable merge-closeout evidence
- Dependencies / Integrations:
  - GitHub PR readiness data from existing `gh`-backed watch helpers
  - Linear issue attachments and workflow state from the existing provider surfaces
  - shared-root merge-closeout commands from the earlier `CO-25` contract

## Open Questions
- Should the authoritative merge-closeout readiness snapshot live only in worker proof, or should the provider-intake claim also persist a compact arming/watchdog view for faster control-host reads? Default to proof-first unless claim persistence proves necessary for correctness.

## Approvals
- Product: self-approved from the Linear issue scope and acceptance criteria
- Engineering: pending docs-review and implementation validation
- Design: N/A
