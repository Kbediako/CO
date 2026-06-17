---
id: 20260423-linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f
title: CO Codex CLI 0.123 Cloud Gate Rerun and Promotion Decision
status: in_progress
relates_to: docs/PRD-linear-919ecdfa-9be9-4d93-995b-7f8e4a784e6f.md
risk: high
owners:
  - Codex
last_review: 2026-06-17
review_notes:
  - 2026-06-17: CO-579 pre-expiry review kept this spec active-current; no verified terminal/archive evidence was established in this stream, CO-579 is the live non-terminal docs-freshness owner, and docs/spec gates remain unchanged.
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective: rerun Codex CLI `0.123.0` required/fallback cloud gates after cloud env/auth rotation and record the release-planning decision.
- Scope: current env/auth stamp, canary evidence, independent manifest validation, version policy, release-planning pins, CO-316 blocker story, and task mirrors.
- Constraints: no release ship work, no secret exposure, and no expansion into release-skill parity or marketplace redesign.

## Issue-Shaping Contract
- User-request translation carried forward: CO-335 must independently decide whether `0.123.0` is promotable now that cloud env/auth has been rotated.
- Protected terms / exact artifact and surface names: `CO-335`, `CO-322`, `CO-316`, `0.123.0`, `Kbediako/CO`, required/fallback cloud canary commands, `docs/guides/codex-version-policy.md`, `.github/workflows/cloud-canary.yml`.
- Nearby wrong interpretations to reject: old missing-env blocker, fallback-only proof, release ship scope, or blind latest-stable bump without manifests.
- Explicit non-goals carried forward: release publication, release notes parity, release-skill parity, provider migration, and unrelated docs cleanup.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth / intended delta |
| --- | --- | --- | --- |
| Required cloud gate | CO-322 failed before submission on stale env id. | Promotion requires cloud execution. | CO-335 required run passes with task `task_e_69e9ef5628408327b88b1fcd0ab14b24`. |
| Fallback gate | CO-322 fallback passed expected missing-env MCP path. | Fallback behavior must remain correct. | CO-335 fallback passes expected `missing_environment` contract. |
| Policy/pins | Main holds `0.123.0`. | No P0/P1 signal from CO-322 non-cloud audit. | Promote `0.123.0` and align release-planning pins. |

## Readiness Gate
- Not done if: no fresh current cloud/auth evidence; no manifest inspection; stale `6999395fcc448191b865917084f21c6f` remains blocker; CO-316 story is not updated.
- Pre-implementation issue-quality review evidence: parent provider worker approved this as a cloud-gate/posture lane and recorded the serial decision because canary classification was parent-owned.
- Safeguard ownership split: parent owns canary evidence, docs/pins, Linear and PR lifecycle.

## Technical Requirements
- Functional requirements: run both canary variants, inspect manifests/run summaries, update policy/pins/task mirrors.
- Non-functional requirements (performance, reliability, security): no secret exposure; evidence paths are exact and reproducible; validation must be green before handoff.
- Interfaces / contracts: `scripts/cloud-canary-ci.mjs`, Codex cloud CLI, GitHub workflows, pack-smoke tests, Linear workpad.

## Architecture & Data
- Architecture / design adjustments: none.
- Data model changes / migrations: task registry/docs freshness entries for CO-335.
- External dependencies / integrations: Codex cloud, GitHub Actions, Linear.

## Validation Plan
- Tests / checks: build, required/fallback cloud canaries, manifest inspection, repo validation gates, standalone review, pack smoke, and `pr ready-review`.
- Rollout verification: attached PR and clean automated-feedback drain before In Review.
- Monitoring / alerts: PR checks and Linear workpad.

## Open Questions
- None.

## Approvals
- Reviewer: parent provider worker
- Date: 2026-04-23
