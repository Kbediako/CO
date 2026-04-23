---
id: 20260422-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4
title: CO-274 provider-worker stdin bootstrap failure classification
relates_to: docs/PRD-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md
risk: high
owners:
  - Codex
last_review: 2026-04-22
---

## Added by Bootstrap (refresh as needed)
- Canonical TECH_SPEC: `tasks/specs/linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`
- PRD: `docs/PRD-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`
- Task checklist: `tasks/tasks-linear-89c4cb0d-4423-4b1d-865f-25a768b9d7b4.md`

## Summary
- Objective: classify the `provider-linear-worker` bootstrap failure where `control-host` launched workers exit after `stderr | Reading additional input from stdin...` before meaningful issue execution.
- Scope: docs-first packet and parent implementation guidance for proof, manifest, diagnostic, and retry/resumable queue truth.
- Constraints: preserve source anchor `ctx:sha256:395893ee7f0985529df981453f3c5cc80e32afb59fe1ed6d49d83252a23013ac#chunk:c000001`, keep CO-224/CO-225 boundaries explicit, and avoid broad provider runtime redesign.

## Issue-Shaping Contract
- User-request translation carried forward: CO-274 is about a pre-work provider-worker bootstrap failure signaled by `stderr | Reading additional input from stdin...`, not ordinary issue execution and not generic provider runtime noise.
- Protected terms / exact artifact and surface names:
  - `provider-linear-worker`
  - `control-host`
  - `stderr | Reading additional input from stdin...`
  - `provider_runtime`
  - `provider-linear-worker-proof.json`
  - `manifest.json`
  - `linear_audit.attempted_count`
  - retry/resumable queue behavior
- Nearby wrong interpretations to reject:
  - `CO-224` child-lane appserver stalling
  - `CO-225` false guardrail-summary truth
  - issue-specific CO-271 or CO-272 content failure
  - diagnostic muting or blanket retry suppression
- Explicit non-goals carried forward: no adjacent-issue scope merge, no provider admission redesign, no issue-specific content fixes, and no evidence suppression.

## Parity / Alignment Matrix

| Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- |
| Parent issue evidence points to generic `provider_runtime` for the stdin-read exit signal. | `provider-linear-worker-proof.json` and `manifest.json` are the machine-checkable failure surfaces. | Add or expose a bootstrap/stdin-specific classification while preserving exact stderr. | Do not rewrite historical proof or manifest artifacts. |
| `linear_audit.attempted_count` can be zero, proving no meaningful Linear issue mutation began. | Audit count remains authoritative proof of whether work started. | Preserve `linear_audit.attempted_count` in summaries and tests. | Do not infer issue progress from pre-work runtime exits. |
| retry/resumable queue behavior must remain truthful after a pre-work failure. | Queue state should not mask the bootstrap boundary or imply work progress. | Keep retry/resume behavior deterministic and evidence-backed. | Do not redesign provider admission, retry queue, or scheduler policy. |
| `CO-224` and `CO-225` are adjacent but separate. | Each issue owns a different failure boundary. | CO-274 coverage must distinguish both issue boundaries. | Do not fold CO-274 into either adjacent lane. |

## Readiness Gate
- Not done if:
  - `stderr | Reading additional input from stdin...` still maps only to generic `provider_runtime`
  - proof/manifests lose exact stderr or `linear_audit.attempted_count` evidence
  - retry/resumable queue behavior implies work began when audit count stayed zero
  - implementation folds CO-274 into CO-224, CO-225, CO-271, or CO-272
- Pre-implementation issue-quality review evidence:
  - 2026-04-22: issue body constraints, protected terms, non-goals, Not Done If, and acceptance criteria make this broader than a one-line diagnostic rename and narrower than generic provider-runtime redesign.
  - Source anchor preserved exactly: `ctx:sha256:395893ee7f0985529df981453f3c5cc80e32afb59fe1ed6d49d83252a23013ac#chunk:c000001`.
- Safeguard ownership split:
  - parent lane: implementation, tests, validation, Linear/workpad reconciliation, PR, and merge

## Technical Requirements
- Functional requirements:
  1. Detect or classify the provider-worker stdin/bootstrap failure separately from generic `provider_runtime`.
  2. Preserve exact `stderr | Reading additional input from stdin...` evidence in proof/read-model output.
  3. Preserve `provider-linear-worker-proof.json`, `manifest.json`, and `linear_audit.attempted_count` truth.
  4. Keep retry/resumable queue behavior truthful and deterministic after pre-work failures.
  5. Distinguish CO-274 from `CO-224` and `CO-225` in tests or fixtures.
- Non-functional requirements:
  - Maintain backwards-compatible proof/manifest readability.
  - Avoid broad provider-runtime redesign.
  - Avoid hiding or muting operator-facing failure evidence.
- Interfaces / contracts:
  - `provider-linear-worker-proof.json`
  - `manifest.json`
  - provider runtime diagnostic/category fields
  - control-host read model/operator summaries
  - retry/resumable queue behavior

## Architecture & Data
- Architecture / design adjustments: choose the smallest shared classification seam that feeds proof, manifest/read-model summaries, and operator guidance.
- Data model changes / migrations: none required. Add a narrow subtype/category only if existing fields cannot express the seam.
- External dependencies / integrations: Linear integration remains on the existing helper surface.

## Validation Plan
- Tests / checks:
  - protected-term grep over packet and mirrors
  - focused provider-worker failure diagnosis regression for `stderr | Reading additional input from stdin...`
  - proof/manifest regression preserving `linear_audit.attempted_count: 0`
  - retry/resumable queue behavior regression
  - fixture or regression proving CO-224 and CO-225 remain separate
- Rollout verification: control-host/provider-worker fixture or run evidence showing bootstrap-specific classification.
- Monitoring / alerts: operator surfaces should show bootstrap-specific guidance instead of only generic `provider_runtime`.

## Open Questions
- Resolved 2026-04-22: the seam is represented as the distinct `provider_stdin_bootstrap` diagnostic category so `provider_runtime` remains available for generic provider runtime failures.
- Resolved 2026-04-22: operator guidance points to the control-host to provider-linear-worker Codex exec stdin/prompt handoff, not issue-specific content.

## Approvals
- Reviewer: manifest-backed standalone review completed with bounded-success after command-intent retry; no actionable issues. Explicit elegance review completed after implementation.
- Date: 2026-04-22
