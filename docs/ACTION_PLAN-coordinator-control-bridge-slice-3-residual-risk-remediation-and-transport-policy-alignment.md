# ACTION_PLAN - Coordinator Control Bridge Slice 3 + Residual Risk Remediation + Transport Policy Alignment

## Summary
- Goal: repair 0995 docs to truthful state and freeze residual-risk remediation + transport-policy requirements before implementation work.
- Scope: docs/mirror updates, index/task snapshot registration, docs-review and standalone-review evidence capture, and elegance/minimality note.
- Stream task id for evidence: `0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-docs`.

## Milestones & Sequencing
1) Capture pre-coding docs-review baseline
- Run docs-review before editing 0995 docs and capture manifest/log evidence.
- Record delegation-guard override reason if required in checklist notes.

2) Truthful docs remediation
- Remove copied/stale completion/evidence claims from 0995 checklist mirrors.
- Keep implementation and final validation sections explicitly pending.
- Align all 0995 dates to 2026-03-03 unless an evidence path date dictates otherwise.

3) Register 0995 task/spec snapshots
- Add 0995 task item + spec entry in `tasks/index.json`.
- Add the 0995 snapshot line in `docs/TASKS.md`.
- Update `docs/docs-freshness-registry.json` entries for 0995 docs/mirrors as needed.

4) Freeze policy content
- Codex-autorunner extraction policy: transport-adapter responsibilities only; CO authority remains in-core.
- Discord/Telegram matrix:
  - GO: read-only notifications,
  - HOLD: mutating controls,
  - NO-GO: forbidden action classes.
- HOLD promotion controls:
  - security gates,
  - reliability/idempotency gates,
  - traceability gates,
  - feature-flag/rollback/promotion governance gates.

5) Post-remediation validation for docs stream
- Rerun docs-review and capture manifest/log evidence.
- Run standalone review (`npm run review`) for the docs stream and capture evidence.
- Record one explicit elegance/minimality note in checklist notes.

6) Handoff boundary (not in this stream)
- Leave implementation and final validation checklist items pending.
- Implementation stream picks up remediation code/testing and final gate closure.

## Evidence Commands (Docs Stream)
- Pre-coding docs-review:
  - `MCP_RUNNER_TASK_ID=0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-docs DELEGATION_GUARD_OVERRIDE_REASON="0995 docs cleanup is a delegated child stream in shared checkout; spawning further subagents is intentionally bypassed for docs-only remediation." npx codex-orchestrator start docs-review --format json --no-interactive`
- Post-remediation docs-review:
  - `MCP_RUNNER_TASK_ID=0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-docs DELEGATION_GUARD_OVERRIDE_REASON="0995 docs cleanup is a delegated child stream in shared checkout; spawning further subagents is intentionally bypassed for docs-only remediation." npx codex-orchestrator start docs-review --format json --no-interactive`
- Standalone review checkpoint:
  - `MCP_RUNNER_TASK_ID=0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-docs TASK=0995-coordinator-control-bridge-slice-3-residual-risk-remediation-and-transport-policy-alignment-docs NOTES="Goal: 0995 docs cleanup continuation | Summary: remove stale copied claims, register 0995, and align extraction/policy controls | Risks: shared-checkout unrelated diffs can appear in review scope" npm run review`

## Risks & Mitigations
- Risk: stale copied claims remain and misrepresent execution state.
- Mitigation: reset checklist mirrors to only docs-stream truths and pending implementation/final items.
- Risk: policy language remains ambiguous for transport promotion.
- Mitigation: include explicit matrix + promotion controls in PRD/spec/action plan.
- Risk: shared-checkout noise contaminates evidence interpretation.
- Mitigation: scope edits to owned docs files and annotate shared-checkout context in notes.
