---
id: 20260514-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5
title: CO-538 verify create-follow-up labels with live post-mutation reads
relates_to: docs/PRD-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md
risk: medium
owners:
  - Codex
last_review: 2026-05-14
related_action_plan: docs/ACTION_PLAN-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md
task_checklists:
  - tasks/tasks-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md
---

# TECH_SPEC - CO-538 verify create-follow-up labels with live post-mutation reads

## Canonical Reference
- PRD: `docs/PRD-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`
- TECH_SPEC canonical: `tasks/specs/linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`
- Task checklist: `tasks/tasks-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5.md`
- Linear issue: `CO-538` / `31958d87-e472-4c3f-a1e2-ab7adb3646b5`
- Source anchor: `ctx:sha256:0b7864e23887d0b023799ab19858917af9f490c4a4e62af57b5913aebe5861dc#chunk:c000001`
- Child lane manifest: `.runs/linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5-docs-packet-local/cli/2026-05-14T03-58-04-115Z-a02ced60/manifest.json`
- Child lane limitation: the referenced source payload path was absent in this checkout; this spec uses the embedded parent prompt as source.

## Summary
- Objective: extend `codex-orchestrator linear create-follow-up` so created and reused follow-up issue labels are verified from live Linear issue state after mutation, repaired once with `addedLabelIds` when missing, and failed closed when terminal live labels still do not match expected source-derived labels.
- Scope:
  - provider Linear workflow facade create/reuse path.
  - post-create live verification.
  - post-reuse live verification for canonical owner reuse.
  - bounded `addedLabelIds` repair for missing expected labels.
  - JSON and human terminal output that reports terminal live labels.
  - focused tests for propagation delay, reuse repair, persistent missing labels, and output.
- Constraints:
  - no Linear label taxonomy changes.
  - no CO-400 projection semantics changes.
  - no provider admission, WIP cap, or queue prioritization changes.
  - no manual labeling sweep.
  - no cached or mutation-return labels as clean-success authority.
  - no full repo validation from the docs-only child lane.

## Issue-Shaping Contract
- User-request translation carried forward: CO-538 is the narrow live verification follow-up to CO-482 label assignment; `create-follow-up` must prove terminal live labels after create/reuse instead of trusting mutation-return labels.
- Protected terms / exact artifact and surface names:
  - `codex-orchestrator linear create-follow-up`
  - `CO-482`
  - `CO-537`
  - `labels: []`
  - `labelIds`
  - `addedLabelIds`
  - `live linear issue-context`
  - `post-create live verification`
  - `canonical owner reuse`
  - `source-derived labels`
  - `fail closed`
- Nearby wrong interpretations to reject:
  - treating mutation-return labels as terminal truth.
  - adding CO-400 label projection changes.
  - changing label taxonomy or global label definitions.
  - changing provider admission or queue prioritization.
  - manually sweeping labels outside `create-follow-up`.
  - weakening CO-482 source-derived label assignment.
- Explicit non-goals carried forward:
  - no Linear label taxonomy changes.
  - no CO-400 projection semantics changes.
  - no provider admission/queue changes.
  - no manual label cleanup.
  - no Linear/GitHub/PR lifecycle work in this child lane.

## Requirements
- `create-follow-up` must read live target issue labels after create and after canonical owner reuse.
- Clean success must be based on terminal live labels, not mutation-return labels.
- Missing expected source-derived labels may be repaired through one bounded `addedLabelIds` attempt followed by a live reread.
- Persistent missing labels must fail closed with issue id or identifier, expected labels, observed labels, and missing labels.
- JSON and human terminal output must report terminal live labels.
- Existing CO-482 source-derived label assignment, canonical owner reuse, and structured follow-up guards must remain intact.

## Validation Plan
- Focused `ProviderLinearWorkflowFacade` tests for create success with live missing labels, post-create live verification, post-reuse live verification, bounded `addedLabelIds` repair, propagation delay, persistent missing labels, and terminal output.
- Focused CLI output tests if terminal human/JSON output changes.
- Docs and registry validation: JSON parse checks, file presence checks, and `git diff --check` in this child lane.
- Parent owns full build/lint/test/docs/review validation.
