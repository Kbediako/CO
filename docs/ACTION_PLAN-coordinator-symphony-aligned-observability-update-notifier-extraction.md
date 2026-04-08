# ACTION_PLAN - Coordinator Symphony-Aligned Observability Update Notifier Extraction (1022)

## Phase 1. Docs-First Registration
- Register `1022` across PRD/TECH_SPEC/ACTION_PLAN/spec/checklist/agent mirror.
- Update `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- Capture a short findings note grounding the slice in the `1021` follow-on recommendation, the real Symphony `ObservabilityPubSub` pattern, and the current CO callback map.

## Phase 2. Notifier Extraction
- Introduce a narrow internal observability update notifier with subscribe/publish semantics.
- Repoint `ControlServer` publishers and request-context wiring to that notifier.
- Subscribe the Telegram bridge through the notifier while preserving the existing bridge read-side and `/control/action` write-side behavior.

## Phase 3. Validation
- Run targeted control/Telegram tests for notifier lifecycle and retained update triggers.
- Run manual simulated/mock notifier-to-Telegram verification.
- Run the required validation gates and explicit elegance review.
- Record any thread-limit, diff-budget, or review-wrapper overrides explicitly if they persist.

## Phase 4. Closeout
- Sync task/spec/mirror state to completed with evidence.
- Record the next slice only if a concrete remaining Symphony-aligned control-surface seam is still dominant after notifier extraction.
- Commit the slice cleanly.
