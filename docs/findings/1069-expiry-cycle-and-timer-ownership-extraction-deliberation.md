# Findings - 1069 Expiry Cycle and Timer Ownership Extraction Deliberation

## Decision

Proceed with a bounded Symphony-aligned extraction that moves the expiry/background ownership cluster out of `controlServer.ts` into a dedicated control-local lifecycle owner.

## Why this seam next

- `1068` removed the remaining question/delegation child-resolution support cluster from the main server entrypoint.
- The next cohesive non-route concentration is now the raw recurring timer plus the question/confirmation expiry cycle.
- That cluster is tightly related, behavior-sensitive, and large enough to extract without widening into unrelated runtime or provider work.
- A bounded Symphony scout confirmed that upstream keeps recurring timers and process lifecycle in dedicated owners instead of the HTTP shell. Evidence: `out/1069-coordinator-symphony-aligned-expiry-cycle-and-timer-ownership-extraction/manual/20260308T135437Z-docs-first/04-scout.md`.

## Boundaries to keep

- Keep `controlServer.ts` on HTTP shell, SSE ownership, and Telegram bridge composition duties.
- Do not introduce a generic scheduler or service container.
- Reuse the existing question child-resolution adapter instead of duplicating its logic inside the new helper.
- Preserve current persistence, event emission, and runtime publish sequencing.
- Do not keep a naked overlapping `setInterval` around child-resolution work; serialize sweeps inside the lifecycle owner.

## Approval

- 2026-03-08: Approved for implementation as the next bounded Symphony-aligned slice after `1068`. The preferred scope is a dedicated expiry lifecycle owner, not a wider runtime abstraction or another review-wrapper detour.
