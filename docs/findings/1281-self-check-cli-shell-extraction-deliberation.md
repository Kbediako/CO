# Deliberation Findings - 1281 Self-Check CLI Shell Extraction

- `1280` closed as a truthful freeze and exhausted the local `rlm` pocket.
- The next truthful nearby binary-facing seam is the `self-check` wrapper still inline in `handleSelfCheck(...)`: format selection, `buildSelfCheckResult()` invocation, and text/json output shaping.
- Shared parser ownership and top-level command dispatch should remain in `bin/codex-orchestrator.ts`; the lower `selfCheck` data helper stays out of scope.
