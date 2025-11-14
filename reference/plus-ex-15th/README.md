# Plus-Ex 15th Anniversary Clone Loader

- Latest archive: `archives/hi-fi-tests/15th-plus/2025-11-14T10-59-24-271Z-88c94f4f/artifacts/design-toolkit/reference/plus-ex-15th`
- Manifest evidence: `.runs/0520-15th-plus-hi-fi/cli/2025-11-14T10-59-24-271Z-88c94f4f/manifest.json`
- Serve locally: `npx serve archives/hi-fi-tests/15th-plus/2025-11-14T10-59-24-271Z-88c94f4f/artifacts/design-toolkit/reference/plus-ex-15th -l 4173`
- Loader macro: `reference/plus-ex-15th/scripts/loader-scroll-macro.js` toggles `document.body.dataset.toolkitScrollUnlocked` within ~1.8s and replays ScrollSmoother.
- Runtime canvas colors + resolved fonts are embedded via `window.macroContext` for downstream automation.
