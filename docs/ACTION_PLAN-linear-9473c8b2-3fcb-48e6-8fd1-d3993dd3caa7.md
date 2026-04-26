# ACTION_PLAN - CO-381 split runtime fallback routing into explicit auto and strict modes

## Summary
- Goal: create the CO-381 docs-first packet and define the parent implementation sequence for explicit `auto` and `strict` runtime fallback routing.
- Scope: docs packet, task checklist mirrors, `tasks/index.json` registration, and parent-owned implementation plan for runtime/router/provider-worker/control-host surfaces.
- Assumptions:
  - parent handoff and issue title are authoritative for this child lane
  - referenced source payload is unavailable in this child workspace because the `.runs` tree is absent
  - parent owns implementation, focused tests, Linear state, workpad, PR lifecycle, and full validation

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `CO-381`
  - `auto`
  - `strict`
  - `selected policy`
  - `policy source`
  - `original target`
  - `fallback target`
  - `blocking reason`
  - `runtime fallback routing`
- Not done if:
  - the packet treats `auto` as silent fallback
  - the packet treats `strict` as a global runtime default change
  - selected policy, policy source, original target, fallback target, or blocking reason is omitted
  - focused validation evidence does not assert policy source alongside fallback target and blocking reason
  - source/test implementation is attempted in this child lane
- Pre-implementation issue-quality review:
  - 2026-04-26: current runtime files show fallback behavior centered in `orchestrator/src/cli/runtime/provider.ts`, manifest mutation in `orchestrator/src/cli/services/orchestratorRuntimeManifestMutation.ts`, route propagation in `orchestrator/src/cli/services/orchestratorExecutionRouteState.ts`, and local summary handling in `orchestrator/src/cli/services/orchestratorLocalRouteShell.ts`.
  - 2026-04-26: micro-task path is not appropriate because correctness depends on exact protected wording and cross-surface runtime fallback parity.

## Milestones & Sequencing
1. Create PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror for CO-381.
2. Register the canonical TECH_SPEC in `tasks/index.json` with `last_review: 2026-04-26`.
3. Run scoped child-lane validation: JSON parse for `tasks/index.json` and scoped git status/diff review.
4. Parent runs docs-review before implementation and records any findings.
5. Parent implements shared runtime fallback policy normalization for `auto` and `strict`.
6. Parent wires policy truth through runtime provider, route state, manifest mutation, local summaries/status, provider-worker proof, and control-host/read-model projections.
7. Parent adds focused tests for policy parsing, auto fallback, strict fail-fast, summary/status output, provider-worker proof, and control-host projections.
8. Parent runs the validation floor appropriate to the production/source changes.
9. Parent runs standalone review and addresses actionable findings.
10. Parent runs an explicit elegance/minimality review.
11. Parent prepares PR handoff and drains review/check feedback under the parent lane lifecycle.

## Dependencies
- Linear issue `CO-381`
- Source anchor `ctx:sha256:788ef44aebc402efe831ec3c10edf00a79653a06d72a8a43cc83c841572629b6#chunk:c000001`
- Runtime selection/provider surfaces under `orchestrator/src/cli/runtime/`
- Execution routing surfaces under `orchestrator/src/cli/services/`
- Provider-worker and control-host projection surfaces
- `tasks/index.json`

## Validation
- Child-lane checks:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index.json ok')"`
  - `git status --short`
  - `git diff --name-only`
- Parent implementation checks:
  - docs-review
  - focused runtime/provider/router tests
  - focused validation evidence for `policy_source` / `fallback_policy_source` on fallback and non-fallback runtime summaries
  - focused provider-worker/control-host projection tests
  - validation floor
  - standalone review
  - elegance review
- Rollback plan:
  - revert the CO-381 packet and registry row if parent source reconciliation changes the issue shape before implementation
  - for implementation, parent should be able to restore previous compatibility by keeping `auto` equivalent to current fallback behavior and using `strict` only when explicitly selected

## Risks & Mitigations
- Risk: `strict` is implemented as a global appserver disable instead of a per-run fallback policy.
  - Mitigation: spec defines strict as denying fallback launch only when the original target is blocked.
- Risk: `auto` preserves fallback but not auditability.
  - Mitigation: selected policy, original target, fallback target, and blocking reason are required fields.
- Risk: provider-worker/control-host projections drift from manifest truth.
  - Mitigation: parent focused tests must assert policy/reason projection across those surfaces.
- Risk: cloud fallback behavior is accidentally folded into runtime fallback.
  - Mitigation: spec keeps execution-mode cloud fallback separate and only requires runtime target truth to remain unambiguous.

## Approvals
- Docs-first packet: bounded same-issue child lane, 2026-04-26
- Parent docs-review / implementation approval: pending
