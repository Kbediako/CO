---
id: 20260414-linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809
title: CO: prevent provider refresh restart loop from breaking co-status attach
relates_to: docs/PRD-linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md
risk: high
owners:
  - Codex
last_review: 2026-04-14
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`
- PRD: `docs/PRD-linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`
- Task checklist: `tasks/tasks-linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809.md`

## Traceability
- Linear issue: `CO-179` / `ea7ddb9e-78a7-4e85-aaa2-f890046d4809`
- Linear URL: https://linear.app/asabeko/issue/CO-179/co-prevent-provider-refresh-restart-loop-from-breaking-co-status
- Source anchor: `ctx:sha256:bb067b2ac2073f849536e231da6e646a1aa470e8438514c13efbf87f6318b36b#chunk:c000001`

## Summary
- Objective: keep `co-status attach` connected to the current local control-host after endpoint/auth sidecar rotation and keep provider refresh stuck recovery bounded.
- Scope:
  - docs-first registration for `CO-179`
  - reloadable `control_endpoint.json` / `control_auth.json` attach target semantics
  - classified attach fetch failures and current-endpoint recovery
  - bounded `restart_required` / `probe_timeout` supervision behavior
  - focused regression coverage for endpoint rotation and provider-worker preservation
- Constraints:
  - do not redesign `CO STATUS`
  - do not redesign provider scheduling
  - do not kill active provider workers
  - keep child-lane output docs-only

## Issue-Shaping Contract
- User-request translation carried forward: attach must survive `control_endpoint.json` endpoint rotation after control-host restart, and provider refresh stuck recovery must avoid repeated request burn while preserving active provider issue workers.
- Protected terms / exact artifact and surface names: `co-status attach`, `control_endpoint.json`, `control_auth.json`, `/ui/data.json`, `provider_refresh_lifecycle_stuck`, `restart_required`, `probe_timeout`, `provider-linear-worker`, `control-host supervise`.
- Nearby wrong interpretations to reject: dashboard redesign, timeout-only masking, provider scheduling rewrite, generic request-budget tuning, or killing detached worker processes during recovery.
- Explicit non-goals carried forward: no Linear mutation from this child lane, no mutating attach client, no remote attach support, and no provider workflow policy changes.

## Parity / Alignment Matrix
- Current truth:
  - attach resolves one endpoint/auth pair and uses it for the live fetch loop
  - fetch failures are not fully classified for stale port, timeout, raw network, and auth rotation cases
  - supervision can see `restart_required` / `probe_timeout`, but attach may remain stranded on the pre-restart endpoint
- Reference truth:
  - persisted endpoint/auth artifacts are the current local host locator
  - restart-required recovery must be bounded and worker-safe
  - request-burn suppression after `provider_refresh_lifecycle_stuck` remains authoritative
- Target truth / intended delta:
  - attach treats selected fetch/probe failures as a reason to reload artifacts, not as proof that the viewer is permanently broken
  - attach switches to the current endpoint when sidecars rotate and the new endpoint is healthy
  - attach classifies dead-port, raw network, auth failure, timeout, non-OK response, and invalid dataset states
  - supervision behavior for `restart_required` / `probe_timeout` remains thresholded and preserves active provider workers
- Explicitly out-of-scope differences:
  - dashboard rendering redesign
  - provider admission/scheduling changes
  - broad launchd replacement
  - remote multi-host attach

## Readiness Gate
- Not done if:
  - attach still pins to a stale endpoint after the artifact rotates
  - dead-port/current-recovery/raw-network/auth/timeout classifications are missing from focused tests
  - `probe_timeout` / `restart_required` supervision can loop without bounded threshold/backoff behavior
  - recovery kills or signals active `provider-linear-worker` issue processes
  - implementation widens into CO STATUS or provider scheduling redesign
- Pre-implementation issue-quality review evidence:
  - 2026-04-14: child lane self-review confirms the issue is broader than a one-line fetch retry because correctness depends on exact artifact names, endpoint rotation, failure taxonomy, supervision behavior, and provider-worker preservation. Micro-task path is ineligible.
- Safeguard ownership split:
  - child lane owns docs packet only
  - parent lane owns implementation, Linear state, workpad, PR lifecycle, docs-review, and validation

## Technical Requirements
- Functional requirements:
  - represent the attach target as a reloadable artifact-backed locator that retains `manifestPath`, `runDir`, task/run ids, current `baseUrl`, current token, and sidecar paths
  - classify fetch failures at the attach boundary before they reach the dashboard renderer
  - reload `control_endpoint.json` and `control_auth.json` after recoverable endpoint/auth/probe failures
  - recover when a stale/dead prior endpoint is replaced by a healthy current endpoint in the same run dir
  - classify raw network errors with safe code/name/message detail where available, without leaking tokens
  - classify 401/403 as auth failure and recover when the auth sidecar rotates to a valid token
  - classify request timeout separately from user cancellation
  - preserve non-OK HTTP and invalid dataset classifications
  - keep retry/reload work bounded by the configured attach refresh interval and a small per-cycle reload budget
  - keep supervision health behavior for `restart_required` and `probe_timeout` finite, thresholded, and observable
  - preserve active provider workers during control-host restart or cleanup
- Non-functional requirements:
  - no unbounded tight loop on dead ports, timeouts, or auth failures
  - no new Linear or Telegram polling from the attach viewer
  - no auth token values in error output, JSON output, or logs
  - backward-compatible attach CLI behavior except for additive recovery/classification output
  - tests must prove both failure classification and successful current-endpoint recovery
- Interfaces / contracts:
  - `orchestrator/src/cli/coStatusAttachCliShell.ts`
  - `orchestrator/src/cli/delegationServer.ts` (`loadControlEndpoint(...)`)
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/src/cli/control/controlHostSupervision.ts`
  - `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`

## Architecture & Data
- Architecture / design adjustments:
  - introduce a narrow attach target/session helper that can reload endpoint/auth artifacts without restarting the viewer
  - keep dashboard rendering as the consumer of datasets and classified errors; do not move endpoint resolution into renderer code
  - add one fetch classification layer around `/ui/data.json` reads
  - wire reload-on-failure so endpoint changes are detected before the next rendered error when possible
  - keep supervision and provider refresh recovery on their existing health/restart seams; only add tests or narrow guard fixes if implementation proves a bounded gap
- Data model changes / migrations:
  - no persistent schema migration expected
  - optional additive attach metadata may include last endpoint, last classification, and recovered endpoint timestamp for tests or non-interactive JSON output
  - supervision state remains the source of restart/probe threshold evidence
- External dependencies / integrations:
  - local filesystem sidecars `control_endpoint.json` and `control_auth.json`
  - authenticated local `GET /ui/data.json`
  - launchd-managed `control-host supervise` loop

## Validation Plan
- Tests / checks:
  - `MCP_RUNNER_TASK_ID=linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809 npx vitest run orchestrator/tests/CoStatusAttachCliShell.test.ts`
  - `MCP_RUNNER_TASK_ID=linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809 npx vitest run orchestrator/tests/ControlHostSupervision.test.ts`
  - add `ControlServerPublicLifecycle` or `ProviderIssueHandoff` focused tests only if implementation touches provider refresh stuck behavior
  - parent lane runs docs-review and the required repo gates before implementation handoff
- Required focused coverage:
  - stale endpoint rotation: old endpoint dies, sidecar rotates, attach reloads
  - dead-port fetch: unused/stopped port classifies as stale/dead endpoint
  - current endpoint recovery: replacement endpoint serves valid `/ui/data.json` and attach resumes
  - raw network error classification: injected fetch/network failure preserves safe class detail
  - auth failure classification: 401/403 is separate and token rotation can recover where practical
  - timeout classification: hung request is separate from operator cancellation
  - `restart_required` / `probe_timeout` supervision behavior: unhealthy samples threshold to bounded restart exit/state
  - active provider worker preservation: control-host restart/cleanup target excludes detached provider issue workers
- Rollout verification:
  - run a local attach scenario against a test or real host, rotate endpoint/auth artifacts, and show recovery without starting a second host
  - verify supervision status/state records the restart reason when health remains unhealthy
  - verify no active provider worker pid is signaled by the recovery path
- Monitoring / alerts:
  - rely on attach error classification, supervision state, `co-status --format json`, and provider polling health payloads

## Open Questions
- Should recovered endpoint metadata be exposed in non-interactive `co-status attach --format json`, or is focused test evidence enough?
- Should auth failure reload use endpoint file mtime, token file mtime, or always reload both sidecars under the same bounded budget?
- Should dashboard text show the stale endpoint and current endpoint redacted/host-only, or keep endpoint detail only in JSON/test surfaces?

## Approvals
- Reviewer: Parent docs-review child-stream succeeded on 2026-04-14; parent manifest-backed review completed before handoff.
- Date: 2026-04-14
