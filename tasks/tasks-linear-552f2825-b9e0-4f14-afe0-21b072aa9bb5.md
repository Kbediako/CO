# Task Checklist - CO-446

## Docs-First
- [x] PRD, canonical spec, TECH_SPEC mirror, action plan, task checklist, and agent mirror exist for `linear-552f2825-b9e0-4f14-afe0-21b072aa9bb5`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register the docs-first packet.
- [x] Protected terms are visible: `co-status`, `last_audit_operation`, `issue_identifier`, issue id, `provider-linear-worker-linear-audit.jsonl`, `issue-context`, `CO-444`, `CO-445`, and `Blocked`.

## Acceptance
- [ ] Parent implementation excludes a `CO-444` audit operation from `CO-445` `last_audit_operation`.
- [ ] Parent implementation keeps matching-target audit operations visible in `co-status`.
- [ ] Mismatched or missing target identity fails closed instead of becoming current audit state.
- [ ] `issue-context` and `Blocked` visibility are preserved.

## Validation
- [x] Child docs lane JSON parse, protected-term scan, and `git diff --check`.
- [ ] Parent focused projection regressions and implementation gate.
- [ ] Parent standalone review, elegance pass, PR checks, ready-review drain, and Linear handoff.

## Notes
Do not delete or rewrite `provider-linear-worker-linear-audit.jsonl`; fix the read-model projection so `last_audit_operation` is keyed by target issue identity.
