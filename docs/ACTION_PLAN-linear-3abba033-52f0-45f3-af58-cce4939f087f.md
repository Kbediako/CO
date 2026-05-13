# ACTION_PLAN - CO-480 MultiAgentV2 0.128 Thread Cap Audit

## Summary
- Goal: make CO truthful about the Codex CLI 0.128 MultiAgentV2 feature-specific thread cap without regressing stable multi-agent guidance.
- Scope: docs-first packet, feature detection, doctor/default/init guidance, docs wording, focused tests or probes, and normal review/validation.
- Assumptions: `features.multi_agent_v2` remains experimental/off by default locally; stable `features.multi_agent=true` remains the normal CO guidance.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: Codex CLI 0.128, MultiAgentV2, `features.multi_agent_v2=true`, `agents.max_threads`, `features.multi_agent_v2.max_concurrent_threads_per_session`, CO-354, CO-466, doctor/default/init behavior.
- Not done if: CO writes invalid `agents.max_threads` under v2, hides the new v2 cap path, weakens stable `[agents] max_threads = 12`, or expands into model/cloud/release/delegation scope.
- Pre-implementation issue-quality review: CO-480 is a valid 0.128 follow-up because it is narrower than CO-466 release intake and newer than CO-354 MultiAgentV2 rejection handling.
- Fallback / refactor decision: touches compatibility behavior. Decision is to remove the stale "omit only" fallback by either supporting the v2 cap or explicitly marking it user-owned; no hidden retained fallback.
- Durable retention evidence: not applicable.
- Large-refactor check: bounded update is acceptable unless implementation discovers duplicated config authorities.

## Milestones & Sequencing
1. Reproduce or fixture current Codex CLI 0.128 behavior for old-path rejection and new-path acceptance/classification.
2. Update doctor/default/init posture and docs wording by classifying the v2-specific cap as user-owned while preserving stable multi-agent behavior.
3. Run focused tests/probes, normal validation, standalone review, PR feedback drain, and Linear handoff.

## Dependencies
- CO-354 behavior must remain intact.
- CO-466 local 0.128 posture is the release-intake background, not implementation scope.
- Live Codex CLI behavior or checked fixtures must be explicit evidence.

## Validation
- Checks / tests:
  - focused feature parser tests
  - focused doctor/default/init tests
  - old-path rejection and new-path acceptance/classification probe or fixture
  - delegation guard
  - spec guard
  - build
  - lint
  - full test
  - docs:check
  - docs:freshness behavior unchanged or explicitly routed to current owner
  - repo:stewardship
  - diff-budget
  - standalone review
  - pack:smoke if package/CLI surfaces change
- Rollback plan: revert the CO-480 branch; no migrations expected.

## Risks & Mitigations
- Risk: generated config starts writing experimental settings by default. Mitigation: classify the v2-specific cap as user-owned in doctor/docs and do not seed it through defaults/init.
- Risk: stable users lose the `agents.max_threads` baseline. Mitigation: focused stable-path regression.
- Risk: docs imply MultiAgentV2 is recommended. Mitigation: keep experimental/default-off wording.

## Approvals
- Reviewer: Pending provider-worker review.
- Date: 2026-05-13
