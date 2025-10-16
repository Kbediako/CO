---
name: Run Manifest Review Checklist
version: 0.1.0
usage: Reviewer confirmation that `.runs/<task>/<run>/manifest.json` meets guardrails.
---

# Run Manifest Checklist — {{task_id}} / {{run_id}}

- [ ] Manifest lists correct `mode` (expected: {{expected_mode}})
- [ ] Approvals captured or explicitly `[]` when not required
- [ ] Artifacts section references diff/log files stored under `.runs/{{task_id}}/{{run_id}}/`
- [ ] Validations include command, status, and log paths
- [ ] Notes summarize outcomes and follow-up actions
- [ ] Additional reviewer observations:
  - {{observation_one}}
  - {{observation_two}}

> Store signed checklist alongside reviewer notes per SOP.
