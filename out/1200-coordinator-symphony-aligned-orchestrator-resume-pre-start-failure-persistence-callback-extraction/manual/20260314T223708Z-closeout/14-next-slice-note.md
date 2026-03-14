# 1200 Next Slice Note

- After `1200`, the nearby `orchestrator.ts` surface is mostly thin forwarding glue.
- The next truthful move is a bounded reassessment of the remaining private wrappers around `executePipeline(...)`, `runAutoScout(...)`, and especially the `performRunLifecycle(...)` service-binding wrapper.
- Do not force another extraction until that reassessment confirms a real seam; the likely candidate is the `performRunLifecycle(...)` binding shell, not `runAutoScout(...)` or `executePipeline(...)`.
