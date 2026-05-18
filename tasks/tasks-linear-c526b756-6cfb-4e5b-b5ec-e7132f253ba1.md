# Task Checklist - linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1

- Linear Issue: `CO-353` / `c526b756-6cfb-4e5b-b5ec-e7132f253ba1`
- MCP Task ID: `linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1`
- Primary PRD: `docs/PRD-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- TECH_SPEC: `tasks/specs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- Agent task mirror: `.agent/task/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`
- Docs child-lane manifest: `.runs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1-docs-packet/cli/2026-04-25T07-37-29-958Z-656ef03f/manifest.json`
- Source anchor: `ctx:sha256:4a1b90d4079209b44b35ed390dfc9ddc4b647dbdb70c4633a2907d47cd8aabc3#chunk:c000001`

## Docs-First
- [x] Source payload availability checked. Evidence: the parent-declared `.runs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1-docs-packet/cli/2026-04-25T07-37-29-958Z-656ef03f/memory/source-0/source.txt` path was not present in this child lane workspace, so this packet records the source anchor and leaves source-payload reconciliation to the parent.
- [x] PRD drafted for CO-353 Codex CLI 0.125.0 reasoning-token telemetry. Evidence: `docs/PRD-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, protected terms, current/reference/target telemetry matrix, Not Done If, and parent-owned implementation boundary. Evidence: `tasks/specs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`.
- [x] ACTION_PLAN drafted for docs-review, token parsing, provider proof, manifests, control/read-model metrics, status/dashboard output, and focused regression sequencing. Evidence: `docs/ACTION_PLAN-linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`.
- [x] Canonical TECH_SPEC registered in `tasks/index.json` under `items[]`. Evidence: `tasks/index.json`.
- [x] Freshness entries added for the scoped packet files. Evidence: `docs/docs-freshness-registry.json`.
- [x] Parent review gate recorded CO-353 findings before handoff. Evidence: manifest-backed standalone review telemetry at `.runs/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1/cli/2026-04-25T07-32-47-648Z-9b84420c/review/telemetry.json`.
- [x] Active-lane checklist mirrored in `.agent/task`. Evidence: `.agent/task/linear-c526b756-6cfb-4e5b-b5ec-e7132f253ba1.md`.

## Protected Scope
- [x] Packet preserves `Codex CLI 0.125.0`.
- [x] Packet preserves `turn.completed.usage.reasoning_output_tokens`.
- [x] Packet preserves `reasoning-token usage`.
- [x] Packet preserves `provider proof`.
- [x] Packet preserves `manifests`.
- [x] Packet preserves `control/read-model metrics`.
- [x] Packet preserves `status/dashboard output`.
- [x] Packet rejects model posture, runtime adoption, rate-limit policy, pricing, budget enforcement, and dashboard redesign scope.

## Parent-Owned Implementation Acceptance
- [x] Parse `turn.completed.usage.reasoning_output_tokens` from Codex CLI 0.125.0 completed-turn usage payloads when present.
- [x] Persist reasoning-token usage in provider proof as a separate nullable field.
- [x] Propagate reasoning-token usage through manifests where token telemetry is already persisted; run summaries were inspected and have no existing token-telemetry summary surface to extend.
- [x] Expose reasoning-token usage through control/read-model metrics and aggregate totals.
- [x] Render reasoning-token usage or explicit unavailable state in status/dashboard output.
- [x] Preserve existing input/output/total token semantics.
- [x] Keep older events and older provider proof artifacts readable when reasoning-token usage is absent.
- [x] Add focused regressions for present field, absent field, legacy proof, manifest propagation, read-model aggregation, and status/dashboard rendering.

## Non-Goals Preserved
- [x] No implementation, tests, generated artifacts, Linear state, workpad, PR lifecycle, or full validation in this child lane.
- [x] No Codex CLI adoption, model posture, runtime-mode, app-server, provider-supervision, or cloud policy change.
- [x] No budget enforcement, billing estimate, pricing, prompt-policy, or rate-limit behavior change.
- [x] No inference or historical backfill of reasoning-token usage without source `turn.completed.usage.reasoning_output_tokens` evidence.

## Validation
- [x] Child-lane protected-term scan completed over the touched docs/checklist files. Evidence: scoped Node term scan returned `protected terms ok`.
- [x] Child-lane JSON parse check completed for `tasks/index.json`. Evidence: scoped Node parse returned `tasks/index.json ok`.
- [x] Child-lane JSON parse check completed for `docs/docs-freshness-registry.json`. Evidence: scoped Node parse returned `docs/docs-freshness-registry.json ok`.
- [x] Child-lane scoped diff whitespace check completed. Evidence: `git diff --check --` against the declared file set returned clean for tracked edits and a scoped trailing-whitespace scan over touched files returned `no trailing whitespace`.
- [x] Full repo validation intentionally not run. Evidence: child-lane constraint forbids full repo validation suites.
- [x] Parent implementation validation for parser, provider proof, manifests, read model, status/dashboard output, and backward compatibility. Evidence: focused telemetry suite passed with 400 tests after review fixes.

## Progress Log
- 2026-04-25: bounded same-issue docs child lane drafted the CO-353 docs-first packet and scoped registry/freshness entries. Implementation, review, validation, Linear state, workpad, and PR lifecycle remain parent-owned.
- 2026-04-25: scoped child-lane checks passed for protected terms, JSON parsing, and diff whitespace; full repo validation was intentionally not run.
- 2026-04-25: parent implementation added reasoning-token parsing/preservation, provider proof and manifest persistence, control/read-model propagation, status/dashboard unavailable-state rendering, and focused regression coverage. Manifest-backed standalone review completed with two P2 findings; both were addressed and the focused telemetry suite passed afterward.
- 2026-04-25: PR feedback follow-up fixed observed-token merge semantics, restored the `paths.docs` field in `tasks/index.json` to a single spec pointer, and added `.agent/task` plus PRD active-lane checklist mirrors.

## Notes
- `docs/docs-catalog.json` already classifies `docs/PRD-*`, `docs/ACTION_PLAN-*`, and `tasks/**/*.md` through existing glob patterns, so no catalog entry is required unless a parent guard reports otherwise.
- Nested subagents were not spawned from this child lane; the child lane itself is the delegated docs packet stream.
