# PRD - CO-480 MultiAgentV2 0.128 thread-cap audit

## Traceability
- Linear issue: `CO-480` / `3abba033-52f0-45f3-af58-cce4939f087f`
- Linear URL: https://linear.app/asabeko/issue/CO-480/co-audit-multiagentv2-0128-feature-specific-thread-cap-support
- Task id: `linear-3abba033-52f0-45f3-af58-cce4939f087f`
- Canonical spec: `tasks/specs/linear-3abba033-52f0-45f3-af58-cce4939f087f.md`
- Source issue: `CO-466` / `bdfd9046-97b5-43bd-850f-b305558cdada`
- Source anchor: `ctx:sha256:8d46bedfd60da0b646de6d6e4ff09345be8869db12283ef070b79df7861bc6e9#chunk:c000001`
- Parent manifest: `../../.runs/linear-3abba033-52f0-45f3-af58-cce4939f087f/cli/2026-05-13T12-35-04-200Z-eb104187/manifest.json`

## Summary
- Problem Statement: CO-354 correctly made doctor/default/init omit and reject `agents.max_threads` when `features.multi_agent_v2=true`, but CO still does not document, probe, or classify the Codex CLI 0.128 v2-specific cap path `features.multi_agent_v2.max_concurrent_threads_per_session`.
- Desired Outcome: CO preserves the old rejection guard, preserves the stable `features.multi_agent=true` `[agents] max_threads = 12` baseline, and adds narrow 0.128-era guidance or user-owned classification for the v2 thread-cap surface.

## User Request Translation (Context Anchor)
- User intent / needs: complete CO-480 in this provider workspace by rebuilding from Rework, adding the missing MultiAgentV2 0.128 cap truth where CO owns docs, doctor advice, defaults, init, or explicit user-owned classification, and validating both the rejected old path and accepted new path.
- Success criteria / acceptance:
  - document `features.multi_agent_v2.max_concurrent_threads_per_session`
  - keep `agents.max_threads` omitted/rejected when `features.multi_agent_v2=true`
  - update doctor/default/init behavior or clearly classify the v2 cap as user-owned with actionable doctor guidance
  - add focused tests or command probes for old-path rejection and new-path acceptance
  - preserve stable `features.multi_agent=true` `[agents] max_threads = 12`
- Constraints / non-goals:
  - no `gpt-5.5` / `xhigh` posture change
  - no workflow pin promotion or cloud-canary rebaseline
  - no broad delegation redesign
  - no removal of stable `multi_agent` thread guidance
  - no weakening of CO-354 fail-closed behavior

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `Codex CLI 0.128`
  - `MultiAgentV2`
  - `features.multi_agent_v2=true`
  - `agents.max_threads`
  - `features.multi_agent_v2.max_concurrent_threads_per_session`
  - `CO-354`
  - `CO-466`
  - `doctor/default/init behavior`
- Protected terms / exact artifact and surface names:
  - `orchestrator/src/cli/doctor.ts`
  - `orchestrator/src/cli/codexDefaultsSetup.ts`
  - `orchestrator/src/cli/init.ts`
  - `orchestrator/src/cli/utils/codexFeatures.ts`
  - `orchestrator/tests/Doctor.test.ts`
  - `orchestrator/tests/CodexDefaultsSetup.test.ts`
  - `orchestrator/tests/InitTemplates.test.ts`
  - `docs/guides/rlm-recursion-v2.md`
  - `skills/delegation-usage/SKILL.md`
  - `skills/delegation-usage/DELEGATION_GUIDE.md`
- Nearby wrong interpretations to reject:
  - re-enable `agents.max_threads` under MultiAgentV2
  - promote `multi_agent_v2` as the default feature
  - remove the stable `features.multi_agent=true` `[agents] max_threads = 12` baseline
  - broaden into unrelated delegation, model posture, cloud, or release work

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Old cap path | CO omits/rejects `agents.max_threads` under `multi_agent_v2`. | Codex CLI 0.128 still rejects `agents.max_threads` when v2 is enabled. | Preserve CO-354 behavior and regression tests. | Re-enabling or renaming `agents.max_threads` under v2. |
| New v2 cap path | CO has no first-class guidance for `features.multi_agent_v2.max_concurrent_threads_per_session`. | Codex CLI 0.128 accepts the feature-specific cap path. | Docs and doctor/default/init posture either support the cap or clearly mark it user-owned with actionable guidance. | Seeding the v2 cap as a default or making v2 generally recommended. |
| Stable multi-agent | CO seeds `[agents] max_threads = 12` for stable `features.multi_agent=true`. | Stable multi-agent still uses the existing baseline. | Preserve stable baseline unchanged. | Removing thread guidance for stable users. |
| Doctor/default/init | CO only exposes the old v2 "omit max_threads" rule. | 0.128 adds an accepted replacement cap surface for v2. | Make the replacement cap visible in doctor/docs, while defaults/init avoid invalid writes and avoid unrequested v2 promotion. | Broad doctor/defaults redesign. |

## Not Done If
- CO docs still imply MultiAgentV2 has no current thread-cap path after Codex CLI 0.128.
- Doctor/default/init write `agents.max_threads` under v2.
- Doctor/default/init stay silent about the accepted v2-specific cap path without an explicit user-owned classification.
- Tests/probes do not cover both `agents.max_threads` rejection and `features.multi_agent_v2.max_concurrent_threads_per_session` acceptance.
- The change expands into unrelated model, cloud, release, or delegation scope.

## Goals
- Preserve CO-354 old-path rejection/omission.
- Add current 0.128 cap guidance or user-owned classification.
- Add focused tests/probes for old and new cap surfaces.
- Keep stable multi-agent baseline intact.

## Non-Goals
- No model posture changes.
- No Codex CLI workflow pin promotion.
- No cloud-canary rebaseline.
- No broad delegation redesign.
- No stable multi-agent baseline removal.

## Stakeholders
- Product: CO maintainers and downstream operators reading CO defaults and doctor advice.
- Engineering: doctor/default/init implementation, tests, docs, and provider-worker validation.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - targeted old-path rejection tests or probes pass
  - targeted new-path acceptance tests or probes pass
  - docs and doctor guidance mention the 0.128 v2 cap surface
  - stable `features.multi_agent=true` max_threads baseline tests remain green
- Guardrails / Error Budgets:
  - zero `agents.max_threads` writes under enabled MultiAgentV2
  - zero default promotion of `multi_agent_v2`
  - smallest viable diff across owned surfaces

## User Experience
- Personas: CO downstream operators configuring Codex multi-agent behavior.
- User Journeys:
  - A stable multi-agent user keeps seeing `[agents] max_threads = 12` guidance.
  - A MultiAgentV2 user sees why `agents.max_threads` is rejected and where the 0.128-specific cap belongs or why CO treats it as user-owned.
  - A reviewer can verify old-path rejection and new-path acceptance without relying on stale prompt-time claims.

## Technical Considerations
- Architectural Notes:
  - `codexDefaultsSetup` and `init` must preserve CO-354 omission of invalid `agents.max_threads` under v2.
  - `doctor` is the right operator-facing place to classify optional v2 cap posture because defaults should not promote experimental v2 by seeding new config automatically.
  - Feature/config helpers should stay narrow and avoid broad delegation/model posture changes.
- Dependencies / Integrations:
  - Codex feature-list/config probe behavior.
  - TOML config parsing in existing defaults/init/doctor paths.
  - Vitest test harness and optional live command probes.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Decision: remove the stale "omit only" compatibility guidance by documenting/classifying the 0.128 v2 cap surface while preserving the valid CO-354 rejection guard.
- Owner: CO-480.
- Trigger: `features.multi_agent_v2=true` with a user needing thread-cap tuning after Codex CLI 0.128.
- Introduced date: 2026-05-13.
- Review date: 2026-05-13.
- Maximum lifetime: N/A because the stale guidance is removed in this lane, not retained.
- Removal condition: CO docs/doctor no longer imply there is no v2 cap path.
- Validation: focused tests/probes plus docs/review gates.
- Large-refactor check: no large refactor is preferred because authority remains in the existing doctor/default/init config surfaces and the change is a single missing cap classification, not a split live/cached state machine.

## Open Questions
- Resolved 2026-05-13: local command probes against active `codex-cli 0.130.0` confirmed `agents.max_threads` is rejected when `features.multi_agent_v2=true`, while `features.multi_agent_v2.max_concurrent_threads_per_session` is accepted both alone and with v2 enabled. The probe also observed `multi_agent_v2.max_concurrent_threads_per_session` is accepted, so CO documents the protected feature path as primary and preserves the top-level path only when user-configured.

## Approvals
- Product: Linear CO-480 acceptance criteria.
- Engineering: docs-review captured with inherited `docs:freshness:maintain` baseline blocker routed to CO-522; implementation/focused probes and local validation captured in the task checklist; standalone review and PR review still required.
- Design: N/A.
