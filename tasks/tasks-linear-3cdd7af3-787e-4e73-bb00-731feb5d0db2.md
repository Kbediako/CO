# Task Checklist - linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2

- Linear Issue: `CO-174` / `3cdd7af3-787e-4e73-bb00-731feb5d0db2`
- MCP Task ID: `linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2`
- Primary PRD: `docs/PRD-linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2.md`
- TECH_SPEC: `tasks/specs/linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2.md`

## Docs
- [x] Live issue context inspected, issue moved `Ready` -> `In Progress`, one workpad created, `parallelize_now` recorded, and `surface-inventory` child lane launched then invalidated as stale by the parent. Evidence: Linear workpad `027d42cb-b957-49f3-a6cf-6bfafec6a91f` and child manifest `.runs/linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2-surface-inventory/cli/2026-04-13T22-59-16-993Z-316f4d59/manifest.json`.
- [x] Docs packet registered in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Audited docs-review completed before implementation. Evidence: `.runs/linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2-co-174-docs-review/cli/2026-04-13T23-05-04-374Z-17c6fed0/manifest.json`, telemetry `clean-success`.

## Implementation
- [x] Provider-worker prompt/help/skill guidance requires matrix-first, safe `parallelize_now`, stricter `stay_serial`, cap-exhaustion evidence, parent ownership discipline, and truthful `forbid_parallel`. Evidence: `providerLinearWorkerRunner.ts`, `bin/codex-orchestrator.ts`, `skills/linear/SKILL.md`.
- [x] CLI/runtime enforcement requires `linear parallelization --summary`, tightens `single_bounded_change`, and caps unresolved same-issue child lanes at `2`. Evidence: `linearCliShell.ts`, `providerLinearChildLaneShell.ts`.
- [x] Shaped canary proves `3/6` safe `parallelize_now` vs `5/235`, with accepted/rejected/invalidated outcomes and zero metric-only child lanes. Evidence: `scripts/provider-linear-parallelization-canary.mjs`.

## Validation
- [x] Focused coverage passed: `LinearCliShell`, `ProviderLinearWorkerRunner`, `ProviderLinearChildLaneShell`, `linear-cli-help`, and canary specs (`5` files / `227` tests).
- [x] Full validation passed: delegation guard, spec guard, build, lint, test (`339` files / `3776` tests), docs check/freshness, repo stewardship, diff budget after trim, direct canary, and pack smoke.
- [x] Manifest-backed review executed and stopped at `failed-boundary` / `command-intent` when the reviewer launched a validation suite. Evidence: `.runs/linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2/cli/2026-04-13T22-56-00-517Z-33ed3ebe/review/telemetry.json`.
- [x] Manual correctness review and elegance fallback completed. Evidence: `out/linear-3cdd7af3-787e-4e73-bb00-731feb5d0db2/manual/manual-review-elegance.md`.

## Handoff
- [ ] PR attached to the Linear issue before review-state transition.
- [ ] Latest `origin/main` merged into the branch before review-state transition.
- [ ] PR checks green and `pr ready-review` drain clean before review-state transition.
- [ ] Unresolved actionable review threads: `0` or explicit waiver with evidence.
- [ ] Workpad refreshed with final validation/review status before `In Review`.
