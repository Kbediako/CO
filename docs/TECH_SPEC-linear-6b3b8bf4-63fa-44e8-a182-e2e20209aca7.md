---
id: 20260425-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7
title: CO-360 task registry docs pointer TECH_SPEC mirror alignment
relates_to: docs/PRD-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md
risk: medium
owners:
  - Codex
last_review: 2026-04-25
---

# TECH_SPEC - CO-369: CO-360 task registry docs pointer TECH_SPEC mirror alignment

## Canonical Reference
- Canonical task spec: `tasks/specs/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- PRD: `docs/PRD-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- Task checklist: `tasks/tasks-linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`
- `.agent` mirror: `.agent/task/linear-6b3b8bf4-63fa-44e8-a182-e2e20209aca7.md`

## Summary
- Objective: make the `CO-369` packet clear enough for the parent lane to align `CO-360` `tasks/index.json` `paths.docs` with the appropriate docs-side `TECH_SPEC` mirror.
- Scope: docs packet only in this child lane; parent-owned implementation either creates/repoints the `CO-360` mirror path or records an explicit legacy fallback.
- Constraints: no child edits to `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, the `CO-360` mirror, provider runtime files, Linear state, or PR lifecycle artifacts.

## Issue-Shaping Contract
- User-request translation carried forward: this is not a broad registry cleanup. The issue is specifically whether `CO-360` has the right docs-facing `TECH_SPEC` mirror and whether `tasks/index.json` `paths.docs` points at it, with a documented fallback allowed only after parent verification.
- Protected terms / exact artifact and surface names: `CO-360`, `CO-369`, `tasks/index.json`, `items[]`, `paths.docs`, `TECH_SPEC`, `TECH_SPEC mirror`, `CO-360 docs TECH_SPEC mirror`, `tasks/specs`, `docs/TECH_SPEC-*`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`, provider runtime files, `source-0`.
- Nearby wrong interpretations to reject: child lane registry edits, blind pointer repointing, broad registry normalization, docs freshness policy edits, provider runtime changes, or accepting an unspecified legacy fallback.
- Explicit non-goals carried forward: no Linear mutation, no full repo validation, no child edit outside the six packet files, and no pre-decision before parent verifies current `CO-360` state.

## Parity / Alignment Matrix

| Dimension | Current Truth | Reference Truth | Target Truth / Intended Delta | Explicitly Out Of Scope |
| --- | --- | --- | --- | --- |
| `paths.docs` | Parent is verifying the current `CO-360` `tasks/index.json` entry. | Registry docs pointers should land on the intended docs-facing spec surface or document a specific exception. | Parent repoints `paths.docs` to the `CO-360` docs `TECH_SPEC` mirror, or records a specific fallback rationale. | Changing unrelated `tasks/index.json` entries. |
| Docs mirror | Issue text says the `CO-360` docs `TECH_SPEC` mirror may be missing or misaligned. | Docs-first packet mirrors should preserve enough canonical spec context for docs readers. | Parent adds or confirms the mirror as the docs target. | Child editing the `CO-360` mirror. |
| Validation | Child can only check packet files. | Pointer edits need focused docs/registry checks where they are implemented. | Parent runs targeted checks after implementation. | Full validation suites in this child lane. |

## Readiness Gate
- Not done if:
  - the packet drops the mirror/repoint versus fallback decision fork
  - parent leaves a missing or ambiguous `paths.docs` target without a concrete rationale
  - implementation touches docs freshness policy, provider runtime files, or unrelated registry rows
  - child edits exceed the six owned files
- Pre-implementation issue-quality review evidence: the canonical task spec records protected terms, rejected interpretations, non-goals, alignment matrix, and parent-owned implementation boundaries.
- Safeguard ownership split: child owns packet creation; parent owns source verification, registry/doc edits, validation, workpad, Linear, PR, and merge.

## Technical Requirements
- Parent must identify the exact `CO-360` UUID, canonical task spec path, docs `TECH_SPEC` mirror path, and current `paths.docs` value.
- Parent must verify whether a docs-side mirror exists and whether it should be the registry docs target.
- Parent must implement one outcome only: mirror plus `paths.docs` repoint, or explicit legacy fallback rationale.
- Parent must avoid broad registry, docs freshness, and runtime changes.
- Child must leave the six packet files in place for patch export.

## Validation Plan
- Child: target-file presence, `git diff --check` over the six files, and protected-term search.
- Parent: focused registry/docs validation, `node scripts/spec-guard.mjs --dry-run`, and any additional gates required by the actual implementation surface.

## Approvals
- Reviewer: CO-369 parent lane verification and final standalone review completed on 2026-04-25.
- Date: 2026-04-25
