# Task Checklist - linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf

- Linear Issue: `CO-514` / `2be8cd2c-f0c8-4e90-8588-fb70dc387faf`
- Task registry id: `20260512-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf`
- MCP Task ID: `linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf`
- Primary PRD: `docs/PRD-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- TECH_SPEC: `tasks/specs/linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-2be8cd2c-f0c8-4e90-8588-fb70dc387faf.md`

## Active Scope
- Serialize provider-worker `goal_evidence` manifest patches with command-runner and control-host manifest persistence.
- Preserve `advisory_only` goal evidence and the Linear-first lifecycle authority boundary.
- Avoid broad manifest schema redesign.

## Acceptance Criteria
- [ ] Manifest `goal_evidence` patching uses a shared lock, compare/retry, or equivalent field-level merge contract.
- [ ] Command-runner/control-host/provider-worker manifest writers that can race with `goal_evidence` patches participate in the same contract or are proven non-overlapping.
- [ ] Focused tests cover concurrent unrelated manifest updates surviving `goal_evidence` patching.
- [ ] Advisory-only `goal_evidence` validation and authority denial markers remain unchanged.

## Validation
- [ ] Targeted manifest helper/provider-worker concurrency tests.
- [ ] `node scripts/delegation-guard.mjs`.
- [ ] `node scripts/spec-guard.mjs --dry-run`.
- [ ] `npm run build`.
- [ ] `npm run lint`.
- [ ] `npm run test`.
- [ ] `npm run docs:check`.
- [ ] `npm run docs:freshness`.
- [ ] `npm run repo:stewardship`.
- [ ] `node scripts/diff-budget.mjs`.
- [ ] Manifest-backed standalone review and explicit elegance pass.

## Notes
- Child-lane attempts for docs support were invalidated after runtime/tooling stalls before patch output; parent owns the docs packet and implementation.
- Do not use `goal_evidence` for Linear transitions, workpad replacement, PR attachment, review handoff, ready-review success, merge closeout, hook recovery success, long-poll terminal status, hook/resume control integration, or TUI automation.

