# Task Checklist - linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1

- Linear Issue: `CO-592` / `5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1`
- MCP Task ID: `linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1`
- Registry Task ID: `20260531-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1`
- Primary PRD: `docs/PRD-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- Canonical TECH_SPEC: `tasks/specs/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`
- Source anchor: `ctx:sha256:82b6890ddb28df5fdb3ee033ffaeefd5d64ff61a39c34fe6c0fd1119ab0d1b87#chunk:c000001`

## Docs-First
- [x] PRD created. Evidence: `docs/PRD-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`.
- [x] Canonical task spec created. Evidence: `tasks/specs/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`.
- [x] TECH_SPEC mirror created. Evidence: `docs/TECH_SPEC-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`.
- [x] ACTION_PLAN created. Evidence: `docs/ACTION_PLAN-linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`.
- [x] Registry mirrors updated in scoped files. Evidence: `tasks/index.json`, `docs/TASKS.md`.
- [x] Issue-quality note captured. Evidence: canonical spec says CO-592 is a guard-contract parity lane for `rehydrated active provider claims`, `sanctioned provider parent proof`, `provider docs-review children`, `delegation-guard`, CO-461, and CO-557.
- [x] Fallback / compatibility decision captured. Evidence: canonical spec expires the missing rehydrated-proof seam and retains strict provider child authorization as durable correctness behavior.

## Fallback / Refactor Decision
- Canonical decision lives in `tasks/specs/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1.md`.
- Summary: expire the missing rehydrated active parent-proof path; retain strict rejection of `parent_run_id alone`, stale, foreign, released, and unrelated claims.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rehydrated provider parent proof | `rehydrated active provider claims` may be ignored as parent proof when original control-host launch provenance was safely cleared during active-run rehydration. | expire fallback | CO-592 parent implementation | `provider docs-review children` run after parent provider-worker rehydration. | 2026-05-31 | 2026-05-31 | 30 days, expires 2026-06-30 | `delegation-guard` recognizes current same-issue, same-run, same-manifest, same-root rehydrated active parent proof without requiring a loose override. | Focused passing rehydrated active parent-proof regression plus existing CO-461/CO-557 guard matrix. |
| Strict provider child authorization | Contract name: `sanctioned provider parent proof` for `provider docs-review children`. | justify retaining fallback | `delegation-guard` / provider child-stream contract | Provider docs-review child validation. | CO-461 / CO-557 | 2026-05-31 | Non-expiring durable retention only with rationale | Non-expiring rationale: rejecting `parent_run_id alone`, stale, foreign, released, and unrelated proof is correctness behavior, not temporary fallback behavior. | Negative regressions for parent-run-only, stale, foreign, released, unrelated, issue mismatch, missing parent_run_id, and unregistered top-level task ids. |
| Provider intake audit residue | Retained/stale provider-intake rows can remain visible beside live rehydrated active rows. | justify retaining fallback | provider-intake audit history | Guard scans provider-intake state for parent proof. | Existing provider-intake behavior | 2026-05-31 | Non-expiring durable audit retention | Audit rows stay visible but are excluded from sanctioned parent proof unless they satisfy active same-run proof requirements. | Released/stale/foreign/unrelated rows fail closed while audit data remains unchanged. |

## Acceptance Criteria
- [x] `delegation-guard` recognizes a current `provider_issue_rehydrated_active_run` claim as `sanctioned provider parent proof` only when same issue, task, run, manifest, and root agree. Evidence: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] `provider docs-review children` require matching `parent_run_id` plus registered parent task proof. Evidence: `tests/delegation-guard.spec.ts`.
- [x] `parent_run_id alone` fails closed. Evidence: `tests/delegation-guard.spec.ts`.
- [x] stale parent proof fails closed. Evidence: full `tests/delegation-guard.spec.ts` suite.
- [x] foreign workspace/root proof fails closed. Evidence: full `tests/delegation-guard.spec.ts` suite.
- [x] `released`, terminal, completed, retained, and unrelated claims fail closed. Evidence: focused and full guard suites.
- [x] child issue mismatch fails closed. Evidence: full `tests/delegation-guard.spec.ts` suite.
- [x] CO-461 provider docs-review child identity strictness remains green. Evidence: full `tests/delegation-guard.spec.ts` suite.
- [x] CO-557 docs-review task-key/root strictness remains green. Evidence: full `tests/delegation-guard.spec.ts` suite.
- [x] Provider-intake audit history is preserved; no manual `provider-intake-state.json` repair is used. Evidence: implementation preserves state rows and updates only rehydrated claim fields.

## Validation
- [x] Scoped docs packet created in the child lane.
- [x] Parent standalone review manifest captured and clean. Evidence: `.runs/linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1/cli/2026-05-31T20-30-39-013Z-6a672379/review/telemetry.json`.
- [x] Focused valid rehydrated active parent-proof regression passes. Evidence: `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts -t "launch provenance"`.
- [x] Focused parent-run-only and related negative regressions pass. Evidence: `npx vitest run tests/delegation-guard.spec.ts -t "rejects provider docs-review parent_run_id-only proof"` and full `tests/delegation-guard.spec.ts` suite.
- [x] Existing CO-461 and CO-557 guard/root regressions pass. Evidence: full `tests/delegation-guard.spec.ts` suite.
- [x] Parent final validation floor passes after implementation. Evidence: delegation/spec guards, build, lint, test, docs, freshness, stewardship, diff-budget, and pack smoke.
- [x] Elegance/minimality pass completed after standalone review with no simplification needed.

## Notes
- Parent owns live Linear/workpad/review/implementation/PR lifecycle; child packet evidence stays under `linear-5404ace3-9fa9-4dce-b0b8-0196aa6a4ce1-docs-packet`.
- Parent added `docs/docs-freshness-registry.json` entries after `docs:freshness` reported the six CO-592 packet paths missing from the registry.
