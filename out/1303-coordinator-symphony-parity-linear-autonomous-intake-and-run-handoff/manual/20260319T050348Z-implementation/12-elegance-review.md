# 1303 Elegance Review

- Kept the autonomy surface additive and bounded: one new persistent host shell plus two provider-focused modules (`providerIntakeState.ts`, `providerIssueHandoff.ts`) instead of spreading provider claim logic across the existing Linear advisory code.
- Reused the existing CO `start` and `resume` CLI flow and manifest schema, only adding issue identity fields needed for rediscovery and rehydration. No separate scheduler or provider-owned runtime was introduced.
- Preserved the intake contract boundary: provider input can only claim or replay accepted `started` issues and trigger CO-controlled `start` or `resume`. Execution ownership, run lifecycle, and scheduler decisions remain inside CO.
- Observability changes stayed read-model focused. The patch extends selected-run projection and Telegram/status rendering rather than adding a second status system for autonomous runs.
- The remaining complexity is structural, not ornamental: removing the ledger, manifest identity, or selected-run redirection would break idempotency, restart recovery, or post-handoff operator visibility.
