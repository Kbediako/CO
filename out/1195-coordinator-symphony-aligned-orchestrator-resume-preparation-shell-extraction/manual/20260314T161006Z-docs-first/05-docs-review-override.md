# 1195 Docs-Review Override

`docs-review` was run for the registered `1195` packet, but the wrapper failed before diff-local docs reasoning:

- pipeline: `docs-review`
- run id: `2026-03-14T16-10-34-149Z-feead61b`
- manifest: `.runs/1195-coordinator-symphony-aligned-orchestrator-resume-preparation-shell-extraction/cli/2026-03-14T16-10-34-149Z-feead61b/manifest.json`
- terminal state: `failed`
- stop reason: `Stage 'Run delegation guard' failed with exit code 1.`

This is recorded as an explicit docs-first override because the stop happened at the wrapper's own delegation guard rather than at a concrete `1195` docs defect.
