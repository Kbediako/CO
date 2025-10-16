# Patterns Templates

These reusable skeletons help Codex agents share status updates without rewriting the same checklists each run.

| Template | Purpose | Key Fields |
| --- | --- | --- |
| `implementation-summary.md` | Builder/tester hand-off note summarizing outcomes for reviewers. | `{{task_id}}`, `{{run_id}}`, `{{mode}}`, validation placeholders. |
| `run-manifest-checklist.md` | Reviewer confirmation that manifests satisfy guardrails before closing a task. | `{{expected_mode}}`, artifact checklist, observation bullets. |

## Usage
1. Copy the template into your run notes under `.runs/<task>/<run>/`.
2. Replace placeholder tokens (`{{...}}`) with actual task details.
3. Link the filled template in the run manifest `notes.follow_up` section when escalations are required.

Refer to `patterns/index.json` for version metadata and automation ingestion.
