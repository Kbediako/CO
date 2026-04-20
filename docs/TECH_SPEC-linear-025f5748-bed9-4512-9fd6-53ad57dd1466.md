---
id: 20260420-linear-025f5748-bed9-4512-9fd6-53ad57dd1466
title: "CO-266 blocked terminal blocker cleanup advisory"
relates_to: docs/PRD-linear-025f5748-bed9-4512-9fd6-53ad57dd1466.md
risk: high
owners:
  - Codex
last_review: 2026-04-20
---

# TECH_SPEC: CO-266 blocked terminal blocker cleanup advisory

## Scope

This spec defines the implementation contract for `CO-266`. The child lane owns only the docs-first packet and registry mirrors. The parent lane owns implementation, Linear state, workpad updates, validation, PR creation, review lifecycle, and merge.

The target behavior is a `read-only advisory` that surfaces `Blocked issues` whose `terminal blockers` make them plausible `ready-to-unblock candidate` or `duplicate-cleanup candidate` items. It must not auto-close, transition, relaunch, or otherwise mutate Linear state.

## Source And Evidence

- Linear issue: `CO-266`
- Issue id: `025f5748-bed9-4512-9fd6-53ad57dd1466`
- Source anchor: `ctx:sha256:cd9f197bda0c6e6ad7bdb511952c54337b8582a1789b66f97d0a3192d8e4d29e#chunk:c000001`
- Declared source payload: `.runs/linear-025f5748-bed9-4512-9fd6-53ad57dd1466-docs-packet/cli/2026-04-19T21-54-28-881Z-fe2b535a/memory/source-0/source.txt`
- Declared manifest: `.runs/linear-025f5748-bed9-4512-9fd6-53ad57dd1466-docs-packet/cli/2026-04-19T21-54-28-881Z-fe2b535a/manifest.json`
- Canonical owner key: `blocked-terminal-blocker-cleanup-advisory`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=blocked-terminal-blocker-cleanup-advisory`
- Source caveat: the source payload available to this lane carries run metadata plus issue id, identifier, and updated_at only. This spec preserves the parent-provided issue-shaping contract in the child-lane instructions; no Linear mutation was performed.

## Protected Contract

The protected issue terms are:

- `Blocked issues`
- `terminal blockers`
- `operator-autopilot`
- `duplicate-cleanup candidate`
- `ready-to-unblock candidate`
- `read-only advisory`
- `blocked-terminal-blocker-cleanup-advisory`
- `codex-orchestrator:canonical-owner-key=blocked-terminal-blocker-cleanup-advisory`
- `issue id`
- `live state`
- `blocker list`
- `canonical/duplicate hints`
- `recommended action`
- `CO-259`

## Current / Reference / Target Matrix

| Surface | Current | Reference | Target |
| --- | --- | --- | --- |
| Blocked issue cleanup visibility | `Blocked issues` can remain hidden after blockers become terminal. | Operators need evidence-backed cleanup and unblock candidates. | Emit operator-visible advisory records for all-terminal blocker cases. |
| Terminal blocker semantics | Terminal blocker truth may not produce queue hygiene guidance. | Completed/canceled/duplicate blockers are not active work blockers. | Treat all-terminal blocker lists as advisory-eligible, not auto-actionable. |
| Non-terminal blocker semantics | Non-terminal blockers keep an issue blocked. | Live blockers are authoritative. | Any non-terminal or unknown blocker suppresses `ready-to-unblock candidate`. |
| Advisory evidence | No required evidence field contract exists for this issue shape. | Operators need audit-ready fields. | Emit `issue id`, `live state`, `blocker list`, `canonical/duplicate hints`, and `recommended action`. |
| Duplicate/canonical cleanup | CO-259 owns canonical owner key reuse. | Owner reuse uses exact keys and markers. | Reuse CO-259-compatible key `blocked-terminal-blocker-cleanup-advisory`; do not replace CO-259. |
| Mutation behavior | Existing worker/Linear helpers own mutation. | Advisory should not surprise-mutate. | Keep generation read-only; parent-owned mutation remains explicit and separate. |

## Readiness Gate

- Not done if:
  - advisory generation auto-closes, auto-deduplicates, unblocks, relaunches, or transitions issues
  - any non-terminal blocker can be treated as `ready-to-unblock candidate`
  - required evidence fields are missing from advisory output
  - CO-259 canonical-owner reuse is replaced or bypassed
  - `duplicate-cleanup candidate` and `ready-to-unblock candidate` are indistinguishable
- Pre-implementation issue-quality review evidence:
  - 2026-04-20: child-lane review accepted the scope as a read-only operator advisory for `Blocked issues` with all `terminal blockers`. The issue is not an auto-close lane, not a blocker-semantics weakening lane, not a direct relaunch lane, and not a replacement for CO-259 canonical-owner reuse. The micro-task path is ineligible because correctness depends on exact protected terms, exact evidence fields, and exact non-goals.
- Safeguard ownership split:
  - child lane owns only the packet files and listed registry/checklist mirrors
  - parent lane owns implementation, focused tests, docs-review, validation, Linear/workpad reconciliation, PR lifecycle, and patch integration

## Technical Requirements

1. Select only live `Blocked issues` for advisory consideration.
2. Read each candidate's current `blocker list` from live or parent-approved authoritative issue state.
3. Classify blockers as terminal, non-terminal, or unknown.
4. Emit no `ready-to-unblock candidate` when any blocker is non-terminal or unknown.
5. Emit an advisory candidate when every blocker is terminal.
6. Include the required evidence fields in every advisory candidate:
   - `issue id`
   - `live state`
   - `blocker list`
   - `canonical/duplicate hints`
   - `recommended action`
7. Classify the `recommended action` as:
   - `ready-to-unblock candidate` when terminal blocker evidence suggests the issue can return to normal queue review
   - `duplicate-cleanup candidate` when exact duplicate/canonical evidence suggests operator duplicate cleanup
   - `read-only advisory` or held state when evidence is insufficient for either stronger recommendation
8. Keep the advisory output read-only. It must not call Linear mutation helpers as part of generation.
9. Preserve CO-259 canonical-owner reuse. If parent creates or reuses a follow-up owner, use `blocked-terminal-blocker-cleanup-advisory` through the existing exact-key marker path.
10. Keep implementation narrow to parent-selected inspection and operator-facing projection seams.

## Architecture & Data

- Architecture / design adjustments:
  - Parent should place classification near the existing issue/blocker read path and surface results through `operator-autopilot` or an adjacent read-model output.
  - Advisory records should be machine-checkable and deterministic enough for focused tests.
  - Unknown or stale blocker data should fail closed to no actionable recommendation.
  - Canonical owner hints should be evidence, not mutation authority.
- Data model changes / migrations:
  - No database migration expected.
  - Additive advisory output fields only.
  - No changes to CO-259 marker semantics.
- External dependencies / integrations:
  - Linear issue/blocker read data.
  - Existing CO-259 canonical-owner reuse path when follow-up ownership is needed.
  - Parent-selected operator-visible output surface.

## Validation Plan

- Child-lane checks:
  - `jq empty tasks/index.json docs/docs-freshness-registry.json`
  - protected-term `rg` across the touched packet and registry files
  - `git diff --check` scoped to touched docs and registries
  - trailing-whitespace check scoped to touched files
- Parent-lane checks:
  - focused classification tests for all-terminal blockers
  - focused classification tests for mixed terminal and non-terminal blockers
  - focused tests that required evidence fields are present
  - focused tests that advisory generation performs no Linear mutation
  - focused tests that canonical owner handoff remains CO-259-compatible
- Rollout verification:
  - demonstrate at least one `ready-to-unblock candidate` shape
  - demonstrate at least one `duplicate-cleanup candidate` shape or a held advisory with missing exact duplicate evidence
  - demonstrate that non-terminal blockers suppress actionable recommendations

## Wrong Interpretations To Reject

- Do not auto-close issues by default.
- Do not weaken non-terminal blocker semantics.
- Do not relaunch `Blocked issues` directly.
- Do not replace CO-259 canonical-owner reuse.
- Do not make fuzzy duplicate detection authoritative.
- Do not hide the required evidence fields behind prose-only logs.

## Non-Goals

- No automatic Linear transition or close behavior.
- No automatic issue relaunch from `Blocked`.
- No broad scheduler or queue-ranking redesign.
- No replacement for CO-259 exact canonical owner markers.
- No implementation or test edits in this child lane.

## Open Questions

- Parent should define the exact terminal-state list after reading current Linear workflow state types.
- Parent should decide whether `recommended action` is a single enum or ordered recommendation list.
- Parent should decide whether advisory output lives in the latest `operator-autopilot` result, the runtime read model, or both.

## Approvals

- Reviewer: bounded same-issue docs child lane self-review.
- Date: 2026-04-20.
