# ACTION PLAN - CO Codex CLI 0.119/0.120 Adoption and Spark File-Search Policy

## Summary
- Goal: decide and document CO's release-note-driven Codex CLI `0.119.0` / `0.120.0` adoption posture and restrict spark usage to file/codebase search only.
- Scope: docs-first packet, release-note/local CLI evidence, adoption matrix, spark policy docs/templates/defaults/tests, outputSchema decision, canary evidence, validation, review, and PR handoff.
- Assumptions: local `codex --version` remains `codex-cli 0.120.0`; cloud promotion remains blocked unless `CODEX_CLOUD_ENV_ID` is available or a policy-level waiver is recorded.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - Codex CLI `0.119.0`
  - Codex CLI `0.120.0`
  - latest stable
  - `gpt-5.3-codex-spark`
  - `explorer_fast`
  - file-search-only
  - codebase-search-only
  - MCP `outputSchema`
  - `tool_search` result ordering
  - app-server / exec-server remote control
  - `codex review`, `codex exec`, cloud canary, runtime-mode canary, CO-180
- Not done if:
  - the result is only a version-string edit
  - spark remains described as synthesis/planning/review/broad exploration capable
  - cloud gates are neither run nor explicitly blocked/waived
  - issue-required upstream surfaces lack adopt/hold/no-op/blocked classification
  - app-server/exec-server remote control is implied as provider-worker default
- Pre-implementation issue-quality review:
  - approved. The issue is a parity/alignment lane with explicit protected terms, a reference/current/target matrix, and strong non-goals. It is broader than CO-180 and narrower than remote-control implementation.

## Milestones & Sequencing
1. Claim issue, inspect live workflow states, create workpad, transition to `In Progress`, record `parallelize_now`, and launch the release-audit child lane.
2. Register the docs-first packet in `tasks/index.json`, `docs/TASKS.md`, `.agent/task/`, and `docs/docs-freshness-registry.json`.
3. Run docs-review before implementation and record manifest/fallback evidence.
4. Collect release-note and local CLI help evidence under the issue packet.
5. Write the adoption matrix and final promote/hold decision.
6. Update spark role policy across docs, templates, shipped skills, defaults setup, and focused drift guards.
7. Evaluate `outputSchema` support and update code/tests or document a source-backed no-op.
8. Run review-wrapper prompt transport, runtime-mode, required cloud canary, and cloud fallback canaries or exact blocker commands.
9. Run required validation, standalone review, elegance pass, open/attach PR, drain automated feedback, and hand off to `In Review`.

## Dependencies
- Official `openai/codex` GitHub release pages for `rust-v0.119.0` and `rust-v0.120.0`.
- Local Codex CLI installation.
- Cloud canary credentials/environment for required cloud contract, or explicit blocker/waiver evidence if absent.
- Existing docs-catalog and docs-hygiene posture checks.

## Validation
- Checks / tests:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - `node scripts/runtime-mode-canary.mjs`
  - required/fallback `npm run ci:cloud-canary` variants or exact blocker artifacts
  - review-wrapper scoped prompt transport canary
  - focused docs/defaults/doctor tests
  - `npm run build`
  - `npm run lint`
  - `npm run test`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `npm run repo:stewardship`
  - `node scripts/diff-budget.mjs`
  - `npm run pack:smoke` if CLI/package/skills/review-wrapper downstream paths changed
  - manifest-backed standalone review and explicit elegance pass
- Rollback plan: revert posture/policy edits and leave the `0.120.0` candidate audit plus spark-policy failure reason preserved in the task packet.

## Risks & Mitigations
- Risk: release-note changes get summarized without mapping to CO surfaces.
  - Mitigation: adoption matrix requires adopt/hold/no-op/blocked classification for each issue-required surface.
- Risk: file-search-only spark wording is fixed in docs but generated defaults still advertise broad use.
  - Mitigation: update defaults/templates and add focused tests.
- Risk: cloud canary absence makes the target look stale again.
  - Mitigation: policy names `0.120.0` as the latest stable candidate and records the blocker rather than leaving an unqualified `0.118.0`.
- Risk: outputSchema support causes broad MCP churn.
  - Mitigation: adopt only where the delegation tool surface has stable structured output shapes; otherwise document a source-backed no-op.
- Risk: repo-wide historical spec/docs freshness debt blocks unrelated feature-lane review handoff after the April 15 date boundary.
  - Mitigation: do not expand CO-183 into baseline repair; preserve the blocker evidence and hand it to CO-184.

## Approvals
- Docs-review: passed via `.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d-co-183-docs-review-r2/cli/2026-04-14T23-00-44-902Z-abb6e4bf/manifest.json`.
- Standalone review: passed as bounded-success via `../../.runs/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/cli/2026-04-14T22-49-28-802Z-039d36f2/review/telemetry.json`; scoped `--uncommitted` transport canary confirms the saved prompt artifact plus `--title` fallback remains necessary on Codex CLI `0.120.0`.
- Elegance review: passed with no code changes required via `out/linear-df69fabe-63c2-4b98-a226-9c37892b4f9d/manual/elegance-review.md`.
- Review handoff: blocked by latest spec/docs freshness failures after April 15 date boundary; CO-184 owns the out-of-scope historical packet baseline repair.
- Date: 2026-04-14
