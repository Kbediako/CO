# TECH_SPEC - Coordinator Symphony-Aligned Telegram In-Process Read Model Reuse (1021)

- Canonical TECH_SPEC: `tasks/specs/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: remove Telegram read-side self-HTTP and replace it with a fresh in-process read adapter while keeping the existing HTTP-backed pause/resume path intact.
- Boundary: Telegram bridge consumes a read adapter for state/issue/dispatch/questions plus current issue resolution; `controlServer.ts` still owns the route/controller layer and existing `/control/action` transport semantics.
- Reference model: Symphony's snapshot-first internal reuse, adapted to CO's stricter authority and transport-hardening model.

## Requirements
- Create docs-first artifacts for `1021`:
  - `docs/PRD-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`
  - `docs/TECH_SPEC-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`
  - `docs/ACTION_PLAN-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`
  - `tasks/specs/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`
  - `tasks/tasks-1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`
  - `.agent/task/1021-coordinator-symphony-aligned-telegram-in-process-read-model-reuse.md`
  - `docs/findings/1021-telegram-in-process-read-model-reuse-deliberation.md`
- Update registries:
  - `tasks/index.json` with `1021` `items[]` and spec entry,
  - `docs/TASKS.md` snapshot entry for `1021`,
  - `docs/docs-freshness-registry.json` entries for all `1021` artifacts.

## Read Adapter Boundary
### Telegram-facing interface
- Introduce a narrow bridge-facing read contract with fresh per-call reads:
  - `readState(): Promise<ControlStatePayload>`
  - `readIssue(issueIdentifier: string): Promise<ControlIssuePayload | null>`
  - `readDispatch(): Promise<ControlDispatchPayload>`
  - `readQuestions(): Promise<QuestionsPayload>`
  - `resolveIssueIdentifier(): Promise<string | null>`
- Keep the bridge rendering code responsible for formatting Telegram message text, not for rebuilding projection payloads.

### Freshness rule
- Do not inject one long-lived `SelectedRunProjectionReader` into the Telegram bridge runtime.
- The adapter implementation must build fresh read-side helpers per call or otherwise avoid long-lived memoized selected-run promises.

### Controller / mutation boundary
- Keep `baseUrl`, `controlToken`, and `fetchImpl` for now if they are still needed only for `/control/action`.
- Keep `/pause` and `/resume` on the existing `/control/action` path so current transport allowlist, nonce, idempotency, replay, and traceability behavior remains unchanged in this slice.
- `manifestPath` becomes removable if the adapter owns current issue identifier resolution.

## Read Semantics
- State/issue/dispatch adapter methods should reuse the existing selected-run/observability boundaries, not duplicate payload shaping.
- Questions should move in-process too, but the adapter must preserve current operator-visible freshness expectations for queued questions and not silently widen behavior.
- External HTTP endpoints remain authoritative for external clients; this slice changes only in-process reuse inside the Telegram bridge.

## Safety Constraints
- CO remains execution authority.
- Coordinator remains advisory/control bridge only.
- Linear remains advisory-only and fail-closed.
- Telegram remains bounded and allowlisted.
- No repo-stored secrets.

## Validation Plan
- Docs-first:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Runtime:
  - targeted `TelegramOversightBridge` coverage for `/status`, `/issue`, `/dispatch`, `/questions`, push-delta dedupe, and retained mutation behavior,
  - integrated coverage through `ControlServer.start()` so the injected bridge adapter is exercised on the real startup path,
  - manual simulated/mock Telegram bridge verification,
  - full repo validation gate chain for the owned diff,
  - explicit elegance review to confirm the bridge got simpler rather than just moving fetch logic around.
