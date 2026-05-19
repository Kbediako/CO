---
id: 20260421-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb
title: CO-276 remaining dead-code-pruning README archive pointer replacement
status: in_progress
relates_to: docs/PRD-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md
risk: low
owners:
  - Codex
last_review: 2026-05-18
review_notes:
  - 2026-05-18: CO-522 active-spec audit found 2 unchecked task checklist items, so this spec remains active and was reviewed for current lifecycle ownership rather than archived. Evidence: `out/linear-b642e879-ba50-45ef-b0d9-b059afa9e932-recovery/spec-preexpiry-local-classification.json`.
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- PRD: `docs/PRD-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- Task checklist: `tasks/tasks-linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`
- `.agent` mirror: `.agent/task/linear-1c101ebc-4b86-4c1f-b04d-0455e50fbacb.md`

## Traceability
- Linear issue: `CO-276` / `1c101ebc-4b86-4c1f-b04d-0455e50fbacb`
- Linear URL: https://linear.app/asabeko/issue/CO-276/co-replace-remaining-dead-code-pruning-archive-readme-pointers-with
- Source issue: `CO-272` / `9dacc402-e9b6-40c4-b657-d4b91b68c941`
- Source anchor: `ctx:sha256:037f0a76dfa8211a54a56b272676253d1646041df2073a17c9a971e9ea74ea69#chunk:c000001`

## Summary
- Objective: replace the remaining dead-code-pruning `.runs` archive README pointers in the seven protected surfaces with durable tracked guidance or explicit regeneration steps.
- Scope:
  - seven protected README files listed in CO-276
  - docs-first packet and registry mirrors
  - targeted validation that no listed README still advertises the missing archive path as durable checkout guidance
- Constraints:
  - do not restore ignored `.runs` archive payloads
  - do not sweep unrelated archive references
  - do not change mirror tooling, hi-fi behavior, or archive retention policy

## Issue-Shaping Contract
- User-request translation carried forward: CO-276 is a follow-up to CO-272 for the remaining listed README residues, not a generic archive cleanup lane.
- Protected terms / exact artifact and surface names:
  - `packages/des-obys/README.md`
  - `packages/des-obys/public/README.md`
  - `packages/eminente/README.md`
  - `packages/eminente/public/README.md`
  - `packages/obys-library/README.md`
  - `packages/obys-library/public/README.md`
  - `reference/plus-ex-15th/README.md`
  - `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z`
- Nearby wrong interpretations to reject:
  - generic `.runs` cleanup outside the seven surfaces
  - recreating deleted or ignored archive payloads in git
  - changing mirror scripts or hi-fi pipeline behavior
  - editing non-listed package READMEs such as `packages/abetkaua/*`
- Explicit non-goals carried forward:
  - no CO-272 surface changes unless a fresh regression appears
  - no unrelated `.runs` manifest example sweep
  - no archive retention policy redesign

## Parity / Alignment Matrix
- Current truth:
  - each protected package README still points to `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/.../public/`
  - `reference/plus-ex-15th/README.md` still points to and serves from a missing `.runs/0801-dead-code-pruning/archive/.../reference/plus-ex-15th` path
- Reference truth:
  - fresh checkouts contain tracked README stubs and tracked reference assets only; `.runs` archive payloads are local-only and ignored
  - CO-272 already handled a narrower set of surfaces and this follow-up names the remaining surfaces
- Target truth / intended delta:
  - listed READMEs direct readers to tracked package/reference context plus explicit regeneration guidance
  - any `.runs` mention in listed files is explicitly local-only output, not a tracked public location
  - unrelated historical/task docs and non-listed package residues stay unchanged
- Explicitly out-of-scope differences:
  - mirror tooling behavior, hi-fi pipeline generation behavior, retained local archive layout, and unrelated 0801 task documentation

## Readiness Gate
- Not done if:
  - any protected README still advertises the missing 0801 archive as durable guidance
  - replacement text depends on ignored archive payloads existing in fresh clones
  - implementation touches unrelated archive surfaces or tooling
- Pre-implementation issue-quality review evidence:
  - 2026-04-21: parent reviewed Linear issue-context, existing README residue with targeted `rg`, and docs-first templates. The micro-task path is not used because the issue explicitly requires traceability docs and protected wording around exact surfaces.
- Safeguard ownership split:
  - same-issue docs child lane was attempted after a `parallelize_now` decision but failed closed with `provider_worker_child_lane_provenance_invalid` because the parent manifest lacks provider control-host provenance
  - parent owns docs packet, README implementation, validation, workpad, PR, and handoff for this run

## Technical Requirements
- Functional requirements:
  - update the seven protected README files only for implementation
  - remove durable-looking references to `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/...`
  - provide durable tracked guidance or explicit regeneration steps
  - label any remaining `.runs` examples as local-only generated output
  - leave non-listed archive references unchanged
- Non-functional requirements:
  - keep the diff small and reviewable
  - avoid adding dependencies or generated payloads
  - keep wording clear for fresh checkout users
- Interfaces / contracts:
  - README guidance only
  - no runtime, API, CLI, package, or data model contract changes

## Architecture & Data
- Architecture / design adjustments:
  - none expected
  - use README wording that points to existing tracked project context and regeneration commands where already available
- Data model changes / migrations:
  - none
- External dependencies / integrations:
  - existing mirror scripts or reference-generation workflows may be mentioned as regeneration guidance only

## Validation Plan
- Tests / checks:
  - targeted `rg` over protected README files for the dead-code-pruning archive path
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - manifest-backed standalone review plus explicit elegance/minimality pass before review handoff
- Rollout verification:
  - reviewers can inspect a fresh checkout and follow the listed README guidance without needing ignored `.runs` archive payloads
- Monitoring / alerts:
  - no ongoing runtime monitoring required

## Open Questions
- None blocking.

## Approvals
- Docs-first packet: parent provider worker
- Parent implementation/review/PR lifecycle: pending
- Date: 2026-04-21
