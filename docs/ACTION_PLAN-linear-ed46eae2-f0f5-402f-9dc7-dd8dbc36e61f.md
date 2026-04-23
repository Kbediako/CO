# ACTION PLAN - CO Codex CLI 0.123.0 Posture and Next-Release Target Audit

## Summary
- Goal: decide and document whether Codex CLI `0.123.0` can become CO's next-release target, or whether `0.122.0` remains the held candidate.
- Scope: release/npm evidence, help-surface comparison, runtime/cloud canaries, policy/task story update, validation/review handoff.
- Assumptions: release-facing marketplace smoke remains on the current `0.122.0` `codex plugin marketplace add` baseline unless a later lane promotes a newer candidate with clean cloud gates.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `CO-322`, `rust-v0.123.0`, `@openai/codex@0.123.0`, `0.122.0`, `0.118.0`, `node scripts/runtime-mode-canary.mjs`, required/fallback cloud-canary commands, `docs/guides/codex-version-policy.md`.
- Not done if: release posture claims latest stable without current evidence; pins move to `0.123.0` without clean cloud gates; CO-314/315/316 work is pulled into this lane.
- Pre-implementation issue-quality review: approved on 2026-04-23 after current evidence showed the lane must record a hold decision rather than a release-prep expansion.

## Milestones & Sequencing
1. Create/refresh the CO-322 docs-first packet, task registry, and workpad.
2. Capture official GitHub release and npm registry evidence for `0.123.0`.
3. Compare `0.123.0` help surfaces with `0.122.0`, including marketplace/plugin assumptions.
4. Run runtime-mode canary and required/fallback cloud-canary contracts using a temporary `@openai/codex@0.123.0` install on PATH.
5. Update `docs/guides/codex-version-policy.md` and `docs/TASKS.md` with the final promote/hold decision.
6. Run validation and manifest-backed review/elegance gates; attach PR and drain automated feedback before review handoff.

## Dependencies
- GitHub release metadata for `openai/codex`.
- npm registry metadata for `@openai/codex`.
- Candidate CLI execution through temporary npm prefix `/tmp/co-322-codex-0123-prefix`.
- Cloud canary environment id `6999395fcc448191b865917084f21c6f`.
- Current-main docs-check and docs-freshness baseline after CO-324.

## Validation
- Checks / tests: `npm run build`; `node scripts/runtime-mode-canary.mjs`; required cloud canary; fallback cloud canary; standard repo gates where baseline allows.
- Rollback plan: revert CO-322 docs/policy changes and leave CO-269 `0.122.0` posture unchanged if evidence is insufficient or review rejects the hold framing.

## Risks & Mitigations
- Risk: `0.123.0` npm latest is mistaken for promotable release posture.
- Mitigation: policy explicitly separates official/npm audit evidence from promotion gates.
- Risk: marketplace release smoke is moved to `0.123.0` just because its plugin marketplace surface is compatible.
- Mitigation: record that 0.123.0 has no marketplace regression versus the current `0.122.0` plugin-marketplace baseline, but keep release-facing smoke on `0.122.0` because cloud gates failed.
- Risk: fallback success is mistaken for full 0.123.0 promotion evidence.
- Mitigation: record the exact required-cloud blocker separately from the clean expected MCP fallback contract.

## Approvals
- Reviewer: parent provider worker issue-quality review.
- Date: 2026-04-23.
