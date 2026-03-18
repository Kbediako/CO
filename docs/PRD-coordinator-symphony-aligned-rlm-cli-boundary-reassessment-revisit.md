# PRD: Coordinator Symphony-Aligned RLM CLI Boundary Reassessment Revisit

## Summary

After `1278`, `1279`, and `1280`, the local `rlm` pocket is worth a current-tree revisit rather than assuming the earlier freeze still reflects the real wrapper shape.

## Problem

`handleRlm(...)` in `bin/codex-orchestrator.ts` still appears to own broader wrapper-local shaping than a thin parse/help adapter:

- runtime-mode selection
- repo-config required-policy application
- goal collection from args/flags/env
- explicit collab-choice detection
- task / parent-run / approval-policy shaping
- completion-shell wiring

If that ownership is still materially broader than the extracted shells, the next truthful move is another reassessment, not an automatic freeze.

## Goal

Determine whether the current local `rlm` wrapper should freeze explicitly or whether one bounded follow-on seam still remains.

## Non-Goals

- changing deeper RLM runtime behavior
- reopening already-extracted launch or completion shells without evidence
- forcing symmetry with other frozen CLI pockets

## Success Criteria

- the current local `rlm` pocket is reinspected from today’s code
- the result explicitly says `freeze` or identifies one bounded follow-on seam
- no implementation starts unless the reassessment proves a real remaining boundary
