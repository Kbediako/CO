# Task Checklist - linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36

- Linear Issue: `CO-552` / `46ef15a6-8118-4534-9efe-31eaa9d9ab36`
- Task registry id: `20260520-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36`
- MCP Task ID: `linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36`
- Primary PRD: `docs/PRD-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`
- TECH_SPEC: `tasks/specs/linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`
- Linear workpad: `323b52d2-c518-4f34-ab07-ea0abc774311`

## Docs-First
- [x] Live issue-context read before implementation. Evidence: `linear issue-context --issue-id 46ef15a6-8118-4534-9efe-31eaa9d9ab36 --format json` reported `Ready`, no attached PR, no workpad.
- [x] Issue transitioned from `Ready` to `In Progress`. Evidence: Linear transition at `2026-05-20T01:11:27.479Z`.
- [x] Single workpad created with required section order and pre-turn decomposition matrix. Evidence: Linear workpad `323b52d2-c518-4f34-ab07-ea0abc774311`.
- [x] Exactly one `linear parallelization` decision recorded for the active turn. Evidence: `parallelize_now` / `independent_scope_available`, summary named `packet-docs` cap `0/2 -> 1/2`.
- [ ] Same-issue child lane `packet-docs` completed and parent accepted or rejected its docs-only patch.
- [ ] PRD created with protected terms, intent checksum, non-goals, Not Done If, and fallback/refactor decision.
- [x] TECH_SPEC created with control-plane invariant checker contract and validation plan. Evidence: `tasks/specs/linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`.
- [ ] TECH_SPEC mirror created. Evidence: `docs/TECH_SPEC-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`.
- [ ] ACTION_PLAN created for implementation, validation, review, and handoff sequencing. Evidence: `docs/ACTION_PLAN-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`.
- [x] Task registration updated in canonical `tasks/index.json` `items[]` shape. Evidence: `tasks/index.json`.
- [x] Docs freshness registry updated for CO-552 packet and invariant catalog rows. Evidence: `docs/docs-freshness-registry.json`.
- [ ] Pre-implementation docs-review child stream captured or governed fallback recorded.

## Acceptance Criteria
- [x] Backlog packet defines one authoritative lifecycle model for active, blocked, terminal, archived, and reopened task/spec rows. Evidence: `docs/control-plane-invariants.json` and `scripts/control-plane-invariants.mjs`.
- [x] Guard dry-run and non-dry execution share the same selector/rule engine, with tests proving dry-run skips writes only. Evidence: `guard_contracts` validation and `tests/control-plane-invariants.spec.ts`.
- [x] Fallback/refactor metadata is represented by structured data or a schema-validated parser, with fragile prose/table variants fail-closed. Evidence: `fallback_refactor_metadata` validation and focused prose-only regression.
- [x] Desired-state reconciler reports and/or repairs WIP cap, process lease, goal duplication, shared-root branch, stale worker branch, review, and Linear relation/label drift. Evidence: required desired-state domains in the invariant catalog and checker.
- [x] Codex review automation records current head SHA, approval/finding state, manual trigger attempts, and invalidates stale approvals on new heads. Evidence: `codex_review_automation` invariant and checker.
- [x] Linear issue auto-creation/reuse paths prove live labels and relations, linking to CO-509 and CO-538 rather than duplicating their scope. Evidence: `linear_hygiene` invariant requires CO-509/CO-538 linkage and live label/relation proof.
- [x] Review workflow checks original spec and coding standards, proposes code changes, and proposes changes to the creating agent loop. Evidence: `review_workflow` invariant requires `code_change_proposals[]` and `agent_loop_proposals[]`.
- [x] Status monitor displays issue, goal, process/agent, branch, review, and gate state without overlapping or duplicate goals. Evidence: `status_monitor` invariant requires separate dimensions and fail-closed one-active-goal policy.

## Implementation
- [x] Add machine-readable control-plane invariant catalog. Evidence: `docs/control-plane-invariants.json`.
- [x] Add fail-closed invariant checker. Evidence: `scripts/control-plane-invariants.mjs`.
- [x] Wire invariant checker into docs gate. Evidence: `package.json` `docs:check` runs `npm run control-plane:invariants`.
- [x] Add focused invariant checker regression coverage. Evidence: `tests/control-plane-invariants.spec.ts`.
- [ ] Accept/reject child docs patch and align docs packet with parent implementation.

## Validation
- [x] Focused invariant checker tests. Evidence: `npm run test:core -- tests/control-plane-invariants.spec.ts` passed, 4 tests.
- [ ] `node scripts/control-plane-invariants.mjs --check --task linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36`.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `npm run repo:stewardship`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] Manifest-backed standalone review with clean semantic verdict or explicit governed waiver.
- [ ] Explicit elegance/minimality pass.
- [ ] PR attached and `codex-orchestrator pr ready-review --pr <number> --quiet-minutes <window>` clean before review-state handoff.

## Progress Log
- 2026-05-20: Live issue-context read, issue moved `Ready` -> `In Progress`, branch created, workpad created, parallelization recorded, and same-issue child lane `packet-docs` launched.
- 2026-05-20: Parent added invariant catalog, fail-closed checker, docs-gate script wiring, focused tests, task spec, checklist, and task mirror.

## Notes
- Advisory `/goal` evidence is not lifecycle authority. Final closeout must re-read the current manifest at `/Users/kbediako/Code/CO/.runs/linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36/cli/2026-05-20T01-09-36-701Z-1e187a0a/manifest.json` and render a concise advisory goal evidence line only if present.
