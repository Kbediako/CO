# Task Checklist - linear-9fc9fe23-bd44-4b72-9459-b5b809970bce

- Linear Issue: `CO-237` / `9fc9fe23-bd44-4b72-9459-b5b809970bce`
- MCP Task ID: `linear-9fc9fe23-bd44-4b72-9459-b5b809970bce`
- Primary PRD: `docs/PRD-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
- TECH_SPEC: `tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`
- Fallback source anchor: `ctx:sha256:8391bf9a067e2de9c1d2651dbe67acb9d3c43cf6bde71c5639ee057b9ca37dfc#chunk:c000001`
- Current origin manifest: `.runs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce-co237-docs-packet/cli/2026-04-18T01-48-20-327Z-dbdc245e/manifest.json`

## Docs-First
- [x] PRD drafted for the `CO-237` review-handoff multiple-attachment seam across `CO-196` and `CO-219`. Evidence: `docs/PRD-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`.
- [x] TECH_SPEC drafted with the bounded current-candidate contract, protected terms, rejected reinterpretations, and parent-owned implementation seams. Evidence: `tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`, `docs/TECH_SPEC-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`.
- [x] ACTION_PLAN drafted for parent implementation and focused validation only. Evidence: `docs/ACTION_PLAN-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` updated within the declared docs scope. Evidence: those files.
- [x] Checklist mirrored to `.agent/task/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`. Evidence: `.agent/task/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`.
- [x] Pre-implementation issue-quality review recorded in spec notes. Evidence: `tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md` review notes.
- [x] `docs/docs-freshness-registry.json` coverage added for all six packet and mirror files. Evidence: `docs/docs-freshness-registry.json`.

## Child-Lane Scope
- [x] Child lane stayed inside the declared docs file scope. Evidence: final diff.
- [x] Child lane did not edit implementation or test files. Evidence: final diff.
- [x] Child lane did not mutate Linear state or workpad. Evidence: this checklist and final diff.
- [x] Child lane did not run full repo validation suites. Evidence: validation section below.
- [x] Child lane leaves changes uncommitted for parent patch export. Evidence: `git status --short`.

## Implementation Acceptance
- [x] `CO-196` style review-handoff incidents no longer stay parked in `In Review` with `provider_issue_review_promotion_action_required` / `multiple_attached_prs` only because closed `#508` and `#515` remain attached. Evidence: existing closed-prior-attempt review-promotion coverage in `orchestrator/tests/ProviderMergeCloseout.test.ts` remains green.
- [x] `CO-219` style review-handoff incidents no longer stay parked in `In Review` on generic `multiple_attached_prs` only because current `#523` coexists with auxiliary `#522`. Evidence: new `CO-226 ... blocking CO-219 handoff` regression in `orchestrator/tests/ProviderMergeCloseout.test.ts`.
- [x] Real ambiguity still remains explicit as `multiple_attached_prs` when more than one truthful current candidate remains. Evidence: new two-current-candidate regression preserves `conflicting_attached_pr_urls`.
- [x] Existing `CO-104` historical merged-attachment behavior and ordinary `Merging` closeout semantics remain intact. Evidence: full `ProviderMergeCloseout` suite passed.
- [x] The repair does not drift into "just `CO-104` again", "only a `Merging` bug", "only `CO-154`", or "only `CO-226`". Evidence: source diff changes only review-promotion cross-issue blocker wording.
- [x] Manual attachment cleanup is no longer the intended steady-state product path for these bounded shapes. Evidence: no detach/cleanup path added; selection continues with ignored/conflicting taxonomy.

## Validation
- [x] Child scoped JSON parse check. Evidence: `jq empty tasks/index.json docs/docs-freshness-registry.json`.
- [x] Child scoped protected-term check over the packet and mirrors. Evidence: `rg -n "provider_issue_review_promotion_action_required|multiple_attached_prs|In Review|review-handoff promotion|providerMergeCloseout.ts|providerIssueHandoff.ts|CO-196|CO-219|#515|closed #508|#523|#522|CO-104|CO-154|CO-226|manual attachment cleanup" docs/PRD-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/TECH_SPEC-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/ACTION_PLAN-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/tasks-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md .agent/task/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md`.
- [x] Child scoped whitespace / diff check on touched files. Evidence: `git diff --check -- docs/PRD-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/TECH_SPEC-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md docs/ACTION_PLAN-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/specs/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/tasks-linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md .agent/task/linear-9fc9fe23-bd44-4b72-9459-b5b809970bce.md tasks/index.json docs/TASKS.md docs/docs-freshness-registry.json`.
- [x] Parent focused `ProviderMergeCloseout` regressions for `CO-196` and `CO-219` style current-candidate selection. Evidence: `npx vitest run --config vitest.config.core.ts orchestrator/tests/ProviderMergeCloseout.test.ts -t "CO-226 blocking attachment"` and full `ProviderMergeCloseout` suite.
- [x] Parent handoff contract reviewed for `ProviderIssueHandoff`; no call-shape change was required because it already delegates to `runProviderReviewHandoffPromotion`. Evidence: source diff is confined to `providerMergeCloseout.ts` and tests.
- [x] Parent proof that true ambiguity still remains explicit as `multiple_attached_prs`. Evidence: new two-current-candidate regression expects `reason: 'multiple_attached_prs'` and `conflicting_attached_pr_urls`.
- [ ] Parent `node scripts/spec-guard.mjs --dry-run` after packet acceptance.

## Progress Log
- 2026-04-18: Bounded same-issue child lane created the `CO-237` docs-first packet and registry mirrors against fallback source anchor `ctx:sha256:8391bf9a067e2de9c1d2651dbe67acb9d3c43cf6bde71c5639ee057b9ca37dfc#chunk:c000001`. The expected shared source payload under `ctx:sha256:6300b9a26bbf277afc1b6ed096318a2372104963d90f62f7519ad74f90d9d6b0#chunk:c000001` was absent in this child checkout, so the packet is anchored on the protected issue wording plus current repo seams in `providerMergeCloseout.ts` and `providerIssueHandoff.ts`. The packet preserves the exact incident checksum `provider_issue_review_promotion_action_required`, `multiple_attached_prs`, `In Review`, `review-handoff promotion`, `CO-196`, closed `#508`, `#515`, `CO-219`, `#523`, and `#522`, and rejects framing this as just `CO-104` again, only a `Merging` bug, only `CO-154`, only `CO-226`, or manual attachment cleanup as the intended steady state.
- 2026-04-19: Reopened-attempt parent implementation fixed the live `CO-219` / `#522` blocker-wording shape by treating `blocking` as cross-issue blocker evidence during review-promotion selection, while preserving true `multiple_attached_prs` ambiguity when two current candidates remain.
