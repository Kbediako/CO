# Action Plan — README vs Codebase Alignment (Task 0904)

## Status Snapshot
- Current Phase: Completed (README + SOP alignment shipped).
- Run Manifest Link: `.runs/0904-readme-codebase-alignment/cli/2025-12-14T01-00-24-028Z-9a93c8df/manifest.json`
- Metrics / State Snapshots: `.runs/0904-readme-codebase-alignment/metrics.json`, `out/0904-readme-codebase-alignment/state.json`
- Approvals / Escalations: None recorded.

## Milestones & Tasks
1. Milestone: High‑impact workflow fixes
   - Tasks: align `npm run review` with current `codex review`; align CLI targeting flag (`--target-stage` vs `--target`); decide `npm run lint` pre-build behavior.
2. Milestone: Documentation correctness sweep
   - Tasks: update learning snapshot path, hi‑fi toolkit source/permit guidance, artifact path clarity, mirror staging path, metrics path, TF‑GRPO note, cloud sync clarity.
3. Milestone: Evidence & guardrails
   - Tasks: run diagnostics + guardrails (`node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`), capture manifest evidence, and flip checklist items in mirrors.

## Risks & Mitigations
- Risk: Fixing docs uncovers real workflow breakages (review runner / CLI flags).
  - Mitigation: prioritize compatibility shims or script fixes over doc-only changes when the workflow is expected to be executable.

## Next Review
- Date: Not scheduled (complete).
- Agenda: Post-merge spot check if README drift resurfaces.
