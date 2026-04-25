# CO-356 Apr 25 Docs Freshness Classification

## Baseline Evidence
- Observed during CO-356 validation on 2026-04-25 after the archive automation workflow fix was implemented.
- `npm run docs:freshness` reported 38 stale docs, with no missing registry rows, missing-on-disk rows, invalid entries, or uncatalogued docs.
- `node scripts/spec-guard.mjs --dry-run` printed six stale active-spec failures with `last_review=2026-03-25`.
- Non-dry-run `npm run docs:freshness:maintain -- --base origin/main --format json` reported `freshness_decision=block_diff_local`, `blocking_changed_paths=[]`, `stale_entries=38`, and six stale spec-guard rows.
- The existing configured owner `CO-343` could not be reused as a same-project owner in this lane; the branch keeps rolling policy unchanged and directly refreshes the reviewed rows instead.

## Reviewed Active Specs
- `tasks/specs/linear-4848ec97-cfab-45d9-9023-79107b496526.md`
- `tasks/specs/linear-74d145eb-305b-4b27-be84-21c248b22e4d.md`
- `tasks/specs/linear-9d962236-4c38-4b28-b144-007c6f3a1395.md`
- `tasks/specs/linear-cc7d12e3-eabf-4168-827e-b3a023583e22.md`
- `tasks/specs/linear-e147ec4f-0860-4b18-91f6-22f16eaad06d.md`
- `tasks/specs/linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5.md`

## Reviewed Docs-Freshness Rows
- `linear-4848ec97-cfab-45d9-9023-79107b496526` packet and mirror rows: PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
- `linear-74d145eb-305b-4b27-be84-21c248b22e4d` packet and mirror rows: PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
- `linear-9d962236-4c38-4b28-b144-007c6f3a1395` packet and mirror rows: PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
- `linear-cc7d12e3-eabf-4168-827e-b3a023583e22` packet and mirror rows: PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
- `linear-e147ec4f-0860-4b18-91f6-22f16eaad06d` packet and mirror rows: PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
- `linear-e1950d32-99a2-4fdc-97c6-400ecacc9cd5` packet and mirror rows: PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror.
- `1311-coordinator-symphony-full-parity-hardening-and-closure` and `1318-coordinator-symphony-current-linear-operational-parity` `.agent` mirrors.

## Disposition
- The six stale active specs remain valid active historical/operator surfaces. Refresh their frontmatter `last_review` to `2026-04-25`.
- The 38 docs-freshness rows remain valid active packet/mirror surfaces. Refresh registry `last_review` to `2026-04-25`.
- No rolling freshness window, cap, owner, or baseline-cohort policy changes are needed.

## Non-Goals Confirmed
- No archive/reclassification because the rows remain active evidence surfaces.
- No branch-protection bypass or manual required-check waiver.
- No expansion of CO-356 implementation scope beyond unblocking the required validation gate.
