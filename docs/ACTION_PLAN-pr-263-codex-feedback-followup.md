# ACTION_PLAN - PR 263 Codex Feedback Follow-up (0984)

## Summary
- Goal: close PR #263 feedback gaps and prevent recurrence with minimal code + process hardening.
- Scope: docs-first scaffolding, focused runtime/canary fixes, targeted tests, full validation, PR lifecycle completion.
- Assumptions: runtime provider architecture from 0981/0983 remains intact.

## Milestones & Sequencing
1) Docs-first + delegated analysis
- Create 0984 PRD/TECH_SPEC/ACTION_PLAN + checklist mirrors + index/registry updates.
- Capture delegated root-cause and implementation-plan evidence.

2) Implementation
- Fix cloud implicit-default runtime compatibility behavior.
- Sanitize runtime override env vars in canary baseline.
- Add regression tests.

3) Validation + PR lifecycle
- Run ordered validation gates (1-10) with logs in `out/0984-pr-263-codex-feedback-followup/manual/`.
- Open follow-up PR, respond in-thread, wait for post-green quiet window with actionable-thread checks, merge if unblocked.

## Dependencies
- Existing runtime selection/provider code and canary script.
- GitHub review APIs via `gh`.

## Validation
- Checks / tests: ordered 1-10 guardrail chain plus targeted regression tests.
- Rollback plan:
  - Revert follow-up patch and keep `--runtime-mode cli` as immediate break-glass.

## Risks & Mitigations
- Risk: process changes are documented but not consistently applied.
  - Mitigation: encode merge-readiness checks explicitly in task checklist evidence requirements.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-27
