# Task List — PlusX 15th Anniversary Hi-Fi Clone (0520-15th-plus-hi-fi)

## Context
- Source URL: https://15th.plus-ex.com/
- Goal: Re-run the hi-fi toolkit with runtime canvas/font propagation, archive the outputs, and validate the localhost clone + ScrollSmoother unlock macro.
- Checklist mirrors: `tasks/0520-15th-plus-hi-fi.md`, `docs/TASKS.md` (0520 snapshot).

### Checklist Convention
- Export `MCP_RUNNER_TASK_ID=0520-15th-plus-hi-fi` before invoking `codex-orchestrator` commands.
- Cite `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json` and `archives/hi-fi-tests/15th-plus/2025-11-14T11-11-13-442Z-6897b063/` whenever updating run status.

## Execution Milestones
1. **Toolkit run completed**
   - Command: `npx codex-orchestrator start hi-fi-design-toolkit --task 0520-15th-plus-hi-fi --format json`.
   - Evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T11-11-13-442Z-6897b063/manifest.json` (extract → tokens → reference → spec-guard → artifact writer).
   - [x] Status
2. **Archive + reference refresh**
   - Tasks: Copy `.runs/0520-15th-plus-hi-fi/2025-11-14T11-11-13-442Z-6897b063/artifacts/design-toolkit/**` into `archives/hi-fi-tests/15th-plus/2025-11-14T11-11-13-442Z-6897b063/`, prune `.runs/.../artifacts`, and update `reference/plus-ex-15th/README.md` + loader macro.
   - [x] Status
3. **Local validation**
   - Procedure: `npx serve ... -l 4173` + Playwright probe verifying `[data-section]` presence and `document.body.dataset.toolkitScrollUnlocked === 'true'`; grep ensures no `/assets/assets/**` paths remain.
   - [x] Status (Playwright output: `{"unlocked":"true","sectionCount":40}`)
4. **Documentation mirrors**
   - Scope: `tasks/index.json`, `docs/TASKS.md`, `tasks/0520-15th-plus-hi-fi.md`, `.agent/task/0520-15th-plus-hi-fi.md`, `docs/design/notes/2025-11-13-15th-plus.md` record manifest + archive pointers.
   - [x] Status

## Notes
- Interaction macro lives at `reference/plus-ex-15th/scripts/loader-scroll-macro.js` and reads `window.macroContext` (slug, URL, runtime fonts/canvas colors) injected by `reference.ts`.
- Compliance permit `plus-ex-15th-2025-11-14` authorizes live asset mirroring + ScrollSmoother unlocking for localhost-only validation.
