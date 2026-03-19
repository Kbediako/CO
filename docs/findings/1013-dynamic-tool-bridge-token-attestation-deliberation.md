# Findings - 1013 Dynamic-Tool Bridge Token Attestation Deliberation

- Date: 2026-03-06
- Task: `1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill`
- Scope: frame the next approved Coordinator slice after `1012` closeout handoff using the existing `1001` and handover evidence, while carrying forward the newer custom-runs-root input.

## Evidence Inputs
- `out/handovers/20260306-fresh-orchestrator-handover.md`
- `tasks/tasks-1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
- `tasks/specs/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane.md`
- `out/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/manual/20260305T175158Z-implementation-gate/00-summary.md`
- `out/1001-coordinator-appserver-dynamic-tool-bridge-experimental-lane/manual/20260305T171827Z-manual-sim/00-summary.md`
- `docs/TASKS.md`
- `out/1012-codex-0111-gpt-5-4-compatibility-and-adoption-realignment/manual/20260306T004500Z-closeout/00-closeout-summary.md`

## Fact Register

### Confirmed
- [confirmed] `1001` already closed the experimental bridge lane with default-off, kill-switch, and non-authoritative Coordinator boundaries.
- [confirmed] `1001` manual simulation covered hidden-token-missing rejection and bounded bridge actions, but the coverage was mock-harness based rather than live app-server based.
- [confirmed] The handover names the next approved technical follow-on as attested dynamic-tool bridge token verification plus live app-server canary and rollback drill evidence.
- [confirmed] `1012` closeout completed before `1013` shared-registry sync and docs-review handoff were recorded.
- [confirmed] The `1012` review lane surfaced a `P2` that control-server manifest validation must not hardcode a literal `.runs` root when configured run roots are in use.

### Inferred
- [inferred] `1013` should strengthen token provenance verification rather than widen Coordinator authority.
- [inferred] Live app-server canary evidence in `1013` should be bounded and rollback-oriented so the bridge remains auditable and reversible.
- [inferred] The inherited custom-runs-root `P2` should be treated as an implementation input for any live canary/control lookup work in `1013`, even if the slice does not broaden scope beyond bridge hardening.

## Deliberation Outcome
- Proceed with the docs-first scaffold for `1013`, then complete the required shared-registry sync and docs-review handoff.
- Treat `1013` as the active approved follow-on slice after `1012` closeout.
- Keep the slice centered on:
  - attested bridge-token verification,
  - bounded live app-server canary evidence,
  - explicit rollback-drill evidence,
  - unchanged CO authority boundaries.

## Inherited Risk Controls
- Do not treat non-empty hidden-token presence as sufficient bridge authentication.
- Do not treat mock-only manual simulation as sufficient canary evidence for this slice.
- Do not assume a literal `.runs` root in live canary/control-path logic when configured run roots are allowed.

## Docs-Review Outcome
- Docs-review reached terminal `succeeded` state at `.runs/1013-coordinator-dynamic-tool-bridge-token-attestation-live-appserver-canary-and-rollback-drill/cli/2026-03-06T00-52-08-829Z-85079438/manifest.json`.
- The review also raised a broader `codex.orchestrator.json` concern around forcing `FORCE_CODEX_REVIEW=1` in non-interactive gate lanes, but current wrapper docs/tests still support that explicit execution branch; keep it as a separate review-wrapper policy/docs follow-up rather than reopening the `1013` docs-first handoff.
- The review also returned an in-scope `P2` against `orchestrator/src/cli/delegationServer.ts` confirming the bridge still accepts mere hidden-token presence while later reporting `bridge_token_validated: true`; this remains the primary runtime hardening target for `1013`.
