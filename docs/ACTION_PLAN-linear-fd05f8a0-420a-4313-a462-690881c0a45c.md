# ACTION_PLAN - CO-399 fallback-expiry repo guard enforcement

## Summary
- Goal: create the CO-399 docs-first packet and registry mirrors for the `fallback-expiry:large-refactor:repo-guards` lane.
- Scope: packet files, task checklist mirrors, `tasks/index.json`, `docs/TASKS.md`, docs freshness registry rows, `scripts/spec-guard.mjs`, and focused `tests/spec-guard.spec.ts` coverage.
- Assumptions:
  - Linear issue CO-399 is the source of truth for protected wording and packet prefix.
  - CO-382 fallback-expiry policy applies because repo guards are the enforcement point for fallback and large-refactor decisions.
  - Guard implementation and focused tests land in this PR; parent retains Linear lifecycle, PR, review, and merge ownership after validation.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `fallback expiry`
  - `large refactor`
  - `minor seam`
  - `repo guards`
  - `spec-guard`
  - `docs:check`
  - `docs:freshness`
  - `diff-budget`
  - `remove fallback`
  - `expire fallback`
  - `justify retaining fallback`
  - `CO-382`
  - `CO-394`
  - `CO-395`
  - `CO-396`
  - `CO-397`
  - `CO-398`
- Not done if:
  - agents can still touch fallback/seam behavior without a recorded decision
  - `Not applicable` can pass while fallback-like paths are changed
  - expired fallback metadata does not fail
  - guard only documents policy but does not gate handoff
  - issue absorbs provider/review/runtime/docs/control-host cleanup scope from CO-394 through CO-398
  - guard implementation expands beyond repo-guard enforcement into CO-394 through CO-398 cleanup work
- Pre-implementation issue-quality review:
  - 2026-04-27: micro-task path is unavailable because correctness depends on exact protected wording, owner references, and guard enforcement semantics.
  - 2026-04-27: the packet keeps CO-399 narrower than surface-specific cleanup and broader than checklist-only documentation.
- Fallback / refactor decision:

  | Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
  | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
  | `repo guards` | Fallback/seam-touching changes with no parseable CO-382 decision | remove fallback | CO-399 parent lane | A diff touches fallback, legacy, cached, break-glass, or minor-seam patterns without a recorded decision. | 2026-04-27 | N/A after removal | N/A after removal | Guard fails until the issue packet records `remove fallback`, `expire fallback`, or `justify retaining fallback`. | Focused missing-decision and bad `Not applicable` tests. |
  | `repo guards` | Temporary fallback retained without complete expiry metadata | expire fallback | CO-399 parent lane | A retained temporary fallback lacks owner, trigger, introduced date, review date, maximum lifetime, removal condition, or validation. | 2026-04-27 | 2026-05-12 | 2026-05-26 | Guard requires complete metadata and always fails stale expiry dates; CO-399 has no implicit refresh allowance. | Focused expired-fallback and pass tests. |
  | `repo guards` | Durable fallback or audit compatibility retained indefinitely | justify retaining fallback | CO-399 parent lane | A fallback-like contract is durable and not intended to expire. | 2026-04-27 | 2026-05-26 | Non-expiring durable retention only with rationale | Guard accepts only when contract name, owning surface, steady-state proof, tests/docs, and non-expiring rationale are present. | Focused durable-retention tests. |
  | `repo guards` | CO-394 through CO-398 owner references used to route surface-specific cleanup | justify retaining fallback | CO-399 parent lane | Guard needs to recognize existing owner lanes without absorbing their implementation scope. | 2026-04-27 | 2026-05-12 | Non-expiring owner routing contract | Remove only if CO-382 policy changes the owner mapping or those issues are superseded by a new canonical owner. | Focused tests proving CO-394, CO-395, CO-396, CO-397, and CO-398 references remain valid. |

- Durable retention evidence:
  - contract name: fallback-expiry owner routing and durable guard compatibility
  - owning surface: `repo guards`
  - steady-state proof: missing/stale fallback decisions fail, complete temporary metadata passes until expiry, durable retention passes only with rationale
  - tests/docs: focused durable-retention, single-owner cleanup, and owner-reference spec-guard tests
  - non-expiring rationale: owner routing is a supported guard contract, not temporary fallback debt
- Large-refactor check: no large refactor in this CO-399 guard lane; the change stays bounded to repo guard enforcement and focused regression coverage.
  - parent keeps CO-394 through CO-398 cleanup work out of scope
  - parent must enforce a `large refactor` decision when new seams touch governed surfaces or fallback, legacy, cached, break-glass, or minor-seam patterns without one bounded fallback decision

## Milestones & Sequencing
1. Create the CO-399 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register the canonical task id in `tasks/index.json`.
3. Add a current CO-399 snapshot to `docs/TASKS.md`.
4. Add docs freshness registry rows for the six CO-399 packet/checklist surfaces.
5. Validate edited JSON, protected terms, `node scripts/spec-guard.mjs --dry-run`, `npm run docs:check`, `npm run docs:freshness`, and `node scripts/diff-budget.mjs`.
6. Report branch, worktree, changed files, validation output, and blockers without pushing or opening a PR.

## Parent-Owned Follow-On Plan
1. Parent reconciles live CO-399 issue context and current `origin/main`.
2. Parent runs docs-review before implementation.
3. Parent chooses the narrow guard integration point across `spec-guard`, `docs:check`, `docs:freshness`, and `diff-budget`.
4. Parent implements fallback/seam-touching detection for governed surfaces and fallback, legacy, cached, break-glass, or minor-seam patterns.
5. Parent requires exactly one of `remove fallback`, `expire fallback`, or `justify retaining fallback`.
6. Parent fails stale fallback expiry dates unconditionally; no implicit issue-quality refresh exception is part of CO-399.
7. Parent adds focused tests for pass, missing decision, bad `Not applicable`, expired fallback, durable retention, and CO-394 through CO-398 owner references.
8. Parent reruns focused guard tests, normal validation, review, Linear workpad, PR lifecycle, and merge gates.

## Dependencies
- Linear issue `CO-399`
- Parent issue `CO-382`
- Owner references `CO-394`, `CO-395`, `CO-396`, `CO-397`, `CO-398`
- `docs/guides/fallback-expiry-and-refactor-policy.md`
- `node scripts/spec-guard.mjs --dry-run`
- `npm run docs:check`
- `npm run docs:freshness`
- `node scripts/diff-budget.mjs`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index ok')"`
  - `node -e "JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8')); console.log('docs freshness registry ok')"`
  - `rg -n "fallback expiry|large refactor|minor seam|repo guards|spec-guard|docs:check|docs:freshness|diff-budget|remove fallback|expire fallback|justify retaining fallback|CO-382|CO-394|CO-395|CO-396|CO-397|CO-398" docs/PRD-linear-fd05f8a0-420a-4313-a462-690881c0a45c.md docs/TECH_SPEC-linear-fd05f8a0-420a-4313-a462-690881c0a45c.md docs/ACTION_PLAN-linear-fd05f8a0-420a-4313-a462-690881c0a45c.md tasks/specs/linear-fd05f8a0-420a-4313-a462-690881c0a45c.md tasks/tasks-linear-fd05f8a0-420a-4313-a462-690881c0a45c.md .agent/task/linear-fd05f8a0-420a-4313-a462-690881c0a45c.md docs/TASKS.md`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `git diff --name-only`
- Parent-owned validation commands:
  - focused guard pass/missing-decision/bad-Not-applicable/expired-fallback/durable-retention/owner-reference tests
  - normal validation floor and review loop
- Rollback plan:
  - revert the CO-399 packet, registry mirror rows, guard implementation, and focused guard tests together if validation fails

## Risks & Mitigations
- Risk: CO-399 becomes checklist-only documentation.
  - Mitigation: packet requires parent implementation to gate handoff through repo guards.
- Risk: CO-399 absorbs CO-394 through CO-398 cleanup scope.
  - Mitigation: packet treats those issues as owner references and non-goals.
- Risk: existing repo guards are weakened.
  - Mitigation: packet explicitly preserves `spec-guard`, `docs:check`, `docs:freshness`, and `diff-budget` behavior.
- Risk: stale expiry metadata becomes normalized.
  - Mitigation: packet and implementation require stale fallback expiry dates to fail unconditionally; any future issue-quality refresh exception must be shaped separately before guards honor it.

## Approvals
- Docs-first packet: CO-399 packet worker, 2026-04-27
- Parent docs-review / implementation approval: pending
