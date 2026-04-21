# Plus-Ex 15th Anniversary Clone Loader

- Tracked content: this directory retains the loader macro used by the hi-fi design toolkit. The full historical capture is not a durable checkout artifact.
- Historical local-only evidence: the original 0520 run recorded a manifest under `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json`; that path is local run evidence, not a tracked public location.
- Regenerate a fresh reference capture by adding a source entry under `design.config.yaml` -> `pipelines.hi_fi_design_toolkit.sources`, exporting `MCP_RUNNER_TASK_ID=<task-id>`, and running `npx codex-orchestrator start hi-fi-design-toolkit --format json --task <task-id>`.
- Serve regenerated output from that new run's local artifact directory, for example `cd <local-run-artifacts>/design-toolkit/reference/<slug> && python3 -m http.server 4173`.
- Loader macro: `reference/plus-ex-15th/scripts/loader-scroll-macro.js` toggles `document.body.dataset.toolkitScrollUnlocked` within ~1.8s and replays ScrollSmoother.
- Runtime canvas colors + resolved fonts are embedded via `window.macroContext` for downstream automation.
