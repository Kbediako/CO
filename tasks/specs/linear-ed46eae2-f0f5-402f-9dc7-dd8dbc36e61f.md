---
id: 20260423-linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f
title: CO Codex CLI 0.123.0 Posture and Next-Release Target Audit
status: in_progress
relates_to: docs/PRD-linear-ed46eae2-f0f5-402f-9dc7-dd8dbc36e61f.md
risk: high
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 active-spec audit found 1 unchecked task checklist item, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Summary
- Objective: audit Codex CLI `0.123.0` and decide whether it can supersede the held `0.122.0` release-planning candidate.
- Scope: official release/npm evidence, help-surface drift, runtime/cloud canaries, version policy, and release blocker story.
- Constraints: no release-prep expansion; no pin movement without clean runtime/cloud evidence.

## Issue-Shaping Contract
- User-request translation carried forward: CO-322 is a first-turn provider-worker audit for `0.123.0` posture and next-release adoption truth.
- Protected terms / exact artifact and surface names: `rust-v0.123.0`, `@openai/codex@0.123.0`, `0.122.0`, `0.118.0`, `codex marketplace add`, `codex plugin marketplace`, `node scripts/runtime-mode-canary.mjs`, required/fallback cloud-canary commands, `docs/guides/codex-version-policy.md`.
- Nearby wrong interpretations to reject: latest npm equals promotion, runtime canary alone is enough, release-facing pins can move without cloud gates, or this lane owns CO-314/315/316 release work.
- Explicit non-goals carried forward: no release notes parity, no release-skill/docs-check parity, no release ship, no marketplace redesign, and no unrelated docs-check baseline repair.

## Parity / Alignment Matrix

| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| Active target | `0.118.0` | Promotion requires all gates | Remain `0.118.0` |
| Release-planning candidate | Held `0.122.0` | `0.123.0` latest upstream/npm | Keep `0.122.0` held because gates failed |
| Marketplace smoke | `0.122.0` plugin-marketplace baseline | 0.123.0 still lacks top-level marketplace help but exposes `codex plugin marketplace add/remove` | No marketplace regression; no 0.123.0 pin movement because cloud gates failed |
| Cloud canary | `0.122.0` explicit pin | candidate pin movement needs evidence | No 0.123.0 pin movement |

## Readiness Gate
- Not done if: next release claims latest stable without evidence; 0.122.0/0.123.0 posture is mixed; pins move without gates.
- Pre-implementation issue-quality review evidence: parent reviewed live issue, current CO-269 policy, official/npm/canary evidence, and approved bounded hold-decision scope on 2026-04-23.
- Safeguard ownership split: child lane owned help-surface artifact only and completed successfully, but accept was invalidated by Linear `updated_at` drift; parent owns source docs/policy.

## Technical Requirements
- Functional requirements: capture timestamps, help surfaces, runtime summary, cloud manifests, and final decision.
- Non-functional requirements: preserve fail-closed cloud gates and use external temp prefix for candidate CLI.
- Interfaces / contracts: GitHub release API, npm registry, Codex CLI help, runtime-mode canary, cloud-canary wrapper.

## Architecture & Data
- Architecture / design adjustments: docs-only policy and task packet update.
- Data model changes / migrations: task registry and docs-freshness registry entries.
- External dependencies / integrations: GitHub, npm, Codex CLI, cloud canary environment.

## Validation Plan
- Tests / checks: build; runtime canary; required/fallback cloud canaries; standard repo guardrails; review/elegance gate.
- Rollout verification: PR attaches to CO-322 and workpad records final evidence.
- Monitoring / alerts: no runtime monitoring change.

## Open Questions
- None.

## Approvals
- Reviewer: parent provider worker.
- Date: 2026-04-23.
