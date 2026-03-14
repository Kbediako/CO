# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Cloud Route Fallback Contract Extraction

## Docs-first

- [x] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1183`.
- [x] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Capture local deliberation plus docs-review approval or explicit override for the cloud-route fallback contract seam.

## Implementation

- [ ] Extract one bounded cloud-route fallback contract helper from `orchestratorCloudRouteShell.ts`.
- [ ] Keep `orchestratorCloudRouteShell.ts` as the shell boundary for preflight invocation, manifest mutation, reroute dispatch, and successful cloud execution handoff.
- [ ] Add focused regression coverage for deny-mode fail-fast behavior, fallback contract shaping, and reroute payload assembly without reopening router or executor seams.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1183-coordinator-symphony-aligned-orchestrator-cloud-route-fallback-contract-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1183`.
