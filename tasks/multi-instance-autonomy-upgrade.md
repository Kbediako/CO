# Task List: Codex Multi-Instance Autonomy Upgrade

## Readiness & Alignment
[ ] TASK-001 Secure sponsor sign-off on PRD objectives and success metrics.  
    Owner: @orchestrator-pm  
    Acceptance: Signed approval recorded in `.runs/autonomy-upgrade/cli/<run-id>/manifest.json`.  
    Manifest: _(pending)_  

[ ] TASK-002 Baseline current orchestrator MTTR, completion rates, and privacy incident counts.  
    Owner: @telemetry-lead  
    Acceptance: Metrics exported to `.runs/autonomy-upgrade/metrics/baseline.json`.  
    Manifest: _(pending)_  

## Typed MCP Control Plane
[ ] TASK-101 Publish versioned schemas to `packages/control-plane-schemas` and integrate validation middleware.  
    Owner: @control-plane  
    Acceptance: `npm run test` passes with new contract tests; validation results appended to manifests.  
    Manifest: _(pending)_  

[ ] TASK-102 Roll out shadow validation, collect drift reports, and enforce rejection for incompatible payloads.  
    Owner: @control-plane  
    Acceptance: Drift report archived in `out/autonomy-upgrade/control-plane/drift.json`; enforcement flag enabled with <1% rejection rollback.  
    Manifest: _(pending)_  

## Multi-Instance Scheduler & Fan-Out
[ ] TASK-201 Implement capability-aware queue, dispatch policies, and recovery workers.  
    Owner: @scheduler  
    Acceptance: Load test shows ≥90% utilization without breach; recovery events logged in manifests.  
    Manifest: _(pending)_  

[ ] TASK-202 Update manifest schema to include per-instance fan-out entries and recovery checkpoints.  
    Owner: @scheduler  
    Acceptance: Manifests reflect multi-instance structure; compatibility adapter documented.  
    Manifest: _(pending)_  

[ ] TASK-203 Run live canary with two production instances and demonstrate auto-reschedule success.  
    Owner: @scheduler  
    Acceptance: Canary report stored in `.runs/autonomy-upgrade/canary/<run-id>/manifest.json`.  
    Manifest: _(pending)_  

## Handle-Based Remote Exec Streaming
[ ] TASK-301 Implement handle issuance service and resumable streaming protocol.  
    Owner: @runtime  
    Acceptance: Integration test verifies resume from offset; handles recorded in `out/autonomy-upgrade/state.json`.  
    Manifest: _(pending)_  

[ ] TASK-302 Enable multi-subscriber observation with backpressure controls.  
    Owner: @runtime  
    Acceptance: Stress test retains <5% frame loss; observer join/leave recorded in manifests.  
    Manifest: _(pending)_  

## Privacy-Aware Streaming Guard
[ ] TASK-401 Deploy rule engine in shadow mode and tune detectors with security partners.  
    Owner: @privacy  
    Acceptance: Precision/recall report approved; false-positive rate <2% before enforcement; privacy policy review sign-off recorded in `.runs/autonomy-upgrade/approvals/latest.json`.  
    Manifest: _(pending)_  

[ ] TASK-402 Enforce redaction/block actions and document override workflow.  
    Owner: @privacy  
    Acceptance: Guard decisions visible in manifests; override SOP stored in `.agent/privacy.md`; enforcement blocked until policy approval evidence is referenced in rollout manifest.  
    Manifest: _(pending)_  

## Cross-Instance Metrics
[ ] TASK-501 Instrument scheduler, control plane, and runtime for per-instance metrics.  
    Owner: @telemetry-lead  
    Acceptance: Metrics file includes `instanceStats` and `privacyEvents`; `npm run eval:test` passes.  
    Manifest: _(pending)_  

[ ] TASK-502 Build dashboards and alerts for utilization, MTTR, and guard violations.  
    Owner: @telemetry-lead  
    Acceptance: Dashboard URL captured in out-state snapshot; alert thresholds documented in `/docs/TECH_SPEC_AUTONOMY_UPGRADE.md`.  
    Manifest: _(pending)_  

## Success Metrics Validation
[ ] TASK-503 Validate post-rollout completion rate ≥95% without manual intervention.  
    Owner: @telemetry-lead  
    Acceptance: Aggregated completion report stored in `.runs/autonomy-upgrade/metrics/post-rollout.json` and referenced in rollout manifest; gating checklist confirms threshold met before Phase 3.  
    Manifest: _(pending)_  

[ ] TASK-504 Confirm MTTR reduction ≥40% compared to baseline.  
    Owner: @telemetry-lead  
    Acceptance: Comparative MTTR analysis appended to `out/autonomy-upgrade/metrics/mttr-delta.json`; manifests document approval to advance rollout once delta achieved.  
    Manifest: _(pending)_  

[ ] TASK-505 Audit metrics completeness to ensure <5% missing fields in `.runs/<task-id>/metrics.json`.  
    Owner: @telemetry-lead  
    Acceptance: Schema validation report stored in `.runs/autonomy-upgrade/metrics/completeness.json`; failure blocks rollout progression until resolved.  
    Manifest: _(pending)_  

## Rollout & Verification
[ ] TASK-601 Execute phased rollout (shadow, limited, full) and record outcomes.  
    Owner: @release  
    Acceptance: Each phase logged with timestamps and results in `.runs/autonomy-upgrade/cli/<run-id>/manifest.json`.  
    Manifest: _(pending)_  

[ ] TASK-602 Conduct post-rollout review and update guardrails/checklists across `/tasks`, `docs/`, and `.agent/`.  
    Owner: @orchestrator-pm  
    Acceptance: Review summary added to `out/autonomy-upgrade/state.json`; guardrails refreshed and approved.  
    Manifest: _(pending)_  

## Outstanding Questions & Dependencies
- Confirm who owns after-hours privacy guard overrides.
- Determine retention limits for handle archives in `out/autonomy-upgrade/state.json`.
- Align with telemetry platform on ingestion window for cross-instance metrics.
