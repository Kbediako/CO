# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Control Plane Lifecycle Shell Extraction

## Docs-first

- [ ] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1155`.
- [ ] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [ ] Capture local deliberation plus docs-review approval or explicit override for the run-entry control-plane lifecycle seam.

## Implementation

- [ ] Introduce one bounded orchestrator-level control-plane lifecycle shell adjacent to `orchestrator.ts`.
- [ ] Rewire `Orchestrator.start()` and `Orchestrator.resume()` to delegate the duplicated setup/teardown lifecycle without widening authority.
- [ ] Keep focused control-plane lifecycle regressions green without reopening `ControlServer` or Telegram-local seams.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1155-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1155`.
