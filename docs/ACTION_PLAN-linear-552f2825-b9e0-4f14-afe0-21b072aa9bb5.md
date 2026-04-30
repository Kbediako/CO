# ACTION_PLAN - CO-446 target-keyed last_audit_operation projection

## Scope
Create the CO-446 docs-first packet and guide the parent implementation so `co-status` cannot project `last_audit_operation` audit state from `CO-444` as `CO-445` current state. This child lane owns docs only.

## Plan
1. Register the CO-446 packet, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
2. Parent inspects the `last_audit_operation` read path from `provider-linear-worker-linear-audit.jsonl` through provider debug snapshots and selected-run projection.
3. Parent adds target-key matching using `issue_identifier` and issue id evidence before exposing `last_audit_operation`.
4. Parent makes mismatched or missing target identity fail closed for current audit projection while retaining matching-target audit visibility.
5. Parent validates the `CO-444` versus `CO-445` mismatch, matching-target retention, `issue-context`, and `Blocked` visibility before review handoff.

## Constraints
Do not delete, truncate, or rewrite `provider-linear-worker-linear-audit.jsonl`; do not hide all audit visibility; do not weaken `co-status`, `issue-context`, or `Blocked`; do not change Linear/workpad/PR lifecycle in this child lane.

## Validation
Child lane: JSON parse for updated registries, protected-term scan, and `git diff --check`. Parent lane: focused projection tests, implementation gate, standalone review, elegance pass, PR checks, and ready-review drain.
