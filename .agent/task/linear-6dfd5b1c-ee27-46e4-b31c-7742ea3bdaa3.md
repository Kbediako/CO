# Agent Task Mirror: CO-400 provider issue current-state authority and issue-context label projection

## Context
- MCP Task ID: `linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3`
- Primary PRD: `docs/PRD-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- TECH_SPEC: `tasks/specs/linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- Canonical task checklist: `tasks/tasks-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`

## Intent Checksum
- Preserve: `issue-context label projection`, `live Linear issue current-state`, `cached snapshots preserve labels`, `no fallback projection`, `provider workers must not infer unlabeled from omitted labels`, `GraphQL`, `ProviderLinearIssueContext`, `live parsing`, `cached parse/write`, `CLI JSON output`, and `focused tests`.
- Protect: `codex-orchestrator linear issue-context`, `providerLinearWorkflowFacade.ts`, `LinearIssueContextQueryResponse`, `ProviderLinearIssueContext`, `buildIssueContextQuery`, `parseIssueContext`, `parseCachedIssueContext`, `writeCachedIssueContextRecord`, `summarizeIssueContext`, `ProviderLinearWorkflowFacade.test.ts`, and `LinearCliShell.test.ts`.
- Reject: display-only labels, fallback label projection, omitted `labels` as known unlabeled state, live-query-only changes that leave cache or CLI JSON broken, CO-398 fallback rework, and expected-state weakening.

## Evidence Gates
- [x] Issue-quality review captured - Evidence: scoped TECH_SPEC carries protected terms, wrong interpretations, non-goals, parity matrix, and Not Done If clauses.
- [x] Fallback / refactor decision captured - Evidence: scoped TECH_SPEC removes label omission, cache stripping, fallback projection, and omitted-label inference.
- [x] Durable retention evidence captured - Evidence: no retained temporary fallback is approved; cache is supported only when known labels are preserved and legacy omitted labels remain unknown/not projected.
- [x] Standalone review approval captured - Parent lane owned.
- [x] Docs-review manifest captured - Parent lane owned.
- [x] Implementation review manifest captured - Parent lane owned.

## Parent Implementation Checklist
1. [x] Add label nodes to `buildIssueContextQuery`.
2. [x] Add label shape to `ProviderLinearIssueContext` and parse live GraphQL label nodes.
3. [x] Preserve labels in `parseCachedIssueContext` and `writeCachedIssueContextRecord`.
4. [x] Keep legacy omitted labels from becoming known `unlabeled`.
5. [x] Include known labels in `summarizeIssueContext` and `linear issue-context --format json`.
6. [x] Add focused facade live-parse, cache round-trip, omitted-label safety, and CLI JSON tests.
7. [x] Preserve CO-398 non-goals and expected-state checks.

## Child Lane Notes
- This mirror was created by a docs-only same-issue child lane.
- No Linear/GitHub/PR lifecycle commands were run or mutated.
- No source code or tests were changed.

## Fallback Expiry / Refactor Decision

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Live issue-context projection | Labels omitted from live current-state GraphQL projection. | remove fallback | CO-400 | Provider worker reads issue context for Linear current state. | existing issue-context behavior | N/A after removal | N/A after removal | Label nodes are queried and parsed as current-state truth. | Focused facade live-parse regression. |
| Cached issue-context snapshots | Cache parse/write can strip labels or make omitted labels appear authoritative. | remove fallback | CO-400 | Issue-context cache is written or read after label-aware live context exists. | existing cache behavior | N/A after removal | N/A after removal | Known labels round-trip; omitted legacy labels remain unknown/not projected. | Cache round-trip and legacy omitted-label safety regressions. |
| Provider-worker label state | Local/provider fallback projection or omitted-label inference substitutes for live Linear labels. | remove fallback | CO-400 | Consumer needs label state from issue context. | existing omission behavior | N/A after removal | N/A after removal | Consumers use live/cached labels only and cannot treat omission as unlabeled. | CLI JSON and provider-facing facade assertions. |

- Large-refactor check: CO-400 already consolidated current-state authority for label projection; CO-575 only records terminal lifecycle reconciliation for the completed packet.
- Minor-seam decision: removing label omission and fallback projection was required by CO-400; CO-575 does not add or retain another label fallback seam.

## CO-575 terminal lifecycle reconciliation

- 2026-05-22: Historical open checklist residue was reconciled under CO-575 after tasks/index and live Linear terminal evidence showed this task is already complete. This allows implementation-docs archival to preserve the full packet on doc-archives without keeping active docs-freshness debt open on main.
