# TECH_SPEC Mirror - CO-446 target-keyed last_audit_operation projection

Canonical spec: `tasks/specs/linear-552f2825-b9e0-4f14-afe0-21b072aa9bb5.md`; PRD: `docs/PRD-linear-552f2825-b9e0-4f14-afe0-21b072aa9bb5.md`; action plan: `docs/ACTION_PLAN-linear-552f2825-b9e0-4f14-afe0-21b072aa9bb5.md`.

## Contract
`co-status` must key `last_audit_operation` by target issue identity. Audit rows from `provider-linear-worker-linear-audit.jsonl` that target `CO-444` must not appear as `CO-445` current audit state. Matching must use `issue_identifier` and issue id evidence when available, fail closed on mismatched or missing target identity, and preserve matching-target audit visibility, `issue-context`, and `Blocked` state truth.

## Not Done If
- `CO-445` can inherit a `last_audit_operation` from `CO-444`.
- Projection still chooses the newest audit operation without checking `issue_identifier` / issue id.
- The fix deletes or rewrites `provider-linear-worker-linear-audit.jsonl`.
- `co-status`, `issue-context`, or `Blocked` visibility is weakened to hide the mismatch.

## Validation
Parent should add focused regressions around `providerIssueObservability` / selected-run projection behavior: mismatched `CO-444` audit row excluded from `CO-445`, matching-target row retained, missing target identity fail-closed, and operator state still visible. Full repo validation remains parent-owned.
