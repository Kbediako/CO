# PRD - CO-589 suppress released terminal failed proofs from current status

## Traceability
- Linear issue: `CO-589` / `92f35fe0-35cb-4d84-851b-e1603aa9d97c`
- Task id: `linear-92f35fe0-35cb-4d84-851b-e1603aa9d97c`
- Registry id: `20260531-linear-92f35fe0-35cb-4d84-851b-e1603aa9d97c`
- Canonical owner key: `control-host-status:released-terminal-failed-proof-suppression`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=control-host-status:released-terminal-failed-proof-suppression`
- Live issue-context evidence: `bin/codex-orchestrator.js linear issue-context --issue-id CO-589 --format json` returned `In Progress` / `started` on 2026-05-31.

## Summary
- Problem Statement: `co-status --format json --dashboard` can still show a released terminal issue as the current selected failed work when the only failed signal is retained historical provider-worker proof. The live reproduction is CO-582: Linear is `Done` / completed, the claim is `released` with reason `provider_issue_released:not_active`, quota hygiene reports zero quota-burning worker processes, but `/ui/data.json` still selects CO-582 as `failed`.
- Desired Outcome: current status projections treat that shape as passive historical audit evidence while preserving real active failed, retrying, or running work for non-terminal or actively retryable issues.

## User Request Translation
- The operator wants repeated orchestration/status failures fixed at the root, not patched over with manual provider-intake cleanup or UI-only suppression.
- The lane must honor the current Codex 0.135.0 and gpt-5.5/xhigh posture, keep shared root clean/latest, and avoid creating another fallback around an expired CO-398 control-host status compatibility bridge.
- Read-only gpt-5.5/xhigh RCA identified `orchestrator/src/cli/control/selectedRunProjection.ts` as the authority seam. Failed retained provider-worker proof is not reconciled when the newer released/not-active claim has terminal Done/completed issue truth, so downstream presenters render the stale selected-run status.
- CO-589 should be linked to CO-398 and CO-582 because CO-398 owns the expired fallback lineage and CO-582 is the current live reproduction.

## Intent Checksum
- Exact wording / phrases to preserve: `co-status --format json`, `/ui/data.json`, `selected_issue_identifier`, `issues[]`, `display_status=failed`, `provider_linear_worker_proof`, `provider_debug_snapshot.claim`, `released`, `provider_issue_released:not_active`, `issue_state=Done`, `issue_state_type=completed`, `compatibility issue projection fallback`, `CO-398`, `CO-582`.
- Protected terms / exact artifact and surface names: `co-status --format json --dashboard`, `selected`, `selected_issue_identifier`, `active issues[]`, `provider-intake-state.json`, `fallback_expiry`, `compatibility issue projection fallback`, `legacy proof fields`, `source-labeled audit evidence`.
- Nearby wrong interpretations to reject: do not hide real failed runs for non-terminal issues, do not delete historical proof, do not manually edit provider-intake state as the fix, do not weaken active retry/running failure visibility, and do not make raw failed run status outrank terminal same-issue Linear truth.

## Parity / Alignment Matrix
| Surface | Current truth | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| `/ui/data.json` selected issue | CO-582 can be selected as `failed` even though the claim is released/not-active and live issue state is terminal Done. | Current status should represent current work, not stale proof. | Released/not-active terminal same-issue proof is suppressed from current selected status. | Removing audit proof from retained debug sections. |
| Active `issues[]` | The stale CO-582 failed proof appears as active current issue. | Active rows require active/retry/running or non-terminal actionable authority. | Active rows exclude passive released terminal failed proof. | Hiding real non-terminal failed rows. |
| `provider_linear_worker_proof` | Retained failed proof is useful audit evidence. | Proof is evidence, not current authority when terminal same-issue state supersedes it. | Proof remains source-labeled and inspectable without driving current status. | Purging `provider-intake-state.json` or run artifacts. |
| Fallback expiry | `compatibility issue projection fallback` is still emitted despite max lifetime `2026-05-26`. | CO-398 requires expired compatibility projection behavior to be removed or degraded. | CO-589 removes/repairs this status authority path and updates tests. | Broad control-host status redesign without need. |

## Acceptance Criteria
1. Status projection treats released/not-active terminal same-issue claims as passive historical rows even when the retained run status is `failed`.
2. Real failed, retrying, or running work remains visible when the issue is non-terminal or has active retry/running authority.
3. `selected`, `selected_issue_identifier`, active `issues[]`, `co-status --format json`, and `/ui/data.json` agree on the same suppression decision.
4. Retained `provider_linear_worker_proof` and `provider_debug_snapshot` remain available only as source-labeled audit evidence, not current status authority.
5. Regression tests cover the CO-582 shape: stale failed proof, released not-active claim, terminal Done/completed issue state, no running/retry source.
6. Regression tests cover the negative case: a non-terminal failed issue still appears as failed/actionable.
7. Local `co-status --format json --dashboard` no longer reports CO-582 as current failed work after the fix.
8. Validation includes focused status projection tests plus the normal CO implementation gate and review path.

## Not Done If
- A released `provider_issue_released:not_active` claim with terminal same-issue truth can still appear as current `failed` status in `selected`, `selected_issue_identifier`, or active `issues[]`.
- A real failed run for a non-terminal or retryable issue is hidden.
- The fix depends on manual local state cleanup instead of deterministic projection logic.
- `fallback_expiry` still presents the expired compatibility projection fallback as routine current-status authority.

## Goals
- Remove stale failed proof authority for terminal released issues.
- Preserve audit visibility for retained provider-worker proof.
- Keep active failure and retry visibility strict for real current work.

## Non-Goals
- No provider-worker admission, Linear workflow, or retry scheduling changes.
- No provider-intake or run-artifact purging.
- No broad status renderer redesign unless focused implementation proves the current seam cannot be fixed safely.
- No weakening of CO-398 source-label/audit-proof retention requirements.

## Metrics & Guardrails
- `co-status --format json --dashboard` reports no current CO-582 failed row after implementation.
- Focused projection tests include both positive suppression and negative active-failure cases.
- Shared root remains clean/latest; work occurs in the CO-589 isolated worktree.
- WIP stays under 4 active/running issues.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the expired compatibility projection behavior that lets historical failed proof become current status authority; justify retaining source-labeled audit proof visibility as a durable operator evidence contract.
- Large-refactor check: a focused change is acceptable because the bug is in current status projection authority ordering and can be fixed without introducing another authority source. If selected, issue, and API/UI projections cannot share one predicate safely, escalate before adding another minor seam.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host status surfaces | Compatibility projection lets retained failed proof drive current selected/active status after terminal released same-issue truth. | remove fallback | CO-589 / CO-398 | Released/not-active claim with terminal Done/completed issue truth and no active running/retry authority is still projected as failed current work. | CO-398 lineage, recurrence observed 2026-05-31 | 2026-05-31 | N/A after removal | Current status projections suppress this passive historical shape while active failures still appear. | Focused compatibility/control-runtime/status tests plus live `co-status` proof. |
| Control-host status surfaces | Source-labeled retained proof/debug data remains visible for audit after current authority suppresses active status. | justify retaining fallback | CO-589 / CO-398 | Operators need historical run/proof evidence to understand why a row was suppressed. | CO-398 lineage | 2026-05-31 | Non-expiring durable audit contract while source-labeled | Remove only with replacement schema preserving current authority, retained proof, source labels, and degraded reason. | Projection tests assert proof is retained as audit evidence without driving current selected/active status. |

## Open Questions
- Should suppressed terminal failed proof appear in a dedicated historical/debug-only section, or is retaining it inside source-labeled debug payload sufficient for this lane?
- Whether a future explicit history section should expose suppressed proof more clearly is out of scope unless current source-labeled audit fields are insufficient.

## Approvals
- Product: parent CO orchestrator, 2026-05-31
- Engineering: pending docs-review before implementation
- Design: not applicable
