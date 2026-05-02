---
id: 20260501-linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442
title: "CO-468 control-host accepted no-run pending revalidation recovery"
relates_to: docs/PRD-linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md
risk: high
owners:
  - Codex
last_review: 2026-05-01
related_action_plan: docs/ACTION_PLAN-linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md
task_checklists:
  - tasks/tasks-linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md
---

# TECH_SPEC - CO-468 control-host accepted no-run pending revalidation recovery

This file mirrors the canonical spec at `tasks/specs/linear-6d7e842c-b10a-42f5-a7e0-8a30a8dd9442.md`.

## Summary
- Objective: define the parent implementation contract for `control-host recovery/nudge/relaunch` when a Ready issue has `accepted/pending revalidation` residue with `run_id=null`, `launch_token=null`, `run_manifest_path=null`, and no manifest while WIP is below cap.
- Scope: recovery/nudge/relaunch classification, non-WIP handling for no-run accepted residue, 25s CLI recovery timeout behavior, and issue-family boundaries for CO-404/CO-406 versus CO-455/CO-459/CO-453.
- Constraints: child lane owns docs only; parent owns live `issue-context`, source inspection, implementation, validation, Linear state, workpad, PR lifecycle, docs-review, and handoff.

## Issue-Shaping Contract
- User-request translation carried forward: CO-468 is the control-host recovery path for a Ready issue with accepted/pending revalidation residue and no run/launch/manifest evidence. The parent fix must let recovery, nudge, or relaunch revalidate that row when WIP is below cap, without turning no-run accepted claims into WIP occupancy.
- Protected terms / exact artifact and surface names: `control-host recovery/nudge/relaunch`, `accepted/pending revalidation`, `Ready issue`, `run_id=null`, `launch_token=null`, `run_manifest_path=null`, `no manifest`, `WIP below cap`, `25s CLI recovery timeout`, `CO-404/CO-406 done family`, `provider-intake-state.json`, `provider_issue_rehydration_pending_revalidation`, `controlHostProviderWorkerRecoverCliShell.ts`, `providerIssueHandoff.ts`, `co-status --format json`, `/ui/data.json`, and `control-host-recovery:accepted-no-run-pending-revalidation:no-run-id-token-manifest`.
- Nearby wrong interpretations to reject: `CO-455 attach timeout with healthy manifests`, `CO-459 stale provider_intake projection`, `CO-453 child-lane tracker drift`, and any request to make no-run accepted claims consume WIP.
- Explicit non-goals carried forward: no implementation/test edits in this child lane, no Linear/GitHub/workpad/PR mutation, no broad provider workflow rewrite, no CO-404/CO-406 reopen, no CO-455/CO-459/CO-453 absorption.

## Readiness Gate
- Not done if:
  - a Ready issue with accepted/pending revalidation and `run_id=null`, `launch_token=null`, `run_manifest_path=null`, and no manifest still cannot recover, nudge, or relaunch when WIP is below cap
  - no-run accepted claims are made to consume WIP
  - the fix is classified as CO-455, CO-459, or CO-453
  - the 25s CLI recovery timeout hides the no-run residue shape or returns a generic attach-timeout answer
  - the canonical owner key is omitted
- Pre-implementation issue-quality review evidence:
  - 2026-05-01: child lane translated the parent prompt into a narrow recovery-residue contract. The issue is not plausibly satisfied by CO-404 alone because CO-404 is the timeout acknowledgement family; it is not plausibly satisfied by CO-406 alone because CO-406 is the accepted no-run non-WIP capacity family. CO-468 composes those done-family boundaries into a Ready-issue recovery path.
- Safeguard ownership split:
  - child owns docs-first packet and declared mirrors only
  - parent owns source/test edits, docs-review, Linear state, workpad, PR lifecycle, and validation

## Technical Requirements
1. Verify live Linear truth before implementation: CO-468 must be treated as a Ready issue unless parent `issue-context` proves otherwise.
2. Locate the control-host recovery, relaunch, and nudge paths that inspect provider-intake claims.
3. Classify accepted/pending revalidation residue with `run_id=null`, `launch_token=null`, `run_manifest_path=null`, and no manifest as non-WIP recovery residue.
4. Preserve WIP below cap truth and do not make no-run accepted claims consume WIP.
5. Preserve duplicate/occupancy protection for claims with real run evidence, launch token evidence, or manifest evidence.
6. Keep the `25s CLI recovery timeout` as an actionable operator result, not a healthy-manifest attach timeout.
7. Preserve CO-404 and CO-406 as done-family references and reject CO-455, CO-459, and CO-453 scope absorption.
8. Add focused parent-owned regressions for recover, relaunch, or nudge with accepted/no-run pending revalidation residue under WIP below cap.

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Control-host recovery/nudge/relaunch | Accepted/pending revalidation with no run id, token, or manifest cannot be recovered even when WIP is below cap. | remove fallback | CO-468 | Ready issue has `run_id=null`, `launch_token=null`, `run_manifest_path=null`, `no manifest`, and WIP below cap. | observed 2026-05-01 | 2026-05-01 | 0 days | Parent recovery path revalidates and relaunches, queues, clears residue, or reports an actionable no-op. | Focused recovery/nudge/relaunch regression with no-run pending revalidation residue. |
| Provider-intake audit state | Accepted/pending revalidation no-run claim remains visible after recovery timeout. | justify retaining fallback | CO-406 / CO-468 boundary | Recovery or launch evidence is absent, but operator audit still needs the retained claim. | CO-406 done family | 2026-05-01 | Non-expiring as non-occupancy audit state | Replace only if provider-intake gains an explicit non-occupancy recovery-residue state. | Status and admission tests prove visible but not WIP. |
| Recovery CLI timeout | CLI returns bounded recovery timeout instead of waiting indefinitely. | justify retaining fallback | CO-404 / CO-468 boundary | Recovery command does not complete inside the operator budget. | CO-404 done family | 2026-05-01 | Non-expiring supported timeout contract | Replace only with a stronger streamed progress/heartbeat contract. | Focused CLI recovery timeout test proves `25s CLI recovery timeout` is actionable and does not mask no-run recovery residue. |

- Durable retention evidence: accepted/no-run pending revalidation is retained only as non-WIP audit/revalidation state. The 25s recovery timeout is retained as an operator safety contract.
- Large-refactor check: parent may keep this as a narrow classifier if recovery, WIP, and timeout truth can share one predicate. Escalate to a broader refactor only if those authorities are split incompatibly.

## Architecture & Data
- Architecture / design adjustments:
  - prefer one recovery-residue classifier near provider-intake/admission/recovery code
  - thread the classifier through recover, relaunch, and nudge paths only where they need it
  - keep status/read-model changes limited to proof of the recovery classification
- Data model changes / migrations:
  - no migration expected
  - additive structured reason fields are allowed only if needed for operator-visible proof
- External dependencies / integrations:
  - Linear issue state
  - provider-intake claim fields
  - control-host CLI timeout handling
  - WIP cap accounting
  - status surfaces used for validation

## Validation Plan
- Child lane:
  - protected-term grep over packet files
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - `git diff --check` over declared touched files
- Parent lane:
  - docs-review before implementation
  - focused recover/relaunch/nudge regression for accepted no-run pending revalidation under WIP below cap
  - focused regression proving no-run accepted claims do not consume WIP
  - focused regression or no-touch proof preserving CO-404 25s timeout and CO-406 non-occupancy behavior
  - implementation gate, standalone review, elegance pass, PR checks, review feedback cleanup, ready-review drain, and Linear handoff

## Open Questions
- Should parent implement the recovery-residue classifier in `providerIssueHandoff.ts`, `controlHostProviderWorkerRecoverCliShell.ts`, or a shared helper feeding both?
- Should a 25s timeout return a distinct recovery-residue reason when no manifest exists, or is existing timeout output plus provider-intake proof sufficient?

## Approvals
- Reviewer: CO-468 provider worker
- Date: 2026-05-01
