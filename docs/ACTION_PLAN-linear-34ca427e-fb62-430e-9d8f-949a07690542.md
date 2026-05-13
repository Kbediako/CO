# ACTION_PLAN - CO-489 External Agent Session Import Resume Continuity

## Summary
- Goal: complete the CO-489 traceability packet and external agent session import continuity evaluation.
- Scope: packet docs, task mirror, `.agent/task` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Assumptions:
  - CO-489 now has an attached packet PR and is in active provider-worker review/validation.
  - The current local Codex CLI is newer than the original 0.128 release-intake evidence.
  - External import must not mutate real user config or live provider-worker state.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - external agent session import
  - background imports
  - imported-session title handling
  - resume continuity
  - provider-worker manifests
  - hook continuation
  - Linear workpads
  - external_migration
  - `codex-cli-0128:external-session-import-continuity`
  - `codex-orchestrator:canonical-owner-key=codex-cli-0128:external-session-import-continuity`
- Not done if:
  - CO-489 lacks packet files or registry mirrors.
  - imported session state replaces provider-worker manifests, provider-intake authority, hook continuation, or Linear workpads.
  - evaluation or future work mutates the operator Codex home config or live CO provider-worker state.
  - evaluation relies only on stale 0.128 workpad evidence after the CLI update.
- Pre-implementation issue-quality review:
  - 2026-05-13: CO-489 is an analysis/evaluation lane, not plugin governance or goals-mode adoption.
  - 2026-05-13: micro-task path is unavailable because correctness depends on exact import surfaces, protected terms, and authority boundaries.
  - 2026-05-13: packet setup was intended as a pre-admission gate; live context now shows CO-489 already `In Progress` with PR #803 attached, so review/handoff follows the active provider-worker path.
- Fallback / refactor decision: remove any lifecycle-authority use of imported sessions and expire stale 0.128 evidence unless refreshed.
- Durable retention evidence: Existing provider-worker manifests and Linear workpads remain durable authority.
- Large-refactor check: adoption that touches lifecycle authority requires a larger continuity design.
- Minor-seam decision: packet setup is safe because it adds traceability only.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Resume authority | Imported sessions could be lifecycle truth. | remove fallback | CO-489 | Import evidence is used for lifecycle or recovery authority. | 2026-05-03 | 2026-05-13 | N/A | Imported sessions stay advisory unless a follow-up governs authority. | Fixture canary plus review evidence. |
| Stale import evidence | Historical 0.128 evidence could be treated as current. | expire fallback | CO-489 | Worker cites old release-intake notes without current probe. | 2026-05-03 | 2026-05-13 | 2026-06-12 | Current CLI/app-server probe or explicit defer/reject decision. | Versioned canary artifact or current upstream citation. |

## Milestones & Sequencing
1. Rebuild live state from shared root, co-status, GitHub PR state, and Linear issue-context.
2. Create an isolated packet worktree from current `origin/main`.
3. Add PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent/task` mirror.
4. Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
5. Validate packet scope, JSON, protected terms, spec guard, docs check, docs freshness classification, and diff budget.
6. Open a packet PR, attach it to CO-489, and watch for current-head review/check completion.
7. Record current local CLI/schema evidence and upstream `rust-v0.128.0` release/source/test behavior.
8. Classify CO continuity use cases as adopt, defer, or reject.
9. Update the attached PR with the evaluation result, then run validation, review, and ready-review drain.

## Dependencies
- Linear issue `CO-489` / `34ca427e-fb62-430e-9d8f-949a07690542`.
- Source issue `CO-466` / `bdfd9046-97b5-43bd-850f-b305558cdada`.
- Codex CLI external_migration feature and app-server protocol.
- Existing CO provider-worker manifests, hook continuation, and Linear workpads.
- User requirement to keep shared root on latest `main` and workers/reviews on `gpt-5.5` / `xhigh`.

## Validation
- Checks / tests:
  - `git diff --check`.
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`.
  - protected-term scan for CO-489 and external import terms.
  - `codex --version`.
  - `codex features list`.
  - `codex app-server generate-ts --enable external_migration`.
  - GitHub release/source/test evidence reads for `openai/codex` `rust-v0.128.0`.
  - `node scripts/spec-guard.mjs --dry-run`.
  - `npm run docs:check`.
  - `npm run docs:freshness` with inherited baseline classification if still red.
  - `node scripts/diff-budget.mjs`.
- Rollback plan:
  - Revert only packet docs and registry mirrors if review rejects the traceability framing.

## Risks & Mitigations
- Risk: packet setup is mistaken for the actual import evaluation.
  - Mitigation: packet docs now include the completed evaluation result and use-case classification.
- Risk: imported sessions become a shadow authority.
  - Mitigation: fallback decision keeps them advisory until a follow-up governs authority boundaries.
- Risk: stale 0.128 evidence hides changed current CLI behavior.
  - Mitigation: current worker records local `codex-cli 0.130.0` feature/schema posture and separately cites `rust-v0.128.0` release/source/test evidence.
- Risk: review auto-trigger misses the packet PR.
  - Mitigation: watch for Codex eyes reaction and manually trigger once per head SHA if absent.

## Approvals
- Reviewer: CO parent orchestrator.
- Date: 2026-05-13.
