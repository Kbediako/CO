# PRD - CO: Rerun Codex CLI 0.123 Cloud Gates After Auth Rotation

## Summary
- Problem Statement: CO-322 completed the Codex CLI `0.123.0` audit but held adoption because the required cloud canary failed before task submission against stale environment `6999395fcc448191b865917084f21c6f`. After cloud environment/auth rotation, the remaining decision must be made from current canary evidence rather than the completed CO-322 state.
- Desired Outcome: Rerun the required and fallback cloud contracts under current cloud/auth posture, independently inspect the manifests/logs, and update release-planning truth surfaces to either promote `0.123.0` or record a current blocker.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat CO-335 as the independent post-rotation cloud-gate owner for Codex CLI `0.123.0`; do not let CO-322's Done state hide the remaining required evidence.
- Success criteria / acceptance: current non-secret cloud env/auth assumptions are recorded; required cloud execution and fallback contract both complete with terminal manifests; policy, pins, and release-blocker story reflect the resulting promote/hold decision.
- Constraints / non-goals: keep scope bounded to cloud-gate evidence and posture decision; do not perform the release ship lane, release-skill parity, marketplace redesign, or broad rebaseline work.

## Intent Checksum
- Exact user wording / phrases to preserve: `CO-335`, `CO-322`, Codex CLI `0.123.0`, `CODEX_CLOUD_ENV_ID=<valid> CODEX_CLOUD_CANARY_REQUIRED=1 npm run ci:cloud-canary`, `CLOUD_CANARY_EXPECT_FALLBACK=1`, `docs/guides/codex-version-policy.md`, `CO-316`.
- Protected terms / exact artifact and surface names: `Kbediako/CO`, `.runs/linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f-cloud-required-0123-current/cli/2026-04-23T10-07-13-661Z-02403ae9/manifest.json`, `.runs/linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f-cloud-fallback-0123-current/cli/2026-04-23T10-11-43-645Z-48d460ec/manifest.json`, `.github/workflows/cloud-canary.yml`, release-facing downstream-smoke workflows.
- Nearby wrong interpretations to reject: reusing the old missing environment blocker as current truth, treating fallback success as a replacement for required cloud execution, widening into actual release publication, or moving pins without manifest-backed evidence.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta |
| --- | --- | --- | --- |
| Cloud environment/auth | Worker env had no secret `CODEX_CLOUD_ENV_ID`; `codex cloud list --env Kbediako/CO` accepted the non-secret environment label. | CO-322 failed against stale id `6999395fcc448191b865917084f21c6f`. | Use `Kbediako/CO` as the current non-secret env identifier for required canary evidence; do not expose secrets. |
| Required cloud canary | Fresh CO-335 run completed cloud execution, status `ready`, task `task_e_69e9ef5628408327b88b1fcd0ab14b24`, poll count `24`. | Version policy requires successful required cloud execution before promotion. | Satisfy the required cloud gate for `0.123.0`. |
| Fallback cloud contract | Fresh CO-335 run completed expected MCP fallback with only `missing_environment`. | Version policy requires fallback behavior remains correct. | Satisfy fallback contract while keeping it distinct from required cloud execution. |
| Release-planning posture | Main still described `0.123.0` as held by the old CO-322 cloud blocker. | CO-322 already found no P0/P1 local/runtime/marketplace regression. | Promote `0.123.0` and update release-planning pins/story from current evidence. |

- Explicitly out-of-scope differences: release publication, release notes parity, release-skill/docs-check parity, marketplace command redesign, and unrelated docs baseline work.

## Not Done If
- CO-322 remains Done but no new current cloud/auth canary evidence exists.
- The policy still holds `0.123.0` only because of stale environment `6999395fcc448191b865917084f21c6f`.
- Release-planning surfaces imply latest-stable readiness without clean required cloud evidence.
- The issue closes without independent manifest/log validation.

## Goals
- Capture current cloud env/auth assumptions without secrets.
- Rerun required and fallback canary contracts.
- Independently inspect manifest/run-summary fields.
- Promote or hold `0.123.0` consistently across policy, pins, task mirrors, and CO-316 blocker story.

## Non-Goals
- No release ship, no release-skill parity, no release-notes parity, no marketplace rebaseline beyond pin alignment, and no unrelated CO issue cleanup.

## Stakeholders
- Product: CO release operators.
- Engineering: CO canary, release, workflow, docs, and provider-worker maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: both canary manifests are terminal and classified; policy/pin surfaces name a single decision; CO-316 blocker story no longer points at the stale cloud blocker.
- Guardrails / Error Budgets: fail closed on current cloud/auth blocker; no secret values in docs/workpad; no release publication from this lane.

## User Experience
- Personas: CO maintainer deciding whether release prep may target latest stable Codex CLI; reviewer verifying that cloud gates are current.
- User Journeys: maintainer reads the policy and sees `0.123.0` promoted with exact evidence paths, or a current blocker if promotion failed.

## Technical Considerations
- Architectural Notes: evidence comes from `scripts/cloud-canary-ci.mjs` required/fallback contracts and CO-322's already-recorded upstream/help/runtime audit.
- Dependencies / Integrations: Codex cloud CLI/auth, Linear workpad, GitHub workflows, `tests/pack-smoke.spec.ts`, `docs/guides/codex-version-policy.md`.

## Open Questions
- None after the fresh cloud runs: both required cloud execution and fallback contract passed.

## Approvals
- Product: CO-335 issue acceptance criteria.
- Engineering: parent provider worker issue-quality review on 2026-04-23.
- Design: Not applicable.
