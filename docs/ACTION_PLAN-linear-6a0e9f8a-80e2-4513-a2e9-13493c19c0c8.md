# ACTION_PLAN - CO-500 repair current-main docs:check backticked workspace path failures

## Summary
- Goal: register the CO-500 traceability packet, then make the minimum Markdown formatting repair required for `docs:check` to stop reporting `backticked-path-missing` for the three protected workspace paths.
- Scope:
  - CO-500 PRD, TECH_SPEC, ACTION_PLAN, task checklist, `.agent` mirror, and registry entries
  - five historical packet lines named by the issue
  - `docs:check` and `docs:freshness` validation
- Assumptions:
  - Current `origin/main` is `989b9677ea72287e0cb561838a3c7f65b297f8a7` at lane start.
  - The reproduced `docs:check` failure is unrelated to Codex CLI 0.128 posture.
  - Removing Markdown code formatting from the stale path text is sufficient; no rule change is needed.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs:check`
  - `backticked-path-missing`
  - .workspaces/linear-8bbdd424-d77e-4312-b4b7-2a82c3df2749
  - .workspaces/linear-f04ab1c2-79e6-4a98-84e1-85efb6583116
  - .workspaces/linear-8e9e3747-77fa-4d28-879a-0fdc07fb1eec
  - `CO-294`
  - `CO-398`
  - `CO-406`
  - current `main`
- Not done if:
  - `docs:check` still reports any named workspace path as `backticked-path-missing`
  - docs-hygiene validation is weakened or disabled
  - historical task packet evidence is deleted
  - completed issue packets are broadly refreshed or `last_review` is bumped outside CO-500
  - the lane claims Codex CLI 0.128 adoption, release, cloud, or workflow pin ownership
- Pre-implementation issue-quality review:
  - 2026-05-05: the issue is narrow, concrete, and current-main reproducible; implementation should be formatting-only in historical packet text after packet creation.
- Fallback / refactor decision:
  - This task does not add, retain, or touch runtime fallback/seam behavior.
- Durable retention evidence:
  - Not applicable; no retained fallback/seam behavior.
- Large-refactor check:
  - Not applicable; a larger refactor would broaden beyond the requested docs-hygiene repair.

## Milestones & Sequencing
1. Register traceability packet.
   - Add PRD, TECH_SPEC, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Apply scoped formatting repair.
   - Launch same-issue child lane for the five historical packet files.
   - Parent accepts or rejects the child patch after reviewing the artifact.
3. Validate and hand off.
   - Run `git diff --check`, JSON parses, delegation/spec guards, `docs:check`, and `docs:freshness`.
   - Run standalone review and elegance pass before review handoff if the final diff is non-trivial.
   - Open/attach PR, wait for required checks and `pr ready-review` drain, then move Linear only when clean.

## Dependencies
- Live Linear issue `CO-500`.
- Current-main `docs:check` reproduction from 2026-05-05.
- Same-issue child-lane proof for the delegated historical packet formatting patch.

## Validation
- Checks / tests:
  - `git diff --check`
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - manifest-backed `codex-orchestrator review` and explicit elegance pass before handoff when required
- Rollback plan:
  - Revert the CO-500 branch. The formatting repair is isolated to Markdown and registry packet files.

## Risks & Mitigations
- Risk: broad completed-packet refresh obscures historical evidence.
  - Mitigation: edit only the named workspace path text and leave surrounding packet content unchanged.
- Risk: docs-hygiene is weakened to clear the gate.
  - Mitigation: do not touch docs-hygiene code; validate with the existing `docs:check` command.
- Risk: lane is mistaken for Codex CLI 0.128 posture work.
  - Mitigation: preserve explicit non-goals and reject posture/pin changes.

## Approvals
- Reviewer: pending
- Date: 2026-05-05
