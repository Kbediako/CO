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
- [ ] Standalone review approval captured - Parent lane owned.
- [ ] Docs-review manifest captured - Parent lane owned.
- [ ] Implementation review manifest captured - Parent lane owned.

## Parent Implementation Checklist
1. [ ] Add label nodes to `buildIssueContextQuery`.
2. [ ] Add label shape to `ProviderLinearIssueContext` and parse live GraphQL label nodes.
3. [ ] Preserve labels in `parseCachedIssueContext` and `writeCachedIssueContextRecord`.
4. [ ] Keep legacy omitted labels from becoming known `unlabeled`.
5. [ ] Include known labels in `summarizeIssueContext` and `linear issue-context --format json`.
6. [ ] Add focused facade live-parse, cache round-trip, omitted-label safety, and CLI JSON tests.
7. [ ] Preserve CO-398 non-goals and expected-state checks.

## Child Lane Notes
- This mirror was created by a docs-only same-issue child lane.
- No Linear/GitHub/PR lifecycle commands were run or mutated.
- No source code or tests were changed.
