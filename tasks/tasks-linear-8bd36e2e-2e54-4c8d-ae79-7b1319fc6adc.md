# Task List: CO-461 provider docs-review child-stream task identity guard compatibility

## Added by Docs Packet 2026-05-01

## Context
- MCP Task ID: `linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc`
- Primary PRD: `docs/PRD-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- TECH_SPEC: `tasks/specs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- Summary of scope: Align provider-launched `docs-review` child-stream task identity with `delegation-guard` so valid provider parent lineage passes while missing/mismatched provenance, registered-parent-prefix mismatch, and ordinary unregistered top-level task ids still fail closed.
- Source anchor: `ctx:sha256:471c87a980984a9fa78484180d20caa0853870300b60d3719fd86502570efbfb#chunk:c000001`
- Child lane manifest: `.runs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc-co461-docs-packet/cli/2026-05-01T03-53-17-330Z-6fa1d127/manifest.json`
- Child lane patch artifact: `.runs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc-co461-docs-packet/cli/2026-05-01T03-53-17-330Z-6fa1d127/provider-linear-child-lane.patch`

### Checklist Convention
- Start every task/subtask with `[ ]` and flip it to `[x]` when the acceptance criteria are met, citing evidence.

### Evidence Gates
- [x] Issue-quality review captured (pre-implementation) - Evidence: `tasks/specs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md` carries the issue-shaping contract, protected terms, wrong interpretations, explicit non-goals, parent/child identity matrix, and Not Done If clauses.
- [x] Fallback / refactor decision captured (pre-implementation) - Evidence: `tasks/specs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md` expires the ambiguous provider docs-review child task identity seam and retains strict provenance/registration failures as correctness contracts.
- [x] Durable fallback retention evidence captured - Evidence: retained contracts require `parent_run_id`, provider launch provenance, and `tasks/index.json` registration proof; no blanket guard override is approved.
- [x] Standalone review approval captured - Evidence: `../../.runs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc/cli/2026-05-01T16-20-48-963Z-a1971f7c/review/telemetry.json` status `succeeded`, review outcome `bounded-success`, no actionable findings.
- [x] Docs-review manifest captured - Evidence: `.runs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc-docs-review/cli/2026-05-01T16-49-31-779Z-1304879a/manifest.json` status `succeeded`; delegation guard treated the docs-review child as a subagent run for the parent task.
- [x] Implementation review manifest captured - Evidence: parent standalone review telemetry above plus docs-review child review telemetry `.runs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc-docs-review/cli/2026-05-01T16-49-31-779Z-1304879a/review/telemetry.json` status `succeeded`, review outcome `clean-success`.

### Progress Log (continuity)
- 2026-05-01: Created docs-first packet from parent-provided child-lane instructions, local source payload lineage, and read-only local packet/source inspection.
- 2026-05-01: Registered PRD, TECH_SPEC mirror, ACTION_PLAN, canonical task spec, task checklist, and `tasks/index.json`. No Linear/GitHub/PR lifecycle surfaces were mutated, and no source/test files were edited.
- 2026-05-01: Parent implemented the guard-side provider docs-review child contract, added focused regressions, refreshed the branch on `origin/main`, completed required validation, and ran manifest-backed standalone review.
- 2026-05-01: Parent ran `linear child-stream --pipeline docs-review`; manifest `2026-05-01T16-49-31-779Z-1304879a` passed delegation guard, spec guard, docs checks, docs freshness maintenance, and forced review.

## Parent Tasks
1. Reproduce the CO-458 failure shape.
   - Files: `tests/delegation-guard.spec.ts`.
   - Commands: parent-selected focused guard test.
   - Acceptance: child `task_id=linear-<issue-id>-docs-review`, `parent_run_id` set, no accepted provider launch provenance, and `delegation-guard` failure are covered.
   - [x] Status: Complete - Evidence: `tests/delegation-guard.spec.ts`; `npm run test:core -- tests/delegation-guard.spec.ts tests/cli-command-surface.spec.ts` passed 168 tests after the final elegance cleanup.
2. Define and implement the guard-compatible parent/child identity contract.
   - Files: `orchestrator/src/cli/providerLinearChildStreamShell.ts`, `scripts/delegation-guard.mjs`, `scripts/lib/provider-run-contract.js`.
   - Commands: parent-selected focused guard and child-stream tests.
   - Acceptance: provider-launched docs-review children either inherit valid parent provider provenance/lineage or use a registered parent task prefix that `delegation-guard` accepts.
   - [x] Status: Complete - Evidence: `scripts/delegation-guard.mjs`; valid provider docs-review child fixture now passes through sanctioned parent proof while preserving task prefix checks.
3. Preserve fail-closed provider provenance behavior.
   - Files: `tests/delegation-guard.spec.ts`, `orchestrator/tests/ProviderLinearChildStreamShell.test.ts`.
   - Commands: focused missing/mismatched provenance tests.
   - Acceptance: missing provider provenance and mismatched provider provenance still fail closed.
   - [x] Status: Complete - Evidence: focused missing-provenance and issue-mismatch regressions in `tests/delegation-guard.spec.ts`; focused final test run passed.
4. Preserve task registration and parent-prefix safety.
   - Files: `tests/delegation-guard.spec.ts`.
   - Commands: focused ordinary top-level and prefix-mismatch guard tests.
   - Acceptance: ordinary unregistered top-level task ids and registered-parent-prefix mismatch still fail closed.
   - [x] Status: Complete - Evidence: ordinary unregistered top-level and registered-parent-prefix mismatch regressions in `tests/delegation-guard.spec.ts`; focused final test run passed.
5. Update diagnostics or guidance for the correct contract.
   - Files: parent-owned guard or worker guidance surfaces selected after source inspection.
   - Commands: focused diagnostics tests if applicable.
   - Acceptance: failures point to valid provider parent provenance/lineage or registered parent task prefix, not blanket override text.
   - [x] Status: Complete - Evidence: `scripts/delegation-guard.mjs` fix guidance now points to `<registered-parent-task>-<stream>` and warns against nesting onto unregistered child ids.
6. Parent-owned review and handoff.
   - Files: parent lane owned manifests, workpad, PR, and review artifacts.
   - Commands: parent lane to choose focused and broader validation gates.
   - Acceptance: parent captures validation/review evidence and handles Linear/GitHub lifecycle after docs-review child-stream truth is clean.
   - [ ] Status: Pending parent implementation - Evidence: pending.

## Relevant Files
- `docs/PRD-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- `docs/TECH_SPEC-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- `docs/ACTION_PLAN-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- `tasks/specs/linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- `tasks/tasks-linear-8bd36e2e-2e54-4c8d-ae79-7b1319fc6adc.md`
- `tasks/index.json`
- `scripts/delegation-guard.mjs` (parent-owned)
- `scripts/lib/provider-run-contract.js` (parent-owned)
- `orchestrator/src/cli/providerLinearChildStreamShell.ts` (parent-owned)
- `orchestrator/src/cli/providerLinearWorkerRunner.ts` (parent-owned)
- `tests/delegation-guard.spec.ts` (parent-owned)
- `orchestrator/tests/ProviderLinearChildStreamShell.test.ts` (parent-owned)

## Notes
- PRD/TECH_SPEC/ACTION_PLAN Requirements: Complete for this docs packet.
- Intent checksum / parity matrix status: Captured in PRD, TECH_SPEC, ACTION_PLAN, and checklist.
- Approvals Needed: Parent lane review before implementation.
- Scope note: `.agent/task`, `docs/TASKS.md`, docs freshness registry updates, source files, and tests are not included because this child lane's declared file scope is limited to the packet files and `tasks/index.json`.
- Subagent usage: This is already a bounded same-issue child lane; no nested delegation was launched from this docs-only packet scope.
