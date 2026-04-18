# PRD - CO: reclaim / reclassify / re-admit plain released/not_active issues across Backlog -> Ready with a free slot

## Added by Bootstrap 2026-04-18

## Traceability
- Linear issue: `CO-240` / `ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`
- Task id: `linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd`
- Canonical spec: `tasks/specs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd.md`
- Shared source 0 anchor: `ctx:sha256:80949939d67126c2c2bb65ec2935ce53a96a87f8e4e7e3b5fd8ff2ecf48992d4#chunk:c000001`
- Source object id: `sha256:80949939d67126c2c2bb65ec2935ce53a96a87f8e4e7e3b5fd8ff2ecf48992d4`
- Context dir: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-co-240-docs-packet/cli/2026-04-18T05-23-04-716Z-7f3aae66/memory/source-0`
- Source payload: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-co-240-docs-packet/cli/2026-04-18T05-23-04-716Z-7f3aae66/memory/source-0/source.txt`
- Origin manifest: `.runs/linear-ddb81c93-87b2-4dff-b69b-33d7ae3c91cd-co-240-docs-packet/cli/2026-04-18T05-23-04-716Z-7f3aae66/manifest.json`
- Adjacent reclaim lanes:
  - `CO-181` fair fresh-discovery admission under retained/released residue
  - `CO-202` stale plain `Blocked` Ready reclaim
  - `CO-203` missing retained-run reclaim proof
  - `CO-212` completed-blocker reclaim

## Summary
`CO-240` covers the reclaim / reclassify / re-admit gap where `provider-intake-state.json` can retain a plain `released` / `provider_issue_released:not_active` row while live issue truth moves across `Backlog` and `Ready`. Even when there is a free slot / `max_allowed=3`, the control host can still leave that issue stranded instead of re-admitting it through the normal path. The issue body also carries forward `CO-236` as a protected adjacent contract that must remain distinct and preserved.

## User Request Translation
- Preserve the exact issue-body framing around `CO-236`, `Ready`, `Backlog`, `provider_issue_released:not_active`, `provider-intake-state.json`, free slot / `max_allowed=3`, and reclaim / reclassify / re-admit.
- Treat the problem as a bounded reclaim/admission truth gap: live issue state can return to `Ready` after `Backlog`, but stale released/not-active residue can still suppress re-admission.
- Keep the recovery on the normal control-host path; do not require manual launch, manual claim deletion, or a side-channel workflow move.
- Keep this broader than the stale-Blocked-only slice from `CO-202`; the `Backlog` / `Ready` reclassification path must also work.
- Keep this narrower than a generic max-concurrency or generic refresh-loop rewrite; the free slot / `max_allowed=3` evidence is proof that admission should be possible, not a license to redesign provider capacity semantics.

## Intent Checksum
- Protected terms and surfaces:
  - `CO-236`
  - `Ready`
  - `Backlog`
  - `provider_issue_released:not_active`
  - `provider-intake-state.json`
  - free slot / `max_allowed=3`
  - reclaim / reclassify / re-admit
  - `fresh_discovery`
  - `providerIssueHandoff.ts`
  - `providerLinearWorkflowStates.ts`
  - `co-status --format json`
- Nearby wrong interpretations to reject:
  - a generic `max-concurrency` explanation
  - a `manual-launch` workaround
  - a `stale-Blocked-only` reinterpretation
  - a generic `refresh-loop` reinterpretation
  - deleting or rewriting retained claim evidence as the product fix
  - treating `Backlog` -> `Ready` as an operator-only concern that bypasses normal reclaim/admission

## Parity / Alignment Matrix

| Surface | Current | Target |
| --- | --- | --- |
| Live issue state | A live issue can move across `Backlog` and `Ready` while provider-intake still reflects plain released/not-active residue. | Current live `Ready` truth becomes the reclaim / reclassify / re-admit signal through the normal path. |
| Retained plain released residue | `provider-intake-state.json` can retain `provider_issue_released:not_active` and leave the issue classified as non-admissible. | The row remains auditable, but it no longer suppresses re-admission once live issue truth is eligible again. |
| Free slot evidence | There can be a free slot / `max_allowed=3`, yet the issue still is not re-admitted. | The free slot evidence is enough for the eligible issue to be reconsidered and admitted; no generic cap rewrite is required. |
| Adjacent reclaim scope | `CO-202`, `CO-203`, and `CO-212` each fix narrower reclaim gaps. | `CO-240` preserves those slices and closes the `Backlog` / `Ready` reclassification + re-admit gap without collapsing into them. |
| Adjacent contract | `CO-236` remains referenced by the issue body as protected adjacency. | The new fix preserves `CO-236` instead of reopening or replacing it. |

## Acceptance Criteria
- A focused regression seeds plain `released` / `provider_issue_released:not_active` residue in `provider-intake-state.json` while the live issue moves from `Backlog` back to `Ready`.
- The reproduction includes free slot / `max_allowed=3` evidence so admission is available without a provider-capacity redesign.
- Refresh / reclaim / `fresh_discovery` reclassifies the stale released/not-active view against live `Ready` truth and re-admits the issue through the normal control-host path.
- No manual launch, manual claim deletion, or special-case workflow mutation is required.
- The fix is not limited to stale `Blocked` cache alone; the `Backlog` / `Ready` reclassification path is covered explicitly.
- Adjacent behavior from `CO-236`, `CO-202`, `CO-203`, `CO-212`, and the `CO-181` free-slot fairness contract remains preserved.

## Non-Goals
- No broad `max-concurrency` redesign.
- No `manual-launch` operator workaround as the shipped fix.
- No `stale-Blocked-only` narrowing that misses `Backlog` / `Ready` reclassification.
- No generic `refresh-loop` or lifecycle-health rewrite.
- No deletion of retained claim evidence from `provider-intake-state.json`.
- No child-lane implementation or test edits in this docs-only slice.

## Not Done If
- A live issue can return from `Backlog` to `Ready`, free slot / `max_allowed=3` exists, and the issue still is not reclaimed / reclassified / re-admitted.
- The fix only covers stale `Blocked` cache and leaves the `Backlog` / `Ready` path broken.
- The parent solution depends on `manual-launch` instead of normal control-host reclaim/admission.
- The explanation drifts into generic `max-concurrency` or generic `refresh-loop` behavior instead of the protected reclaim / reclassify / re-admit contract.
- `CO-236` adjacency is blurred, reopened, or replaced without explicit evidence.

## Metrics & Guardrails
- Primary success metrics:
  - focused coverage proves a plain released/not-active issue can be re-admitted after `Backlog` -> `Ready`
  - focused coverage proves one free slot / `max_allowed=3` is enough to admit the eligible issue
  - focused coverage proves retained audit state remains intact in `provider-intake-state.json`
- Guardrails:
  - no duplicate same-issue worker launch
  - no manual claim cleanup as the product path
  - no reopened request-burn or direct-read regression in preserved reclaim lanes
  - no drift into label/filter, backlog-policy, or lifecycle-health rewrites

## User Experience
- Operators can move or observe an issue across `Backlog` and `Ready` and expect the control host to re-admit it when the issue is truly eligible again.
- Operator-facing evidence in `provider-intake-state.json` stays useful for audit without trapping the issue behind stale released/not-active residue.
- Reviewers can evaluate the issue as a reclaim / reclassify / re-admit fix rather than a generic concurrency or refresh incident.

## Technical Considerations
- The parent implementation likely lives in the existing reclaim/admission seams rather than a new scheduler layer.
- The parent should preserve adjacent reclaim proofs from `CO-202`, `CO-203`, and `CO-212` while deciding whether the `Backlog` -> `Ready` correction belongs entirely in `providerIssueHandoff.ts` or needs a narrow workflow-state helper/shared classification seam.
- If `Backlog` -> `Ready` reclassification depends on same-cycle refetch behavior, the parent should reuse the existing bounded refetch pattern rather than invent a new mutation or admission path.

## Open Questions
- Does the narrowest parent fix live entirely in `providerIssueHandoff.ts`, or does the `Backlog` / `Ready` distinction need a small shared helper in `providerLinearWorkflowStates.ts`?
- Should the parent persist a dedicated reclaim / reclassify / re-admit reason string for this slice, or is existing refreshed `Ready` metadata sufficient once the issue is admitted again?
- Does the parent need focused same-cycle refetch coverage when `Backlog` becomes `Ready`, or can existing refresh ordering prove the behavior without another seam?

## Approvals
- Product: Linear issue `CO-240`
- Engineering: pending parent lane acceptance, docs-review, and implementation validation
- Design: N/A
