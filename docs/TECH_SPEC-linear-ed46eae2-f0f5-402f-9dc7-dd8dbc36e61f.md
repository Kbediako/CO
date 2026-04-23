---
id: 20260423-linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f
title: CO Codex CLI 0.123.0 Posture and Next-Release Target Audit
relates_to: docs/PRD-linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f.md
risk: high
owners:
  - Codex
last_review: 2026-04-23
---

## Summary
- Objective: complete the CO-322 audit for Codex CLI `0.123.0` and decide whether it can replace the held `0.122.0` release-planning candidate.
- Scope: official release/npm evidence, command/help-surface classification, runtime-mode canary, required/fallback cloud-canary evidence, version-policy update, and release blocker story update.
- Constraints: keep `0.123.0` unpromoted unless runtime/cloud gates are clean; do not widen into CO-314, CO-315, CO-316, or unrelated docs baseline repair.

## Issue-Shaping Contract
- User-request translation carried forward: CO-322 is a bounded `0.123.0` posture audit and next-release target decision, not a release implementation lane.
- Protected terms / exact artifact and surface names: Codex CLI `0.123.0`, Codex CLI `0.122.0`, Codex CLI `0.118.0`, `rust-v0.123.0`, `@openai/codex@0.123.0`, `codex exec`, `codex review --help`, `codex login --device-auth`, `codex marketplace add`, `codex plugin marketplace`, `node scripts/runtime-mode-canary.mjs`, `CODEX_CLOUD_ENV_ID`, `CODEX_CLOUD_CANARY_REQUIRED=1`, `CLOUD_CANARY_EXPECT_FALLBACK=1`, `.github/workflows/cloud-canary.yml`.
- Nearby wrong interpretations to reject: blind latest stable promotion, moving pins before cloud evidence, using 0.122.0 evidence as 0.123.0 proof, treating absent top-level marketplace help as a release-smoke regression after current main moved smoke to `codex plugin marketplace add`, or repairing unrelated docs-check baseline debt in this lane.
- Explicit non-goals carried forward: no release shipping, release notes parity, skills/docs-check parity, marketplace contract redesign, provider-worker app-server migration, or unrelated baseline cleanup.

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth / intended delta |
| --- | --- | --- | --- |
| Active compatibility target | CO policy targets `0.118.0`. | Newer builds need runtime/cloud gates. | Remain `0.118.0` because 0.123.0 cloud gates did not pass. |
| Held release-planning candidate | CO-269 holds `0.122.0`. | `0.123.0` is upstream/npm latest as of 2026-04-23. | Keep `0.122.0` held; record 0.123.0 audit evidence as blocked. |
| Marketplace smoke | Release-facing smoke uses the `0.122.0` `codex plugin marketplace add` baseline. | 0.123.0 top-level `codex marketplace` is absent, but `codex plugin marketplace add/remove` is present. | No marketplace-smoke regression versus current main; no 0.123.0 pin movement because cloud gates failed. |
| Cloud canary pin | `cloud-canary` pins `@openai/codex@0.122.0`. | Pin should follow promoted candidate only with gates. | Keep 0.122.0 pin because 0.123.0 cloud gates failed. |

- Explicitly out-of-scope differences: release-lane implementation, archive/doc baseline repair, and marketplace smoke redesign.

## Readiness Gate
- Not done if: policy or release blocker story claims latest stable without the fresh 0.123.0 decision; 0.122.0 and 0.123.0 posture are mixed; release-facing pins move without runtime/cloud gate evidence.
- Pre-implementation issue-quality review evidence: parent reviewed CO-322 scope, live workflow state, current CO-269 policy, and current 0.123.0 evidence on 2026-04-23; scope is not narrower than the issue because it preserves all acceptance criteria and non-goals.
- Safeguard ownership split: child lane `help-surface-evidence` owned only `out/linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f/child-help-surface.md` and completed successfully; accept was invalidated by Linear `updated_at` drift, so parent owns policy/docs, canary evidence, Linear workpad, PR, and final decision.

## Technical Requirements
- Functional requirements: capture release/npm timestamps; compare help surfaces; run canaries; update policy docs and task story with hold/promote decision.
- Non-functional requirements (performance, reliability, security): avoid global Codex install mutation by using a temporary npm prefix for 0.123.0; keep evidence under ignored `.runs/` and `out/`; do not weaken cloud-canary failure handling.
- Interfaces / contracts: GitHub release metadata, npm registry metadata, Codex CLI help commands, runtime-mode canary summary JSON, cloud-canary manifest/run-summary contracts, Linear workpad.

## Architecture & Data
- Architecture / design adjustments: documentation-only posture update; no runtime architecture changes.
- Data model changes / migrations: add task packet and registry entries only.
- External dependencies / integrations: official `openai/codex` release, npm registry, Codex CLI `0.123.0`, cloud environment id `6999395fcc448191b865917084f21c6f`, cloud-canary fallback contract.

## Validation Plan
- Tests / checks: `npm run build`; `PATH=/tmp/co-322-codex-0123-prefix/bin:$PATH node scripts/runtime-mode-canary.mjs`; required/fallback cloud-canary commands; docs/spec/build/lint/test/docs/diff/review gates where baseline allows.
- Rollout verification: workpad mirrors evidence and PR readiness drain is clean before In Review handoff.
- Monitoring / alerts: no runtime monitoring changes; release blocker remains documented until cloud gates pass.

## Open Questions
- None. Current result is hold because required cloud failed before task submission; fallback passed only the expected MCP fallback contract for missing environment metadata.

## Approvals
- Reviewer: parent provider worker issue-quality review.
- Date: 2026-04-23.
