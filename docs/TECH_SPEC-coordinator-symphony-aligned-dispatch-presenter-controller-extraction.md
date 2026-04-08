# TECH_SPEC - Coordinator Symphony-Aligned Dispatch Presenter/Controller Extraction (1020)

- Canonical TECH_SPEC: `tasks/specs/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`.
- Owner: Codex.
- Last Reviewed: 2026-03-06.

## Summary
- Scope: extract `/api/v1/dispatch` payload shaping and failure classification out of the inline controller route while preserving controller-owned HTTP/audit behavior.
- Boundary: presenter/read-side code shapes dispatch payloads and semantic outcomes; `controlServer.ts` keeps method/status/header selection and audit-event emission.
- Reference model: Symphony’s controller/presenter layering, adapted to CO’s extra read-only dispatch route and stricter fail-closed authority posture.

## Requirements
- Create docs-first artifacts for `1020`:
  - `docs/PRD-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`
  - `docs/TECH_SPEC-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`
  - `docs/ACTION_PLAN-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`
  - `tasks/specs/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`
  - `tasks/tasks-1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`
  - `.agent/task/1020-coordinator-symphony-aligned-dispatch-presenter-controller-extraction.md`
  - `docs/findings/1020-dispatch-presenter-controller-extraction-deliberation.md`
- Update registries:
  - `tasks/index.json` with `1020` `items[]` and spec entry,
  - `docs/TASKS.md` snapshot entry for `1020`,
  - `docs/docs-freshness-registry.json` entries for all `1020` artifacts.

## Presenter / Controller Split
### Presenter responsibilities
- Own dispatch payload shaping only:
  - success payload body,
  - failure-classification outcome,
  - recommendation payload content,
  - dispatch summary payload content needed by the controller.
- It must not own HTTP method gating or final response writing.

### Controller responsibilities
- `controlServer.ts` should keep:
  - route selection,
  - `GET` method gating,
  - status-code selection,
  - response headers,
  - audit-event emission via `emitDispatchPilotAuditEvents(...)`.

### Preserved boundaries
- Keep `SelectedRunProjectionReader` as the selected-run context boundary.
- Keep `readDispatchEvaluation(...)` as the dispatch-pilot evaluation boundary.
- Keep state/issue/refresh/UI presenter/controller behavior unchanged.
- Keep auth/session, webhooks, mutations, SSE, and Telegram behavior unchanged.

## Interfaces / Contracts
- Preserve current behavior for `GET /api/v1/dispatch`:
  - `200` plus dispatch summary/recommendation when advisory guidance is available or blocked without fail-closed error,
  - existing fail-closed error statuses/codes for malformed or unavailable sources,
  - existing traceability fields and audit-event semantics.
- Do not add new env vars or persistent state.
- Do not widen recommendation authority.

## Safety Constraints
- CO remains execution authority.
- Coordinator remains advisory/control bridge only.
- Linear remains advisory-only and non-mutating.
- Telegram remains bounded and allowlisted.
- No repo-stored secrets.

## Validation Plan
- Docs-first:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
- Runtime:
  - targeted `ControlServer` coverage for dispatch success, fail-closed, reserved identifier, and method/status behavior,
  - manual simulated/mock dispatch checks,
  - full repo validation gate chain for the owned diff,
  - explicit elegance review to confirm dispatch layering is actually thinner after extraction.
