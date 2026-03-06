# PRD - Coordinator Symphony-Aligned Telegram Oversight + Live Linear Advisory Adapters (1014)

## Summary
- Problem Statement: CO now has the hardened control core, Telegram provider credentials, and Linear provider credentials, but it still lacks the real provider adapters that would make Telegram a usable operator surface and Linear a live advisory source.
- Desired Outcome: ship a bounded adapter lane that layers Symphony-like selected-item oversight onto CO's existing control/advisory core without importing Symphony's desktop inventory model or weakening CO authority boundaries.
- Scope Status: docs-first implementation stream for task `1014-coordinator-symphony-aligned-telegram-oversight-and-live-linear-advisory-adapters`; runtime implementation is in scope for this lane.

## User Request Translation
- Continue as the top-level Orchestrator and use the real `openai/symphony` repo/checkout as a behavior reference, not as an authority model.
- Make Linear work like the useful parts of Symphony:
  - a single active item view,
  - recent event/status context,
  - issue/workflow context that can be surfaced alongside the run.
- Make Telegram the operator-facing oversight/control surface for that same active CO run.
- Treat 1014 as the CO-first foundation for a future downstream-user Telegram oversight surface, while keeping this slice intentionally single-run and bounded.
- Preserve the hard boundaries from the closed coordinator lanes:
  - CO remains execution authority,
  - Coordinator remains intake/control bridge only,
  - Linear remains advisory-only,
  - no scheduler ownership transfer,
  - no import of Symphony's lower-guardrail defaults.

## Baseline and Gap
- `0998` adopted the read-only Symphony-compatible observability subset and explicitly deferred provider/runtime work.
- `1000` implemented a non-authoritative dispatch pilot, but it still consumes only locally supplied metadata.
- `1009` and `1010` completed setup/runbook lanes, but both PRDs explicitly left real runtime/provider implementation downstream.
- `1013` closed the hardened app-server dynamic-tool bridge and left the control core ready for adapters.
- Current repo gap:
  - Telegram transport semantics exist only as normalized control metadata.
  - Linear advisory semantics exist only as a fail-closed static projection.
  - no provider-backed ingress/egress adapters exist yet.

## Symphony Reference Policy
- The real `openai/symphony` repo/checkout is a useful behavior reference for:
  - selected-item focus,
  - live event projection,
  - concise operator context around one active repo/agent.
- It is not the policy baseline for CO authority or approval posture.
- `openai/symphony` adoption findings from `0998` remain the authoritative policy source for what is allowed to carry over.

## Slice Scope (1014)
### In Scope
- Telegram polling adapter for one active CO run:
  - allowed-chat/operator gating,
  - `/start`, `/help`, `/status`, `/issue`, `/dispatch`, `/questions`,
  - bounded mutating controls for `/pause` and `/resume`,
  - Symphony-like selected-item summary for the active run.
- Linear live advisory adapter:
  - `ControlServer`-owned async provider-backed issue lookup from the configured Linear workspace/team/project,
  - advisory recommendation synthesis onto the existing dispatch pilot,
  - tracked Linear metadata plus a bounded recent-activity slice projected into the compatibility issue/status views.
- Credential/config resolution that avoids storing provider secrets in the repo.
- Canary, rollback, manual simulation, and elegance-review evidence for the owned adapter delta.

### Out of Scope
- Public Telegram webhook ingress or a multi-run/global bot router.
- Linear-authoritative mutation, issue transitions, comment posting, or scheduler ownership transfer.
- Repo-clone/switch/commit/pull operations from Symphony's desktop shell.
- Discord expansion or any new transport authority lane.
- Importing Symphony's SQLite repo/group/agent inventory into CO.

## Authority + Safety Boundaries
- CO remains the only execution authority for run/control state changes.
- Coordinator stays a bridge onto existing CO state and control endpoints.
- Telegram uses the existing transport auth/idempotency/traceability model and may not bypass it.
- Linear remains recommendation-only and must fail closed on malformed config, missing credentials, or provider errors.
- Any mutating Telegram control remains explicitly bounded to existing `pause`/`resume` semantics and the current transport allowlist policy.

## Telegram Adapter Requirements
1. No public endpoint dependency
- The adapter must work through Telegram Bot API polling so it can operate before any public webhook infrastructure exists.

2. Single active item model
- The adapter targets one active CO run and renders a Symphony-like selected-item summary:
  - run/task identifier,
  - current status,
  - last summary/last event,
  - workspace path,
  - latest Linear advisory state when available.

3. Bounded command surface
- Required:
  - `/start`
  - `/help`
  - `/status`
  - `/issue`
  - `/dispatch`
  - `/questions`
  - `/pause`
  - `/resume`
- Deferred:
  - `/cancel`
  - arbitrary command execution
  - multi-run switching

4. Operator scoping
- Only configured Telegram chat principals may interact with the adapter.
- Untrusted chats fail closed and do not produce control actions.

## Linear Adapter Requirements
1. Live provider binding
- Use the real Linear API token plus configured workspace/team/project bindings.
- Bindings must resolve from configuration/env without writing secrets into tracked files.
- Live provider fetch must be owned by the `ControlServer` request/projection path so the selected advisory item stays aligned with the active CO run.
- Provider-backed lookups must be bounded so a slow/stalled Linear request fails closed instead of hanging the read-only surfaces.

2. Advisory-only recommendation synthesis
- The live adapter must feed the existing dispatch pilot contract rather than introduce a separate control path.
- Recommendation output must remain non-authoritative and auditable.

3. Provider metadata projection
- Compatibility issue/status payloads should expose the selected live Linear issue metadata plus a bounded recent-activity/event slice under a tracked/advisory field so Telegram can render a Symphony-like active item.

4. Fail-closed behavior
- Missing token, malformed binding, empty/invalid provider response, or provider fetch failure must never widen authority.

## Manual Mock and Live Validation Requirements
1. Telegram mock polling simulation proves:
- allowed chat acceptance,
- untrusted chat rejection,
- bounded command routing,
- pause/resume control traceability,
- read-only projection rendering.

2. Linear mock/provider validation proves:
- binding resolution,
- live issue selection,
- advisory-only recommendation synthesis,
- malformed-source/token-missing fail-closed behavior.

3. Combined canary proves:
- the active run can expose both CO status context and live Linear advisory context through Telegram without bypassing CO control semantics.

4. Rollback drill proves:
- disabling the adapter path returns the run to the prior control-core-only baseline.

## Exact Validation Gate Order (Policy)
1. `node scripts/delegation-guard.mjs`
2. `node scripts/spec-guard.mjs --dry-run`
3. `npm run build`
4. `npm run lint`
5. `npm run test`
6. `npm run docs:check`
7. `npm run docs:freshness`
8. `node scripts/diff-budget.mjs`
9. `npm run review`
10. `npm run pack:smoke` (required when touching CLI/package/skills/review-wrapper paths intended for downstream npm users)

## Acceptance Criteria
1. `1014` docs/task mirrors are created and registered with docs-review evidence.
2. A Telegram polling oversight adapter exists for one active CO run and preserves existing transport guardrails.
3. A live Linear-backed advisory resolver exists and continues to fail closed while remaining non-authoritative.
4. Compatibility payloads expose enough run + advisory context for a Symphony-like selected-item view.
5. Targeted tests, manual/mock usage evidence, and an explicit elegance review exist for the 1014-owned delta.
