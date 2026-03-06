# TECH_SPEC - Coordinator Live Linear Advisory Ingress + Telegram Delta Notifications (1016)

- Canonical TECH_SPEC: `tasks/specs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: introduce a fail-closed live Linear advisory ingress route plus bounded Telegram push notifications that both reuse the shared selected-run projection established in `1015`.
- Boundary: keep CO authoritative, keep Linear advisory-only, keep Telegram bounded/allowlisted, and do not broaden `/api/v1` beyond compatibility reads.
- Reference model: borrow Symphony's live-updating active-item feel, but keep CO's stricter execution and control posture.

## Requirements
- Create docs-first artifacts for `1016`:
  - `docs/PRD-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`
  - `docs/TECH_SPEC-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`
  - `docs/ACTION_PLAN-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`
  - `tasks/specs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`
  - `tasks/tasks-1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`
  - `.agent/task/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md`
  - `docs/findings/1016-live-linear-ingress-and-telegram-delta-deliberation.md`
- Update registries:
  - `tasks/index.json` with `1016` `items[]` and `specs[]` entries,
  - `docs/TASKS.md` snapshot entry for `1016`,
  - `docs/docs-freshness-registry.json` entries for all `1016` artifacts.

## Ingress Architecture
### Linear webhook route
- Add a new control-server route:
  - `POST /integrations/linear/webhook`
- Route placement requirements:
  - handle it before bearer-auth-protected `/control/*` mutating routes and before `/api/v1/*` compatibility fallthrough,
  - keep it outside `/api/v1` so read-only compatibility semantics remain intact.
- Request handling requirements:
  - capture the raw request body for signature verification,
  - verify the delivery using a configured webhook secret and the Linear delivery/signature headers,
  - parse the event kind from Linear headers,
  - return a fast `2xx` ack only for accepted or safely ignored duplicate deliveries; malformed, unsigned, or out-of-scope deliveries fail closed with explicit status and audit detail,
  - keep processing bounded so provider retries do not pile up.

### Scope validation
- Accepted deliveries must be validated against configured CO Linear scope:
  - workspace,
  - team,
  - project.
- Validation may use payload metadata when present and may fall back to the existing bounded provider client when the event needs issue/project/team enrichment.
- Provider enrichment for accepted deliveries must resolve the exact Linear issue id from the webhook payload; it may not reuse the existing latest-updated-in-scope lookup path.
- Out-of-scope deliveries must not mutate the accepted advisory state.

### Idempotency and run-local state
- Persist Linear ingress state in a dedicated run-local sidecar under `paths.runDir`.
- The state should include:
  - recently seen delivery ids,
  - latest accepted advisory event summary,
  - latest accepted advisory timestamp,
  - last event classification/result,
  - any bounded issue/team/project metadata needed by the shared selected-run projection.
- The dedupe ledger must survive process-local route handling for the current run and reject replays cleanly.

## Projection Integration
- Reuse the `1015` selected-run builder as the single projection sink.
- The builder should be able to merge the latest accepted Linear advisory ingress state into:
  - `/api/v1/state`
  - `/api/v1/:issue`
  - `/ui/data.json`
- For `1016`, keep `/api/v1/dispatch` on its current provider-read path; the webhook-backed state only shapes the selected-run/read-surface projection in this slice.
- If the existing dispatch advisory surface consumes tracked Linear state, update it only through the same normalized advisory input instead of a separate formatter or cache.
- Missing issue lookups must remain fail-closed and must not perform unnecessary provider fetches.

## Telegram Delta Integration
### Push model
- Keep Telegram polling and command handling intact for pull requests.
- Add a bounded push pathway that:
  - watches selected-run changes through the existing event stream and/or projection snapshots,
  - computes a material delta hash from the shared selected-run projection,
  - sends a Telegram message only when a material change occurs.

### Push state
- Persist Telegram push cursor state in a dedicated run-local sidecar under `paths.runDir`.
- The push state should include:
  - last processed run event sequence,
  - last sent selected-run hash,
  - pending selected-run hash plus observed-at timestamp when a material change arrives during cooldown,
  - last sent timestamp and optional advisory metadata when helpful,
  - simple cooldown/rate-limit metadata.

### Push content
- Push content must stay concise and oversight-oriented:
  - run status transitions,
  - queued-question arrival/clear,
  - material tracked Linear advisory changes,
  - no hidden mutating affordances beyond the already approved bounded Telegram controls.

## Configuration Contract
### Linear env
- Existing advisory env remains in scope:
  - `CO_LINEAR_API_TOKEN` or `CO_LINEAR_API_KEY` or `LINEAR_API_KEY`
  - `CO_LINEAR_WORKSPACE_ID`
  - `CO_LINEAR_TEAM_ID`
  - `CO_LINEAR_PROJECT_ID`
  - `CO_LINEAR_REQUEST_TIMEOUT_MS`
- New ingress secret:
  - `CO_LINEAR_WEBHOOK_SECRET`

### Telegram env
- Reuse the existing Telegram oversight env and allowlist.
- Add only bounded opt-in config if needed for push cadence/state:
  - `CO_TELEGRAM_PUSH_ENABLED`
  - `CO_TELEGRAM_PUSH_INTERVAL_MS` or equivalent bounded polling cadence

## Safety Constraints
- CO remains execution authority.
- Coordinator remains intake/control bridge only.
- Linear ingress is advisory-only.
- Telegram push must not create a second control surface with broader permissions.
- No repo-stored secrets.
- No assumption that the local control server itself is a permanently public webhook endpoint; the route must support forwarded ingress, but deployment/public exposure is separate.

## Validation Plan
- Docs-first:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - mirror parity for `tasks/tasks-1016...` vs `.agent/task/1016...`
- Runtime:
  - targeted control-server tests for signature verification, replay rejection, scope mismatch rejection, and accepted advisory state projection,
  - targeted Telegram tests for push dedupe, rate limiting, and projection-driven content,
  - targeted selected-run/read-surface tests to confirm shared projection coherence after advisory ingress,
  - manual simulated/mock ingress evidence using signed payloads against the local route,
  - live Linear provider verification with the real workspace/team/project binding,
  - live Telegram push verification against the real bot/chat where the environment allows.

## Placeholder Gate Manifests (Future)
- docs-review: `.runs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/cli/<docs-review-run-id>/manifest.json`
- implementation-gate: `.runs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/cli/<implementation-gate-run-id>/manifest.json`
