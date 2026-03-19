# 1194 Docs-Review Override

`docs-review` was run for the registered `1194` packet, but the wrapper failed before diff-local docs reasoning:

- pipeline: `docs-review`
- run id: `2026-03-14T15-37-50-726Z-384ba784`
- manifest: `.runs/1194-coordinator-symphony-aligned-orchestrator-start-preparation-shell-extraction/cli/2026-03-14T15-37-50-726Z-384ba784/manifest.json`
- terminal state: `failed`
- stop reason: `Stage 'Run delegation guard' failed with exit code 1.`

This is recorded as an explicit docs-first override because the stop happened at the wrapper's own delegation guard rather than at a concrete `1194` docs defect.
