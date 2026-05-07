# ACTION_PLAN - CO-482 create-follow-up label assignment by live Linear label ids

## Traceability
- Linear issue: `CO-482` / `203c5fad-698f-4094-970c-06de5743d94c`
- Task registry id: `20260507-linear-203c5fad-698f-4094-970c-06de5743d94c`
- MCP Task ID: `linear-203c5fad-698f-4094-970c-06de5743d94c`
- PRD: `docs/PRD-linear-203c5fad-698f-4094-970c-06de5743d94c.md`
- TECH_SPEC: `tasks/specs/linear-203c5fad-698f-4094-970c-06de5743d94c.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-203c5fad-698f-4094-970c-06de5743d94c.md`
- Task checklist: `tasks/tasks-linear-203c5fad-698f-4094-970c-06de5743d94c.md`
- Source anchor: `ctx:sha256:35dc0ba6bd24707bc8b61eb4e856c128cd9c9b2df7c212299073774262aacd50#chunk:c000001`

## Summary
- Goal: make `codex-orchestrator linear create-follow-up` assign source-derived follow-up issue labels by live Linear label ids with immediate traceability.
- Scope: provider facade source-label derivation, create/reuse label assignment mutations, focused tests, docs/task evidence.
- Assumptions:
  - Linear label ids from live source issue labels are the mutation authority; names or cached projection are not enough.
  - Reused issue label behavior must be explicit: attach missing labels or fail/action-required, never silent success.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-482`
  - `codex-orchestrator linear create-follow-up`
  - `assigning follow-up issue labels with live Linear label ids`
  - `label policy`
  - `immediate traceability`
  - `do not broaden into CO-400 label projection`
- Not done if:
  - source-derived required labels are silently omitted
  - labels are resolved by name, hard-coded id, stale provider state, or CO-400 projection
  - CLI output or failure evidence lacks resulting/requested/observed label id traceability
  - label assignment failure after issue creation is reported as clean success
  - canonical-owner reuse hides missing labels
  - CO-400 projection/cache surfaces change
- Pre-implementation issue-quality review:
  - 2026-05-07 docs child lane accepted the narrow mutation-only issue shape and rejected label projection/current-state broadening.
- Fallback / refactor decision:
  - This task touches stale/non-authoritative label assignment behavior.
  - Decision: remove the fallback where required follow-up labels can be omitted or inferred from non-authoritative sources.
  - CO-400 label projection remains a separate adjacent owner scope; CO-482 must not implement it.
- Durable retention evidence:
  - `create-follow-up` live label-id assignment is durable supported behavior.
  - No temporary fallback is retained by CO-482; CO-400 projection ownership is separate out-of-scope work.
- Large-refactor check:
  - A large refactor is not required because this lane adds a bounded label-id mutation contract to the existing `create-follow-up` helper and does not split label current-state authority.

## Milestones & Sequencing
1. Inspect current `create-follow-up` CLI/facade path and tests.
   - Confirm request/result/audit surfaces for title, description, intent checksum, non-goals, `Not Done If`, acceptance, related links, parity matrix, canonical-owner reuse, and blocker linkage.
   - Identify exact GraphQL/API seam for live label-id verification and issue-label assignment.
2. Add source-derived label policy.
   - Derive labels from live source issue labels.
   - Require `Lifecycle: Implementation`, at least one `Priority:*`, at least one `Area:*`, and one type label from `Bug`, `Improvement`, or `Feature`.
   - Preserve all existing structured follow-up validation.
3. Implement live-id assignment.
   - Apply source-derived labels to created follow-up issues through `labelIds`.
   - For reused issues, attach missing labels through `addedLabelIds`.
   - Preserve recovery metadata when issue creation/reuse succeeds but label assignment fails.
4. Add immediate traceability.
   - Return resulting labels in CLI JSON.
   - Emit requested/observed/missing label evidence on assignment failures.
   - Ensure failures are clear enough for the parent lane to recover without guessing.
5. Validate, review, and hand off.
   - Run focused CLI/facade tests first.
   - Run parent-required repo gates after implementation.
   - Run manifest-backed review and elegance/minimality pass before PR handoff.

## Dependencies
- Existing `create-follow-up` CLI and provider Linear workflow facade.
- Linear GraphQL/API issue-label assignment mutation.
- Existing JSON result shape.
- CO-400 remains the separate owner for label projection/current-state authority.

## Validation
- Checks / tests:
  - focused `ProviderLinearWorkflowFacade.test.ts` created follow-up label assignment coverage
  - focused reused follow-up label behavior coverage
  - missing lifecycle/priority/area/type source-label failure coverage
  - label-assignment recovery metadata coverage
  - resulting labels and requested/observed/missing label id coverage
  - parent-required docs/build/test/review gates after implementation
- Rollback plan:
  - Revert the CLI/facade label-id changes and tests if live label assignment cannot be made fail-closed within this scope.
  - If implementation requires CO-400 projection/cache changes, stop and relaunch with widened ownership instead of broadening this lane.

## Risks & Mitigations
- Risk: label names, hard-coded ids, or stale local projection are easier to consume than live source labels.
  - Mitigation: derive from live source issue labels and reject name/fuzzy/cache matching.
- Risk: issue creation succeeds but label assignment fails.
  - Mitigation: return explicit recovery metadata and do not report clean success.
- Risk: canonical-owner reuse masks label drift.
  - Mitigation: attach missing labels under the same live-id policy or return action-required/fail-closed output.
- Risk: implementation drifts into CO-400 current-state label projection.
  - Mitigation: keep all projection/cache/summary label surfaces out of scope.

## Approvals
- Reviewer: provider-worker parent lane.
- Date: 2026-05-07.
