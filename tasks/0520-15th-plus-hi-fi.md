# Task Checklist — PlusX 15th Anniversary Hi-Fi Clone (0520-15th-plus-hi-fi)

> Export `MCP_RUNNER_TASK_ID=0520-15th-plus-hi-fi` before running orchestrator commands. Mirror updates in `.agent/task/0520-15th-plus-hi-fi.md` and `docs/TASKS.md`. Flip checkboxes only after referencing the manifest or archive that proves completion.

## Pipeline Run + Evidence
- [x] Toolkit run captured — `npx codex-orchestrator start hi-fi-design-toolkit --task 0520-15th-plus-hi-fi --format json`; Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T10-51-49-459Z-fb52f4b5/manifest.json`.
- [x] Runtime canvas/fonts propagated — `design/state.json` lists `runtimeCanvasColors`, `resolvedFonts`, and interaction script metadata for `plus-ex-15th`; Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T10-51-49-459Z-fb52f4b5/design/state.json`.

## Archive + Reference
- [x] Artifacts mirrored — `archives/hi-fi-tests/15th-plus/2025-11-14T10-51-49-459Z-fb52f4b5/` copies `design-toolkit/{context,tokens,styleguide,reference,diffs,motion}` prior to pruning `.runs/.../artifacts`.
- [x] Reference README + loader refreshed — `reference/plus-ex-15th/README.md` points to the archive + manifest, `scripts/loader-scroll-macro.js` unlocks ScrollSmoother on localhost.

## Validation + Hygiene
- [x] Local clone check — `npx serve archives/hi-fi-tests/15th-plus/2025-11-14T10-51-49-459Z-fb52f4b5/artifacts/design-toolkit/reference/plus-ex-15th -l 4173` + Playwright probe confirm `document.body.dataset.toolkitScrollUnlocked === 'true'` and `40` `[data-section]` nodes rendered with no `/assets/assets/**` requests (Playwright output `{"unlocked":"true","sectionCount":40}`).
- [x] Docs mirrored — `tasks/index.json`, `docs/TASKS.md`, `.agent/task/0520-15th-plus-hi-fi.md`, and `docs/design/notes/2025-11-13-15th-plus.md` reference the manifest + archive.
