# Plus-Ex 15th Anniversary Clone Loader

- Task 0801 removed the archived design-toolkit reference payload from fresh checkouts; this tracked directory now retains the loader macro and capture metadata only.
- Regenerate a reviewer-usable capture with the hi-fi design toolkit flow described in `docs/README.md`.
- Serve the regenerated capture directory printed by the run manifest with `npx serve <generated-reference-dir> -l 4173`.
- Loader macro: `reference/plus-ex-15th/scripts/loader-scroll-macro.js` toggles `document.body.dataset.toolkitScrollUnlocked` within ~1.8s and replays ScrollSmoother.
- Runtime canvas colors + resolved fonts are embedded via `window.macroContext` for downstream automation.
