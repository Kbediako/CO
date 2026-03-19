# 1193 Docs-Review Override

`docs-review` was rerun after the `1193` packet was corrected to use unique doc paths. The wrapper still failed before diff-local docs reasoning:

- pipeline: `docs-review`
- run id: `2026-03-14T14-58-44-403Z-e0f74f55`
- manifest: `.runs/1193-coordinator-symphony-aligned-orchestrator-control-plane-lifecycle-shell-extraction/cli/2026-03-14T14-58-44-403Z-e0f74f55/manifest.json`
- terminal state: `failed`
- stop reason: `Stage 'Run delegation guard' failed with exit code 1.`

This is recorded as an explicit docs-first override because the stop happened at the wrapper's own delegation guard rather than at a concrete `1193` docs defect.
