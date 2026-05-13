# Task Checklist - CO: decide admission posture for unreadable foreign provider manifests

## Traceability
- Linear issue: `CO-149` / `4dd7c20a-3eec-406f-addc-e89948f044f7`
- Linear URL: https://linear.app/asabeko/issue/CO-149/co-decide-admission-posture-for-unreadable-foreign-provider-manifests
- Task/spec packet:
  - `docs/PRD-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`
  - `docs/TECH_SPEC-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`
  - `docs/ACTION_PLAN-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`
  - `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`
  - `.agent/task/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`

## Checklist
- [x] Docs-first packet created and registered for `CO-149`. Proof: `docs/PRD-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `docs/TECH_SPEC-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `docs/ACTION_PLAN-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Workspace moved onto an issue branch and the required single-turn parallelization decision was recorded before implementation. Proof: branch `linear/co-149-unreadable-foreign-provider-manifests`; `linear parallelization --issue-id 4dd7c20a-3eec-406f-addc-e89948f044f7 --decision stay_serial --reason single_bounded_change ...`.
- [x] Initial single workpad source created for the issue. Proof: `out/linear-4dd7c20a-3eec-406f-addc-e89948f044f7/manual/workpad.md`.
- [x] Audited `docs-review` child stream completed or produced a truthful fallback before implementation. Proof: `.runs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7-co-149-docs-review/cli/2026-04-11T12-44-14-281Z-e269d6a8/manifest.json`, `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`.
- [x] Admission posture for unreadable foreign provider manifests is explicitly documented and linked from the task/spec packet. Proof: `docs/PRD-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `docs/TECH_SPEC-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `docs/ACTION_PLAN-linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`, `tasks/specs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7.md`.
- [x] Shared admission gating conservatively counts unreadable live foreign occupancy or an equivalent safe mechanism. Proof: `orchestrator/src/cli/control/providerIssueHandoff.ts`, `orchestrator/src/cli/providerLinearWorkerRunner.ts`, `orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Regression coverage proves a live unreadable foreign manifest cannot let webhook/retry/resume over-admit beyond cap. Proof: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Regression coverage proves unrelated stale corrupt historical manifests do not wedge all new admissions host-wide. Proof: `orchestrator/tests/ProviderIssueHandoff.test.ts`, `npx vitest run orchestrator/tests/ProviderIssueHandoff.test.ts`.
- [x] Standalone review and elegance review completed before review handoff. Proof: attempted `FORCE_CODEX_REVIEW=1 npm run review -- --manifest .runs/linear-4dd7c20a-3eec-406f-addc-e89948f044f7/cli/2026-04-11T11-38-35-453Z-bf352bf9/manifest.json`; wrapper stalled without `review/telemetry.json`, then manual review fallback plus explicit elegance pass were recorded in `out/linear-4dd7c20a-3eec-406f-addc-e89948f044f7/manual/workpad.md`.
- [x] Final validation floor completed for the non-trivial diff. Proof: `node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, `npm run pack:smoke`.

## Notes
- This follow-up stays explicitly related to `CO-125` and rejects widening into generic status-truth or stale-history cleanup work.
- The corrected implementation seam is admission occupancy accounting in `providerIssueHandoff.ts`, where unreadable-manifest proof evidence can influence shared admission without changing general discovered-run ownership flows.
- `npm run test` initially surfaced a discovery-cache regression in `ProviderIssueHandoffAdmissionCache.test.ts`; the fix consolidated readable-run discovery and unreadable-manifest occupancy into one cached snapshot before the full validation floor was rerun clean.
