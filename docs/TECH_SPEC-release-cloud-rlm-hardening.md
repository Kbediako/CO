# TECH_SPEC - Release + Cloud + RLM Hardening (0962)

## Summary
- Objective: Hardening pass across release workflow, cloud canary preflight, symbolic deliberation artifacts, and docs/process ergonomics.
- Scope: workflow/script/runtime/test/docs updates only.
- Constraints: keep existing behavior stable and avoid broad refactors.

## Technical Requirements
- Functional requirements:
  - Release metadata resolution must produce a single canonical release tag for all trigger modes.
  - Release workflow must reject non-tag manual dispatches unless explicit valid tag input is provided.
  - Release workflow must detect unsigned or lightweight tags and fail before build/publish.
  - Prerelease tags (`-alpha`, `-beta`, `-rc`, etc.) must not publish to `latest`.
  - Cloud canary must fail fast when Codex CLI install/preflight fails.
  - Cloud canary script must validate remote branch existence before launch.
  - Symbolic deliberation artifact file writes should be optional via env flag.
  - `rlmRunner` console logging must be replaced by shared logger calls.
- Non-functional requirements:
  - Preserve deterministic CI output and actionable error messages.
  - Keep symbolic prompt/token budget behavior unchanged.
  - Maintain test and lint pass criteria.
- Interfaces / contracts:
  - New env knob: `RLM_SYMBOLIC_DELIBERATION_LOG` (`0` default, truthy to emit prompt/output/meta files).
  - Release workflow metadata step outputs canonical `tag` and `tag_version` for downstream jobs.
  - Release workflow requires CI signer material via repository secrets: `RELEASE_SIGNING_PUBLIC_KEYS` (GPG) or `RELEASE_SIGNING_ALLOWED_SIGNERS` (SSH).

## Scope Boundaries
- Docs/process ergonomics scope is intentionally limited to:
  - a micro-task path policy section
  - downstream skills release/install guidance

## Architecture and Data
- Architecture / design adjustments:
  - Consolidate release-tag parsing in one workflow step and propagate via outputs.
  - Add cloud preflight branch check prior to orchestrator start command.
  - Gate deliberation artifact persistence behind a runtime option derived from env.
- Data model changes / migrations:
  - No persistent schema migrations.
  - Symbolic state may omit deliberation `artifact_paths` when logging is disabled.
- External dependencies / integrations:
  - GitHub Actions runtime tools (`git`, `gh`, `npm`).

## Validation Plan
- Tests / checks:
  - Update symbolic tests to cover deliberation artifact logging toggle and final_var/output_var planner hints.
  - Execute full guardrail command chain from AGENTS.
- Rollout verification:
  - Validate workflow YAML with repository checks.
  - Validate cloud canary script behavior via unit-style assertions (existing script execution in CI lane).
- Monitoring / alerts:
  - Review release workflow run summaries and cloud canary step summary output.

## Open Questions
- None blocking.

## Approvals
- Reviewer: Codex (self)
- Date: 2026-02-14
