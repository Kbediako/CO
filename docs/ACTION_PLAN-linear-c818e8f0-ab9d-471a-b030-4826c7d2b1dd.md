# ACTION_PLAN - CO-560 prevent provider-worker review-handoff false retry after clean nested review evidence

## Summary
- Goal: add explicit governed nested review evidence resolution so successful provider-worker review handoff does not become a false retry when parent telemetry is absent.
- Scope: provider-worker review evidence resolution, CO-515-shaped regression fixtures, control-host/co-status retry projection for handed-off issues, docs packet, validation, review, and PR handoff.
- Assumptions: no PR is attached at start; live Linear state was `Ready` and has been moved to `In Progress`; top-level missing telemetry remains fail-closed unless explicit clean governed evidence exists elsewhere.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `provider-linear-worker-proof.json`, `owner_status=succeeded`, `end_reason=issue_review_handoff`, `review/telemetry.json`, `implementation-gate`, `review_verdict`, `contract_validation`, `contract_overall_verdict`, `provider_linear_worker_review_unknown`, `provider-intake-state.json`, `co-status --format json`, `In Review`, `PR #836`, `CO-515`.
- Not done if: clean nested evidence still emits `provider_linear_worker_review_unknown`; missing evidence is accepted as clean; status queues the contained handoff shape as active/retrying; the fix relies on manual JSON edits, run deletion, or manifest quarantine.
- Pre-implementation issue-quality review: CO-560 is a bounded product bug with explicit evidence, non-goals, positive acceptance, and fail-closed negative controls.
- Fallback / refactor decision: touches a provider-worker review evidence seam. Remove the top-level-only telemetry authority for explicitly bound clean governed nested/child evidence; retain the non-expiring fail-closed contract for missing or unknown evidence.
- Durable retention evidence: fail-closed governed review evidence remains supported safety behavior, owned by provider-worker review contract handling, and validated by negative regressions.
- Large-refactor check: do not broaden into CO-478/CO-506 parser behavior; the bounded fix should use existing review telemetry/contract validation semantics.

## CO-382 Fallback Decision Table
| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker review handoff | Parent stage treats missing top-level telemetry as the only review authority even when the worker recorded explicit clean nested governed evidence | remove fallback | CO-560 | Successful `issue_review_handoff` with clean nested implementation-gate evidence and absent parent telemetry | Existing pre-CO-560 behavior | 2026-05-19 | N/A after removal | Parent resolves review verdict from explicit governed nested evidence or records the expected missing path | CO-515-shaped positive regression; unbound and unlineaged negative regressions; clean standalone review |
| Control-host status surfaces | Manifest-only retry projection treats successful review handoff proof as retryable failed WIP | remove fallback | CO-560 | Completed historical provider run has `owner_status=succeeded`, `end_reason=issue_review_handoff`, and a succeeded implementation-gate child stream | Existing pre-CO-560 behavior | 2026-05-19 | N/A after removal | Completed clean handoff proof with succeeded implementation-gate child stream is excluded from retry projection; failed handoffs without clean child evidence remain retryable | `SelectedRunProjection` positive and failed-handoff negative regressions; `co-status --format json` evidence |
| Review fail-closed contract | Missing or unknown review evidence blocks provider-worker review handoff | justify retaining fallback | Provider-worker review contract | No explicit clean governed review evidence exists or lineage is not tied to the provider attempt | Existing review-verdict contract | 2026-05-19 | Non-expiring supported safety contract | Replace only with an equivalent stricter governed review contract | Negative regressions for absent, unbound, unlineaged, unknown, findings, and invalid contract evidence |

- Contract name: provider-worker review evidence fail-closed contract.
- Owning surface: `orchestrator/src/cli/services/commandRunner.ts` provider-linear-worker review contract.
- Steady-state proof: missing, unknown, findings, invalid contract, unbound, or unlineaged review evidence blocks review handoff.
- Tests/docs: `CommandRunnerReviewEvidenceConsistency` negative regressions plus this CO-560 packet describe the retained safety path.
- Non-expiring rationale: fail-closed review evidence is a supported safety contract, not temporary fallback debt.
- Large-refactor decision: no large refactor is warranted because CO-560 removes the top-level-only telemetry fallback and keeps the provider-worker review contract in the existing authority surface.
- Minor-seam decision: this bounded seam is acceptable because it resolves only explicitly lineaged same-issue governed review evidence and does not add another review parser, lifecycle, or status authority.

## Milestones & Sequencing
1. Register docs-first packet, task mirrors, and freshness registry entries; run pre-implementation docs review.
2. Inspect current provider-worker review contract code and control-host rehydration/status projection.
3. Add focused CO-515-shaped positive and negative regression fixtures.
4. Implement explicit governed review evidence convergence and status retry suppression for already-handed-off issues.
5. Run focused tests and full required validation gates.
6. Run manifest-backed standalone review, address findings, run elegance pass, open/attach PR, drain `ready-review`, and transition to `In Review` only when clean.

## Dependencies
- Live Linear issue-context for CO-560.
- Existing review telemetry semantics from CO-478/CO-506.
- Current control-host/co-status fixture helpers.
- PR #836 / CO-515 evidence shape from issue text.

## Validation
- Checks / tests: focused provider-worker review evidence tests, focused control-host/co-status status projection tests, `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, manifest-backed `codex-orchestrator review`, elegance pass, and `npm run pack:smoke` if CLI/package review-wrapper paths require it.
- Rollback plan: revert the CO-560 branch/PR; fail-closed top-level telemetry behavior remains conservative, and local containment remains only an emergency operator action, not product behavior.

## Risks & Mitigations
- Risk: accepting clean from an unbound nested manifest. Mitigation: require explicit binding to worker proof/audit/child manifest and validate semantic/contract fields.
- Risk: hiding real failed active provider runs. Mitigation: keep the status suppression narrow to successful `issue_review_handoff` plus live review state and explicit clean evidence.
- Risk: weakening review parser semantics. Mitigation: do not modify clean/finding/unknown parser rules unless implementation proves the same root cause, and keep negative coverage for unknown/empty evidence.

## Approvals
- Reviewer: parent provider worker.
- Date: 2026-05-19.
