# TECH_SPEC - Workspace/Symlink/Hook Safety Hardening + Windows Fail-Closed Criteria

- Canonical TECH_SPEC: `tasks/specs/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-05.

## Summary
- Scope: implementation-complete hardening lane for workspace boundary safety deferred by 0998.
- Core contract: enforce path-under-root and symlink/junction-escape fail-closed behavior, bound hook execution with deterministic timeout outcomes, and emit auditable hook/path observability.
- Windows posture: fail-closed criteria are validated in scoped 0999 coverage; broader portability parity remains deferred.
- Hard boundary: 0996 mutating-control HOLD/NO-GO remains unchanged.

## Authoritative Evidence
- Implementation-gate manifest: `.runs/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/cli/2026-03-05T04-41-01-711Z-1543a2df/manifest.json`.
- Terminal closeout bundle: `out/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/manual/20260305T042953Z-terminal-closeout/`.
- Mirror-sync post-implementation bundle: `out/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/manual/20260305T045624Z-mirror-sync-post-implementation/`.

## Requirements
- Path containment:
  - every candidate workspace path is canonicalized before authorization,
  - normalized candidate path must remain under canonical root or be rejected with deterministic error metadata.
- Symlink/junction escape controls:
  - resolve final target before operation; reject if resolved target escapes root,
  - treat Windows junction/reparse-style path escapes as fail-closed unless explicitly proven in-root.
- Hook execution controls:
  - hook execution is timeout bounded with deterministic terminal outcome (`success`/`timeout`/`failed`/`skipped`),
  - timeout path cannot leave long-running orphan behavior that blocks control surfaces,
  - observable metadata includes timeout duration, reason, and operation context.
- Windows fail-closed semantics (0999 scope only):
  - normalize case/separators before root/symlink checks,
  - reject ambiguous Windows absolute path forms that cannot be safely rooted in current workspace policy,
  - ensure path validation behavior is deterministic across equivalent Windows path variants.
- Guardrail contract:
  - no authority expansion,
  - no 0996 HOLD boundary changes,
  - no portability-claim inflation beyond 0999 scope.

## Acceptance
- Canonical spec defines concrete fail-closed contracts for path-under-root, symlink/junction escape, hook timeout, and observability.
- GO/NO-GO conditions remain explicit and testable.
- 0996 HOLD carry-forward remains explicit in all 0999 artifacts.
- Registry mirrors (`tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`) point to authoritative implementation-closeout evidence.
- Validation evidence includes terminal gate chain + manual simulations (including Windows identifier rejects) plus post-implementation docs/parity reruns.
