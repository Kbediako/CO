# PRD - CO: prevent provider refresh restart loop from breaking co-status attach

## Added by Bootstrap 2026-04-14

## Traceability
- Linear issue: `CO-179` / `ea7ddb9e-78a7-4e85-aaa2-f890046d4809`
- Linear URL: https://linear.app/asabeko/issue/CO-179/co-prevent-provider-refresh-restart-loop-from-breaking-co-status
- Task id: `linear-ea7ddb9e-78a7-4e85-aaa2-f890046d4809`
- Source anchor: `ctx:sha256:bb067b2ac2073f849536e231da6e646a1aa470e8438514c13efbf87f6318b36b#chunk:c000001`
- Related lanes:
  - `CO-41` / `linear-af97d673-43a4-4a36-8738-b7f61e5b71a1`
  - `CO-74` / `linear-c4c32123-af51-4552-b55a-03d17917659c`
  - `CO-163` / `linear-b84c9a78-b62f-48fa-b1c4-88f8222535da`

## Summary
- Problem Statement: `co-status attach` resolves `control_endpoint.json` once, then keeps using that `base_url` and token while the local control-host can rotate endpoint/auth artifacts after a supervised restart. When provider refresh health reaches `provider_refresh_lifecycle_stuck`, `restart_required`, or repeated `probe_timeout`, the supervised recovery path can restart the host and publish a new endpoint, but an already-running attach viewer can remain pinned to the stale dead port and report only generic dashboard errors. Operators lose the very status surface they need while the host is trying to recover, and repeated probes risk request burn if recovery is not bounded.
- Desired Outcome: Make `co-status attach` resilient to artifact-backed endpoint rotation and make supervised provider refresh recovery bounded and classifiable. Attach should reload current endpoint/auth artifacts after stale endpoint, dead-port, timeout, raw network, or auth failures; recover when the current endpoint is healthy; and preserve active provider workers while avoiding repeated provider refresh request burn.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): Create the docs-first packet for `CO-179` so implementation can target the exact operator failure: attach must survive `control_endpoint.json` rotation after control-host restart, and provider refresh stuck recovery must be bounded instead of spinning on requests or killing active provider workers.
- Success criteria / acceptance:
  - stale `control_endpoint.json` endpoint rotation is detected by the attach path and resolved by reloading current endpoint/auth artifacts
  - dead-port fetches are classified distinctly from malformed payloads and ordinary dashboard errors
  - current endpoint recovery is proven when the artifact now points to a healthy replacement host
  - raw network errors remain classifiable with safe detail instead of collapsing into an unstructured thrown error
  - auth failure and timeout classification are covered where practical, including token rotation recovery when the auth sidecar updates
  - `restart_required` and `probe_timeout` supervision behavior remains bounded and machine-checkable
  - active provider workers are preserved; no recovery path kills detached `provider-linear-worker` issue processes
- Constraints / non-goals:
  - do not redesign `CO STATUS`, the dashboard renderer, or provider scheduling wholesale
  - do not require killing active provider workers
  - do not weaken `provider_refresh_lifecycle_stuck` / `restart_required` truth
  - do not introduce a second host or polling loop under `co-status attach`
  - child lane owns docs packet only; parent owns Linear state, workpad, implementation, validation, PR lifecycle, and patch integration

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `CO: prevent provider refresh restart loop from breaking co-status attach`
  - `control_endpoint.json endpoint rotation`
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `probe_timeout`
  - `active provider worker preservation`
- Protected terms / exact artifact and surface names:
  - `co-status attach`
  - `control_endpoint.json`
  - `control_auth.json`
  - `/ui/data.json`
  - `provider_refresh_lifecycle_stuck`
  - `restart_required`
  - `probe_timeout`
  - `provider-linear-worker`
  - `control-host supervise`
- Nearby wrong interpretations to reject:
  - "redesign the whole CO STATUS dashboard"
  - "increase refresh timeouts and call it fixed"
  - "restart by killing all descendant provider workers"
  - "treat every fetch failure as the same dashboard error"
  - "make attach start a new control-host when the old endpoint is stale"

## Parity / Alignment Matrix
- Current truth:
  - `co-status attach` resolves an existing run dir through `control_endpoint.json` and `control_auth.json`, then passes one fixed `baseUrl` and token into the attached dashboard fetch loop.
  - the attach fetch path reads `/ui/data.json` and reports malformed payloads or HTTP failures, but endpoint rotation, dead ports, raw network errors, auth failures, and timeouts do not have a complete recovery/classification contract.
  - control-host supervision already treats `restart_required` and `probe_timeout` as unhealthy signals, but attach viewers pinned to the old endpoint can still be stranded after a restart publishes a new artifact.
  - provider refresh stuck handling must preserve the no-request-burn boundary established by prior `provider_refresh_lifecycle_stuck` lanes.
- Reference truth:
  - the persisted endpoint/auth artifacts are the authority for the current local control-host endpoint.
  - when the host restarts, readers that attach by artifact should re-check the artifact before declaring the viewer permanently broken.
  - restart-required recovery should be finite, observable, and scoped to the control-host process tree, not detached provider issue workers.
- Target truth / intended delta:
  - attach fetch failures classify as stale/dead endpoint, raw network error, auth failure, timeout, invalid payload, or non-OK HTTP response.
  - attach reloads `control_endpoint.json` and `control_auth.json` after recoverable endpoint/auth/probe failures and switches to the current endpoint when the artifact changed.
  - attach reports current-endpoint recovery after a dead old port is replaced by a healthy `/ui/data.json` response.
  - supervision/recovery keeps `restart_required` and `probe_timeout` bounded by threshold/backoff semantics and does not restart or probe in a tight loop.
  - active `provider-linear-worker` issue processes remain outside the cleanup target.
- Explicitly out-of-scope differences:
  - dashboard layout/interaction redesign
  - provider admission/scheduling policy redesign
  - global request-budget policy changes
  - remote attach support beyond local artifact-backed endpoint resolution

## Not Done If
- `co-status attach` stays pinned to a stale port after `control_endpoint.json` rotates to a healthy current endpoint.
- Dead-port, raw network, timeout, and auth failures all collapse into one generic dashboard error.
- A replaced token in `control_auth.json` cannot recover an attach viewer after an auth failure.
- `probe_timeout` or `restart_required` causes unbounded restart/probe churn or repeated provider refresh request burn.
- Recovery kills active detached `provider-linear-worker` issue processes.
- The implementation widens into CO STATUS renderer redesign or provider scheduling redesign.

## Goals
- Add a reloadable, artifact-backed attach target contract.
- Classify attach fetch/probe failures with enough structure for tests and operators.
- Recover the attach viewer when stale endpoint artifacts rotate to a healthy current endpoint.
- Keep provider refresh stuck recovery finite, supervised, and request-burn aware.
- Preserve active provider workers during control-host restart or cleanup.

## Non-Goals
- Rebuilding the dashboard renderer or changing its visual model.
- Changing provider issue scheduling, admission caps, or workflow state policy.
- Replacing `control-host supervise` with a new service manager.
- Adding mutating controls to `co-status attach`.
- Running Linear mutations from this docs-only child lane.

## Stakeholders
- Product: CO operators who use `co-status attach` during live local control-host incidents.
- Engineering: CO control-host, attach viewer, provider refresh, and supervision maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary Success Metrics:
  - stale endpoint rotation recovers to a current endpoint without launching another host
  - tests prove dead-port, current recovery, raw network, auth failure, and timeout classifications
  - restart-required/probe-timeout supervision remains bounded and records clear reason/state
  - no provider-worker process preservation regression
- Guardrails / Error Budgets:
  - attach should perform at most bounded artifact reload/probe work per refresh cycle
  - error output must not leak bearer tokens or auth sidecar contents
  - stuck refresh truth remains visible as `provider_refresh_lifecycle_stuck` / `restart_required`
  - cleanup targets only supervised control-host process trees

## User Experience
- Personas:
  - local operator watching `CO STATUS` while a supervised control-host restarts
  - reviewer validating request-burn and worker-preservation behavior
  - maintainer diagnosing endpoint/auth sidecar rotation
- User Journeys:
  - an operator has `co-status attach` open; the old control-host endpoint dies; the run dir publishes a new `control_endpoint.json`; attach reloads and resumes rendering from the current endpoint.
  - an endpoint is dead with no replacement; attach displays a classified stale/dead endpoint state and keeps retrying only on the configured bounded cadence.
  - a token rotates; attach classifies the auth failure, reloads `control_auth.json`, and recovers if the current token works.
  - supervision observes repeated `probe_timeout` or explicit `restart_required`, exits for launchd restart after threshold, and does not kill detached provider issue workers.

## Technical Considerations
- Architectural Notes:
  - `orchestrator/src/cli/coStatusAttachCliShell.ts` is the narrow attach-side owner of endpoint resolution and `/ui/data.json` fetch behavior.
  - `loadControlEndpoint(...)` in `orchestrator/src/cli/delegationServer.ts` already resolves the artifact-backed endpoint/auth pair and can be reused or wrapped by a reloadable attach target.
  - `orchestrator/src/cli/control/controlStatusDashboard.ts` can keep rendering behavior unchanged while receiving classified fetch errors from the attach shell.
  - `orchestrator/src/cli/control/controlHostSupervision.ts` and `orchestrator/src/cli/controlHostSupervisionCliShell.ts` own health classification and restart threshold behavior.
  - prior provider refresh stuck lanes make request-burn suppression a guardrail, not an optional improvement.
- Dependencies / Integrations:
  - `orchestrator/src/cli/coStatusAttachCliShell.ts`
  - `orchestrator/src/cli/delegationServer.ts`
  - `orchestrator/src/cli/control/controlStatusDashboard.ts`
  - `orchestrator/src/cli/control/controlHostSupervision.ts`
  - `orchestrator/src/cli/controlHostSupervisionCliShell.ts`
  - `orchestrator/src/cli/control/controlServerPublicLifecycle.ts`
  - `orchestrator/src/cli/control/providerIssueHandoff.ts`
  - `orchestrator/tests/CoStatusAttachCliShell.test.ts`
  - `orchestrator/tests/ControlHostSupervision.test.ts`
  - `orchestrator/tests/ControlServerPublicLifecycle.test.ts`
  - `orchestrator/tests/ProviderIssueHandoff.test.ts`

## Open Questions
- Should attach expose recovery classifications only through dashboard error text/tests, or also through `--format json` metadata for non-interactive smoke checks?
- Should auth failure recovery reload both endpoint and auth sidecars every time, or only reload auth when the endpoint path is unchanged?
- What is the smallest safe retry budget for endpoint reload within one refresh cycle before waiting for the next configured interval?

## Approvals
- Product: Linear issue `CO-179`
- Engineering: Parent docs-review child-stream succeeded and implementation validation/review gates passed on 2026-04-14.
- Design: N/A
