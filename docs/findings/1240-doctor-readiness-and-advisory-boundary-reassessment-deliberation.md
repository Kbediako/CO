# 1240 Deliberation: Doctor Readiness And Advisory Boundary Reassessment

- Risk stays below the full-deliberation threshold because the lane is a docs-first reassessment, not a live doctor behavior change.
- The strongest reason to open this lane now is that the broader doctor command family is still materially mixed once the RLM runner family freezes: `handleDoctor(...)`, `doctor.ts`, `doctorUsage.ts`, and `doctorIssueLog.ts` compose distinct readiness, telemetry, recommendation, and persistence concerns behind one command surface.
- The likely mixed boundary is not just the utilities; it is the broader command-level ownership across readiness aggregation, usage-policy output, issue-log persistence, and CLI entry orchestration over the existing helper families.
- The key risk is inventing another helper around already-extracted readiness sources instead of finding a real remaining ownership boundary inside the broader doctor family.
