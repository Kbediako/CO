---
id: 20260525-linear-d2e17480-ee95-4eab-b83d-21be17e58993
title: CO-585 review docs freshness public and spec pre-expiry batch
relates_to: docs/PRD-linear-d2e17480-ee95-4eab-b83d-21be17e58993.md
risk: high
owners:
  - Codex
last_review: 2026-05-25
---

## Added by Bootstrap 2026-05-25

## Summary
- Objective: Review and clear the exact public-doc and active-spec pre-expiry batch exposed after CO-584.
- Scope: Two public docs, ten active task specs, their task-index/freshness registry metadata, and validation evidence.
- Constraints: No blind `last_review` bumps, no gate weakening, no historical deletion, no unrelated owner absorption.

## Issue-Shaping Contract
- User-request translation carried forward: CO-585 owns the deterministic `block_spec_guard_pre_expiry` batch for 2026-06-01, not the whole docs-freshness backlog.
- Protected terms / exact artifact and surface names: `docs:freshness:spec-and-public-pre-expiry:2026-06-01`, `codex-orchestrator:canonical-owner-key=docs:freshness:spec-and-public-pre-expiry:2026-06-01`, `block_spec_guard_pre_expiry`, `docs/public/downstream-setup.md`, `docs/public/provider-onboarding.md`, and the ten `tasks/specs/linear-*.md` paths named in CO-585.
- Nearby wrong interpretations to reject: Do not treat this as terminal lifecycle cleanup, rolling cohort routing, global public-doc rewrite, or permission to relax freshness gates.
- Explicit non-goals carried forward: No unrelated owner changes; no broad refactor; no historical packet deletion.

## Parity / Alignment Matrix
- Current truth: CO-584 validation reports two public docs and ten active specs as pre-expiry for 2026-06-01.
- Reference truth: Public docs and active specs should remain truthful, current, and reviewable while docs freshness and spec guard stay strict.
- Target truth / intended delta: Each named path has current review evidence, truthful `last_review=2026-05-25`, and the maintain decision no longer blocks on this batch.
- Explicitly out-of-scope differences: Separately owned terminal lifecycle, rolling cohort, and capacity residue remain visible under their emitted owner routes.

## Readiness Gate
- Not done if: `block_spec_guard_pre_expiry` still names this batch, review dates change without evidence, or any gate is weakened.
- Pre-implementation issue-quality review evidence: Current baseline reproduction records `freshness_decision=block_spec_guard_pre_expiry`, `pre_expiry_entries=2`, `spec_guard_pre_expiry_entries=10`, `registry_blockers=0`, `invalid_entries=0`, `missing_in_registry=0`, and `missing_on_disk=0`.
- Safeguard ownership split: Parent owns the spec batch and final validation; same-issue child lane `public-guides-review` owns bounded public-guide review.

## Technical Requirements
- Functional requirements:
  - Reproduce the current `block_spec_guard_pre_expiry` baseline.
  - Review `docs/public/downstream-setup.md` and `docs/public/provider-onboarding.md` against current provider-worker setup behavior.
  - Review the ten active specs against current implementation and tests, then add concise review notes.
  - Update `tasks/index.json` and `docs/docs-freshness-registry.json` with truthful 2026-05-25 review dates.
  - Confirm `docs:freshness:maintain --check --format json` no longer blocks on this pre-expiry batch.
- Non-functional requirements (performance, reliability, security):
  - All validation remains deterministic and local.
  - No new network or credential requirements.
  - JSON registries remain parseable and stable for review.
- Interfaces / contracts:
  - `tasks/index.json` canonical task registration.
  - `docs/docs-freshness-registry.json` docs freshness registry rows.
  - `scripts/spec-guard.mjs --dry-run`.
  - `docs:freshness:maintain --check --format json` maintenance decision output.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker runtime docs | `codex exec` / `codex exec resume` break-glass guidance when app-server authority is unavailable or intentionally bypassed. | justify retaining fallback | CO-585 docs freshness review, then next runtime-policy owner | App-server provider authority unavailable or explicitly bypassed | 2026-05-22 | 2026-05-25 | Re-review by 2026-06-24 | Remove or narrow when provider-worker app-server authority no longer needs a CLI break-glass path | Public guide review plus `docs:check` |

- For `justify retaining fallback`, contract name: provider-worker runtime authority; owning surface: provider onboarding docs and AGENTS runtime guidance; steady-state proof: app-server remains the normal path and CLI resume is documented as break-glass only; tests/docs: docs freshness and docs check; why it is not governed as an expiring fallback: the break-glass path is an explicit operational safety valve, not an accidental stale compatibility path.
- Large-refactor check: No larger refactor is required because this task updates review evidence and documentation, not runtime authority code.

## Architecture & Data
- Architecture / design adjustments: No code architecture changes. Documentation now names app-server authority and CLI break-glass routing more explicitly.
- Data model changes / migrations: Metadata rows in `tasks/index.json` and `docs/docs-freshness-registry.json` receive current review dates for the reviewed paths.
- External dependencies / integrations: Linear issue CO-585 and same-issue child lane manifest evidence.

## Validation Plan
- Tests / checks:
  - Baseline `docs:freshness:maintain --check --format json`.
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`.
  - `git diff --check`.
  - `node scripts/spec-guard.mjs --dry-run`.
  - `node scripts/delegation-guard.mjs`.
  - `npm run build`.
  - `npm run lint`.
  - `npm run test`.
  - `npm run docs:check`.
  - `npm run docs:freshness`.
  - `npm run repo:stewardship`.
  - `node scripts/diff-budget.mjs`.
  - Manifest-backed standalone review and explicit elegance pass.
- Rollout verification: Maintain output advances beyond CO-585's pre-expiry batch to pass or a separately owned blocker.
- Monitoring / alerts: Workpad and PR body record any residual owner route with its emitted decision and owner key.

## Open Questions
- None.

## Approvals
- Reviewer: Pending.
- Date: 2026-05-25.
