---
id: <YYYYMMDD-unique>
title: <Short Title>
relates_to: <PRD or task reference>
risk: <low|medium|high>
owners:
  - <Name>
last_review: <YYYY-MM-DD>
---

## Added by Bootstrap (refresh as needed)

## Summary
- Objective:
- Scope:
- Constraints:

## Issue-Shaping Contract
- User-request translation carried forward:
- Protected terms / exact artifact and surface names:
- Nearby wrong interpretations to reject:
- Explicit non-goals carried forward:

## Parity / Alignment Matrix
- Required for parity/alignment lanes; otherwise state `Not applicable`.
- Current truth:
- Reference truth:
- Target truth / intended delta:
- Explicitly out-of-scope differences:

## Readiness Gate
- Not done if:
- Pre-implementation issue-quality review evidence:
- Safeguard ownership split:

## Technical Requirements
- Functional requirements:
- Non-functional requirements (performance, reliability, security):
- Interfaces / contracts:

## Fallback Expiry / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `<Yes|No>`.
- Required decision table:

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `<surface>` | `<branch or behavior>` | `remove fallback` / `expire fallback` / `justify retaining fallback` | `<issue or owner>` | `<activation condition>` | `<YYYY-MM-DD>` | `<YYYY-MM-DD>` | `<days/date>` | `<condition>` | `<test/gate/proof>` |

- For `justify retaining fallback`, also record contract name, owning surface, steady-state proof, tests/docs, and why it is not governed as an expiring fallback.
- Large-refactor check: record whether the policy in `docs/guides/fallback-expiry-and-refactor-policy.md` prefers a larger consolidation over another minor seam, and why.

## Architecture & Data
- Architecture / design adjustments:
- Data model changes / migrations:
- External dependencies / integrations:

## Validation Plan
- Tests / checks:
- Rollout verification:
- Monitoring / alerts:

## Open Questions
- 

## Approvals
- Reviewer:
- Date:
