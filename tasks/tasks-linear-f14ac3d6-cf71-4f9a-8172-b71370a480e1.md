# Task Checklist - linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1

- Linear Issue: `CO-420` / `f14ac3d6-cf71-4f9a-8172-b71370a480e1`
- MCP Task ID: `linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1`
- Primary PRD: `docs/PRD-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md`
- TECH_SPEC: `tasks/specs/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md`
- Agent mirror: `.agent/task/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1.md`
- Canonical owner key: `docs:freshness:maintain`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=docs:freshness:maintain`

## Docs-First Packet
- [x] PRD scaffolded with user-request translation, protected terms, wrong interpretations to reject, non-goals, `Not Done If`, acceptance criteria, validation plan, and current/reference/target parity matrix.
- [x] TECH_SPEC mirror scaffolded and pointed at canonical spec.
- [x] ACTION_PLAN scaffolded with child-lane scope and parent-owned follow-through.
- [x] Canonical spec scaffolded with issue-shaping contract.
- [x] `.agent/task` mirror scaffolded for future agent resume.
- [x] Protected terms carried through: `docs:freshness`, `docs:freshness:maintain`, `docs/docs-catalog.json`, `docs/docs-freshness-registry.json`, `CO-401`, `block_unowned_repo_debt`, `configured_owner_terminal`, `blocking_changed_paths=[]`, `March 28 task packet/mirror cohort`, and `docs:freshness:maintain canonical owner key`.

## Parent-Owned Follow-Through
- [x] Re-home the March 28 Task Packet / Task Mirror cohort under live `CO-420`. Evidence: `docs/docs-catalog.json`, `docs/guides/docs-freshness-cohorts.md`, `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/docs-freshness-maintenance.json`.
- [x] Update `docs/docs-catalog.json` owner metadata from terminal `CO-401` to live `CO-420` without changing freshness caps or eligible classes. Evidence: `docs/docs-catalog.json` and post-fix `docs:freshness:maintain` output.
- [x] Keep the exact March 28 task packet/mirror rows machine-visible as declared rolling debt. Evidence: `co-420-apr-28-march-28-task-packet-mirror` in `docs/docs-catalog.json` and post-fix `docs:freshness` output.
- [x] Update `docs/docs-freshness-registry.json`, `tasks/index.json`, `docs/TASKS.md`, and `docs/TASKS-archive-2026.md` for CO-420 registration and task-list reserve headroom. Evidence: parent diff.
- [x] Run parent validation and record results in the authoritative workpad. Evidence: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/`.

## Validation
- [x] Child sanity: accepted six-file `docs-packet` child lane after patch scope review and `git apply --check`. Evidence: `.runs/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1-docs-packet/cli/2026-04-28T21-22-21-862Z-b5aa551f/manifest.json`.
- [x] Baseline reproduction: `npm run docs:freshness`. Evidence: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/before/docs-freshness.json`.
- [x] Baseline reproduction: `docs:freshness:maintain -- --format json` with `block_unowned_repo_debt`, `configured_owner_terminal`, terminal `CO-401`, and `blocking_changed_paths=[]`. Evidence: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/before/docs-freshness-maintenance.json`.
- [x] Parent validation: `npm run docs:freshness`. Evidence: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/docs-freshness.log`.
- [x] Parent validation: `npm run docs:freshness:maintain -- --format json`. Evidence: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/docs-freshness-maintenance.json`.
- [x] Parent validation: `node scripts/spec-guard.mjs --dry-run`. Evidence: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/spec-guard-dry-run.log`.
- [x] Parent validation: `npm run docs:check`. Evidence: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/docs-check.log`.
- [x] Parent validation: `node scripts/delegation-guard.mjs`, `npm run build`, `npm run lint`, `npm run test`, `npm run repo:stewardship`, and `node scripts/diff-budget.mjs`. Evidence: corresponding logs under `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/`.
- [x] Standalone review: first forced bounded review found an unrelated PRD freshness bump; parent reverted it and reran review clean with `review_outcome=bounded-success`. Evidence: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/review.log`, `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/review-rerun.log`, `.runs/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/cli/2026-04-28T21-42-01-004Z-b55ff018/review/telemetry.json`.
- [x] Elegance/minimality pass recorded. Evidence: `out/linear-f14ac3d6-cf71-4f9a-8172-b71370a480e1/after/elegance-review.md`.

## Notes
- The accepted child lane only edited the six packet files; the parent lane owns catalog, registry, task-index, task-list, Linear workpad, review, and PR lifecycle.
- `CO-415` timeout/core validation repair is explicitly out of scope.
- The parent should preserve fail-closed behavior for `block_unowned_repo_debt`, `configured_owner_terminal`, and `blocking_changed_paths=[]` while proving the live CO-420 owner path.
