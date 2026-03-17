# PRD: Coordinator Symphony-Aligned Doctor CLI Request Shell Extraction

## Summary

After `1285` revalidated the live `doctor` boundary, the next truthful nearby extraction is the remaining binary-facing doctor request-shaping seam still owned by `handleDoctor(...)`.

## Problem

`handleDoctor(...)` still owns a bounded local shell above `orchestrator/src/cli/doctorCliShell.ts`:

- output-format selection
- `--usage`, `--cloud-preflight`, and `--issue-log` toggle wiring
- dependent flag guards for `--cloud-env-id`, `--cloud-branch`, and `--issue-*`
- `doctor --apply` plus `--format json` incompatibility guarding
- positive-integer validation for `--window-days`
- task-filter derivation and `repoRoot` injection

That wrapper logic is still inline in the binary rather than behind a dedicated doctor request-shell helper.

## Goal

Extract the bounded doctor request-shaping shell into `orchestrator/src/cli/` while keeping shared parser ownership and top-level command dispatch local in the binary.

## Non-Goals

- changing underlying doctor, usage, cloud-preflight, issue-log, or apply behavior
- widening into delegation/devtools/skills internals
- reworking shared parser helpers or unrelated CLI families

## Success Criteria

- `handleDoctor(...)` becomes a thin parse wrapper
- local doctor request shaping and validation move into a dedicated helper
- focused parity proves the command surface is unchanged
