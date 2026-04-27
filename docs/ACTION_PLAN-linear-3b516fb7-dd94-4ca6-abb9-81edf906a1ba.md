# ACTION_PLAN - CO-397 docs freshness owned fallback expiry

## Summary
- Goal: create the CO-397 docs-first packet and registry mirrors for the `docs freshness ownership` fallback-expiry lane.
- Scope: packet files, task checklist mirrors, `tasks/index.json`, `docs/TASKS.md`, and docs freshness registry rows only.
- Assumptions:
  - parent-provided issue context is the source of truth for this packet worker
  - CO-382 fallback-expiry policy applies because docs freshness ownership is a governed high-churn surface
  - parent owns all implementation and Linear lifecycle work after the packet exists

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `docs freshness ownership`
  - `fallback expiry`
  - `large refactor`
  - `minor seam`
  - `remove fallback`
  - `expire fallback`
  - `justify retaining fallback`
  - `docs:freshness:maintain`
  - `rolling_freshness_cohorts.owner_issue`
  - `configured_owner_terminal`
  - `same-project live owner`
- Not done if:
  - the docs packet omits or renames any protected term
  - the plan permits owned rolling debt to pass without live same-project non-terminal owner verification
  - terminal, canceled, duplicate, out-of-project, or unverifiable owner metadata remains usable
  - the canonical owner key changes away from `docs:freshness:maintain`
  - the worker lane edits implementation files
- Pre-implementation issue-quality review:
  - 2026-04-27: micro-task path is unavailable because correctness depends on exact protected wording, fallback-expiry classification, and owner-source parity.
  - 2026-04-27: the packet keeps CO-397 narrower than a broad docs freshness sweep and broader than a terminal-only owner check.
- Fallback / refactor decision:
  - `expire fallback`: eligible historical rolling debt stays temporary and capped by rolling window/cap evidence.
  - `remove fallback`: configured owner strings without live same-project non-terminal verification are not usable.
  - `justify retaining fallback`: canonical `docs:freshness:maintain` owner recovery is a durable ownership contract.
- Durable retention evidence:
  - contract name: canonical `docs:freshness:maintain` owner recovery
  - owning surface: `docs freshness ownership`
  - steady-state proof expected from parent: exact canonical owner key is stable, duplicate prevention remains scoped, invalid configured owners fail closed, and catalog guidance is re-homed intentionally
- Large-refactor check:
  - no large refactor in this worker lane
  - parent may keep a minor seam only if it tightens the existing owner-verification path and does not add a new owner authority source

## Milestones & Sequencing
1. Create the CO-397 PRD, canonical TECH_SPEC, TECH_SPEC mirror, ACTION_PLAN, task checklist, and `.agent` mirror.
2. Register the canonical task id in `tasks/index.json`.
3. Add a current CO-397 snapshot to `docs/TASKS.md`.
4. Add docs freshness registry rows for the six CO-397 packet/checklist surfaces.
5. Validate edited JSON, protected terms, `docs:check`, and `docs:freshness`.
6. Report branch, worktree, changed files, validation output, and blockers without pushing or opening a PR.

## Parent-Owned Follow-On Plan
1. Parent reconciles live CO-397 issue context and the current `docs/docs-catalog.json` owner state before implementation.
2. Parent runs docs-review before implementation.
3. Parent updates `scripts/docs-freshness-maintain.mjs` so `rolling_freshness_cohorts.owner_issue` is usable only after live same-project non-terminal verification.
4. Parent handles terminal, canceled, duplicate, out-of-project, and unverifiable configured owners as fail-closed owner actions.
5. Parent reuses or creates the canonical `docs:freshness:maintain` owner and intentionally re-homes `docs/docs-catalog.json` owner guidance when configured owner verification fails.
6. Parent updates `docs/guides/docs-freshness-cohorts.md` and focused tests to describe and prove the contract.
7. Parent reruns focused docs freshness validation, normal validation, review, Linear workpad, PR lifecycle, and merge gates.

## Dependencies
- Linear issue `CO-397`
- `docs/guides/fallback-expiry-and-refactor-policy.md`
- `docs/docs-catalog.json`
- `scripts/docs-freshness-maintain.mjs`
- `npm run docs:freshness`
- `npm run docs:freshness:maintain`
- `tasks/index.json`
- `docs/TASKS.md`
- `docs/docs-freshness-registry.json`

## Validation
- Checks / tests:
  - `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index ok')"`
  - `node -e "JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8')); console.log('docs freshness registry ok')"`
  - `rg -n "docs freshness ownership|fallback expiry|large refactor|minor seam|remove fallback|expire fallback|justify retaining fallback|docs:freshness:maintain|rolling_freshness_cohorts.owner_issue|configured_owner_terminal|same-project live owner" ...`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `git diff --name-only`
- Parent-owned validation commands:
  - `npm run docs:freshness`
  - `npm run docs:freshness:maintain -- --format json`
  - focused `docs-freshness-maintain` tests
- Rollback plan:
  - revert only the CO-397 packet and registry mirror rows if packet validation fails; implementation remains untouched in this worker lane

## Risks & Mitigations
- Risk: CO-397 is interpreted as permission to hide stale docs with wider rolling caps.
  - Mitigation: packet rejects cap/window increases as substitutes for live owner verification.
- Risk: canonical owner recovery becomes another unbounded fallback.
  - Mitigation: packet classifies it as a durable ownership contract with exact owner-key scope and validation requirements.
- Risk: worker lane drifts into implementation.
  - Mitigation: ownership scope excludes scripts, tests, catalog, guide, runtime, provider, and control-host files.
- Risk: out-of-project or unverifiable owner states get flattened into terminal-only behavior.
  - Mitigation: packet names those invalid states and leaves reason-code shape as a parent implementation decision.

## Approvals
- Docs-first packet: CO-397 packet worker, 2026-04-27
- Parent docs-review / implementation approval: pending
