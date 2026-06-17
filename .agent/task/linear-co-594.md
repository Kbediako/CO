# Agent Task Mirror - CO-594

## Environment / Workspace Stamp
- Issue: `CO-594`
- Task id: `20260617-linear-co-594-co-594-consolidation`
- Worktree: `/Users/kbediako/.codex/worktrees/e405/CO`
- Branch: `kb/linear-consolidation-ponytail-refactor`
- Current date: `2026-06-17`

## Plan
- [x] Verify branch/status and isolate on `kb/linear-consolidation-ponytail-refactor`.
- [x] Verify Linear connector access.
- [x] Inventory open CO issues and create canonical `CO-594`.
- [x] Verify current Codex/OpenAI posture from local CLI and official docs.
- [x] Create docs-first packet.
- [x] Run docs-review before implementation edits. Evidence: `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/manifest.json`.
- [x] Complete Ponytail audit. Evidence: subagents `019ed39f-e649-7b93-9bf5-d960ac09759b`, `019ed3a0-0b1d-7680-8b48-8aa9a3ab90b0`.
- [x] Choose smallest safe refactor targets after docs-review. Targets: remove the dependency-missing custom TOML fallback parser from `orchestrator/src/cli/config/delegationConfig.ts`; remove the expired CO-485 review-wrapper legacy sandbox retry.
- [x] Implement behavior-preserving simplifications. Evidence: implementation subagents `019ed3a7-43f9-7391-86c0-7bae4b18cf4b`, `019ed3b1-868f-7703-8fa9-2da304881b66`; focused validation `npx vitest run --config vitest.config.core.ts orchestrator/tests/DelegationConfig.test.ts`, `npx vitest run --config vitest.config.core.ts tests/review-launch-attempt.spec.ts`, and `npx vitest run --config vitest.config.core.ts tests/run-review.spec.ts`.
- [x] Validate, review, and run elegance pass. Evidence: required checks passed, final enforce-mode standalone review was clean, pack smoke passed, and the elegance recheck found no remaining issue.

## Acceptance Criteria
- [x] `CO-594` preserves full source issue provenance fields and links source issues.
- [x] Docs-review passes before repo implementation edits. Evidence: `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/manifest.json`.
- [x] Subagent evidence exists for inventory, posture, audit, implementation, and validation/review. Evidence: validation/review subagents `019ed3ac-44c3-7103-a798-ecb8f3a67bfb`, `019ed3d0-3c38-7801-a08c-fad3599a0b56`, `019ed3d2-bb9e-77d0-af6d-6e7786003c3b`.
- [x] Final implementation slices are smaller/simpler than baseline and behavior-preserving. Evidence: deleted custom TOML subset fallback while preserving supported `@iarna/toml` parsing; removed expired legacy sandbox retry while preserving fail-closed review-wrapper behavior.

## Validation
- [x] `codex-orchestrator start docs-review --task 20260617-linear-co-594-co-594-consolidation-docs-review --format json`. Evidence: `.runs/20260617-linear-co-594-co-594-consolidation-docs-review/cli/2026-06-17T03-22-35-783Z-398da307/manifest.json`.
- [x] Required post-implementation checks after docs-review. Evidence: delegation guard, spec guard, build, lint, test, docs:check, docs:freshness, repo:stewardship, diff-budget with explicit override, standalone review, elegance review, and pack:smoke passed.

## Notes
- `CO-588` is historical predecessor only.
- `CO-490` remains blocked unless fresh cloud evidence changes.
- Official OpenAI latest-model docs name `gpt-5.5` latest; `xhigh` is kept only because this is a hard async agentic CO lane.
