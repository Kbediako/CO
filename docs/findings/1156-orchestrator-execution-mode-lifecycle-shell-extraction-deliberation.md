# Findings: 1156 Orchestrator Execution-Mode Lifecycle Shell Extraction

- Date: 2026-03-13
- Task: `1156-coordinator-symphony-aligned-orchestrator-execution-mode-lifecycle-shell-extraction`

## Summary

After `1155`, the next truthful Symphony-aligned seam is not another startup-shell trim. The highest-leverage remaining duplication sits one layer deeper in `orchestrator.ts`, where the local and cloud execution paths still own the same execution lifecycle shell around different mode-specific bodies.

## Evidence

- Local read-only inspection of `orchestrator/src/cli/orchestrator.ts` shows repeated lifecycle choreography across the local and cloud execution paths: control watcher pre-body sync, `in_progress` manifest transition, run-started emission, autoscout/advanced-note emission, heartbeat handling, and post-run persistence/finalization.
- `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/20260313T104000Z-closeout/14-next-slice-note.md` already identifies the next truthful seam as the shared execution lifecycle shell rather than more startup-shell shaving.
- Direct inspection of the real Symphony checkout at `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/orchestrator.ex`, `/Users/kbediako/Code/symphony/elixir/lib/symphony_elixir/agent_runner.ex`, and `/Users/kbediako/Code/symphony/SPEC.md` shows the same architectural preference: keep orchestration/lifecycle ownership separate from the worker/session execution body.

## Decision

- Proceed docs-first with `1156` as an orchestrator execution-mode lifecycle shell extraction.
- Keep runtime selection, local/cloud execution bodies, and cloud provider wiring in `orchestrator.ts`.
- Treat config-only trims and further startup-shell shaving as lower-value follow-ups than the shared execution lifecycle boundary.
