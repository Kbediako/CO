# Task Checklist - linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a

- Linear Issue: `CO-394` / `fb31f0d5-56c4-4f56-8faa-1e4ef63a705a`
- MCP Task ID: `linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a`
- Primary PRD: `docs/PRD-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- TECH_SPEC: `tasks/specs/linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a.md`
- Larger-refactor owner: `CO-400`

## Docs-First
- [x] PRD drafted for CO-394 provider workflow fallback expiry.
- [x] TECH_SPEC and mirror drafted with protected terms, non-goals, Not Done If, fallback decisions, and validation plan.
- [x] ACTION_PLAN drafted for docs, inventory, metadata, focused tests, review, and handoff.
- [x] Checklist mirrored to `.agent/task`.
- [x] Registry mirrors updated for the CO-394 packet.

## Fallback Inventory
- [x] Provider-id mapping fallback identified: `mapping_source: provider_id_fallback` and `buildProviderFallbackTaskId`.
- [x] Retained-claim/autopilot fallback identified: cached claim state, retained run identity/proof, and deferred fresh-discovery arbitration in `providerIssueHandoff.ts`.
- [x] Large-refactor threshold applied: provider issue current-state authority consolidation is tracked separately in `CO-400`.

## Implementation
- [x] Add provider workflow fallback expiry metadata in `providerIssueHandoff.ts`.
- [x] Preserve provider-id mapping activation behavior.
- [x] Preserve retained-claim/autopilot fail-closed and reclaim behavior.
- [x] Avoid adding a new provider workflow seam.

## Validation
- [x] Metadata regression proves every retained provider workflow fallback has owner, trigger, introduced date, review date, maximum lifetime, removal condition, and validation (`npm run test -- ProviderIssueHandoff.test.ts`, 376 passed).
- [x] Focused provider workflow tests cover fallback activation and non-activation paths (`npm run test -- ProviderIssueHandoff.test.ts`, 376 passed).
- [x] `node scripts/spec-guard.mjs --dry-run`.
- [x] `npm run build`.
- [x] `npm run lint` (passed with existing warnings in `orchestrator/tests/DelegationMcpHealth.test.ts`).
- [x] `npm run test` (356 files, 4945 tests passed).
- [x] `npm run docs:check`.
- [x] `npm run docs:freshness`.
- [x] `npm run repo:stewardship`.
- [x] `node scripts/diff-budget.mjs`.
- [x] Same-issue child lane `provider-fallback-test-verify` completed successfully as zero-byte advisory: `.runs/linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a-provider-fallback-test-verify/cli/2026-04-26T20-35-07-318Z-1b0f7279/manifest.json`.
- [x] Standalone review completed before review handoff: `../../.runs/linear-fb31f0d5-56c4-4f56-8faa-1e4ef63a705a/cli/2026-04-26T20-07-32-275Z-ca61df73/review/telemetry.json` (`bounded-success`, no actionable issues).
- [x] Elegance/minimality pass completed before review handoff: no simplification edits; retained shape is the smallest machine-checkable expiry registry plus one focused metadata regression.
- [ ] PR attached and `pr ready-review` drain clean before transition to `In Review`.

## Notes
- Follow-up `CO-400` was created as a related Backlog issue blocked by CO-394 for the larger provider issue current-state authority refactor.
- Review date for expiring provider workflow fallbacks: 2026-05-10.
- Maximum lifetime for expiring provider workflow fallbacks: 2026-05-26.
