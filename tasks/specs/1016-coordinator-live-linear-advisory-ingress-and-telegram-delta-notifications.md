---
id: 20260306-1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications
title: Coordinator Live Linear Advisory Ingress + Telegram Delta Notifications
relates_to: docs/PRD-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications.md
risk: high
owners:
  - Codex
last_review: 2026-03-06
---

## Summary
- Objective: add fail-closed live Linear advisory ingress and projection-driven Telegram push notifications on top of the shared selected-run context established in `1015`.
- Scope: one inbound advisory route, one run-local advisory ledger, one Telegram push cursor, and the smallest projection/control test changes needed to keep the surfaces coherent.
- Constraints: keep CO execution authority unchanged, keep Linear advisory-only, keep Telegram bounded/allowlisted, and avoid deployment-only assumptions inside the repo lane.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning and ingress-first implementation as the immediate follow-up to `1015`.
- Reasoning: the projection boundary is now in place; the next material value comes from live advisory ingress plus proactive oversight, not another read-surface refactor.
- Initial review evidence: `docs/findings/1016-live-linear-ingress-and-telegram-delta-deliberation.md`, `out/1015-coordinator-symphony-aligned-selected-run-projection-and-advisory-context/manual/20260306T061614Z-closeout/14-next-slice-live-linear-ingress.md`.
- Delegated review refinement: keep the slice minimal by adding only `POST /integrations/linear/webhook` before bearer auth and `/api/v1` fallthrough, persist a dedicated `linear-advisory-state.json` sidecar under the run directory for replay-safe advisory ingress state, and trigger Telegram push through a bridge-owned projection-delta method instead of a second formatter or direct webhook-side rendering. Use the real `openai/symphony` checkout only for the Linear skill/client/shared projection patterns; do not copy its poll-only control flow, Telegram absence, or looser unattended mutation posture. Evidence: `docs/findings/1016-live-linear-ingress-and-telegram-delta-deliberation.md`, `.runs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications-scout/cli/2026-03-06T06-40-06-402Z-a23b3b4b/manifest.json`.
- Docs-review override: the registered docs-review run passed `delegation-guard`, `spec-guard`, `docs:check`, and `docs:freshness`, then `npm run review` timed out after low-signal exploratory review work. The only concrete docs issue surfaced there was the machine-specific Symphony path, and that was corrected before proceeding. Evidence: `.runs/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/cli/2026-03-06T06-56-54-322Z-1d6ddbb7/manifest.json`, `out/1016-coordinator-live-linear-advisory-ingress-and-telegram-delta-notifications/manual/20260306T070107Z-docs-review-override/00-summary.md`.

## Technical Requirements
- Functional requirements:
  - introduce a new fail-closed Linear ingress route outside `/api/v1`,
  - verify signature/idempotency, reject malformed deliveries, and safely ignore replay or out-of-scope deliveries without mutating state,
  - validate accepted deliveries against configured workspace/team/project scope,
  - persist accepted advisory state in a run-local sidecar,
  - merge accepted advisory state into the shared selected-run projection,
  - add bounded Telegram push notifications driven by selected-run deltas.
- Non-functional requirements:
  - no repo-stored secrets,
  - no new authority or mutation semantics,
  - bounded ingress handling and provider enrichment,
  - deterministic replay rejection and push dedupe.
- Interfaces / contracts:
  - existing `/control/action`, `/api/v1/state`, `/api/v1/dispatch`, `/api/v1/<issue>`, `/questions`, and Telegram command surfaces remain authoritative,
  - the new route is additive and advisory-only,
  - Telegram push must render from the same projection contract used by pull commands.

## Architecture & Data
- Architecture / design adjustments:
  - add the ingress route at the control-server boundary before compatibility fallthrough,
  - add a run-local Linear advisory state ledger,
  - add a run-local Telegram push cursor with last-sent hash plus pending-unsent hash during cooldown,
  - keep the shared selected-run builder as the sole render input for the control surfaces.
- Data model changes / migrations:
  - no repo-level migration,
  - additive runtime sidecar files under `paths.runDir`.
- External dependencies / integrations:
  - existing Telegram bot/runtime config,
  - existing Linear API token/workspace/team/project bindings,
  - new Linear webhook secret,
  - real `openai/symphony` checkout as read-only reference for the hidden Linear skill, Linear client, and shared projection model; no Telegram or webhook artifact is expected there.

## Validation Plan
- Tests / checks:
  - targeted control-server ingress tests,
  - targeted Telegram delta/push tests,
  - targeted selected-run coherence tests after ingress state is merged,
  - manual simulated/mock signed-ingress evidence,
  - live Linear and Telegram verification where the environment allows,
  - full repo validation gate chain for the owned diff.
- Rollout verification:
  - docs-review before implementation,
  - delegated read-only review approval captured in spec/checklist notes,
  - live provider verification against the real configured credentials where applicable.
- Monitoring / alerts:
  - ingress acceptance/rejection remains visible in logs and manual evidence,
  - push state and replay state stay auditable under the run directory.

## Open Questions
- Whether accepted advisory ingress state should immediately shape `/api/v1/dispatch` in this slice or remain selected-run-only until a follow-up.
- Which Telegram deltas should be on by default versus suppressed unless explicitly material.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
