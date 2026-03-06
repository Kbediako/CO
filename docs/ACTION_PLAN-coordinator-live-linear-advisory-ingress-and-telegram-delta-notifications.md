# ACTION_PLAN - Coordinator Live Linear Advisory Ingress + Telegram Delta Notifications (1016)

## Summary
- Goal: add live Linear advisory ingress and bounded Telegram push notifications without breaking the shared selected-run projection or widening authority.
- Scope: one inbound advisory route, one run-local advisory state ledger, one run-local Telegram push cursor, and the smallest projection/test updates needed to keep the control surface coherent.
- Assumptions:
  - the `1015` selected-run builder remains the central read boundary,
  - existing Telegram bot credentials and Linear API credentials remain externally managed,
  - a stable public endpoint may still be absent during local implementation, so signed local/manual ingress simulation is part of validation.

## Milestones & Sequencing
1. Docs-first registration
- Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror.
- Record the ingress-first follow-up boundary and the Telegram delta scope.
- Register `1016` in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

2. Research + pre-implementation review
- Run bounded delegated read-only review of the control-server ingress path, event stream, and Telegram delta hooks.
- Use the real `openai/symphony` checkout as a read-only reference for the hidden Linear skill, Linear client, and shared projection model; explicitly ignore the quarantined wrong clone and do not copy Symphony's poll-only or approval-posture semantics.
- Run docs-review before implementation and update the spec/checklist notes with the review decision.

3. Linear ingress implementation
- Add the fail-closed Linear ingress route outside `/api/v1`.
- Verify signature/idempotency/scope and persist accepted advisory event state under the run directory.
- Keep the advisory event path additive and non-mutating.

4. Projection + Telegram push integration
- Feed accepted advisory state into the shared selected-run builder.
- Extend Telegram oversight with bounded push notifications driven by the same projection/event stream.
- Preserve the existing pull commands and bounded controls.

5. Validation + closeout
- Run targeted ingress/Telegram/projection tests plus the required repo gate chain for the owned diff.
- Capture manual simulated/mock usage evidence and live provider verification where the runtime environment allows.
- Run explicit elegance review, sync closeout artifacts, and commit the coherent `1016` slice.

## Dependencies
- Closed foundations:
  - `1009`
  - `1013`
  - `1014`
  - `1015`
- External configuration already prepared:
  - Telegram bot token and active operator chat
  - Linear API token, workspace, team, and project bindings
- External configuration still expected during implementation:
  - `CO_LINEAR_WEBHOOK_SECRET`
  - forwarded/public webhook path only when live provider ingress verification is attempted

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - `npm run review`
  - `npm run pack:smoke` if downstream-facing paths are touched
- Rollback plan:
  - disable the ingress route and fall back to provider-read-only advisory lookup,
  - disable Telegram push while preserving pull commands,
  - remove run-local advisory/push sidecars and confirm selected-run projection still renders the `1015` baseline.

## Risks & Mitigations
- Replay or duplicate delivery noise:
  - persist delivery ids and ignore duplicate replays deterministically without mutating state.
- Signature/auth drift:
  - require raw-body verification and fail closed when secrets or headers are missing.
- Projection drift after ingress:
  - continue routing through the shared selected-run builder and test the read surfaces together.
- Telegram spam:
  - gate push on material selected-run deltas and persist the last-sent hash/cursor.
- Overfitting to Symphony:
  - copy only live-active-item behavior, not UI-owned authority or inventory-first patterns.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-06.
