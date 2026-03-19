# 1246 Deliberation

- Trigger: `1245` froze the remaining delegation-setup pocket after confirming that the leftover overlap was only a tiny private readiness-classification fragment.
- Next truthful candidate: the broader doctor command family across `handleDoctor(...)`, `doctor.ts`, `doctorUsage.ts`, and `doctorIssueLog.ts`.
- Reason to reassess rather than implement immediately: `1240` already showed that the smaller parser seam was the first truthful follow-on, so this broader family needs a fresh read on the current tree before any new extraction is claimed.
- Initial evidence:
  - `doctor.ts` still owns broad readiness aggregation and doctor summary formatting
  - `doctorUsage.ts` owns telemetry reading plus recommendation policy
  - `doctorIssueLog.ts` owns issue-log persistence and run-context resolution
  - `handleDoctor(...)` in `bin/codex-orchestrator.ts` still mediates command-entry behavior across those surfaces
- Deliberation result: proceed with a docs-first reassessment lane and only open an implementation slice if a concrete mixed-ownership seam survives current-tree inspection.
