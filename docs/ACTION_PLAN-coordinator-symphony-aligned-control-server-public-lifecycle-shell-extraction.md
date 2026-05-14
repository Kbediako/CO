# ACTION_PLAN: Coordinator Symphony-Aligned Control Server Public Lifecycle Shell Extraction

## Docs-first

- [ ] Create PRD / TECH_SPEC / ACTION_PLAN / findings / spec / checklist / .agent mirror for `1154`.
- [ ] Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [ ] Capture local deliberation plus docs-review approval or explicit override for the public lifecycle shell seam.

## Implementation

- [ ] Introduce one bounded public lifecycle shell adjacent to `controlServer.ts`.
- [ ] Rewire `controlServer.ts` to delegate public startup and shutdown orchestration without widening the public contract.
- [ ] Keep focused public lifecycle regressions green without reopening already-extracted startup or Telegram seams.

## Closeout

- [ ] Run the standard gate bundle and capture closeout artifacts under `out/1154-coordinator-symphony-aligned-control-server-public-lifecycle-shell-extraction/manual/<timestamp>-closeout/`.
- [ ] Run an explicit elegance review.
- [ ] Record the next truthful seam after `1154`.
