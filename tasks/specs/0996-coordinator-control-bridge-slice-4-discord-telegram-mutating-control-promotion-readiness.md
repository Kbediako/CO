---
id: 20260304-0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness
title: Coordinator Control Bridge Slice 4 + Discord/Telegram Mutating Control Promotion Readiness
relates_to: docs/PRD-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness.md
risk: high
owners:
  - Codex
last_review: 2026-03-05
---

## Summary
- Objective: define implementation-checkable promotion-readiness controls for Discord/Telegram mutating actions while preserving 0995 policy boundaries.
- Scope: docs-first planning + registry/snapshot updates + validation evidence, extended with residual-r4 replay traceability metadata parity, residual-r5 nonce replay/persist-ordering, residual-r6 cancel replay traceability, residual-r7 replay-ID canonicalization, residual-r9 transport discriminator/replay-scope, residual-r10 delegation metadata discriminator remediation, residual-r10-postfix control-state cap enforcement follow-up, and post-closeout P1 cancel-confirmation transport-scope binding remediation under existing task 0996.
- Status note: 0996 mutating-control promotion-readiness is GO-approved/closed as of 2026-03-05; HOLD/NO-GO wording below is historical gating lineage unless explicitly marked as ongoing qmd runtime-adoption posture.
- Constraint: docs/task artifacts only for this stream.

## Pre-Implementation Review Note
- Decision: approved for docs-first planning execution.
- Reasoning: 0996 is the approved next slice from 0995 and requires explicit qmd placement/timing before implementation.

## Technical Requirements
- Functional requirements:
  - Preserve authority invariants:
    - CO remains execution/control authority.
    - Coordinator remains intake/control plane only.
  - Encode qmd placement/timing as explicit contracts:
    - direct runtime adoption: HOLD,
    - sidecar research retrieval for docs/tasks/specs: GO now (optional stream),
    - read-only adapter pilot: later gate, non-blocking to control security hardening.
  - Define HOLD -> GO acceptance gates for mutating transport controls:
    - identity binding,
    - nonce/expiry replay protection,
    - idempotency window/index,
    - full traceability schema,
    - kill-switch/rollback drills.
  - Define residual-r4 replay traceability parity requirement:
    - replayed transport events must use replay-request actor/transport metadata (request/intent context) instead of inheriting unrelated `snapshot.latest_action` context.
  - Define residual-r5 nonce durability/replay requirements:
    - P1: cancel replay branch must consume nonce on idempotent replay path (`orchestrator/src/cli/control/controlServer.ts`) so replayed cancel traffic cannot reuse fresh nonce later.
    - P2: nonce consumption must not occur before durable persist (`orchestrator/src/cli/control/controlServer.ts`) so transient persist failures do not irreversibly burn nonce.
  - Define residual-r6 cancel replay traceability requirement:
    - P2: cancel replay idempotent responses include canonical `traceability` metadata (`orchestrator/src/cli/control/controlServer.ts`) so replay response provenance cannot drift to caller fallback actor/transport data.
  - Define residual-r7 replay-ID canonicalization requirements:
    - P1: preserve canonical IDs in cancel replay traceability (`orchestrator/src/cli/control/controlServer.ts`) so canonical `null` `request_id`/`intent_id` values are not replaced by fallback caller IDs.
    - P1: keep replay audit IDs sourced from replay index (`orchestrator/src/cli/control/controlServer.ts`) so replay traceability IDs cannot inherit unrelated `snapshot.latest_action` IDs.
  - Define residual-r9 transport replay-safety requirements from run `3d002f4b`:
    - P1: reject transport metadata without a transport discriminator (`orchestrator/src/cli/control/controlServer.ts`).
    - P2: require transport-scoped replay match for cancel requests (`orchestrator/src/cli/control/controlServer.ts`) so cancel replay resolution cannot cross transport boundaries.
  - Define residual-r10 delegation fail-closed requirement from run `09e690f6`:
    - P1: reject metadata-only transport calls before delegation forwarding (`orchestrator/src/cli/delegationServer.ts`) so metadata cannot bypass discriminator/nonce/idempotency gating by being silently dropped in delegation pre-processing.
  - Define residual-r10-postfix transport-state cap requirement from review closeout:
    - P2: enforce hard cap behavior when overflow entries are unexpired in transport nonce/idempotency caches (`orchestrator/src/cli/control/controlState.ts`) so control-state persistence cannot grow unbounded under sustained in-window traffic.
  - Define post-closeout cancel confirmation transport-scope requirement:
    - P1: reject confirmed cancel requests when top-level transport metadata mismatches confirmed scope and bind confirmed scope when top-level transport is omitted.
  - Require standalone/elegance cadence guidance for future subagent implementation streams.
- Non-functional requirements:
  - Decisions remain auditable and timestamped.
  - Gate criteria remain deterministic and testable.
  - Docs mirrors/registries remain synchronized.

## qmd Decision + Timing Contract
| Decision | State | Placement | Timing Gate | Blocking Behavior |
| --- | --- | --- | --- | --- |
| Direct runtime adoption | HOLD (qmd runtime-adoption posture) | PRD/spec/action plan/checklist notes | Defer until all mutating-control acceptance gates pass with evidence | Hard-blocked in 0996 |
| Sidecar research retrieval for docs/tasks/specs | GO now | Optional delegated docs stream | Can run immediately for requirement/evidence support | Non-blocking to control hardening |
| Read-only adapter pilot | Later gate | Future slice planning + rollout checklist | After security hardening baseline and replay/idempotency controls are proven | Explicitly non-blocking to current hardening scope |

## Authority + Surface Invariants
- External transports never mutate run state directly; they submit intents through CO control APIs only.
- CO control state and manifest traceability remain canonical.
- Unsupported/forbidden actions remain fail-closed with auditable rejection payloads.

## HOLD -> GO Acceptance Gates (Mutating Discord/Telegram Controls)
1. Identity binding gate
- Required evidence:
  - actor identity is verified against approved identity source,
  - scoped principal binding is persisted and queryable,
  - unauthorized identity paths fail closed.

2. Replay protection gate (nonce + expiry)
- Required evidence:
  - nonce issuance + expiry validation is enforced for every mutating action,
  - replayed/expired requests are rejected with deterministic codes,
  - replay rejection telemetry is observable,
  - cancel replay branches consume nonce before returning idempotent replay responses.

3. Idempotency window/index gate
- Required evidence:
  - request/intent index provides deterministic duplicate handling,
  - idempotency window behavior is tested under retry/replay pressure,
  - persisted state remains consistent across retries,
  - transient persist failures do not permanently consume transport nonce before durable state update.

4. Full traceability schema gate
- Required evidence:
  - action records include `actor_id`, `transport`, `intent_id`, `request_id`, `task_id`, `run_id`, `manifest_path`, `action`, `decision`, timestamps,
  - trace fields are recoverable end-to-end in status/history surfaces.
  - replayed transport event metadata preserves replay-request parity for actor/transport fields.

5. Kill-switch + rollback drill gate
- Required evidence:
  - feature flag remains default-off,
  - kill-switch and rollback drill are executed and documented,
  - rollback restores CO-only control path without orphaned mutating intents.

## Mandatory Standalone/Elegance Cadence (Future Subagent Implementation Streams)
- Kickoff checkpoint: run standalone review after stream kickoff planning before coding.
- Burst checkpoint: run standalone review after each meaningful implementation burst.
- Pre-handoff checkpoint: run standalone review before merge/handoff recommendation.
- Elegance checkpoint: run explicit elegance/minimality pass after findings are addressed for non-trivial diffs.
- Hard-stop policy: unresolved P0 and high-signal P1 findings remain hard-stop until resolved or explicitly waived with evidence.

## Validation Plan
- Pre-edit docs-review baseline (historical non-terminal attempt, retained for audit):
  - Manifest: `.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs/cli/2026-03-03T23-32-51-423Z-2bee5ef0/manifest.json`
  - Log: `.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs/cli/2026-03-03T23-32-51-423Z-2bee5ef0/runner.ndjson`
- Post-edit docs-review (terminal closeout run):
  - Manifest: `.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs/cli/2026-03-04T00-03-05-993Z-ba8298a8/manifest.json`
  - Log: `.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs/cli/2026-03-04T00-03-05-993Z-ba8298a8/runner.ndjson`
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 docs-first planning stream runs as delegated worker in shared checkout; no additional subagents are spawned for this bounded docs-only slice." npx codex-orchestrator start docs-review --format json --no-interactive`
- Docs checks:
  - `npm run docs:check`
  - `npm run docs:freshness`
- Standalone review checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs NOTES="Goal: 0996 docs-first planning checkpoint | Summary: encode qmd timing and HOLD->GO gates; sync mirrors/registries | Risks: shared-checkout unrelated diffs can widen review scope" npm run review`
- Residual-r4 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r4 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens the next implementation checklist without code edits." npx codex-orchestrator start docs-review --format json --no-interactive`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r4 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r4 docs-first checkpoint | Summary: open replay traceability metadata parity follow-up lane under existing task 0996 | Risks: shared-checkout non-0996 diffs may inflate review scope" npm run review`
- Residual-r5 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r5 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens nonce residual implementation checklist items without code edits." npx codex-orchestrator start docs-review --format json --no-interactive`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r5 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r5 docs-first checkpoint | Summary: open nonce replay/persist-ordering residual lane under existing task 0996 and set NO-GO pending fixes | Risks: shared-checkout non-0996 diffs may inflate review scope" npm run review`
- Residual-r6 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r6 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens cancel replay traceability checklist items without code edits." npx codex-orchestrator start docs-review --format json --no-interactive --task 0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r6 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r6 docs-first checkpoint | Summary: open cancel replay response traceability residual lane from run 66338252 and keep NO-GO pending validation | Risks: shared-checkout non-0996 diffs may inflate review scope" MANIFEST=.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T08-00-10-026Z-66338252/manifest.json npm run review -- --manifest .runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T08-00-10-026Z-66338252/manifest.json`
- Residual-r7 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r7 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens replay-ID canonicalization checklist items without code edits." npx codex-orchestrator start docs-review --format json --no-interactive --task 0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r7 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r7 docs-first checkpoint | Summary: open replay-ID canonicalization residual lane from run 0ef17be6 and keep NO-GO pending validation | Risks: shared-checkout non-0996 diffs may inflate review scope" MANIFEST=.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T09-23-36-723Z-0ef17be6/manifest.json npm run review -- --manifest .runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T09-23-36-723Z-0ef17be6/manifest.json`
- Residual-r9 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r9 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens transport discriminator/replay-scope checklist items without code edits." npx codex-orchestrator start docs-review --format json --no-interactive --task 0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r9 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r9 docs-first checkpoint | Summary: open transport discriminator and transport-scoped cancel replay residual lane from run 3d002f4b and keep NO-GO pending validation | Risks: shared-checkout non-0996 diffs may inflate review scope" MANIFEST=.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T11-29-27-215Z-3d002f4b/manifest.json npm run review -- --manifest .runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T11-29-27-215Z-3d002f4b/manifest.json`
- Residual-r10 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r10 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens delegation metadata discriminator checklist items without code edits." npx codex-orchestrator start docs-review --format json --no-interactive --task 0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r10 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r10 docs-first checkpoint | Summary: open delegation metadata discriminator fail-closed residual lane from run 09e690f6 and keep NO-GO pending validation | Risks: shared-checkout non-0996 diffs may inflate review scope" MANIFEST=.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T12-47-18-555Z-09e690f6/manifest.json npm run review -- --manifest .runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T12-47-18-555Z-09e690f6/manifest.json`

## Implementation Validation Closeout Status (2026-03-05)
- Initial closeout attempt (`terminal-closeout-20260304T005802Z`) was not green and triggered blocker-fix recovery.
  - `npm run build` failed with `TS2345` in `orchestrator/src/cli/control/controlServer.ts`.
  - `npm run test` failed with CLI test-suite failures in `tests/cli-command-surface.spec.ts` and `tests/cli-frontend-test.spec.ts`.
- Latest authoritative closeout rerun (`20260305T092559-post-p1-terminal-closeout`) captured ordered gates `01..11` with expected shared-checkout override recovery on attempt2 for steps `08`, `09`, and `11`:
  - closeout summary bundle: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T092559-post-p1-terminal-closeout/00-closeout-summary.md`,
  - gate matrix: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T092559-post-p1-terminal-closeout/gate-matrix.tsv`.
- Authoritative implementation-gate run for current mirror state is terminal succeeded:
  - manifest: `.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T22-35-57-207Z-867d92df/manifest.json`,
  - runner log: `.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T22-35-57-207Z-867d92df/runner.ndjson`,
  - closeout pointer: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T092559-post-p1-terminal-closeout/11-authoritative-run.json`.
- Previously open closeout findings for malformed transport fail-open handling and replay control-seq progression are resolved and evidenced in the 0996 checklist mirrors.
- Post-closeout P1 cancel-confirmation transport-scope remediation is implementation-resolved:
  - targeted regression coverage: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T221505Z-p1-cancel-confirmation-transport-scope-bind/targeted-controlserver-tests.log`,
  - manual mismatch/binding evidence: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T221505Z-p1-cancel-confirmation-transport-scope-bind/manual-sim.log`,
  - review/elegance closeout notes: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T221505Z-p1-cancel-confirmation-transport-scope-bind/standalone-review-summary.txt`, `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T221505Z-p1-cancel-confirmation-transport-scope-bind/elegance-note.md`.
- Residual-r10 P1 from run `09e690f6` is implementation-resolved:
  - targeted regression coverage: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T133029Z-r10-impl-delegation-metadata-discriminator/05-targeted-regression-pause-cancel.log`,
  - manual fail-closed evidence: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T133029Z-r10-impl-delegation-metadata-discriminator/01-manual-sim-pause-metadata-without-transport.log`, `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T133029Z-r10-impl-delegation-metadata-discriminator/02-manual-sim-cancel-metadata-without-transport.log`,
  - stream bundle: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T133029Z-r10-impl-delegation-metadata-discriminator/`.
- Residual-r10 postfix review found no unresolved P1/P0 and surfaced one new P2 (`orchestrator/src/cli/control/controlState.ts`) for transport-state cache cap enforcement:
  - review evidence: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T134347Z-r10-postfix-residual-risk-closure/01-standalone-review-output.log`, `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T134347Z-r10-postfix-residual-risk-closure/02b-review-final-severity.txt`.
- Residual-r10-postfix P2 is implementation-resolved in-stream with targeted + full control-state tests:
  - `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T134651Z-r10-residual-p2-controlstate-cap-enforcement/01-targeted-controlstate-tests.log`,
  - `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T134651Z-r10-residual-p2-controlstate-cap-enforcement/02-full-controlstate-suite.log`,
  - `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T134651Z-r10-residual-p2-controlstate-cap-enforcement/04-manual-simulated-check.log`.
- Latest authoritative docs-review run for the current mirror/index snapshot is terminal succeeded:
  - `.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T13-04-00-379Z-6e6fc6fb/manifest.json`.
- Technical state: GO-approved/closed for 0996 mutating-control promotion-readiness; terminal implementation-gate closeout rerun requirement remains satisfied by run `2026-03-04T22-35-57-207Z-867d92df`, kill-switch/rollback drill evidence remains captured in `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T231451Z-killswitch-rollback-drill/08-drill-summary.md`, and explicit user approval is recorded in `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T113200Z-hold-go-approval-closeout/00-hold-go-approval-artifact.md`.
- Manual simulated/mock/dummy usage bundle remains confirmed and linked:
  - baseline logs: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T005323Z-impl-core/`
  - verification note: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T092559-post-p1-terminal-closeout/12-simulated-mock-dummy-verification-note.md`

## Residual-r4 Follow-up Scope (Opened, Docs-First)
- No new task id; follow-up remains within task `0996`.
- Implementation target for next stream:
  - patch replay traceability metadata sourcing so replayed transport events bind to replay context,
  - add targeted replay-order regression coverage,
  - capture manual replay simulation evidence,
  - rerun implementation-gate and mirror sync validation chain.

## Residual-r5 Follow-up Scope (Opened, Docs-First)
- No new task id; follow-up remains within task `0996`.
- Implementation targets for next stream:
  - patch cancel replay idempotent branch to consume nonce (`orchestrator/src/cli/control/controlServer.ts`),
  - patch nonce consumption ordering to occur after durable persist success (`orchestrator/src/cli/control/controlServer.ts`) or equivalent atomic/rollback-safe behavior,
  - add targeted regression tests for nonce replay and persist-failure retry recovery,
  - capture manual simulation evidence for replay + durability behavior,
  - rerun implementation-gate and mirror sync validation chain.

## Residual-r6 Follow-up Scope (Opened, Docs-First)
- No new task id; follow-up remains within task `0996`.
- Implementation targets for next stream:
  - patch cancel replay idempotent response path to include canonical `traceability` payload (`orchestrator/src/cli/control/controlServer.ts`),
  - add targeted regression coverage that validates replay response actor/transport/request parity under changed caller metadata,
  - capture manual replay traceability evidence for cancel replay response payloads,
  - rerun implementation-gate and mirror sync validation chain.

## Residual-r7 Follow-up Scope (Opened, Docs-First)
- No new task id; follow-up remains within task `0996`.
- Implementation targets for next stream:
  - patch cancel replay traceability to preserve canonical replay-index `request_id`/`intent_id` values (`orchestrator/src/cli/control/controlServer.ts`),
  - patch replay audit traceability ID sourcing to remain replay-index bound (`orchestrator/src/cli/control/controlServer.ts`),
  - add expanded targeted regression coverage for request-only/intent-only replay flows and later-action contamination scenarios,
  - capture manual replay simulation evidence proving canonical replay-ID preservation,
  - rerun implementation-gate and mirror sync validation chain.

## Residual-r9 Follow-up Scope (Opened, Docs-First)
- No new task id; follow-up remains within task `0996`.
- Implementation targets for next stream:
  - patch transport metadata validation to reject requests without transport discriminator (`orchestrator/src/cli/control/controlServer.ts`),
  - patch cancel replay lookup to require transport-scoped replay matching (`orchestrator/src/cli/control/controlServer.ts`),
  - add expanded targeted regression coverage for missing-discriminator metadata and cross-transport replay matching protection,
  - capture manual simulation evidence proving transport-scoped replay safety for cancel requests,
  - rerun implementation-gate and mirror sync validation chain.

## Residual-r10 Follow-up Scope (Resolved In-Stream + Postfix Residual Handled)
- No new task id; follow-up remains within task `0996`.
- Implemented in this stream:
  - delegation metadata extraction/validation now rejects metadata-only transport calls before forwarding (`orchestrator/src/cli/delegationServer.ts`),
  - targeted delegated `pause`/`cancel` metadata-without-transport regression coverage is added and passing,
  - manual simulation evidence confirms fail-closed behavior for metadata-only transport calls.
- Postfix residual handling in this stream:
  - standalone review severity gate surfaced P2 transport-state cache cap overflow (`orchestrator/src/cli/control/controlState.ts`) with no unresolved P1/P0,
  - P2 cap enforcement was implemented and validated with targeted + full control-state tests.
- Closeout completion evidence:
  - fresh terminal implementation-gate rerun is captured at `.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T22-35-57-207Z-867d92df/manifest.json`,
  - authoritative closeout bundle is `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T092559-post-p1-terminal-closeout/`.

## Promotion-Decision Resolutions (2026-03-05 Closeout Lane)
- Mutating transport controls are GO-approved/closed with explicit approval artifact recorded in-repo.
- Read-only adapter pilot scope is deferred to the next slice and remains non-blocking to current mutating-control promotion hardening.
- qmd remains sidecar/docs-retrieval-only in this slice; direct runtime adoption stays HOLD.
- HOLD -> GO evidence matrix artifact: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T213723Z-promotion-decision-closeout-docs/hold-go-evidence-matrix.md`.
- Kill-switch/rollback drill summary and approval record artifacts: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T231451Z-killswitch-rollback-drill/08-drill-summary.md`, `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T231451Z-killswitch-rollback-drill/09-hold-go-approval-record.md`.
- Explicit approval artifact (exact user quote): `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T113200Z-hold-go-approval-closeout/00-hold-go-approval-artifact.md`.
- Prior 2026-03-05 approval-revalidation lane remains as historical evidence and is superseded by the explicit quote artifact: `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260305T085824Z-hold-go-approval-revalidation/00-approval-satisfaction-decision.txt`.

## Approvals
- Reviewer: Codex.
- Date: 2026-03-05.
