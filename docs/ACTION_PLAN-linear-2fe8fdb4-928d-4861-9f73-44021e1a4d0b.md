# ACTION_PLAN - CO-551 operator-confirmed quota-hygiene stale-process remediation

## Summary
- Goal: define and later implement a remediation-only quota-hygiene path that acts only after explicit operator confirmation of scoped current-audit PID targets.
- Scope: docs-first packet and parent-owned implementation for operator-confirmed stale-process remediation; CO-542 remains detection/reporting only.
- Assumptions: current quota-hygiene audit output is the evidence source; process side effects are allowed only after confirmation and current-audit PID eligibility checks.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `quota-hygiene:operator-confirmed-stale-process-remediation:v1`, `current detector owner CO-542 remains detection/reporting only`, `remediation only`, `explicit operator confirmation`, `scoped targets`, `current-audit PID eligibility`, `durable per-PID audit output`, `no automatic kill/restart`, `no app-server/control-host restarts`, `no provider-intake mutation`, `no model calls`, and `no kill-by-name behavior`.
- Not done if: remediation can run without operator confirmation, target by name, use stale audit evidence, restart app-server/control-host, mutate `provider-intake-state.json`, spend model calls, or omit durable per-PID output.
- Pre-implementation issue-quality review: parent-provided CO-551 protected terms and non-goals are translated into the PRD, canonical TECH_SPEC, mirror, and checklist before source edits.
- Fallback decision: remove manual/broad stale-process cleanup as an operator workaround; retain the CO-542 detection/reporting boundary as a durable authority split.

## Fallback / Seam Decisions

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Stale process cleanup | Manual or broad-name cleanup can clear stale quota symptoms without governed evidence. | `remove fallback` | CO-551 | Operator identifies stale quota consumers in a current audit. | 2026-05-21 | 2026-05-21 | This issue | Remediation is explicit, PID-scoped, current-audit eligible, and audited per PID. | Focused confirmation/eligibility/refusal tests. |
| CO-542 detector boundary | Contract name: CO-542 read-only quota-hygiene detector boundary. | `justify retaining fallback` | Owning surface: `codex-orchestrator hygiene quota` detector/reporting contract plus CO-551 remediation boundary. | Steady-state proof: detector output remains zero-model and read-only, while remediation is available only through explicit `--apply --yes --only` confirmation and current-audit PID eligibility. | CO-542 detector contract | 2026-05-21 | Non-expiring durable retention only with rationale. | Non-expiring rationale: the detector/remediator authority split is a supported safety contract, not temporary compatibility debt; remove only through a separate approved issue that preserves current-audit evidence, explicit confirmation, and read-only detector semantics. | Tests/docs: focused detector smoke, remediation command contract, and false-positive tests prove detector remains read-only while remediation is opt-in. |
| Per-PID audit output | Cleanup output could be top-level only. | `remove fallback` | CO-551 | Remediation has one or more requested PIDs. | 2026-05-21 | 2026-05-21 | This issue | Each PID has structured action/refusal evidence. | Snapshot/schema coverage for per-PID records. |

Durable retained-boundary evidence:
- Contract name: CO-542 read-only quota-hygiene detector boundary.
- Owning surface: `codex-orchestrator hygiene quota` detector/reporting contract plus CO-551 remediation boundary.
- Steady-state proof: detector output remains zero-model and read-only, while remediation is available only through explicit `--apply --yes --only` confirmation and current-audit PID eligibility.
- Tests/docs: focused detector smoke, remediation command contract, and false-positive tests prove detector remains read-only while remediation is opt-in.
- Non-expiring rationale: the detector/remediator authority split is a supported safety contract, not temporary compatibility debt; remove only through a separate approved issue that preserves current-audit evidence, explicit confirmation, and read-only detector semantics.

## Milestones & Sequencing
1. Complete docs-first packet, registry mirrors, and task checklist in the bounded docs child lane.
2. Parent imports the packet and reconciles it against current Linear/workpad truth.
3. Parent inspects CO-542 quota-hygiene detector output and current process inventory helpers.
4. Parent designs the exact command/confirmation UX and durable per-PID audit schema.
5. Parent adds focused tests for confirmation, current-audit PID eligibility, refusal behavior, no kill-by-name, no restarts, no provider-intake mutation, no model calls, and per-PID output.
6. Parent implements the smallest remediation surface that preserves CO-542 as detection/reporting only.
7. Parent runs focused validation, required docs gates, manifest-backed review, PR handoff, and Linear closeout.

## Validation
- Child checks:
  - protected-term scan across declared packet files
  - markdown trailing-whitespace check across declared packet files
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - changed-file scope inspection limited to declared docs-phase files
- Parent checks:
  - focused remediation tests for explicit confirmation and current-audit PID eligibility
  - focused refusal tests for stale audit, missing PID, changed PID identity, protected infrastructure, kill-by-name, app-server/control-host restart, provider-intake mutation, and model-call paths
  - focused output test for durable per-PID audit records
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - parent-selected implementation gates and manifest-backed review
- Rollback plan: remove the remediation command/tests while keeping CO-542 detector behavior unchanged; no data migration should be required.

## Approvals
- Reviewer: bounded same-issue docs child lane.
- Date: 2026-05-21
