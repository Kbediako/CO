# ACTION_PLAN: Coordinator Symphony-Aligned Orchestrator Start-Resume Control-Plane Launch Shell Extraction

- Date: 2026-03-14
- Owner: Codex (top-level agent)
- Task: `1168-coordinator-symphony-aligned-orchestrator-start-resume-control-plane-launch-shell-extraction`

## Plan

1. Register the docs-first packet for the shared `start()` / `resume()` control-plane launch shell.
2. Keep the extracted `withControlPlaneLifecycle(...)` helper as the shared launch wrapper with its optional resume-only pre-start failure hook.
3. Keep preparation logic, manifest mutation, and `performRunLifecycle(...)` ownership in place.
4. Add or retain focused regressions for start success, resume success, resume pre-start failure persistence, and cleanup ordering.
5. Run the deterministic gate bundle, bounded review, and elegance pass on the final tree.
