---
id: 20260513-linear-3abba033-52f0-45f3-af58-cce4939f087f
title: CO-480 MultiAgentV2 0.128 feature-specific thread cap support
relates_to: docs/PRD-linear-3abba033-52f0-45f3-af58-cce4939f087f.md
risk: medium
owners:
  - Codex
last_review: 2026-05-13
related_action_plan: docs/ACTION_PLAN-linear-3abba033-52f0-45f3-af58-cce4939f087f.md
task_checklists:
  - tasks/tasks-linear-3abba033-52f0-45f3-af58-cce4939f087f.md
---

## Summary
- Objective: add truthful CO support or explicit user-owned classification for Codex CLI 0.128 `features.multi_agent_v2.max_concurrent_threads_per_session`.
- Scope: MultiAgentV2 feature detection, doctor/default/init guidance, docs wording, and focused tests or command probes.
- Constraints: preserve CO-354 rejection of `agents.max_threads` under v2 and preserve stable `features.multi_agent=true` `[agents] max_threads = 12`.

## Issue-Shaping Contract
- User-request translation carried forward: audit the 0.128 MultiAgentV2 cap path without changing model posture, release pins, cloud posture, or stable multi-agent behavior.
- Protected terms / exact artifact and surface names: Codex CLI 0.128, MultiAgentV2, `features.multi_agent_v2=true`, `agents.max_threads`, `features.multi_agent_v2.max_concurrent_threads_per_session`, CO-354, CO-466, doctor/default/init behavior.
- Nearby wrong interpretations to reject: do not re-enable invalid `agents.max_threads` under v2, do not promote `multi_agent_v2` by default, do not remove the stable `[agents] max_threads = 12` baseline, and do not broaden into model/cloud/release/delegation scope.
- Explicit non-goals carried forward: no workflow pin promotion, no cloud canary rebaseline, no `gpt-5.5` posture change, no broad delegation redesign.

## Parity / Alignment Matrix

| Surface | Current | Reference | Target |
| -- | -- | -- | -- |
| Old cap path | CO omits/rejects `agents.max_threads` when v2 is enabled. | Codex CLI 0.128 rejects that old path. | Keep rejection and tests intact. |
| New v2 cap path | CO does not classify the feature-specific cap. | Codex CLI 0.128 accepts `features.multi_agent_v2.max_concurrent_threads_per_session`. | Support or explicitly classify the new cap as user-owned with actionable guidance. |
| Stable multi-agent | CO writes/recommends `[agents] max_threads = 12` for stable `multi_agent`. | Stable `features.multi_agent=true` keeps the old baseline. | Keep stable guidance unchanged. |

## Readiness Gate
- Not done if: the old invalid path can be written under v2, the new accepted path is undocumented/unclassified, stable multi-agent loses its baseline, or validation lacks old-path and new-path coverage.
- Pre-implementation issue-quality review evidence: live CO-480 issue-context on 2026-05-13 shows this is valid 0.128 adoption work, not a duplicate of CO-354 or CO-466.
- Safeguard ownership split: this packet repair only creates the docs-first traceability needed for backlog admission; implementation remains provider-worker owned after the issue moves to Ready/In Progress.

## Technical Requirements
- Functional requirements:
  - Detect or parse explicit `features.multi_agent_v2=true` without misclassifying missing/disabled v2.
  - Preserve omission/rejection guidance for `agents.max_threads` under v2.
  - Document, support, or explicitly classify `features.multi_agent_v2.max_concurrent_threads_per_session`.
  - Preserve stable `features.multi_agent=true` `agents.max_threads` behavior.
  - Add tests or probes for old-path rejection and new-path acceptance/classification.
- Non-functional requirements:
  - keep output actionable for downstream users
  - do not introduce release/cloud/model churn
  - fail closed on ambiguous feature-list parsing
- Interfaces / contracts:
  - `codex features list`
  - `codex-orchestrator doctor`
  - `codex-orchestrator codex defaults`
  - `codex-orchestrator init codex`
  - repo docs and generated config surfaces

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MultiAgentV2 thread config | Treating v2 as only "omit max_threads" after 0.128 added a feature-specific cap | remove fallback | CO-480 | `features.multi_agent_v2=true` with Codex CLI 0.128+ | 2026-05-03 | 2026-05-13 | No retained fallback | v2 cap is supported or explicitly user-owned | focused doctor/default/init tests or command probes |

- Large-refactor check: a bounded doctor/default/init/docs update is acceptable because the surface is already centralized in CO-354-era feature detection. Escalate only if the implementation discovers multiple competing config authorities.

## Architecture & Data
- Architecture / design adjustments: extend existing doctor/default messaging rather than adding a parallel config authority. `codex-orchestrator doctor` exposes a `multi_agent_v2_thread_cap` classification, while defaults/init preserve user-owned cap config and continue omitting `agents.max_threads` when v2 is effective.
- Data model changes / migrations: none expected.
- External dependencies / integrations: local Codex CLI feature/config behavior.

## Validation Plan
- Tests / checks:
  - focused tests for `codexFeatureProbeDisablesMultiAgentV2` and any new cap parser/classifier
  - focused doctor/default/init tests for old-path rejection and stable-path preservation
  - command probe or fixture proving new-path acceptance/classification
  - normal validation floor after implementation
- Rollout verification: doctor/default output gives clear action for MultiAgentV2 users and stable users.
- Monitoring / alerts: none beyond docs/check and provider-worker review handoff.

## Open Questions
- Resolved on 2026-05-13: CO describes the v2 cap as optional user-owned configuration and does not seed it.

## Approvals
- Reviewer: Pending provider-worker review.
- Date: 2026-05-13
