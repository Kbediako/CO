---
id: 20260327-linear-488135bf-954e-4bd9-be7a-ad09d75f5f29
title: CO Add Audited Provider-Worker Child-Stream Support for Bounded Multi-Agent Work
owners: [Codex]
last_review: 2026-04-27
---
## Requirements
1. Launch only from an active `provider-linear-worker` parent run with matching provider control-host provenance.
2. Keep the allowlist bounded to review/planning pipelines and preserve `<provider-task>-<stream>` plus `parent_run_id` continuity.
3. Surface truthful child-stream lineage in provider proof artifacts.
4. Preserve the single-stream path when child streams are unused.
- Validate with focused launcher/provenance/discovery regressions plus the required repo floor.
