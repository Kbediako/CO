# Task List: CO-400 provider issue current-state authority and issue-context label projection

## Added by Docs Packet 2026-04-28

## Context
- MCP Task ID: `linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3`
- Primary PRD: `docs/PRD-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- TECH_SPEC: `tasks/specs/linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- Summary of scope: Carry Linear issue labels through `linear issue-context` as live current-state authority across GraphQL, typed context, live parse, cached parse/write, summary, CLI JSON, and focused tests.
- Source anchor: `ctx:sha256:f92e935a0e7a99898f24e320414e1c8a7cc9bc966dbf796b8c606abad73b6446#chunk:c000001`

### Checklist Convention
- Start every task/subtask with `[ ]` and flip it to `[x]` when the acceptance criteria are met, citing evidence.

### Evidence Gates
- [x] Issue-quality review captured (pre-implementation) - Evidence: `tasks/specs/linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md` carries the issue-shaping contract, protected terms, wrong interpretations, explicit non-goals, parity matrix, and Not Done If clauses.
- [x] Fallback / refactor decision captured (pre-implementation) - Evidence: `tasks/specs/linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md` removes label omission, cache stripping, fallback projection, and omitted-label inference.
- [x] Durable fallback retention evidence captured - Evidence: no retained temporary fallback is approved; cache is documented only as a supported snapshot contract that must preserve known labels and treat legacy omissions conservatively.
- [ ] Standalone review approval captured (pre-implementation) - Evidence: parent lane to run if required before implementation.
- [ ] Docs-review manifest captured (pre-implementation) - Evidence: parent lane to run if required; this child lane was scoped to packet creation only.
- [ ] Implementation review manifest captured (post-implementation) - Evidence: parent lane to capture after source/test changes.

### Progress Log (continuity)
- 2026-04-28: Created docs-first packet from parent-provided child-lane instructions, CO-400 memory context, and read-only local source search. The referenced source payload path was absent in this child checkout.
- 2026-04-28: Registered PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and docs freshness entries. No Linear/GitHub/PR lifecycle surfaces were mutated.

## Parent Tasks
1. Extend live issue-context GraphQL label projection.
   - Files: `orchestrator/src/cli/control/providerLinearWorkflowFacade.ts`.
   - Commands: Focused provider workflow facade tests selected by parent.
   - Acceptance: `buildIssueContextQuery` requests Linear issue label nodes with stable identity/name metadata.
   - [ ] Status: Pending parent implementation.
2. Carry labels through typed live context.
   - Files: `ProviderLinearIssueContext`, `LinearIssueContextQueryResponse`, and `parseIssueContext`.
   - Commands: Focused live-parse regression.
   - Acceptance: live GraphQL label nodes become issue-context label records without fallback projection.
   - [ ] Status: Pending parent implementation.
3. Preserve labels through cached snapshots.
   - Files: `ProviderLinearIssueContextCacheRecord`, `parseCachedIssueContext`, `writeCachedIssueContextRecord`.
   - Commands: Focused cache round-trip regression and legacy omitted-label safety assertion.
   - Acceptance: known labels survive cache read/write, and older omitted `labels` does not become known `unlabeled`.
   - [ ] Status: Pending parent implementation.
4. Expose labels in summary and CLI JSON.
   - Files: `summarizeIssueContext`, CLI issue-context output paths, `orchestrator/tests/LinearCliShell.test.ts`.
   - Commands: Focused CLI JSON regression.
   - Acceptance: `linear issue-context --format json` includes known labels and does not infer unlabeled from omission.
   - [ ] Status: Pending parent implementation.
5. Parent-owned review and handoff.
   - Files: parent lane owned manifests, workpad, PR, and review artifacts.
   - Commands: parent lane to choose focused and broader validation gates.
   - Acceptance: parent captures validation/review evidence and handles Linear/GitHub lifecycle.
   - [ ] Status: Pending parent lane.

## Relevant Files
- `docs/PRD-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- `docs/TECH_SPEC-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- `docs/ACTION_PLAN-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- `tasks/specs/linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- `tasks/tasks-linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- `.agent/task/linear-6dfd5b1c-ee27-46e4-b31c-7742ea3bdaa3.md`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Notes
- PRD/TECH_SPEC/ACTION_PLAN Requirements: Complete for this docs packet.
- Intent checksum / parity matrix status: Captured in PRD, TECH_SPEC, ACTION_PLAN, checklist, and `.agent` mirror.
- Approvals Needed: Parent lane review before implementation.
- Subagent usage: This is already a bounded same-issue child lane; no nested delegation was launched from this docs-only packet scope.
