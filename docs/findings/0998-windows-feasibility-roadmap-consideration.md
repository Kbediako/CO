# Findings - 0998 Windows Feasibility Roadmap Consideration

- Date: 2026-03-05
- Context task: `0998-coordinator-readonly-observability-surface-hardening-and-symphony-inclusion-plan`
- Scope: integrate Windows feasibility research into roadmap planning as deferred, non-blocking follow-up.

## Conditional Verdict

CO can be used on Windows now for core CLI/runtime flows, but full native-Windows contributor parity is not yet available. Treat Windows support as conditional: acceptable for current read-only/core usage, not yet GO for parity claims across all validation and helper lanes.

## Current Blockers (Native-Windows Parity)

| Blocker | Severity | Effect | Proposed slice |
| --- | --- | --- | --- |
| `WIN-B01` default test lane has Bash/POSIX dependencies | High | `npm run test` is not reliably native-Windows clean | `1002` |
| `WIN-B02` design reference pipeline symlink path lacks Windows fallback | Medium | Symlink creation can fail on native Windows permissions | `0999` then `1002` |
| `WIN-B03` maintenance/helper scripts are Bash-only | Medium | Native cmd/PowerShell users cannot run common helper flows directly | `1002` |
| `WIN-B04` no Windows CI lane | Medium | Windows regressions can ship undetected | `1003` |

## Where, When, Why (Deferred Slices)

| Slice | Timing | Why this slice |
| --- | --- | --- |
| `0999` | Near-term hardening window (deferred, low priority) | Extend existing workspace/symlink/hook fail-closed hardening to include Windows permission/path failure behavior. |
| `1002` | After `0999` and only with reviewed Windows research inputs | Consolidate runtime portability fixes (tests, script parity, path/process handling) without changing authority model. |
| `1003` | After `1002` stabilization | Add Windows CI and packaging/runtime canaries to convert portability work into sustained confidence evidence. |

Priority posture: `P3` for `0999/1002`, `P4` for `1003`. This is explicitly deferred and non-blocking for completed `0998`.

## GO / NO-GO Criteria

- GO (start `1002`): latest Windows compatibility audit + official runtime verification are present under `out/windows-research/`, reviewed, and include actionable blocker severity/remediation.
- GO (claim broader Windows parity): `WIN-B01..WIN-B04` are closed with passing Windows-targeted validation evidence and stable CI signal.
- NO-GO: any change that widens mutating control authority or weakens existing 0996 HOLD/guardrail contracts while pursuing portability.
- NO-GO: roadmap/docs language claiming full Windows parity before Windows CI + test-lane parity evidence exists.

## Non-Blocking Status Statement

This finding does not reopen or downgrade `0998` completion. It records Windows enablement as a low-priority roadmap consideration for future slices (`0999/1002/1003`) and leaves current 0998 implementation status unchanged.

## Sources

- `out/windows-research/20260305T034239Z-co-compat-audit/windows-compat-matrix.md`
- `out/windows-research/20260305T034239Z-co-compat-audit/windows-blockers.json`
- `out/windows-research/20260305T034023Z-official-runtime-verification/official-support-summary.md`
- `out/windows-research/20260305T033814Z-roadmap/windows-adoption-roadmap.md`
- `out/windows-research/20260305T033814Z-roadmap/windows-risk-register.md`
