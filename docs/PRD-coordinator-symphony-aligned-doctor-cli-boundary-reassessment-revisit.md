# PRD: Coordinator Symphony-Aligned Doctor CLI Boundary Reassessment Revisit

## Summary

After `1284` froze the remaining local `setup` pocket, the next truthful nearby unresolved binary-facing seam is a revisit of the local `doctor` boundary in `bin/codex-orchestrator.ts`.

## Problem

An earlier doctor freeze concluded that the remaining local `doctor` pocket was only help/parse/validation glue. Current-tree inspection shows the local pocket is still broader:

- `--usage`, `--cloud-preflight`, and `--issue-log` toggle wiring
- dependency guards for `--cloud-env-id`, `--cloud-branch`, and `--issue-*`
- `doctor --apply` plus `--format json` incompatibility guarding
- positive-integer validation for `--window-days`
- task-filter derivation and `repoRoot` injection

That means the old freeze conclusion should be revisited against the current code before the lane proceeds further.

## Goal

Reassess the local `doctor` pocket from current code and determine whether the next truthful move is a new extraction lane or an updated explicit freeze.

## Non-Goals

- changing underlying doctor, usage, cloud-preflight, or issue-log behavior
- widening into delegation/devtools/skills internals
- reopening already-frozen unrelated CLI pockets

## Success Criteria

- the current local `doctor` pocket is re-evaluated against the live tree
- the reassessment records a truthful `go` or `freeze`
- if `go`, the next narrower seam is identified concretely with bounded ownership
