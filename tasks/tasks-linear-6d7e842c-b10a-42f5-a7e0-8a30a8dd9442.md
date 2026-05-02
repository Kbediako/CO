# Task Checklist - CO-468

- Linear Issue: `CO-468` / `6d7e842c-b10a-42f5-a7e0-8a30a8dd9442`
- MCP Task ID: `linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442`
- Primary PRD: `docs/PRD-linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`
- TECH_SPEC: `tasks/specs/linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`
- Agent mirror: `.agent/task/linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`
- Canonical owner key: `control-host-recovery:accepted-no-run-pending-revalidation:no-run-id-token-manifest`

## Docs-First
- [x] PRD drafted with user-request translation, intent checksum, non-goals, not-done-if, and fallback/refactor decision.
- [x] TECH_SPEC mirror drafted with issue-shaping contract, readiness gate, technical requirements, validation plan, and fallback/refactor decision.
- [x] Canonical task spec drafted under `tasks/specs/`.
- [x] ACTION_PLAN drafted with milestones, dependencies, validation, risks, and readiness gate.
- [x] Checklist mirrored to `.agent/task`.
- [x] Registry mirrors updated in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

## Protected Issue Terms
- [x] `control-host recovery/nudge/relaunch`
- [x] `accepted/pending revalidation`
- [x] `Ready issue`
- [x] `run_id=null`
- [x] `launch_token=null`
- [x] `run_manifest_path=null`
- [x] `no manifest`
- [x] `WIP below cap`
- [x] `25s CLI recovery timeout`
- [x] `CO-404/CO-406 done family`
- [x] `control-host-recovery:accepted-no-run-pending-revalidation:no-run-id-token-manifest`

## Wrong Interpretations Rejected
- [x] `CO-455 attach timeout with healthy manifests`
- [x] `CO-459 stale provider_intake projection`
- [x] `CO-453 child-lane tracker drift`
- [x] making no-run accepted claims consume WIP

## Acceptance
- [x] Parent verifies live CO-468 issue-context before implementation and records whether the issue is still Ready.
- [x] Parent implementation handles accepted/pending revalidation residue with `run_id=null`, `launch_token=null`, `run_manifest_path=null`, and no manifest.
- [x] Parent implementation keeps WIP below cap truthful and does not make no-run accepted claims consume WIP.
- [x] Parent implementation preserves `25s CLI recovery timeout` as actionable operator evidence.
- [x] Parent implementation preserves the `CO-404/CO-406 done family` boundaries.
- [x] Parent implementation does not absorb CO-455, CO-459, or CO-453 scope.

## Validation
- [x] Child docs lane protected-term grep over packet files.
- [x] Child docs lane JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`.
- [x] Child docs lane `git diff --check` over declared touched files.
- [x] Parent docs-review before implementation.
- [x] Parent focused recover/nudge/relaunch tests.
- [x] Parent WIP/non-occupancy and timeout boundary tests.
- [ ] Parent implementation gate, standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff.

## CO-382 Fallback Metadata
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor check: parent should keep this scoped to the recovery-residue classifier unless source inspection shows split recovery/WIP/timeout authority that needs broader consolidation.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host recovery/nudge/relaunch | Accepted/pending revalidation with no run id, token, or manifest cannot be recovered even when WIP is below cap. | remove fallback | CO-468 | Ready issue has `run_id=null`, `launch_token=null`, `run_manifest_path=null`, `no manifest`, and WIP below cap. | observed 2026-05-01 | 2026-05-01 | 0 days | Parent recovery path revalidates and relaunches, queues, clears residue, or reports an actionable no-op. | Focused recovery/nudge/relaunch regression with no-run pending revalidation residue. |
| Provider-intake audit state | Accepted/pending revalidation no-run claim remains visible after recovery timeout. | justify retaining fallback | CO-406 / CO-468 boundary | Recovery or launch evidence is absent but operator audit still needs the retained claim. | CO-406 done family | 2026-05-01 | Non-expiring as non-occupancy audit state | Replace only if provider-intake gains an explicit non-occupancy recovery-residue state. | Status and admission tests prove visible but not WIP. |
| Recovery CLI timeout | CLI returns bounded recovery timeout instead of waiting indefinitely. | justify retaining fallback | CO-404 / CO-468 boundary | Recovery command does not complete inside the operator budget. | CO-404 done family | 2026-05-01 | Non-expiring supported timeout contract | Replace only with a stronger streamed progress/heartbeat contract. | Focused CLI recovery timeout test proves `25s CLI recovery timeout` is actionable and does not mask no-run recovery residue. |

## Notes
- This is a bounded same-issue child lane. Parent owns Linear state, workpad, PR lifecycle, docs-review, implementation, and final handoff.
- The declared source payload path is not available inside this child checkout; packet content is anchored on the prompt and source anchor.
