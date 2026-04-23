# Task Checklist - linear-4a684a5e-64b0-47fb-835a-d792eba29071

- Linear Issue: `CO-341` / `4a684a5e-64b0-47fb-835a-d792eba29071`
- MCP Task ID: `linear-4a684a5e-64b0-47fb-835a-d792eba29071`
- Primary PRD: `docs/PRD-linear-4a684a5e-64b0-47fb-835a-d792eba29071.md`
- TECH_SPEC: `docs/TECH_SPEC-linear-4a684a5e-64b0-47fb-835a-d792eba29071.md`
- Task spec: `tasks/specs/linear-4a684a5e-64b0-47fb-835a-d792eba29071.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4a684a5e-64b0-47fb-835a-d792eba29071.md`

## Docs-First
- [x] PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, and `.agent` mirror drafted. Evidence: docs packet paths above.
- [x] Pre-implementation issue-quality review notes captured before implementation. Evidence: `tasks/specs/linear-4a684a5e-64b0-47fb-835a-d792eba29071.md`.
- [x] `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` mirror this packet. Evidence: registry updates for `20260424-linear-4a684a5e-64b0-47fb-835a-d792eba29071`.
- [ ] Docs-review evidence captured before implementation. Evidence: pending child stream.

## Workflow
- [x] `linear issue-context` inspected live team states before active work. Evidence: packaged `linear issue-context --issue-id 4a684a5e-64b0-47fb-835a-d792eba29071`.
- [x] Issue was already in live started state `In Progress`. Evidence: issue-context output.
- [x] Exactly one same-turn parallelization decision recorded. Evidence: packaged `linear parallelization --decision parallelize_now --reason independent_scope_available`.
- [x] Same-issue child lane `source-evidence` completed successfully before turn end. Evidence: `.runs/linear-4a684a5e-64b0-47fb-835a-d792eba29071-source-evidence/cli/2026-04-23T19-09-21-468Z-48bafb2b/manifest.json`; zero-byte patch rejected as advisory.
- [x] Exactly one persistent `## Codex Workpad` comment is kept current. Evidence: Linear comment `7d6443c6-706b-4485-85ad-b737192f8e59`.
- [x] Shared root left untouched because it is dirty on `linear/co-278-refresh-spec-guard-baseline`. Evidence: `git -C /Users/kbediako/Code/CO status --short --branch`.
- [x] CO in-progress cap checked. Evidence: root `co-status --format json` reported `running=3`, `issues=3`, `max_allowed=3`, active `CO-338`, `CO-341`, `CO-339`.

## Source And Local Audit
- [x] Official `rust-v0.124.0` release facts captured. Evidence: `out/linear-4a684a5e-64b0-47fb-835a-d792eba29071/manual/codex-0124-source-evidence.md`.
- [x] Official Codex model, CLI model/reasoning, hooks, and config docs captured. Evidence: source evidence file and OpenAI docs MCP fetches.
- [x] `codex --version` captured. Evidence: `out/linear-4a684a5e-64b0-47fb-835a-d792eba29071/manual/local-probes/codex-version.log`.
- [x] `npm view @openai/codex version` captured. Evidence: `out/linear-4a684a5e-64b0-47fb-835a-d792eba29071/manual/local-probes/npm-openai-codex-version.log`.
- [x] `codex login status` captured. Evidence: `out/linear-4a684a5e-64b0-47fb-835a-d792eba29071/manual/local-probes/codex-login-status.log`.
- [x] `gpt-5.5` / `xhigh` top-level `codex exec` smoke passed. Evidence: `out/linear-4a684a5e-64b0-47fb-835a-d792eba29071/manual/local-probes/codex-exec-gpt55-xhigh-ok.jsonl`.
- [x] `gpt-5.5` / `xhigh` delegated subagent smoke passed. Evidence: `out/linear-4a684a5e-64b0-47fb-835a-d792eba29071/manual/local-probes/codex-exec-gpt55-xhigh-delegated.jsonl`.
- [x] `gpt-5.5` / `xhigh` direct review-model smoke passed. Evidence: `out/linear-4a684a5e-64b0-47fb-835a-d792eba29071/manual/local-probes/codex-review-gpt55-xhigh-smoke.log`.
- [x] Local command surfaces captured: `exec`, `exec resume`, `review`, `login --device-auth`, `app-server`, `mcp`, `plugin`, `features`, and `plugin marketplace`. Evidence: `out/linear-4a684a5e-64b0-47fb-835a-d792eba29071/manual/local-probes/`.
- [x] Local config warning keys and hook path inspected. Evidence: live `~/.codex/config.toml` has no `remote_connections`, `skills`, or `voice_transcription`; `notify` points at executable computer-use `1.0.758`; `~/.codex/hooks.json` contains the CO stop hook.

## Runtime And Cloud Gates
- [x] App-server/local runtime surface recorded for current provider worker. Evidence: provider manifest runtime `appserver` / `AppServerRuntimeProvider`.
- [ ] Provider-worker `codex exec` / `codex exec resume` seam probed or blocked. Evidence: pending final decision note.
- [x] Runtime-mode canary pre-build blocker captured. Evidence: `out/linear-4a684a5e-64b0-47fb-835a-d792eba29071/manual/runtime-mode-canary/runtime-mode-canary.log` shows missing packaged `dist/bin/codex-orchestrator.js`.
- [ ] Runtime-mode canary rerun after build. Evidence: pending.
- [x] Required cloud canary pre-build blocker captured. Evidence: `out/linear-4a684a5e-64b0-47fb-835a-d792eba29071/manual/cloud-canary-required/cloud-canary-required.log` shows missing packaged `dist/bin/codex-orchestrator.js`.
- [ ] Required cloud canary rerun after build or exact blocker. Evidence: pending.
- [ ] Cloud fallback contract rerun after build or exact blocker. Evidence: pending.

## Implementation
- [ ] Final hold/promote/no-op bucket decision recorded. Evidence: pending.
- [ ] Active docs/tests/configuration updated consistently with the final posture. Evidence: pending.
- [ ] Marketplace/pack-smoke command surface aligned if adopting `0.124.0`. Evidence: pending.
- [ ] CO-337 and CO-340 contradiction/supersession status handled or tracked. Evidence: pending.

## Validation
- [ ] `node scripts/delegation-guard.mjs`. Evidence: pending.
- [ ] `node scripts/spec-guard.mjs --dry-run`. Evidence: pending.
- [ ] `npm run build`. Evidence: pending.
- [ ] `npm run lint`. Evidence: pending.
- [ ] `npm run test`. Evidence: pending.
- [ ] `npm run docs:check`. Evidence: pending.
- [ ] `npm run docs:freshness`. Evidence: pending.
- [ ] `npm run repo:stewardship`. Evidence: pending.
- [ ] `node scripts/diff-budget.mjs`. Evidence: pending.
- [ ] Manifest-backed standalone review. Evidence: pending.
- [ ] Elegance review. Evidence: pending.
- [ ] `npm run pack:smoke` if downstream package/smoke surfaces change. Evidence: pending.

## Handoff
- [ ] Workpad refreshed after docs-first, implementation, validation, and immediately before review handoff. Evidence: pending.
- [ ] PR attached to Linear issue before review-state transition. Evidence: pending.
- [ ] Actionable PR feedback handled or explicitly pushed back. Evidence: pending.
- [ ] Latest `origin/main` merged, PR checks green, and `pr ready-review` drains cleanly before `In Review`. Evidence: pending.
