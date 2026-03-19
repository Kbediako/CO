# Deliberation Findings - 1286 Doctor CLI Request Shell Extraction

- `1285` closed as a truthful `go` reassessment and confirmed the local `doctor` pocket is still broader than the older freeze note described.
- The next truthful nearby seam is the doctor request-shaping layer still inline in `handleDoctor(...)`: toggle wiring, dependent flag guards, `--apply` plus `--format json` incompatibility guarding, `--window-days` validation, task-filter derivation, and `repoRoot` injection.
- Shared parser ownership and top-level command dispatch should remain in `bin/codex-orchestrator.ts`; the lower `doctorCliShell` execution/output logic stays out of scope.
