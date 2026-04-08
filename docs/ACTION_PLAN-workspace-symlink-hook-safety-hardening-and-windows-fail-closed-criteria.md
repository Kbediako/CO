# ACTION_PLAN - Workspace/Symlink/Hook Safety Hardening + Windows Fail-Closed Criteria

## Summary
- Goal: complete and mirror-sync 0999 as the hardening slice for workspace/symlink/hook safety with scoped Windows fail-closed criteria.
- Scope: implementation closeout evidence + docs/task mirror synchronization + registry pointer refresh.
- Constraint boundary: 0996 mutating-control HOLD/NO-GO remains unchanged.

## Milestones & Sequencing (Completed 2026-03-05)
1) Open 0999 docs-first contract
- Completed: PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror were created and aligned in the docs-first stream.

2) Implement concrete in-scope hardening items
- Completed: path-under-root fail-closed checks, symlink/junction/redirect escape rejection checks, hook timeout observability checks, and Windows identifier fail-closed checks were validated in closeout simulations.

3) Execute GO/NO-GO closeout validation
- Completed: ordered implementation gate chain reached terminal succeeded status in authoritative manifest `2026-03-05T04-41-01-711Z-1543a2df`.

4) Sync mirrors and registries to implementation-complete
- Completed: `tasks/index.json`, `docs/TASKS.md`, PRD/TECH_SPEC/ACTION_PLAN/spec/checklist, and `.agent` mirror now reference authoritative closeout evidence.

5) Run post-implementation docs/parity validation
- Completed: `npm run docs:check`, `npm run docs:freshness`, and task-vs-agent parity diff rerun with logs under `out/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/manual/20260305T045624Z-mirror-sync-post-implementation/`.

## Evidence Commands
- Terminal closeout gate chain + simulations: see `out/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/manual/20260305T042953Z-terminal-closeout/00-terminal-closeout-summary.md` and associated `01` through `18` logs.
- Mirror-sync validation reruns:
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `diff -u tasks/tasks-0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria.md .agent/task/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria.md`

## Risks & Mitigations
- Risk: path canonicalization misses Windows-specific alias/normalization edge cases.
- Mitigation: retain explicit Windows fail-closed criteria with targeted identifier reject checks in 0999 evidence; keep full parity deferred.
- Risk: wording drift could imply full Windows parity completion.
- Mitigation: keep explicit scope language that 0999 validates fail-closed criteria only, with broader parity deferred to `1002`/`1003`.
- Risk: 0996 HOLD boundary drift.
- Mitigation: retain explicit carry-forward clause across PRD/spec/checklist/TASKS snapshot and avoid any HOLD -> GO claims.
