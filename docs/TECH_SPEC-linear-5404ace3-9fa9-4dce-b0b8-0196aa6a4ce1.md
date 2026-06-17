---
id: 20260531-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1
title: "CO-592 provider parent-proof rehydration"
relates_to: docs/PRD-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md
risk: high
owners:
  - Codex
last_review: 2026-06-17
related_action_plan: docs/ACTION_PLAN-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md
task_checklists:
  - tasks/tasks-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md
review_notes:
  - 2026-06-17: Reviewed CO-592 fallback metadata; kept the expiring rehydrated parent-proof seam on its existing 2026-06-30 deadline and preserved durable strict-proof/audit-retention dispositions.
---

This TECH_SPEC mirrors `tasks/specs/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`. The canonical spec owns the full provider parent-proof rehydration contract, acceptance criteria, fallback/seam decision, and validation plan for CO-592.

## Canonical Reference
- Linear issue: `CO-592` / `5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1`
- Canonical spec: `tasks/specs/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- Source anchor: `ctx:sha256:82b6890ddb28df5fdb3ee033ffaeefd5d64ff61a39c34fe6c0fd1119ab0d1b87#chunk:c000001`

## Summary
CO-592 adds a narrow `delegation-guard` proof path so `rehydrated active provider claims` can act as `sanctioned provider parent proof` for matching `provider docs-review children`. The path must preserve CO-461 and CO-557 strictness by requiring registered parent task proof, active parent manifest support, same issue identity, same run, same manifest, current-root/shared-root authority, and matching `parent_run_id`.

## Technical Requirements
- Accept rehydrated parent proof only for current active claims such as `provider_issue_rehydrated_active_run`.
- Require same provider, issue id, issue identifier, parent task id, run id, run manifest path, and active parent manifest.
- Require docs-review child `parent_run_id` to match the sanctioned parent run.
- Preserve issue-field mismatch rejection when child manifests carry issue fields.
- Reject `parent_run_id alone`.
- Reject stale, foreign, released, terminal, completed, retained, or unrelated claims.
- Preserve CO-461 strict provider docs-review child identity behavior.
- Preserve CO-557 docs-review task-key and control-host root authority.
- Preserve `provider-intake-state.json` as audit history; do not repair proof by deleting or rewriting rows.

## Validation
- Focused guard tests cover valid rehydrated active proof, parent-run-only failure, stale proof, foreign proof, released proof, unrelated proof, child issue mismatch, missing `parent_run_id`, and ordinary unregistered top-level rejection.
- Existing CO-461 and CO-557 guard/root tests remain green.
- Parent docs-review and implementation-gate remain parent-owned.
- See the canonical task spec for full validation sequencing and fallback/compatibility decisions.
