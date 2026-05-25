# Task Checklist - linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4

- Linear Issue: `CO-583` / `fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4`
- MCP Task ID: `linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4`
- Primary PRD: `docs/PRD-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md`
- Canonical TECH_SPEC: `tasks/specs/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md`
- `.agent` mirror: `.agent/task/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md`
- Canonical owner key: `control-host:machine-status-active-worker-timeout-quarantine:v1`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=control-host:machine-status-active-worker-timeout-quarantine:v1`
- Source anchor: `ctx:sha256:687a20fdf718f72e2f87044a8a517a50912c6a1325dac159ee8adfb6b6be454b#chunk:c000001`

## Docs-First
- [x] PRD drafted. Evidence: `docs/PRD-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md`.
- [x] TECH_SPEC mirror drafted. Evidence: `docs/TECH_SPEC-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md`.
- [x] Canonical task spec drafted. Evidence: `tasks/specs/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4.md`.
- [x] Registry mirrors updated. Evidence: `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [ ] Parent docs-review approval recorded. Evidence: pending parent lane.

## Issue-Shaping Contract
- User-request translation carried forward: Replace the control-host machine-status same-endpoint timeout patch with a snapshot-only status plane and treat CO-583 as the active replacement for terminal CO-574.
- Protected terms / exact artifact and surface names: control-host machine-status same-endpoint timeout, `/ui/machine-status.json`, snapshot-only status plane, source-root freshness, stale owner freshness, `provider_refresh_lifecycle_stuck`, `dispatch_source_issue_by_id`, `node::SyncProcessRunner`, `uv_spawn`, `posix_spawn`, `/healthz`, `/readyz`, CO-574, CO-572, CO-557, CO-579, CO-581, CO-569, `control-host:machine-status-active-worker-timeout-quarantine:v1`, `codex-orchestrator:canonical-owner-key=control-host:machine-status-active-worker-timeout-quarantine:v1`.
- Nearby wrong interpretations to reject: no timeout-only bump, no unconditional restart, no stale endpoint discovery framing, no new fallback status text, no extra `Promise.race`, no provider-intake cleanup, no docs-freshness owner repair, no weakening docs/spec gates.
- Explicit non-goals carried forward: do not weaken `docs:freshness`, `docs:freshness:maintain`, `docs:check`, or `spec-guard`; do not delete audit history; do not mark terminal CO-574 as live owner; do not fold this refactor into CO-557 without explicit re-review.

## Parity / Alignment Matrix
- Current truth: `/ui/machine-status.json` can still trigger live source-root freshness, stale owner freshness, provider refresh, owner resolution, Git/process, and sync filesystem work on the serving path, while supervision can restart on heavyweight same-endpoint status timeouts.
- Reference truth: Serving paths read committed snapshots only; expensive collection is external to request handling; cheap liveness and degraded readiness are separate; current source-root freshness and owner facts are monotonic across status surfaces.
- Target truth / intended delta: Snapshot-only machine-status reads, external bounded collection, liveness-only supervisor restarts, endpoint-starvation/snapshot-read-blocking diagnostics, clean shared-root authority despite dirty isolated workers, and terminal CO-574 preserved only as historical/superseded owner evidence.
- Explicitly out-of-scope differences: Docs-freshness registry integrity, rolling cohort ownership, and pre-expiry review lanes remain separate.

## Fallback / Refactor Decision Evidence
- Large-refactor decision: selected. The repair spans `/ui/machine-status.json`, `co-status`, `live_host`, supervision, source-root freshness, and owner freshness, so a coherent status-plane split is required.
- Minor-seam decision: rejected except for the explicitly expiring quarantine row below; timeout tuning, another `Promise.race`, stale endpoint copy changes, or retry-only branches are not acceptable as the durable fix.

| Surface | Fallback/seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host status plane | Active-worker timeout quarantine and same-endpoint timeout compatibility wording in `coStatusAttachCliShell` / `controlRuntime` | expire fallback | CO-583 | machine-status endpoint/probe timeout while active workers exist | 2026-05-25 | 2026-05-25 | 2026-06-24 | Snapshot-only machine-status request path, `/healthz` supervision probe, `/readyz` degraded readiness, and endpoint-starvation diagnostics replace the quarantine | Focused status-plane/supervision tests, `docs:freshness:maintain`, and live hygiene/`co-status` proof |

## Acceptance Criteria
- [x] Packet includes Non-Goals, Not Done If, acceptance criteria, and parity matrix.
- [x] Every requested surface and protected term is named in PRD, TECH_SPEC, action plan, and checklist.
- [x] `control-host:machine-status-active-worker-timeout-quarantine:v1` appears in packet and mirror metadata.
- [x] `/ui/machine-status.json` serves committed immutable snapshots without request-path freshness/provider/owner/sync work. Evidence: `orchestrator/src/cli/control/machineStatusController.ts`, `orchestrator/src/cli/control/controlRuntime.ts`, `orchestrator/tests/ControlMachineStatusContract.test.ts`, and `orchestrator/tests/ControlServerSeededRuntimeAssembly.test.ts`.
- [x] Control-token-authenticated `/healthz`, `/readyz`, supervision, `co-status`, `live_host`, UI machine-status, and owner/freshness generations agree under the incident shape. Evidence: `orchestrator/src/cli/control/controlServerPublicRouteHelpers.ts`, `orchestrator/src/cli/controlHostSupervisionCliShell.ts`, `orchestrator/tests/ControlServerPublicRouteHelpers.test.ts`, `orchestrator/tests/ControlHostSupervision.test.ts`, and `orchestrator/tests/CoStatusCliShell.test.ts`.

## Not Done If
- Protected owner key is missing from any mirror.
- Status requirements accept timeout-only masking, stale endpoint discovery, fallback text, more `Promise.race`, or restart churn.
- `/ui/machine-status.json` still computes freshness/owner/provider/Git/process work on request.
- Any serving-path module still calls sync child-process APIs such as `spawnSync`, `execFileSync`, or `execSync`.
- Stale dirty source-root facts can override newer clean shared-root truth.
- Terminal CO-574 can satisfy live ownership for this recurring canonical bug class.

## Validation
- [x] `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- [x] `git diff --check -- <declared docs files>`.
- [x] Protected-term scan over declared files. Evidence: `rg -n "control-host:machine-status-active-worker-timeout-quarantine:v1|/ui/machine-status\\.json|/healthz|/readyz|co-status|live_host|supervision|owner/freshness facts" <declared files>`.
- [x] Focused RED/review findings captured. Evidence: `.runs/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4/cli/2026-05-25T07-51-36-430Z-71bb1162/review/telemetry.json` recorded stale committed snapshot, optimistic readiness, and request-path source-root freshness refresh findings.
- [x] Focused green tests plus local incident-shape soak captured. Evidence: `npm run test -- --run orchestrator/tests/CoStatusCliShell.test.ts orchestrator/tests/ControlHostSupervision.test.ts orchestrator/tests/ControlMachineStatusContract.test.ts orchestrator/tests/ControlRequestRouteDispatch.test.ts orchestrator/tests/ControlServerPublicRouteHelpers.test.ts orchestrator/tests/ControlServerSeededRuntimeAssembly.test.ts` passed 196 tests; `npm run test` passed 367 files / 6330 tests.
- [x] Current-head Core Lane command evidence captured. Evidence: `npm run test:core` uses `vitest.config.core.ts` for the narrow core matrix (core include set, excluding adapter/evaluation lanes such as `!(adapters|evaluation)/**/*.test.{ts,tsx,js,jsx}`); rerun passed 367 files / 6337 tests with log `out/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4/manual/20260525T2250Z-timeout-rework/npm-run-test-core.log`.
- [x] Current-head review rework captured. Evidence: CodeRabbit current-head feedback on PR #890 for `/readyz` snapshot-read fail-closed behavior and stale machine-status timeout handling, plus local Codex review feedback that timeout-shaped legacy machine-status stderr must remain non-overridable by freshness artifacts; `npm run test -- --run orchestrator/tests/ControlServerPublicRouteHelpers.test.ts orchestrator/tests/ControlHostSupervision.test.ts` passed 2 files / 111 tests, `npm run build` passed, `npm run lint` passed with only the pre-existing `DelegationMcpHealth.test.ts` warnings, `npm run docs:check` passed, and rerun `npm run pack:smoke` passed after one temp-directory cleanup race.
- [x] Full guard sequence captured. Evidence: `MCP_RUNNER_TASK_ID=linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4 node scripts/delegation-guard.mjs`, `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run docs:check`, `npm run docs:freshness`, `npm run docs:freshness:maintain -- --check --format json --report out/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4/docs-freshness-maintenance-rework.json --freshness-report out/linear-fccf02b5-d6d7-488f-9dd3-1eb6f54aa4d4/docs-freshness-rework.json`, `npm run repo:stewardship`, `node scripts/diff-budget.mjs`, and `npm run pack:smoke`.
- [x] Branch-level diff-budget override recorded for review wrapper only. Reason: the same CO-583 control-plane refactor necessarily includes docs-first packet, registry rows, and regression tests, including the post-review healthz auth/fail-closed and readiness fail-closed regression coverage; splitting would separate required spec/test evidence from the status-plane behavior under review. The override is limited to this manifest-backed review lane.

## Notes
- The accepted docs child originally used a fallback anchor because the parent source payload path was absent in that child checkout. Parent corrected the packet to the prompt-provided source anchor `ctx:sha256:687a20fdf718f72e2f87044a8a517a50912c6a1325dac159ee8adfb6b6be454b#chunk:c000001` and the full protected CO-583 snapshot status-plane contract before implementation.
