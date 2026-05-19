# PRD - CO-538 verify create-follow-up labels with live post-mutation reads

## Traceability
- Linear issue: `CO-538` / `31958d87-e472-4c3f-a1e2-ab7adb3646b5`
- Task registry id: `20260514-linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5`
- MCP Task ID: `linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5`
- Source anchor: `ctx:sha256:0b7864e23887d0b023799ab19858917af9f490c4a4e62af57b5913aebe5861dc#chunk:c000001`
- Source payload: `.runs/linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5-docs-packet-local/cli/2026-05-14T03-58-04-115Z-a02ced60/memory/source-0/source.txt`
- Child lane manifest: `.runs/linear-31958d87-e472-4c3f-a1e2-ab7adb3646b5-docs-packet-local/cli/2026-05-14T03-58-04-115Z-a02ced60/manifest.json`
- Child lane note: the source payload path was not present in this child checkout, so this packet is anchored on the parent prompt, source anchor metadata, and local packet patterns.

## Summary
- Problem Statement: `codex-orchestrator linear create-follow-up` already has CO-482 live-id label assignment behavior, but post-mutation success can still rely on mutation-return labels, stale helper state, or cached projection rather than a fresh live verification read. That leaves room for a created or reused follow-up to report success even when the terminal live issue still has `labels: []` or is missing source-derived labels.
- Desired Outcome: after every create or canonical owner reuse path, `create-follow-up` performs post-create live verification and post-reuse live verification against live Linear issue state, repairs missing source-derived labels through a bounded `addedLabelIds` path when appropriate, and fails closed with issue id plus expected, observed, and missing labels when live verification still does not match.

## User Request Translation
- User intent / needs: make `codex-orchestrator linear create-follow-up` prove that labels actually landed on the live follow-up issue after creation or reuse, not merely that a create/update mutation returned a success-shaped payload.
- Success criteria / acceptance:
  - focused tests cover create success where the immediate live read still reports missing labels or `labels: []`.
  - create and canonical owner reuse paths both perform post-mutation live reads, preferably through the same live authority used by `live linear issue-context`.
  - missing live target labels trigger one bounded `addedLabelIds` repair attempt using expected source-derived labels.
  - persistent missing labels fail closed as a partial failure that includes follow-up issue id or identifier, expected labels, observed labels, and missing labels.
  - JSON and human terminal output expose terminal live labels, not mutation-return labels as authority.
  - focused tests cover propagation delay, reuse repair, persistent missing labels, and operator output.
  - existing CO-482 source-derived `labelIds` / `addedLabelIds` behavior remains intact.
- Constraints / non-goals:
  - docs packet only in this child lane; parent owns implementation, Linear/GitHub/PR lifecycle, and full validation.
  - no Linear label taxonomy changes.
  - no CO-400 projection semantics changes.
  - no provider admission or queue prioritization changes.
  - no manual labeling sweep.
  - no cached, local, or mutation-return labels as authority for clean success.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - `codex-orchestrator linear create-follow-up`
  - `CO-482`
  - `CO-537`
  - `labels: []`
  - `labelIds`
  - `addedLabelIds`
  - `live linear issue-context`
  - `post-create live verification`
  - `canonical owner reuse`
  - `source-derived labels`
  - `fail closed`
- Protected terms / exact artifact and surface names:
  - `codex-orchestrator linear create-follow-up`
  - `live linear issue-context`
  - `post-create live verification`
  - `post-reuse live verification`
  - `canonical owner reuse`
  - `labelIds`
  - `addedLabelIds`
  - `source-derived labels`
  - JSON terminal output
  - human terminal output
- Nearby wrong interpretations to reject:
  - treating mutation-return `labels` as final authority.
  - accepting cached issue labels, provider projection, workpad text, or old issue-context snapshots as clean-success proof.
  - changing Linear label taxonomy or adding a manual labeling sweep.
  - modifying CO-400 issue-context/cache projection semantics.
  - changing provider admission, WIP caps, queue prioritization, or PR lifecycle.
  - weakening CO-482 source-derived label assignment.

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Create path label proof | CO-482 can request labels through `labelIds`, but a mutation response can be stale or incomplete. | Live Linear issue state after creation is the authority for terminal labels. | `create-follow-up` reads the live follow-up after create, compares expected source-derived labels, and only reports success when live labels match. | Label taxonomy changes or manual labeling. |
| Canonical owner reuse | Reuse can attach missing labels with `addedLabelIds`, but returned data alone is not enough proof. | Reused owners must be verified against live issue state after repair. | Reuse path performs a live read, applies bounded `addedLabelIds` repair if needed, rereads, and fails closed on persistent missing labels. | Canonical owner matching redesign. |
| Output authority | JSON/human output may be tempted to show mutation-return labels. | Operators need terminal live label evidence. | JSON and human terminal output identify terminal live labels plus expected/observed/missing details on failure. | Workpad, PR, or provider admission output redesign. |
| Adjacent owner split | CO-482 owns source-derived label assignment and CO-537 is protected adjacent context. | CO-538 owns post-mutation live verification of those labels. | CO-482 semantics remain intact while CO-538 adds live verification and bounded repair. | CO-400 projection semantics or label catalog changes. |

## Current Evidence
- Parent prompt identifies CO-538 as a docs-first packet for `codex-orchestrator linear create-follow-up` post-create/post-reuse live label verification.
- Parent prompt explicitly protects `CO-482`, `CO-537`, `labels: []`, `labelIds`, `addedLabelIds`, `live linear issue-context`, `canonical owner reuse`, `source-derived labels`, and `fail closed`.
- Parent prompt explicitly rejects Linear label taxonomy changes, CO-400 projection semantics changes, provider admission/queue prioritization changes, manual labeling sweeps, and cached/mutation-return labels as authority.
- The child checkout did not contain the referenced source payload path, so this packet preserves the source anchor and records the missing-payload limitation.

## Not Done If
- `create-follow-up` can report clean success while the terminal live follow-up still has `labels: []` or lacks expected source-derived labels.
- Create or reuse paths rely on mutation-return labels, cached labels, provider projection, workpad text, or stale issue-context output as final authority.
- Missing live labels are repaired unboundedly or without a final live reread.
- Persistent missing labels lack follow-up issue id or identifier, expected labels, observed labels, and missing labels.
- JSON or human terminal output omits terminal live labels.
- The implementation changes Linear label taxonomy, CO-400 projection semantics, provider admission, queue prioritization, or unrelated lifecycle behavior.

## Goals
- Make post-create and post-reuse live label verification a first-class `create-follow-up` contract.
- Use live issue state as the only authority for terminal follow-up labels.
- Add bounded `addedLabelIds` repair for missing live labels, followed by a final live reread.
- Fail closed with operator-actionable expected, observed, and missing label evidence.
- Preserve CO-482 source-derived label assignment semantics.

## Non-Goals
- No Linear label taxonomy changes.
- No CO-400 issue-context/cache/projection semantics changes.
- No provider admission, WIP cap, or queue prioritization changes.
- No manual labeling sweep.
- No canonical owner matching redesign beyond live label verification and repair.
- No parent-owned Linear/GitHub/workpad/PR lifecycle work from this child lane.

## Stakeholders
- Product: CO operators relying on provider-created follow-up issues to carry correct labels immediately.
- Engineering: provider Linear workflow facade, CLI shell, and provider-worker maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary success metrics:
  - post-create live reads verify expected source-derived labels before clean success.
  - post-reuse live reads verify expected source-derived labels before clean success.
  - bounded `addedLabelIds` repair handles propagation or reuse drift without unbounded retries.
  - persistent missing labels fail closed with issue id, expected labels, observed labels, and missing labels.
  - JSON and human output cite terminal live labels.
- Guardrails / error budgets:
  - zero clean successes backed only by mutation-return or cached labels.
  - zero CO-400 projection changes.
  - zero label taxonomy changes.
  - zero provider admission or queue prioritization changes.
  - zero weakening of existing CO-482 source-derived label policy.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required; this is a bounded verification-and-repair extension to the existing `create-follow-up` helper, with live Linear still the single authority.
- Minor-seam decision: acceptable because CO-538 removes reliance on mutation-return or cached labels instead of adding another label authority.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Follow-up live label proof | Mutation-return or cached labels can be treated as terminal label authority. | `remove fallback` | CO-538 | `create-follow-up` creates or reuses a follow-up issue. | Existing pre-CO-538 behavior | 2026-05-14 | This issue | Clean success requires live post-mutation issue labels matching expected source-derived labels. | Focused create/reuse/repair/failure/output tests. |

- Contract name: `create-follow-up` live post-mutation label verification.
- Owning surface: provider Linear workflow facade and CLI shell.
- Steady-state proof: focused tests prove live reads, bounded repair, terminal live output, and fail-closed missing-label evidence.
- Tests/docs: `ProviderLinearWorkflowFacade.test.ts`, CLI output tests, and this CO-538 docs packet.
- Non-expiring rationale: live verification is the intended durable authority contract, not a temporary fallback.
- Adjacent owner note: CO-482 remains the source-derived label assignment owner; CO-400 projection semantics and label taxonomy remain out of scope.

## Open Questions
- Parent implementation should choose the exact live read helper, but it must be equivalent in authority to `live linear issue-context`.
- Parent implementation should decide whether propagation delay receives a single immediate repair plus reread or a short bounded wait before the repair; either path must fail closed with explicit evidence.

## Approvals
- Product: Linear CO-538.
- Engineering: provider-worker parent lane.
- Design: N/A.
