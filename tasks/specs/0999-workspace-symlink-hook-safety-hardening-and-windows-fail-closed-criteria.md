---
id: 20260305-0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria
title: Workspace/Symlink/Hook Safety Hardening + Windows Fail-Closed Criteria
relates_to: docs/PRD-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria.md
risk: high
owners:
  - Codex
last_review: 2026-03-05
---

## Summary
- Objective: implement and close the 0999 hardening contract for workspace containment, symlink/junction escape controls, and hook timeout observability.
- Scope status: implementation-complete on 2026-03-05 with terminal gate-chain and manual simulation evidence.
- Boundary: preserve 0996 mutating-control HOLD/NO-GO status unchanged.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning execution.
- Reasoning: 0998 explicitly deferred workspace/symlink/hook safety hardening to 0999, and Windows findings required bounded fail-closed semantics before portability expansion.
- Follow-through: implementation closed under authoritative manifest `.runs/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/cli/2026-03-05T04-41-01-711Z-1543a2df/manifest.json`.

## Implementation Closeout Evidence
- Authoritative manifest: `.runs/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/cli/2026-03-05T04-41-01-711Z-1543a2df/manifest.json`.
- Terminal closeout evidence root: `out/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/manual/20260305T042953Z-terminal-closeout/`.
- Mirror-sync post-implementation evidence root: `out/0999-workspace-symlink-hook-safety-hardening-and-windows-fail-closed-criteria/manual/20260305T045624Z-mirror-sync-post-implementation/`.

## Inputs and Findings Baseline
- `docs/findings/0998-openai-symphony-adoption-timing-and-slice-map.md`
- `docs/findings/0998-windows-feasibility-roadmap-consideration.md`
- `out/windows-research/20260305T034239Z-co-compat-audit/windows-compat-matrix.md`
- `out/windows-research/20260305T034239Z-co-compat-audit/windows-blockers.json`
- `out/windows-research/20260305T033814Z-roadmap/windows-adoption-roadmap.md`
- `out/windows-research/20260305T033814Z-roadmap/windows-risk-register.md`
- `tasks/specs/0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan.md`

## 0999 In-Scope Implementation Contract
1) Path-under-root fail-closed checks
- Canonicalize root and candidate path before authorization.
- Reject candidates that resolve outside root.
- Reject unresolved/ambiguous path states with deterministic fail-closed errors.

2) Symlink/junction escape fail-closed checks
- Resolve final target before side effects.
- Deny if resolved target escapes canonical root.
- Apply same deny behavior for symlink/junction/reparse-style escape variants.

3) Hook timeout/behavior hardening + observability
- Hook execution must be bounded by explicit timeout.
- Timeout and terminal behavior must be deterministic and auditable.
- Hook outcome telemetry must emit at least: status, reason, duration, and operation context.

4) Windows path semantics/criteria (explicitly bounded to 0999)
- Normalize Windows separator and case behavior before containment checks.
- Evaluate drive-letter and absolute-prefix variants against canonical root with fail-closed default.
- Treat unsupported or ambiguous Windows path forms as explicit rejection paths.
- Keep broader portability parity and CI uplift out-of-scope (deferred to `1002`/`1003`).

## 0999 Out-of-Scope Contract
- `WIN-B01` full test-lane parity closure, `WIN-B03` helper-script parity, and `WIN-B04` Windows CI lane rollout.
- Any mutating-control authority changes.
- Any 0996 HOLD -> GO policy change.

## GO / NO-GO Criteria
### GO (start implementation stream)
- 0999 requirements are explicit, testable, and fail-closed by default.
- Windows path semantics criteria are explicit and scoped.
- Validation expectations (targeted tests + manual checks + docs mirrors) are enumerated.

### GO (close 0999 implementation)
- Path/symlink/junction/hook timeout validations pass with evidence.
- No path escape succeeds in adversarial tests.
- Hook timeout outcomes are observable and deterministic.
- Docs/task mirrors and registry pointers reflect terminal evidence.

### NO-GO
- Any path or symlink/junction escape bypasses containment checks.
- Hook execution can stall indefinitely or return ambiguous timeout state.
- Windows-specific path handling is fail-open or unspecified for known edge variants.
- Any language or behavior weakens 0996 HOLD/NO-GO guardrail posture.

## Validation Results (Authoritative Closeout)
- Ordered implementation gate-chain validations passed in the terminal closeout bundle (`01` through `10` logs plus rerun evidence in `18-implementation-gate-rerun.log`).
- Manual adversarial simulations passed for symlink escape, redirect escape, non-`.runs` layout rejection, timeout observability, and Windows identifier rejects (`11` through `15` logs).
- Windows coverage in 0999 remains scoped to fail-closed criteria verification (including identifier reject checks), not a full Windows parity claim.

## 0996 HOLD Boundary Carry-Forward
- 0996 remains HOLD/NO-GO for mutating-control promotion unless explicit approval evidence is recorded in 0996 artifacts.
- 0999 hardening is non-authoritative and does not change control-promotion posture.

## Acceptance
- 0999 PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror are synchronized to implementation-complete state.
- Task/spec/docs registries are updated to authoritative implementation-gate evidence pointers.
- GO/NO-GO and validation contracts remain explicit and implementation-checkable.
- Windows fail-closed criteria are verified while broader portability parity remains deferred.
- Terminal closeout + mirror-sync evidence paths are captured under the 0999 evidence directory.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-05.
