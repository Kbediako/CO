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
- [x] Same-issue child lane `packet-docs` completed and parent accepted its docs-only patch. Evidence: run `2026-05-20T01-12-50-179Z-fa527bc6`.
- [x] PRD created with protected terms, intent checksum, non-goals, Not Done If, and fallback/refactor decision. Evidence: `docs/PRD-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`.
- [x] TECH_SPEC created with control-plane invariant checker contract and validation plan. Evidence: `tasks/specs/linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`.
- [x] TECH_SPEC mirror created. Evidence: `docs/TECH_SPEC-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`.
- [x] ACTION_PLAN created for implementation, validation, review, and handoff sequencing. Evidence: `docs/ACTION_PLAN-linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36.md`.
- [x] Task registration updated in canonical `tasks/index.json` `items[]` shape. Evidence: `tasks/index.json`.
- [x] Docs freshness registry updated for CO-552 packet and invariant catalog rows. Evidence: `docs/docs-freshness-registry.json`.
- [ ] Pre-implementation docs-review child stream captured or governed fallback recorded.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Large-refactor decision: prefer a governed control-plane refactor over another minor seam because authority is split across live Linear/GitHub state, cached provider-intake state, review telemetry, docs/spec lifecycle metadata, goals, branches, processes, and status projections.
- Minor-seam decision: individual child workstreams may remove or expire narrow seams only when they preserve the authoritative source-of-truth contract and include focused validation.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-plane invariant truth | Recurring operational drift invariants were inferable from issue prose and scattered local tests instead of one schema-checked catalog | remove fallback | CO-552 | CO-543 and GPT Pro advisory showed repeated drift across lifecycle, guards, reviews, leases, goals, branches, and Linear hygiene | 2026-05-17 | 2026-05-20 | This issue | `npm run docs:check` validates `docs/control-plane-invariants.json` and linked packet/registry rows | `npm run test:core -- tests/control-plane-invariants.spec.ts` and `node scripts/control-plane-invariants.mjs --check --task linear-46ef15a6-8118-4534-9efe-31eaa9d9ab36` |
| Task/spec lifecycle | Terminal, archived, or done rows still counted as active freshness/fallback/provider-worker blockers | remove fallback | CO-552 | Active gates see terminal or archived rows as live obligations without explicit reopen evidence | 2026-05-17 | 2026-05-20 | 0 days after implementation | One canonical lifecycle model drives freshness, fallback expiry, and provider-worker blocking | lifecycle classifier tests plus `docs:freshness`, `docs:freshness:maintain`, and `spec-guard` |
| Guard execution | Dry-run/non-dry selector or rule divergence | remove fallback | CO-552 | Dry-run skips validation semantics instead of writes only | 2026-05-17 | 2026-05-20 | 0 days after implementation | Shared selector/rule engine used by both execution modes | parity tests proving dry-run skips writes only |
| Fallback/refactor evidence | Guard-critical truth inferred from prose or fragile Markdown variants | remove fallback | CO-552 | Fallback metadata is incomplete, unparseable, or silently accepted | 2026-05-17 | 2026-05-20 | 0 days after implementation | Structured data or schema-validated parser fails closed | parser/schema tests plus docs packet fixtures |
| Review state | Cached or previous-head review approval treated as current | remove fallback | CO-552 | PR head SHA changes or review verdict is `unknown`/missing | 2026-05-17 | 2026-05-20 | 0 days after implementation | Current-head SHA-bound review state is required for clean handoff | review state tests and ready-review proof |
| Desired-state reconciliation | Stale provider-intake, retry/resume, process, branch, goal, or status cache outranks live authority | remove fallback | CO-552 | Cached claim or process state disagrees with live Linear/GitHub/control-host truth | 2026-05-17 | 2026-05-20 | 0 days after implementation | Reconciler reports or repairs drift and live terminal truth dominates cache | reconciler tests plus status monitor proof |
| Linear hygiene | Snapshot-only labels/relations treated as creation success | remove fallback | CO-552 with CO-509/CO-538 | Auto-created/reused issue lacks required labels or relations on live readback | 2026-05-17 | 2026-05-20 | 0 days after implementation | Live label/relation verification and reconciler failures are surfaced | Linear hygiene tests or dry-run/live-read evidence |

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
