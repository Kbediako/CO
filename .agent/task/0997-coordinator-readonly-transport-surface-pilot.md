# Task Checklist - 0997-coordinator-readonly-transport-surface-pilot

- MCP Task ID: `0997-coordinator-readonly-transport-surface-pilot`
- Primary PRD: `docs/PRD-coordinator-readonly-transport-surface-pilot.md`
- TECH_SPEC: `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`
- ACTION_PLAN: `docs/ACTION_PLAN-coordinator-readonly-transport-surface-pilot.md`

## Foundation
- [x] Standalone pre-implementation review note is recorded in canonical spec. - Evidence: `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`.
- [x] Post-implementation review note records terminal implementation validation. - Evidence: `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`, `.runs/0997-coordinator-readonly-transport-surface-pilot/cli/2026-03-05T00-44-50-509Z-75da1233/manifest.json`.
- [x] 0997 docs artifacts are synchronized to implementation-complete framing (PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror). - Evidence: `docs/PRD-coordinator-readonly-transport-surface-pilot.md`, `docs/TECH_SPEC-coordinator-readonly-transport-surface-pilot.md`, `docs/ACTION_PLAN-coordinator-readonly-transport-surface-pilot.md`, `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`, `tasks/tasks-0997-coordinator-readonly-transport-surface-pilot.md`, `.agent/task/0997-coordinator-readonly-transport-surface-pilot.md`.
- [x] 0997 task/spec snapshots are updated with implementation-gate terminal pointers. - Evidence: `tasks/index.json`, `docs/TASKS.md`.

## Policy Anchors (0994/0995/0996)
- [x] Codex-autorunner extraction learnings are carried forward (bounded adapter scope; CO remains authority). - Evidence: `docs/PRD-coordinator-readonly-transport-surface-pilot.md`, `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`, `docs/findings/0994-codex-autorunner-extraction-and-transport-go-hold.md`, `docs/findings/0995-codex-autorunner-extraction-and-transport-go-hold.md`.
- [x] qmd posture references remain explicit (direct runtime HOLD; sidecar docs retrieval optional GO; mutating controls HOLD under 0996). - Evidence: `docs/PRD-coordinator-readonly-transport-surface-pilot.md`, `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`, `tasks/specs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness.md`.

## Status-Only Implementation Contract
- [x] `status_only` mode allows `delegate.status` request surface only. - Evidence: `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`, `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/18-manual-status-only-rerun.log`.
- [x] Optional outbound status/event notification contract is documented. - Evidence: `docs/PRD-coordinator-readonly-transport-surface-pilot.md`, `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`.
- [x] Mutating actions are explicitly denied and remain HOLD under 0996. - Evidence: `docs/PRD-coordinator-readonly-transport-surface-pilot.md`, `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`, `tasks/specs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness.md`.
- [x] Unsupported and malformed transport inputs are fail-closed by policy. - Evidence: `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`, `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/18-manual-status-only-rerun.log`.

## Validation (Terminal Closeout + Mirror Sync)
- [x] Implementation-gate rerun reached terminal succeeded for 0997. - Evidence: `.runs/0997-coordinator-readonly-transport-surface-pilot/cli/2026-03-05T00-44-50-509Z-75da1233/manifest.json`, `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/16-implementation-gate-rerun.log`, `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/terminal-closeout-summary.json`.
- [x] Manual status-only checks confirm allow/block behavior. - Evidence: `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/18-manual-status-only-rerun.log`, `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/manual-status-only-results.json`.
- [x] Terminal closeout docs checks are captured. - Evidence: `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/06-docs-check.log`, `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T003024Z-terminal-closeout/07-docs-freshness.log`.
- [x] Mirror-sync stream reran `npm run docs:check` and `npm run docs:freshness`. - Evidence: `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T010502Z-mirror-sync-post-closeout/01-docs-check.log`, `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T010502Z-mirror-sync-post-closeout/02-docs-freshness.log`.
- [x] Task + `.agent` mirror byte parity check captured for post-closeout sync. - Evidence: `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T010502Z-mirror-sync-post-closeout/03-mirror-parity.log`.
- [x] Stream evidence note recorded. - Evidence: `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T010502Z-mirror-sync-post-closeout/00-evidence-note.md`.
- [x] Post-sync verify gate 5 false-stall concern is resolved with terminal double-pass full-suite tests. - Evidence: `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T012233Z-test-stall-remediation/diagnosis.md`, `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T012233Z-test-stall-remediation/01-test-attempt1.log`, `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T012233Z-test-stall-remediation/02-test-attempt2.log`.
- [x] Stale guard seed manifest is retained as historical non-terminal evidence and is not authoritative for 0997 terminal status. - Evidence: `out/0997-coordinator-readonly-transport-surface-pilot/manual/20260305T010613Z-stale-manifest-disposition/01-disposition-note.md`.

## Implementation Boundary
- [x] 0997 remains bounded to read-only transport status surface; no mutation promotion claim is made. - Evidence: `docs/PRD-coordinator-readonly-transport-surface-pilot.md`, `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`.
- [x] Mutating controls remain HOLD under 0996 and are not promoted by this stream. - Evidence: `tasks/specs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness.md`, `tasks/specs/0997-coordinator-readonly-transport-surface-pilot.md`, `docs/TASKS.md`.
