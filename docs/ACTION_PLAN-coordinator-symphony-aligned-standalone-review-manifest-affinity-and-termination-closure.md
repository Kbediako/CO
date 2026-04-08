# ACTION_PLAN - Coordinator Symphony-Aligned Standalone Review Manifest Affinity and Termination Closure

## Phase 1 - Docs and evidence

- Register `1067` across PRD / TECH_SPEC / ACTION_PLAN / findings / spec mirror / checklist mirror / `tasks/index.json` / `docs/TASKS.md` / docs freshness registry.
- Capture `1066` closeout evidence plus the current manifest-selection and bounded-termination seams as the basis for the next slice.

## Phase 2 - Bounded implementation

- Prefer active run-dir lineage over raw newest-mtime manifest fallback when standalone review is launched without an explicit manifest.
- Keep artifact placement aligned with the same resolved run lineage.
- Make bounded termination wait for child closure before surfacing failure.

## Phase 3 - Validation and closeout

- Run focused `run-review` regressions plus standard guards.
- Run `pack:smoke`.
- Record any remaining broader review/test lifecycle issues as the next slice instead of silently widening scope.
