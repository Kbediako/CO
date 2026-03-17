# Findings: 1258 Skills CLI Remaining Boundary Freeze Reassessment

- After `1257`, the local `skills` pocket appears to be limited to shared parse/help gating plus a thin wrapper into `orchestrator/src/cli/skillsCliShell.ts`.
- The already-extracted `skills` shell now owns the bespoke `install` flag mapping, CLI-only `--only` guard, and JSON/text output shaping, so those contracts are no longer reasons to keep extracting the residual wrapper.
- The truthful next move is a freeze reassessment unless local inspection shows one more real mixed-ownership seam.
