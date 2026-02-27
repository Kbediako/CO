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

## Acceptance Evidence
- Runtime findings closure (cloud/default compatibility + canary env sanitization):
  - `.runs/0984-pr-263-codex-feedback-followup/cli/2026-02-27T06-03-10-274Z-c519009a/manifest.json`
  - `out/0984-pr-263-codex-feedback-followup/manual/final-05-test-rerun6.log`
  - `out/0984-pr-263-codex-feedback-followup/manual/pre-pr-targeted-tests-3.log`
- Root cause + prevention controls:
  - `.runs/0984-pr-263-codex-feedback-followup/cli/2026-02-27T06-03-10-274Z-c519009a/manifest.json`
  - `out/0984-pr-263-codex-feedback-followup/manual/pr-263-root-cause.md`
- Merge-discipline control updates:
  - `.runs/0984-pr-263-codex-feedback-followup/cli/2026-02-27T06-03-10-274Z-c519009a/manifest.json`
  - `AGENTS.md`
  - `docs/AGENTS.md`

## Risks & Mitigations
- Risk: process changes are documented but not consistently applied.
  - Mitigation: encode merge-readiness checks explicitly in task checklist evidence requirements.

## Approvals
- Reviewer: self-approved (task owner)
- Date: 2026-02-27
