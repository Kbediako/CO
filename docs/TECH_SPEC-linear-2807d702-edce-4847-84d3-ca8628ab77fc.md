---
id: 20260526-linear-2807d702-edce-4847-84d3-ca8628ab77fc
title: CO-529 archived registry rows require archive stubs or retained lifecycle evidence
relates_to: docs/PRD-linear-2807d702-edce-4847-84d3-ca8628ab77fc.md
risk: high
owners:
  - Codex
last_review: 2026-05-26
---

## Summary
- Objective: fail closed when `docs/docs-freshness-registry.json` marks a full on-main document `status=archived` without a valid archive stub or explicit retained/historical class.
- Scope: docs-freshness/archive classification, current registry row repair, focused tests, docs-first packet, and PR validation.
- Constraints: preserve valid archive stubs, preserved historical stubs, retained terminal packets, docs catalog strictness, and `spec-guard`.

## Issue-Shaping Contract
- User-request translation carried forward: archived registry status must not hide active-looking docs unless the file proves archive or retained-history truth.
- Protected terms / exact artifact and surface names: implementation-docs archive automation, `docs/docs-freshness-registry.json`, `status=archived`, `<!-- docs-archive:stub -->`, `Full content`, `Archive branch`, `Archive path`, `allow_registry_only`, `preserved_historical_stub`, `retained_terminal_packet`, docs:freshness, PR #800.
- Nearby wrong interpretations to reject: do not bulk-stub without archive payload proof; do not mark suspect rows active blindly; do not weaken freshness, spec guard, or archive policy; do not treat marker examples in text as archive stubs.
- Explicit non-goals carried forward: no broad docs freshness rewrite, no historical doc deletion, no blind `last_review` bumps, no provider-worker queue changes.

## Parity / Alignment Matrix
- Current truth: some `status=archived` rows point at full docs without stub metadata or retained lifecycle evidence; the original PR #800 example has since been converted to a valid archive stub.
- Reference truth: archive stubs require the marker plus `Full content`, `Archive branch`, and `Archive path`; retained non-live docs should use explicit statuses such as `preserved_historical_stub` or `retained_terminal_packet`.
- Target truth / intended delta: full docs cannot be hidden by `status=archived`; they must be stubbed, retained with explicit class/evidence, or reclassified as active/current debt.
- Explicitly out-of-scope differences: archive branch content migration strategy beyond rows touched for this invariant.

## Readiness Gate
- Not done if: `docs:freshness` passes while a full task packet or implementation doc is `status=archived` with no valid stub or retained lifecycle evidence.
- Pre-implementation issue-quality review evidence: live CO-529 issue-context, guarded transition, `stay_serial/overlapping_scope` decision, open PR list `[]`, and current-main scan showing `697` existing non-stub archived rows before classification.
- Safeguard ownership split: parent owns docs, registry classification, tests, and implementation because delegation transport closed on the attempted queue-audit stream.

## Technical Requirements
- Functional requirements:
  - Add a deterministic validity check for `status=archived` registry rows.
  - Treat a row as valid archived only when the file is a valid archive stub or has explicit retained/historical lifecycle evidence supported by existing contracts.
  - Keep `preserved_historical_stub` and `retained_terminal_packet` validations strict.
  - Repair current invalid rows by stubbing only when archive payload evidence exists, or by reclassifying to a truthful explicit lifecycle status/current status.
  - Ensure `allow_registry_only` cannot hide a full non-stub document as archived.
- Non-functional requirements:
  - Fail closed with path-specific invalid-entry messages.
  - Keep scan cost linear in registry entries and file reads already needed by docs freshness.
  - Avoid broad archive automation refactors unless the current seam cannot support the invariant.
- Interfaces / contracts:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - `scripts/implementation-docs-archive.mjs`
  - `scripts/audit-archive-stub-unchecked.mjs`
  - `scripts/lib/archive-stub.js`

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Docs freshness registry | `status=archived` is accepted for full docs without valid archive-stub metadata or explicit retained lifecycle class. | remove fallback | CO-529 | Registry row is archived but file is not a valid archive stub and has no retained/history proof. | 2026-05-13 | 2026-05-26 | Not retained | Freshness/archive checks fail closed or rows are repaired to truthful status. | focused docs-freshness/archive tests. |

- Large-refactor check: a targeted invariant is acceptable because the repository already has archive-stub parsing and retained lifecycle statuses; this task should connect those contracts rather than replace the archive system.

## Architecture & Data
- Architecture / design adjustments: prefer adding the invariant to `scripts/docs-freshness.mjs` so current-main registry truth is checked even when rows were not changed in the current diff. Add archive-automation guardrails only where `allow_registry_only` can create or preserve unsafe rows.
- Data model changes / migrations: no new status is expected; use existing `archived`, `preserved_historical_stub`, `retained_terminal_packet`, and active/current statuses. Current rows may need metadata/status repair.
- External dependencies / integrations: none beyond local git/doc registry and existing archive branch URL conventions.

## Validation Plan
- Tests / checks:
  - RED: focused docs-freshness regression where a full TECH_SPEC/task packet is marked `archived` without stub or retained evidence.
  - GREEN: valid archive stub, preserved historical stub, retained terminal packet, and historical/archive reference cases still pass.
  - Focused implementation-docs archive test for `allow_registry_only` safety if that seam can create unsafe archived rows.
  - Required gates: spec guard, build, lint, focused tests, docs:check, docs:freshness, docs:freshness:maintain, repo:stewardship, diff-budget, review.
- Rollout verification: PR checks and ready-review quiet window after automated review feedback is drained.
- Monitoring / alerts: docs freshness invalid-entry output must name the offending path and missing archive/retained proof.

## Open Questions
- Which existing non-stub archived rows are intentional retained history versus invalid active docs must be resolved by current registry/task-index evidence during implementation.

## Approvals
- Reviewer: parent CO orchestrator
- Date: 2026-05-26
