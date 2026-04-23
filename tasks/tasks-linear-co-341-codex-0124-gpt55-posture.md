# Task Checklist - CO: Re-audit Codex CLI 0.124.0 posture and GPT-5.5 hook/config alignment

- Linear Issue: `CO-341`
- MCP Task ID: `linear-co-341-codex-0124-gpt55-posture`
- Primary PRD: `docs/PRD-linear-co-341-codex-0124-gpt55-posture.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-co-341-codex-0124-gpt55-posture.md`
- Task spec: `tasks/specs/linear-co-341-codex-0124-gpt55-posture.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-co-341-codex-0124-gpt55-posture.md`

## Docs-First
- [x] CO-341 validated as the canonical `0.124.0` / `gpt-5.5` posture lane. Evidence: subagent `019dbbaf-b4cc-7791-a7ff-c8d262454e20` final report.
- [x] PRD drafted. Evidence: `docs/PRD-linear-co-341-codex-0124-gpt55-posture.md`.
- [x] TECH_SPEC drafted and registered. Evidence: `docs/TECH_SPEC-linear-co-341-codex-0124-gpt55-posture.md`, `tasks/specs/linear-co-341-codex-0124-gpt55-posture.md`, `tasks/index.json`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-co-341-codex-0124-gpt55-posture.md`.
- [x] Registry mirrors updated. Evidence: `docs/TASKS.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, `.agent/task/linear-co-341-codex-0124-gpt55-posture.md`.
- [x] Issue-quality review captured. Evidence: task/spec notes and `tasks/index.json` approval entry.

## Current Truth
- [x] Local Codex identity checked. Evidence: `codex-cli 0.124.0` from `codex --version`.
- [x] Local `gpt-5.5` exec smoke passed after config cleanup. Evidence: `codex exec --ephemeral --json -m gpt-5.5 "Reply with OK only."` returned `OK`.
- [x] Targeted local config/hook drift patched. Evidence: `/Users/kbediako/.codex/config.toml` no longer carries unknown `skills`, `voice_transcription`, or `remote_connections` feature keys and notify points at the installed Computer Use `1.0.758` client.
- [x] Command/release/model evidence captured under `out/linear-co-341-codex-0124-gpt55-posture/manual/`. Evidence: `out/linear-co-341-codex-0124-gpt55-posture/manual/command-surface/`.
- [x] Residual plugin-manifest warnings classified as CO-owned or local-only. Evidence: CO-341 command-surface logs show the warnings come from local temporary plugin cache state, not CO-owned plugin manifests.

## Posture Implementation
- [x] Runtime-mode canary completed or blocked with evidence. Evidence: `out/linear-co-341-codex-0124-gpt55-posture/manual/runtime-mode-canary-final/runtime-canary-summary.json` reports all four scenario checks `20/20` and `ready_for_default_flip=true`.
- [x] Review/provider/delegation surfaces completed or blocked with evidence. Evidence: `codex-orchestrator review` ran under Codex `0.124.0`, `model: gpt-5.5`, appserver runtime, and `xhigh` at `.runs/linear-co-341-codex-0124-gpt55-posture/cli/2026-04-23T19-49-48-421Z-1c49182e/review/output.log`; delegated evidence manifests `.runs/linear-co-341-codex-0124-gpt55-posture-delegation-evidence/cli/2026-04-23T19-28-32-535Z-da963fef/manifest.json`, `.runs/linear-co-341-codex-0124-gpt55-posture-delegation-evidence/cli/2026-04-23T19-29-55-629Z-b8ba3bc3/manifest.json`, and `.runs/linear-co-341-codex-0124-gpt55-posture-delegation-evidence/cli/2026-04-23T19-30-00-399Z-63c7496a/manifest.json` succeeded.
- [ ] Cloud-required and cloud-fallback contracts completed or blocked with evidence.
- [x] Marketplace/pack-smoke surfaces completed or blocked with evidence. Evidence: `MCP_RUNNER_TASK_ID=linear-co-341-codex-0124-gpt55-posture npm run pack:smoke` passed, including marketplace add/install/status coverage.
- [x] Version policy and docs mirrors updated if promotion is GO. Evidence: `docs/guides/codex-version-policy.md`, `AGENTS.md`, `docs/AGENTS.md`, `README.md`, `docs/README.md`, and `docs/public/downstream-setup.md`.
- [x] Default config generation/template updated if promotion is GO. Evidence: `orchestrator/src/cli/codexDefaultsSetup.ts`, `templates/codex/.codex/config.toml`, `templates/codex/.codex/agents/awaiter-high.toml`, and `templates/codex/.codex/agents/worker-complex.toml`.
- [x] Workflow pins and pack-smoke tests updated if promotion is GO. Evidence: `.github/workflows/cloud-canary.yml`, `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, and `tests/pack-smoke.spec.ts`.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed with CO-341 delegation manifests present.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed after task-spec frontmatter refresh.
- [x] `npm run build`. Evidence: passed after the role-migration review fix.
- [x] `npm run lint`. Evidence: passed with the existing `DelegationMcpHealth.test.ts` warnings only.
- [x] `npm run test`. Evidence: 350 files / 4695 tests passed.
- [x] `npm run docs:check`. Evidence: passed after CO-341 evidence/checklist updates.
- [x] `npm run docs:freshness`. Evidence: passed after updating `skills/collab-subagents-first/SKILL.md` and its registry row.
- [x] `npm run repo:stewardship`. Evidence: 5691 tracked files, 0 action-required.
- [x] `node scripts/diff-budget.mjs`. Evidence: passed with CO-341 scope override (`31` files, `999` lines).
- [x] `FORCE_CODEX_REVIEW=1 npm run review`. Evidence: `.runs/linear-co-341-codex-0124-gpt55-posture/cli/2026-04-23T19-49-48-421Z-1c49182e/review/output.log`; reviewer P2s were addressed by adding review/delegation evidence and keeping cloud open until the branch cloud canaries complete.
- [x] `npm run pack:smoke`. Evidence: passed after updating the remaining shipped-skill `0.123.0` reference.
- [x] Explicit elegance/minimality pass recorded. Evidence: post-review patch was limited to role-specific migration, shipped-skill stale posture wording, and task evidence updates; no new abstraction added.

## Linear Monitoring
- [x] CO-341 created and moved to In Progress.
- [x] CO-341 related to CO-337, CO-338, CO-340, and CO-316.
- [x] CO In Progress count validated at four after CO-338 entered In Progress.
- [x] CO-337 terminal criteria checked. Evidence: Linear monitor subagent `019dbbca-a03e-7c11-b4a0-430606643181` reports CO-337 is `Done`, PR `#628` merged, and checks passed.
- [x] CO-338 terminal criteria checked. Evidence: Linear monitor subagent `019dbbca-a03e-7c11-b4a0-430606643181` reports CO-338 remains `In Progress` because `npm view @kbediako/codex-orchestrator` still reports `latest = 0.1.38` and release run `24852631649` failed before publish.
- [x] CO-340 terminal criteria checked. Evidence: Linear monitor subagent `019dbbca-a03e-7c11-b4a0-430606643181` reports CO-340 remains `Blocked`; CO-341 owns the canonical `gpt-5.5` posture decision and CO-342 tracks fallback cloud-canary baseline debt.
- [ ] CO-341 terminal criteria checked.

## Notes
- CO-338 remains the release publish blocker and must not be closed by this posture lane.
- `explorer_fast` remains the explicit `gpt-5.3-codex-spark` file/codebase search-only exception.
- Do not emit `CO_ORCHESTRATOR_STOP: ...` unless the monitored issue set is terminal or a genuine hard blocker is reached.
