# Review artifacts

`npm run review` is the agent-first wrapper around `codex review`. It saves the review prompt and the Codex CLI output log beside the manifest that supplied the evidence. The artifact layout mirrors the `.runs/<task>/cli/<run-id>` structure, so reviewers can grab everything they need without guessing.

## Artifact layout

- The prompt is written to `review/prompt.txt` inside the run directory that contains the manifest.
- The CLI output (stdout+stderr) streams to `review/output.log` as soon as `codex review` starts running.
- The script echoes both relative paths before invoking the CLI (e.g., `Review prompt saved to: .runs/0303-orchestrator-autonomy/cli/2025.../review/prompt.txt`), so you can paste them straight into a terminal or a PR comment.
- The run directory housing `review/` comes from `scripts/run-review.ts` via `resolveReviewArtifactsDir()`: it uses the manifest directory (`path.dirname(manifest.json)`) unless `CODEX_ORCHESTRATOR_RUN_DIR` is set, so overrides land in custom folders if needed.

## Locating the run directory from a manifest

1. Find the manifest that fed the review. The wrapper prints it (and the CLI summary does too) as something like `.runs/0101/cli/<run-id>/manifest.json`.
2. The run directory is the manifest’s parent directory. For example, if the manifest is `.runs/0101/cli/2026-01-02T03-04-05-678Z/manifest.json`, then the run directory is `.runs/0101/cli/2026-01-02T03-04-05-678Z`.
3. If your workflow sets `CODEX_ORCHESTRATOR_RUN_DIR`, that value replaces the manifest’s parent directory and the `review/` subdirectory lives under it instead.
4. Inside that run directory you will always find `review/prompt.txt` and `review/output.log` once `npm run review` reaches the CLI invocation.

## Quick commands

```bash
latest_manifest=$(find .runs -path '*/cli/*/manifest.json' -print | sort | tail -n1)
run_dir=$(dirname "$latest_manifest")
ls "$run_dir/review"
cat "$run_dir/review/prompt.txt"
tail -n 200 "$run_dir/review/output.log"
```

- If you already know the task and run-id, skip the search and work off that exact path.
- When you need to hand the prompt/output to a reviewer, zip them with `tar czf review.tgz "$run_dir/review"` or reference the relative paths printed by `npm run review`.

Keep this guide handy whenever you need to trace the concrete evidence that `codex review` consumed.
