# PRD - CO-480 MultiAgentV2 0.128 Thread Cap Audit

## Traceability
- Linear issue: `CO-480` / `3abba033-52f0-45f3-af58-cce4939f087f`
- Linear URL: https://linear.app/asabeko/issue/CO-480
- Task id: `linear-3abba033-52f0-45f3-af58-cce4939f087f`
- Canonical spec: `tasks/specs/linear-3abba033-52f0-45f3-af58-cce4939f087f.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-3abba033-52f0-45f3-af58-cce4939f087f.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-3abba033-52f0-45f3-af58-cce4939f087f.md`

## Summary
- Problem Statement: Codex CLI 0.128 keeps rejecting `agents.max_threads` when `features.multi_agent_v2=true`, while adding a MultiAgentV2-specific cap surface: persisted config at `multi_agent_v2.max_concurrent_threads_per_session` and feature-specific CLI/probe evidence at `features.multi_agent_v2.max_concurrent_threads_per_session`. CO-354 correctly protects the old rejection path, and CO-466 adopted the broader local 0.128 posture, but CO does not yet document, probe, or classify the new v2-specific cap surface.
- Desired Outcome: CO preserves the stable `features.multi_agent=true` thread guidance and the MultiAgentV2 `agents.max_threads` rejection guard, while adding truthful guidance, doctor/default/init behavior, or an explicit user-owned classification for the accepted 0.128 v2-specific cap path.

## User Request Translation
- User intent / needs: keep CO current with Codex CLI 0.128 MultiAgentV2 behavior without regressing stable multi-agent defaults or broadening into unrelated model, cloud, or delegation work.
- Success criteria / acceptance: document or classify the 0.128 v2 cap surface, including `features.multi_agent_v2.max_concurrent_threads_per_session` as explicit CLI/probe evidence and `multi_agent_v2.max_concurrent_threads_per_session` as persisted config, keep `agents.max_threads` rejected/omitted under v2, preserve stable `[agents] max_threads = 12`, and prove old-path rejection plus new-path acceptance with focused tests or probes.
- Constraints / non-goals: no `gpt-5.5` model posture change, no workflow pin promotion, no cloud-canary rebaseline, no broad delegation redesign, no default promotion of experimental MultiAgentV2, and no weakening of CO-354 fail-closed behavior.

## Intent Checksum
- Protected terms: Codex CLI 0.128, MultiAgentV2, `features.multi_agent_v2=true`, `agents.max_threads`, `features.multi_agent_v2.max_concurrent_threads_per_session`, CO-354, CO-466, doctor/default/init behavior.
- Nearby wrong interpretations to reject:
  - re-enable `agents.max_threads` under MultiAgentV2
  - promote `multi_agent_v2` as the default feature
  - remove stable `features.multi_agent=true` `[agents] max_threads = 12` guidance
  - widen into unrelated delegation, model posture, cloud, or release work

## Parity / Alignment Matrix

| Surface | Current | Reference | Target |
| -- | -- | -- | -- |
| Old cap path | CO omits/rejects `agents.max_threads` under `multi_agent_v2`. | Codex CLI 0.128 still rejects `agents.max_threads` when v2 is enabled. | Preserve CO-354 behavior and regression coverage. |
| New v2 cap path | CO has no first-class guidance for the v2 cap surface. | Codex CLI 0.128 owns persisted config at `multi_agent_v2.max_concurrent_threads_per_session` and accepts feature-specific CLI/probe evidence at `features.multi_agent_v2.max_concurrent_threads_per_session`. | Docs and doctor/default/init posture either support it or clearly classify it as user-owned. |
| Stable multi-agent | CO seeds `[agents] max_threads = 12` for stable `features.multi_agent=true`. | Stable multi-agent still uses the existing baseline. | Preserve stable baseline unchanged. |

## Not Done If
- CO docs still imply MultiAgentV2 has no current thread-cap path after Codex CLI 0.128.
- Doctor/default/init writes `agents.max_threads` under `features.multi_agent_v2=true`.
- Doctor/default/init stays silent about the accepted v2-specific cap path without an explicit user-owned classification.
- Tests or command probes do not cover both `agents.max_threads` rejection and `features.multi_agent_v2.max_concurrent_threads_per_session` acceptance.
- The change expands into unrelated model, cloud, release, or delegation scope.

## Goals
- Document the 0.128 v2-specific cap path.
- Preserve old-path rejection/omission under MultiAgentV2.
- Preserve stable multi-agent guidance.
- Add focused probes or tests for the rejected old path and accepted new path.

## Non-Goals
- No `gpt-5.5` / `xhigh` posture change.
- No workflow pin promotion or cloud-canary rebaseline.
- No broad delegation redesign.
- No default promotion of `multi_agent_v2`.
- No removal of stable `multi_agent` thread guidance.

## Metrics & Guardrails
- Primary success metrics: focused tests or probes prove old-path rejection and new-path classification; docs and doctor/default/init guidance are internally consistent.
- Guardrails: keep stable multi-agent defaults intact; fail closed on unsupported v2 config; avoid release-facing pin churn.

## Technical Considerations
- Likely surfaces: `orchestrator/src/cli/doctor.ts`, `orchestrator/src/cli/codexDefaultsSetup.ts`, `orchestrator/src/cli/init.ts`, `orchestrator/src/cli/utils/codexFeatures.ts`, docs guidance, and targeted tests.
- Implementation decision: CO does not seed the experimental v2-specific cap through defaults/init. Doctor and docs classify `multi_agent_v2.max_concurrent_threads_per_session` and the feature-specific CLI/probe path `features.multi_agent_v2.max_concurrent_threads_per_session` as user-owned, preserve configured values, and keep stable users on `[agents] max_threads = 12`.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: preserve the CO-354 compatibility guard as a strict rejection of invalid `agents.max_threads` under MultiAgentV2, and classify the new v2-specific cap without creating another hidden fallback.
- Owner: CO-480.
- Trigger: Codex CLI feature detection or config generation when `features.multi_agent_v2=true`.
- Introduced date: 2026-05-03 evidence from CO-480 issue creation.
- Review date: 2026-05-13 packet repair.
- Maximum lifetime: no retained fallback; unsupported or user-owned behavior must be explicit.
- Removal condition: not applicable; the target is deterministic classification.
- Validation: focused doctor/default/init and feature-probe tests or command probes.

## Open Questions
- Resolved on 2026-05-13: CO reports the MultiAgentV2 cap as an optional user-owned knob and does not write it by default.
