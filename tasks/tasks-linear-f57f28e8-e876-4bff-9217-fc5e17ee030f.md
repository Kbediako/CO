# Task Checklist - CO-458

## Docs-First
- [x] PRD, canonical spec, action plan, task checklist, and agent mirror exist for `linear-f57f28e8-e876-4bff-9217-fc5e17ee030f`.
- [x] `tasks/index.json` and `docs/TASKS.md` register the docs-first packet inside the declared file scope.
- [x] Protected terms are visible: `actual control-host source root`, `command path`, `package root`, `git ref`, `origin/main`, `freshness relative to origin/main`, `shared checkout drift`, `supervised source-root drift`, `source-vs-dist drift`, `global binary/package provenance drift`, `provider-linear-worker-proof.json`, `provider-intake-state.json`, `co-status`, and `control-host`.

## Acceptance
- [ ] Parent implementation exposes actual control-host source root, command path, package root, git ref, and freshness relative to `origin/main` on control-host status/proof surfaces.
- [ ] Parent implementation distinguishes shared checkout drift, supervised source-root drift, source-vs-dist drift, and global binary/package provenance drift.
- [ ] Parent implementation treats `CO-113`, `CO-25`, `CO-388`, and `CO-450` as historical related lanes, not reopened scope.
- [ ] Status/proof inspection remains read-only and does not fetch, checkout, reset, rebuild, restart, relaunch, mutate Linear, or update PR/workpad state.

## Validation
- [x] Child docs lane JSON parse, protected-term scan, and `git diff --check`.
- [ ] Parent focused status/proof provenance regressions and implementation gate.
- [ ] Parent standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff.

## Notes
This docs packet intentionally does not add a `docs/TECH_SPEC-*` mirror or `docs/docs-freshness-registry.json` rows because those files were not in the declared child-lane file scope. Parent owns any additional registry/freshness mirrors required after patch import.
