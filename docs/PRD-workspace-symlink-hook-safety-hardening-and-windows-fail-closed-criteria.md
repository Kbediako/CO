# PRD - Workspace/Symlink/Hook Safety Hardening + Windows Fail-Closed Criteria (0999)

## Summary
- Problem Statement: 0998 deferred workspace/symlink/hook safety hardening to a dedicated 0999 lane, and the Windows feasibility findings required explicit fail-closed criteria for path semantics before broader portability work.
- Desired Outcome: complete the 0999 implementation contract for workspace boundary enforcement, symlink/junction escape handling, and hook timeout behavior with deterministic observability and fail-closed outcomes.
- Scope Status: implementation-complete on 2026-03-05 for task `0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria`.

## User Request Translation
- User intent: sync the approved 0999 slice to implementation-complete status across all docs/task mirrors using authoritative closeout evidence.
- Required outcomes:
  - move 0999 mirrors from docs-first/open wording to implementation-complete,
  - capture gate-chain and manual simulation evidence (including Windows identifier reject checks),
  - keep Windows language scoped to fail-closed criteria (not full parity),
  - keep 0996 mutating-control HOLD boundary unchanged,
  - update registry pointers to the authoritative implementation-gate manifest.

## Authoritative Closeout Evidence
- Manifest: `.runs/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/cli/2026-03-05T04-41-01-711Z-1543a2df/manifest.json`
- Terminal closeout bundle: `out/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/manual/20260305T042953Z-terminal-closeout/`
- Mirror-sync post-implementation bundle: `out/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/manual/20260305T045624Z-mirror-sync-post-implementation/`

## Inputs and Evidence Baseline
- `docs/findings/0998-openai-symphony-adoption-timing-and-slice-map.md`
- `docs/findings/0998-windows-feasibility-roadmap-consideration.md`
- `tasks/specs/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan.md`
- `out/windows-research/20260305T034239Z-co-compat-audit/windows-compat-matrix.md`
- `out/windows-research/20260305T034239Z-co-compat-audit/windows-blockers.json`
- `out/windows-research/20260305T033814Z-roadmap/windows-adoption-roadmap.md`
- `out/windows-research/20260305T033814Z-roadmap/windows-risk-register.md`

## In Scope (0999 Implementation Contract)
- Path-under-root fail-closed enforcement:
  - all workspace-derived paths must resolve under configured root before read/write/exec side effects,
  - canonicalized path checks reject traversal attempts and normalized escape variants.
- Symlink/junction escape fail-closed enforcement:
  - dereferenced targets that escape root are rejected deterministically,
  - escape checks must treat symlink/junction/reparse-like hops as unsafe unless resolved target remains under root.
- Hook timeout/behavior hardening + observability:
  - hook execution has explicit timeout ceiling and deterministic timeout result,
  - timeout/failure/skip/success outcomes are emitted in auditable status/trace fields,
  - hook hangs must not block indefinitely.
- Windows path semantics and fail-closed criteria (0999-scoped):
  - normalize separator/case behavior before root checks,
  - apply explicit fail-closed behavior for Windows-specific edge cases (drive-letter variance, UNC/device-like absolute prefixes, junction-like escape behavior),
  - keep broader Windows parity work deferred to later slices.

## Out of Scope
- Broad native-Windows contributor parity closure (`WIN-B01..WIN-B04`) and CI expansion (`1002`/`1003`).
- Runtime authority expansion or mutating control promotion.
- Any HOLD -> GO policy change for 0996 mutating controls.

## 0996 Boundary Carry-Forward (Unchanged)
- 0996 remains the only lane for mutating-control promotion readiness and explicit HOLD -> GO decisions.
- 0999 hardening does not alter mutating-control authority boundaries.
- No language in 0999 may imply 0996 HOLD removal.

## GO / NO-GO Criteria (0999)
- GO to implement 0999 runtime hardening:
  - canonical path-under-root and symlink/junction escape requirements are defined and testable,
  - hook timeout and observability requirements are defined with deterministic outcomes,
  - Windows-specific fail-closed semantics are explicit and bounded to 0999 scope.
- GO to close 0999 implementation:
  - targeted tests and manual adversarial checks prove fail-closed behavior,
  - docs/task mirrors and registries reflect terminal evidence pointers,
  - no 0996 boundary regression is introduced.
- NO-GO:
  - any path resolution flow permits root escape,
  - hook execution can hang without bounded timeout outcome,
  - Windows path/junction semantics are ambiguous or fail-open,
  - any change weakens 0996 HOLD posture or mutating-control guardrails.

## Validation Expectations (Satisfied in Closeout)
- Targeted/manual validations captured in terminal closeout bundle:
  - root containment and escape-path checks,
  - symlink/junction and redirect escape denial checks,
  - hook timeout deterministic observability checks,
  - Windows identifier fail-closed reject checks.
- Docs/regression checks rerun in mirror-sync stream:
  - `npm run docs:check`
  - `npm run docs:freshness`
  - checklist mirror parity log (`tasks/` vs `.agent/task/`).

## Acceptance Criteria
1. 0999 PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are synchronized to implementation-complete state.
2. In-scope implementation contract explicitly includes path-under-root, symlink/junction escape fail-closed checks, hook timeout hardening, and observability outputs.
3. Windows path semantics/fail-closed criteria are explicit and bounded; broader parity remains deferred.
4. 0996 HOLD boundary is explicitly unchanged across 0999 artifacts.
5. `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` are updated to the authoritative implementation-gate manifest.
6. Evidence is captured under `out/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/manual/20260305T042953Z-terminal-closeout/` and `out/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/manual/20260305T045624Z-mirror-sync-post-implementation/`.
