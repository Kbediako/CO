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

## CO-382 Fallback Decision Table

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Provider-worker `goal_evidence` patch | stale whole-manifest overwrite after reread-before-write | remove fallback | CO-514 | concurrent goal evidence patch and unrelated writer | 2026-05-12 | 2026-05-12 | this issue | field-level patch runs under shared manifest lock | focused concurrency test |
| Whole manifest persistence | command-runner/control-host snapshot writes can race outside the patch path | remove fallback | CO-514 | snapshot persistence races with provider-worker patch | 2026-05-12 | 2026-05-12 | this issue | snapshot writes use shared helper or are proven non-overlapping | focused writer test |
| Linear-first lifecycle authority | goal evidence is advisory beside canonical workflow truth | justify retaining fallback | provider-worker workflow | goal evidence exists or fails closed | existing authority contract predates CO-514 | 2026-05-12 | non-expiring authority contract | separate approved authority redesign | advisory marker tests |

- Large refactor: bounded shared manifest helper is sufficient; no broad manifest schema redesign or lifecycle authority redesign is needed.
- Minor seam: stale whole-manifest overwrite is removed for goal evidence and known racing writers; the retained Linear-first authority contract is durable governance, not temporary compatibility debt.
- Contract name: Linear-first advisory goal evidence authority boundary.
- Owning surface: CO provider-worker workflow and Linear/workpad/PR/review/check lifecycle gates.
- Steady-state proof: goal evidence can be present, absent, stale, or malformed while lifecycle authority remains with Linear/workpad/PR/review/check gates.
- Tests/docs: manifest helper tests, command-runner/provider-worker goal evidence tests, and CO-514 packet docs prove advisory markers and authority denial remain intact.
- Non-expiring rationale: the authority boundary is a supported governance contract and should be removed only by a separate approved lifecycle authority redesign.

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
