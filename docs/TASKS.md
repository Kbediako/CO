# Task List Snapshot — Orchestrator Workspace

- **Update — 2025-11-06:** Snakes Arena game assets were extracted from this repository and archived under `/Users/asabeko/Documents/snakes-arena-backup`; the remaining pipelines cover orchestrator diagnostics, linting, testing, and spec guard validation only.

## Checklist Mirror
The Snakes Arena checklist has been retired from this workspace; reference the archived manifests in `/Users/asabeko/Documents/snakes-arena-backup/.runs/` if historical evidence is needed.

> _Guardrail note:_ Minimal diagnostics or smoke-test pipelines can opt out of spec-guard enforcement by setting `guardrailsRequired: false` in their pipeline definition (e.g., inside `codex.orchestrator.json`). Standard design pipelines keep `node scripts/spec-guard.mjs --dry-run` inline so manifests such as `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json` continue to record guardrail evidence automatically.
<!-- tasks-archive-index:begin -->
## Archive index
Archived task snapshots live on the task-archives branch.
- 2025: https://github.com/Kbediako/CO/blob/task-archives/docs/TASKS-archive-2025.md
- 2026: https://github.com/Kbediako/CO/blob/task-archives/docs/TASKS-archive-2026.md
<!-- tasks-archive-index:end -->
# Task List Snapshot — Recursive Language Model Orchestrator (0105)

- Update - Planning: PRD/tech spec/action plan/mini-spec/checklist drafted; docs-review manifest at `.runs/0105-rlm-orchestrator/cli/2026-01-05T01-34-37-751Z-8297b912/manifest.json`.
- Update - Implementation: RLM CLI + pipeline + runner delivered; implementation-gate manifest at `.runs/0105-rlm-orchestrator/cli/2026-01-05T02-28-20-190Z-5dd73dc0/manifest.json`; subagent diagnostics at `.runs/0105-rlm-orchestrator-subagent/cli/2026-01-05T01-33-04-231Z-f1060b4e/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0105-rlm-orchestrator` before orchestrator commands.
## Checklist Mirror
Mirror status with `tasks/tasks-0105-rlm-orchestrator.md` and `.agent/task/0105-rlm-orchestrator.md`. Keep `[ ]` until evidence is recorded.
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: `docs/PRD-rlm-orchestrator.md`, `docs/TECH_SPEC-rlm-orchestrator.md`, `docs/ACTION_PLAN-rlm-orchestrator.md`, `tasks/tasks-0105-rlm-orchestrator.md`, `tasks/specs/0105-rlm-orchestrator.md`.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0105-rlm-orchestrator/cli/2026-01-05T01-34-37-751Z-8297b912/manifest.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `tasks/tasks-0105-rlm-orchestrator.md`, `.agent/task/0105-rlm-orchestrator.md`, and `tasks/index.json` - Evidence: `docs/TASKS.md`, `tasks/tasks-0105-rlm-orchestrator.md`, `.agent/task/0105-rlm-orchestrator.md`, `tasks/index.json`.

### Implementation Planning
- [x] CLI entrypoint + pipeline shape agreed. Evidence: `bin/codex-orchestrator.ts`, `codex.orchestrator.json`.
- [x] Task-id/run-id resolution agreed for ad-hoc runs. Evidence: `bin/codex-orchestrator.ts`.
- [x] `rlm` vs `start <pipeline-id>` behavior agreed (blocking vs detach, run-id output). Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `bin/codex-orchestrator.ts`.
- [x] Built-in pipeline packaging agreed (no repo config required). Evidence: `codex.orchestrator.json`, `orchestrator/src/cli/rlmRunner.ts`.
- [x] Built-in `rlm` pipeline precedence vs local `codex.orchestrator.json` clarified (override vs disable). Evidence: `orchestrator/src/cli/services/pipelineResolver.ts`, `orchestrator/src/cli/config/userConfig.ts`.
- [x] `rlm` vs `start <pipeline-id>` blocking/detach semantics + exit code retrieval documented. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `bin/codex-orchestrator.ts`.
- [x] Validator auto-detect heuristics agreed. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/src/cli/rlm/validator.ts`.
- [x] `--validator none` semantics + exit codes agreed. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/src/cli/rlm/runner.ts`.
- [x] Loop stop conditions agreed (validator pass, max iterations, optional time cap). Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/src/cli/rlm/runner.ts`.
- [x] Tests/fixtures scope agreed. Evidence: `docs/TECH_SPEC-rlm-orchestrator.md`, `orchestrator/tests/RlmLoop.test.ts`, `orchestrator/tests/RlmValidator.test.ts`.

# Task List Snapshot — Slimdown Audit (0101)
- Update - Validation: docs-review rerun after Phase 6 status checklist fix; manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T19-18-50-704Z-783d9ad9/manifest.json`.
- Update - Validation: Phase 6 final guardrail pass captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T18-58-28-347Z-1e1709bb/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T18-59-01-699Z-c2f0e210/manifest.json`.
- Update - Closeout: Phase 6 status snapshot refreshed; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T18-30-10-751Z-b4856059/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T17-59-01-839Z-0bed253b/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-phase3scan/cli/2026-01-03T17-56-17-000Z-8a2830d3/manifest.json`.
- Update - Implementation: remove legacy `CODEX_ORCHESTRATOR_REPO_ROOT` fallback in run-manifests resolver; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T17-58-18-128Z-e4ee9d1f/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T17-59-01-839Z-0bed253b/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-phase3scan/cli/2026-01-03T17-56-17-000Z-8a2830d3/manifest.json`.
- Update - Maintenance: docs/TASKS archive to clear docs:check line limit; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T16-53-16-126Z-c2694b63/manifest.json`.
- Update - Implementation: Phase 2 helper consolidation (date parsing) executed; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T16-06-21-829Z-3a4283cd/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T16-07-07-173Z-61412973/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-phase2scan/cli/2026-01-03T16-05-01-798Z-570d564c/manifest.json`.
- Update - Planning: PRD/tech spec/findings/checklist drafted; docs-review manifest captured at `.runs/0101-slimdown-audit/cli/2026-01-01T06-52-39-251Z-006dbf53/manifest.json`.
- Update - Planning: Action plan captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T14-36-37-744Z-18a8bb03/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T14-37-13-914Z-98c9b1f0/manifest.json`.
- Update - Planning: Phase 5 consolidation targets (docs tooling, pack helpers, wrapper cleanup) and Phase 6 consolidation targets (CLI args, mirror overlap, pipelines/adapters) captured; subagent diagnostics at `.runs/0101-slimdown-audit-pass3/cli/2026-01-01T13-19-30-562Z-fb8559df/manifest.json`, `.runs/0101-slimdown-audit-phase6/cli/2026-01-01T13-58-29-786Z-01202b8e/manifest.json`.
- Update - Planning: Phase 7 guardrail stage-set reuse targets captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-01T15-58-20-481Z-0ed04072/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-scout/cli/2026-01-01T15-58-52-966Z-2f8ac345/manifest.json`.
- Update - Fix: mirror fetch repoRoot regression addressed; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-01T16-52-59-234Z-249b7bd8/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-01T16-53-34-477Z-50756963/manifest.json`.
- Update - Fix: spec-guard runner restored for packaged pipelines; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T01-52-56-143Z-9ad8920d/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T01-46-31-523Z-0a37d3fe/manifest.json`.
- Update - SOP: review-loop monitoring includes inline review thread checks; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T02-20-52-639Z-d06c3655/manifest.json`.
- Update - SOP: review-loop monitoring window scales by PR complexity (10-min minimum); docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T02-41-59-440Z-885c79db/manifest.json`.
- Update - SOP: review-loop rubric defines small/medium/large watch windows; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T04-12-32-043Z-4e121dac/manifest.json`.
- Update - SOP: codex review comments require in-thread reply + reaction + resolve; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T08-43-51-067Z-2a27c307/manifest.json`.
- Update - Planning: Phase 8 targets (docs-review checks stage-set, static server reuse, fallback diagnostics, env resolver) captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T06-55-04-213Z-55d3f4a1/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-scout2/cli/2026-01-02T06-46-06-627Z-0e162446/manifest.json`.
- Update - Planning: Phase 9 resolver unification + dist shipping captured; subagent diagnostics at `.runs/0101-slimdown-audit-resolver/cli/2026-01-02T09-00-37-249Z-e98a2f15/manifest.json`.
- Update - Planning: Phase 10 script helper drift cleanup captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T09-55-37-130Z-c402e6fb/manifest.json`; diagnostics at `.runs/0101-slimdown-audit/cli/2026-01-02T09-56-13-353Z-b1f91623/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-scout3/cli/2026-01-02T09-57-29-698Z-58860366/manifest.json`.
- Update - Planning: Phase 11 status UI task-key normalization captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T11-00-37-065Z-5391c706/manifest.json`; diagnostics at `.runs/0101-slimdown-audit/cli/2026-01-02T11-01-13-986Z-4d0f4aa6/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-scout4/cli/2026-01-02T10-55-12-120Z-5e7504b1/manifest.json`.
- Update - Fix: status UI build task-key reference corrected (Codex review); implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T11-53-07-596Z-dbddf8db/manifest.json`; diagnostics at `.runs/0101-slimdown-audit/cli/2026-01-02T11-54-48-463Z-7c548515/manifest.json`.
- Update - Planning: Phase 12 run/out resolver alignment captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T12-41-06-364Z-cd175807/manifest.json`; diagnostics at `.runs/0101-slimdown-audit/cli/2026-01-02T12-41-50-370Z-b2cc981f/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt1/cli/2026-01-02T12-30-19-247Z-b99ceeb5/manifest.json`.
- Update - Implementation: Phase 12 resolver alignment executed (docs + review/mirror outputs); implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T13-01-51-814Z-021b8041/manifest.json`; diagnostics at `.runs/0101-slimdown-audit/cli/2026-01-02T13-03-29-813Z-3d090550/manifest.json`.
- Update - Implementation: Phase 12 resolver alignment extended (mirror check/serve/fingerprint, docs-hygiene, spec-guard runner, CLI persistence); docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T13-54-00-624Z-d3e36760/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T13-55-59-723Z-62f6f269/manifest.json`; diagnostics at `.runs/0101-slimdown-audit/cli/2026-01-02T13-57-46-632Z-c145680f/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt2/cli/2026-01-02T13-46-37-874Z-01efddfc/manifest.json`.
- Update - Maintenance: docs/TASKS archive triggered to restore line threshold; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T14-12-18-533Z-c2d9bd50/manifest.json`; diagnostics at `.runs/0101-slimdown-audit/cli/2026-01-02T14-12-57-601Z-bdf80c3c/manifest.json`.
- Update - Implementation: Phase 9 follow-ups align status UI build + ExperienceStore defaults to run-manifest envs; docs-review manifests at `.runs/0101-slimdown-audit/cli/2026-01-02T15-28-00-072Z-d17a5b2b/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T15-36-57-582Z-43141b97/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T15-35-14-355Z-282b6470/manifest.json`; diagnostics at `.runs/0101-slimdown-audit/cli/2026-01-02T15-28-37-827Z-b3dcc31f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T15-37-33-701Z-1cdcb253/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt4/cli/2026-01-02T15-29-57-838Z-c6b88cf6/manifest.json`.
- Update - Implementation: Phase 9 follow-ups align status UI serve + run-review defaults to run-manifest envs; docs-review manifests at `.runs/0101-slimdown-audit/cli/2026-01-02T16-10-19-693Z-120d35f6/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-16-43-058Z-05acbb94/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T16-15-03-569Z-f1e2d6cd/manifest.json`; diagnostics at `.runs/0101-slimdown-audit/cli/2026-01-02T16-10-58-932Z-498b80c1/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-17-21-039Z-253d9249/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt5/cli/2026-01-02T16-12-20-495Z-64aabefa/manifest.json`.
- Update - Planning: Phase 13 env resolver call-site consolidation captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T16-49-34-024Z-5a2b3cb6/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt6/cli/2026-01-02T16-48-09-519Z-6db698f3/manifest.json`.
- Update - Planning: Phase 14 docs helper pathExists reuse captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T17-33-50-144Z-0ed18b20/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt7/cli/2026-01-02T17-28-55-010Z-bb65bf5e/manifest.json`.
- Update - Planning: Phase 15 resolver API trim captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T18-14-47-765Z-336eafb3/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt8/cli/2026-01-02T18-13-24-956Z-63ce6e71/manifest.json`, `.runs/0101-slimdown-audit-hunt9/cli/2026-01-02T19-09-59-034Z-16bd8ebc/manifest.json`.
- Update - Implementation: Phase 13 env resolver call-site consolidation executed; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T16-56-04-083Z-fffd4806/manifest.json`.
- Update - Implementation: Phase 14 docs helper pathExists reuse executed; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T17-44-33-292Z-f3f7b8c7/manifest.json`.
- Update - Implementation: Phase 15 resolver API trim executed; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T18-25-48-442Z-74eb1353/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-27-43-563Z-d6350a14/manifest.json`.
- Update - Docs: clarify Phase 15 ↔ target 26 mapping; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T18-36-36-848Z-d5087848/manifest.json`.
- Update - Planning: Phase 16 pathExists reuse captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T19-51-16-427Z-2436596a/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt9/cli/2026-01-02T19-09-59-034Z-16bd8ebc/manifest.json`.
- Update - Planning: Phase 17 CLI environment resolver wrapper captured; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T00-26-10-060Z-7d3aa6a1/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt10/cli/2026-01-03T00-21-25-802Z-96e4a179/manifest.json`.
- Update - Implementation: Phase 16 pathExists reuse executed; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T19-56-02-736Z-5bac93fd/manifest.json`.
- Update - Implementation: Phase 17 CLI environment resolver wrapper removed; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T00-43-23-233Z-849e7395/manifest.json`.
- Update - Docs: Phase 17 evidence + identifier guardrail note refreshed; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T00-53-56-830Z-7ea1799c/manifest.json`.
- Update - Implementation: Phase 8 consolidations (docs-review checks stage-set, static server reuse, fallback removal, resolver alignment) executed; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T07-30-37-808Z-9a35aa5f/manifest.json`.
- Update - Fix: status UI external out dir data path + default /data.json wiring; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T08-22-25-959Z-0202a7c5/manifest.json`.
- Update - Implementation: Phase 9 resolver unification + dist shipping executed; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T09-16-35-400Z-28b143d5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T14-55-28-935Z-24c71173/manifest.json`.
- Update - Implementation: Phase 10 helper dedupe executed; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-02T10-23-28-082Z-dc336fd7/manifest.json`; diagnostics at `.runs/0101-slimdown-audit/cli/2026-01-02T10-25-10-663Z-a1a4cd8f/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0101-slimdown-audit` before orchestrator commands.
## Checklist Mirror
Mirror status with `tasks/tasks-0101-slimdown-audit.md` and `.agent/task/0101-slimdown-audit.md`. Keep `[ ]` until evidence is recorded.
- [x] Docs + checklist drafted - Evidence: `docs/PRD-slimdown.md`, `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`, `tasks/tasks-0101-slimdown-audit.md`.
- [x] Action plan drafted - Evidence: `docs/ACTION_PLAN-slimdown.md`.
- [x] Phase 5 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 6 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 7 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 8 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 9 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 10 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 11 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 12 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 13 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 14 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 15 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 16 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 17 consolidation targets captured - Evidence: `docs/TECH_SPEC-slimdown.md`, `docs/findings/slimdown-audit.md`.
- [x] Phase 3 pipeline and harness simplifications executed - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T11-12-06-081Z-b957f1cf/manifest.json`.
- [x] Phase 4 automation + CLI simplifications executed - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T14-09-41-854Z-46f3b7ea/manifest.json`.
- [x] Phase 5 consolidations executed - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T16-30-31-721Z-35c24301/manifest.json`.
- [x] Phase 7 consolidations executed - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T16-30-31-721Z-35c24301/manifest.json`.
- [x] Phase 8 consolidations executed - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T07-30-37-808Z-9a35aa5f/manifest.json`.
- [x] Phase 8 regression fix (status UI external out dir data path) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T08-12-07-082Z-bc0c7883/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-22-25-959Z-0202a7c5/manifest.json`.
- [x] Phase 9 consolidation executed (resolver unification + dist shipping) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T09-16-35-400Z-28b143d5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T14-55-28-935Z-24c71173/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T15-35-14-355Z-282b6470/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-15-03-569Z-f1e2d6cd/manifest.json`.
- [x] Phase 10 consolidation executed (script helper drift cleanup) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T10-23-28-082Z-dc336fd7/manifest.json`.
- [x] Phase 11 consolidation executed (status UI task-key normalization) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T11-53-07-596Z-dbddf8db/manifest.json`.
- [x] Phase 12 consolidation executed (docs + run/out resolver alignment) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T13-01-51-814Z-021b8041/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T13-55-59-723Z-62f6f269/manifest.json`.
- [x] Phase 13 consolidation executed (env resolver call-site consolidation) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T16-56-04-083Z-fffd4806/manifest.json`.
- [x] Phase 14 consolidation executed (docs helper pathExists reuse) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T17-44-33-292Z-f3f7b8c7/manifest.json`.
- [x] Phase 15 consolidation executed (resolver API trim) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T18-25-48-442Z-74eb1353/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-27-43-563Z-d6350a14/manifest.json`.
- [x] Phase 16 consolidation executed (script-side pathExists reuse) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T19-56-02-736Z-5bac93fd/manifest.json`.
- [x] Phase 17 consolidation executed (CLI env resolver wrapper removed) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-03T00-43-23-233Z-849e7395/manifest.json`.
- [x] Phase 18 consolidation executed (guardrail detection + optional-deps wrapper removal) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-03T04-14-39-520Z-2b87960a/manifest.json`.
- [x] Phase 19 consolidation executed (jsonlWriter shim cleanup + persistence writeAtomicFile shim removal + identifier guard inline) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-03T05-44-22-728Z-b10e19d2/manifest.json`.
- [x] Phase 20 consolidation executed (guardrail detection normalization + control-plane/scheduler shim cleanup) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-03T06-13-29-437Z-8bebc30a/manifest.json`.
- [x] Review-loop SOP updated to reply in-thread, react, and resolve connector review threads - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-02T08-43-51-067Z-2a27c307/manifest.json`.
- [x] Docs-review manifest captured - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T06-52-39-251Z-006dbf53/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-09-05-816Z-0c732c0b/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-36-24-243Z-95cbbe20/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T15-58-20-481Z-0ed04072/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-52-59-234Z-249b7bd8/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-45-50-306Z-0b3346ae/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-52-56-143Z-9ad8920d/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T02-20-52-639Z-d06c3655/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T02-41-59-440Z-885c79db/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T04-12-32-043Z-4e121dac/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T06-55-04-213Z-55d3f4a1/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-55-37-130Z-c402e6fb/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-00-37-065Z-5391c706/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T12-41-06-364Z-cd175807/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T12-58-29-363Z-8fd2e290/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T13-54-00-624Z-d3e36760/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T14-12-18-533Z-c2d9bd50/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T14-57-19-702Z-e80c5979/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T15-28-00-072Z-d17a5b2b/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T15-36-57-582Z-43141b97/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-10-19-693Z-120d35f6/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-16-43-058Z-05acbb94/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-49-34-024Z-5a2b3cb6/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T17-33-50-144Z-0ed18b20/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T18-14-47-765Z-336eafb3/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T18-36-36-848Z-d5087848/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-33-32-512Z-bf6c97bd/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-51-16-427Z-2436596a/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T23-52-33-485Z-ee1b36d2/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T00-26-10-060Z-7d3aa6a1/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T00-53-56-830Z-7ea1799c/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T04-13-58-327Z-45a18714/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T05-03-38-728Z-9004e3c2/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T06-02-59-806Z-350c4e02/manifest.json`.
- [x] Implementation-gate manifest captured - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T11-12-06-081Z-b957f1cf/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-09-41-854Z-46f3b7ea/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T15-30-21-816Z-3ab2817f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-30-31-721Z-35c24301/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-53-34-477Z-50756963/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-46-31-523Z-0a37d3fe/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T07-30-37-808Z-9a35aa5f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-12-07-082Z-bc0c7883/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-22-25-959Z-0202a7c5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-11-06-612Z-b04c1d6c/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-16-35-400Z-28b143d5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T10-23-28-082Z-dc336fd7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-21-53-840Z-375955a7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-53-07-596Z-dbddf8db/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T13-01-51-814Z-021b8041/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T13-55-59-723Z-62f6f269/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T14-55-28-935Z-24c71173/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T15-35-14-355Z-282b6470/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-15-03-569Z-f1e2d6cd/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T16-56-04-083Z-fffd4806/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T17-44-33-292Z-f3f7b8c7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T18-25-48-442Z-74eb1353/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-27-43-563Z-d6350a14/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T19-56-02-736Z-5bac93fd/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T00-43-23-233Z-849e7395/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T04-14-39-520Z-2b87960a/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T05-21-56-441Z-59fb5d3a/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T05-44-22-728Z-b10e19d2/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-03T06-13-29-437Z-8bebc30a/manifest.json`.
- [x] Diff budget check passed (override recorded for Phase 6 consolidation scope) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T11-12-06-081Z-b957f1cf/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T14-09-41-854Z-46f3b7ea/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T15-30-21-816Z-3ab2817f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-30-31-721Z-35c24301/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-01T16-53-34-477Z-50756963/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T01-46-31-523Z-0a37d3fe/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T07-30-37-808Z-9a35aa5f/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-12-07-082Z-bc0c7883/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T08-22-25-959Z-0202a7c5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-11-06-612Z-b04c1d6c/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T09-16-35-400Z-28b143d5/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T10-23-28-082Z-dc336fd7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-21-53-840Z-375955a7/manifest.json`, `.runs/0101-slimdown-audit/cli/2026-01-02T11-53-07-596Z-dbddf8db/manifest.json`.
- [x] Frontend-testing manifest captured (DevTools) - Evidence: `.runs/0101-slimdown-audit/cli/2026-01-01T10-10-36-969Z-c65778ef/manifest.json`.
- [x] Subagent review captured - Evidence: `.runs/0101-slimdown-audit-review/cli/2026-01-01T04-44-27-502Z-9688b054/manifest.json`, `.runs/0101-slimdown-audit-nextsteps/cli/2026-01-01T05-38-23-619Z-961fd034/manifest.json`, `.runs/0101-slimdown-audit-usage/cli/2026-01-01T06-08-57-842Z-dee29417/manifest.json`, `.runs/0101-slimdown-audit-nextphase/cli/2026-01-01T06-22-49-653Z-3e9e326e/manifest.json`, `.runs/0101-slimdown-audit-usage2/cli/2026-01-01T10-04-09-470Z-2a8c0e1b/manifest.json`, `.runs/0101-slimdown-audit-slimdown2/cli/2026-01-01T11-00-20-245Z-fca96825/manifest.json`, `.runs/0101-slimdown-audit-pass3/cli/2026-01-01T13-19-30-562Z-fb8559df/manifest.json`, `.runs/0101-slimdown-audit-phase6/cli/2026-01-01T13-58-29-786Z-01202b8e/manifest.json`, `.runs/0101-slimdown-audit-impl1/cli/2026-01-01T14-37-01-370Z-7538c896/manifest.json`, `.runs/0101-slimdown-audit-scout/cli/2026-01-01T15-58-52-966Z-2f8ac345/manifest.json`, `.runs/0101-slimdown-audit-scout2/cli/2026-01-02T06-46-06-627Z-0e162446/manifest.json`, `.runs/0101-slimdown-audit-resolver/cli/2026-01-02T09-00-37-249Z-e98a2f15/manifest.json`, `.runs/0101-slimdown-audit-scout3/cli/2026-01-02T09-57-29-698Z-58860366/manifest.json`, `.runs/0101-slimdown-audit-scout4/cli/2026-01-02T10-55-12-120Z-5e7504b1/manifest.json`, `.runs/0101-slimdown-audit-hunt1/cli/2026-01-02T12-30-19-247Z-b99ceeb5/manifest.json`, `.runs/0101-slimdown-audit-hunt2/cli/2026-01-02T13-46-37-874Z-01efddfc/manifest.json`, `.runs/0101-slimdown-audit-hunt3/cli/2026-01-02T14-40-21-824Z-a1fa2df3/manifest.json`, `.runs/0101-slimdown-audit-hunt4/cli/2026-01-02T15-29-57-838Z-c6b88cf6/manifest.json`, `.runs/0101-slimdown-audit-hunt5/cli/2026-01-02T16-12-20-495Z-64aabefa/manifest.json`, `.runs/0101-slimdown-audit-hunt6/cli/2026-01-02T16-48-09-519Z-6db698f3/manifest.json`, `.runs/0101-slimdown-audit-hunt7/cli/2026-01-02T17-28-55-010Z-bb65bf5e/manifest.json`, `.runs/0101-slimdown-audit-hunt8/cli/2026-01-02T18-13-24-956Z-63ce6e71/manifest.json`, `.runs/0101-slimdown-audit-hunt9/cli/2026-01-02T19-09-59-034Z-16bd8ebc/manifest.json`, `.runs/0101-slimdown-audit-hunt10/cli/2026-01-03T00-21-25-802Z-96e4a179/manifest.json`, `.runs/0101-slimdown-audit-hunt11/cli/2026-01-03T04-02-04-863Z-95fa88e1/manifest.json`, `.runs/0101-slimdown-audit-hunt19/cli/2026-01-03T05-04-12-933Z-8d2ce2c1/manifest.json`, `.runs/0101-slimdown-audit-hunt20/cli/2026-01-03T06-05-24-408Z-82a12564/manifest.json`.

- Update - Fix: guardrail summary detection normalized + optional-deps wrapper removed; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T04-13-58-327Z-45a18714/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T04-14-39-520Z-2b87960a/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt11/cli/2026-01-03T04-02-04-863Z-95fa88e1/manifest.json`.
- Update - Implementation: Phase 19 shim cleanup (jsonlWriter + persistence writeAtomicFile + identifier guard inline); docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T05-03-38-728Z-9004e3c2/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T05-44-22-728Z-b10e19d2/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt19/cli/2026-01-03T05-04-12-933Z-8d2ce2c1/manifest.json`.
- Update - Implementation: Phase 20 guardrail detection normalization + control-plane/scheduler shim cleanup; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T06-02-59-806Z-350c4e02/manifest.json`; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T06-13-29-437Z-8bebc30a/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt20/cli/2026-01-03T06-05-24-408Z-82a12564/manifest.json`.
- Update - Validation: shim revert validation + checklist sync; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T06-47-13-568Z-f47b1970/manifest.json`; subagent diagnostics at `.runs/0101-slimdown-audit-hunt21/cli/2026-01-03T06-47-48-713Z-d7b1ad8c/manifest.json`.
- Update - Implementation: shim revert + checklist sync validated; implementation-gate manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T06-52-44-894Z-47e39b73/manifest.json`.
- Update - Maintenance: tasks archive + Phase 19/20 header renumber; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T07-11-40-945Z-7f3ab0bf/manifest.json`.
- Update - Maintenance: archive index links normalized; docs-review manifest at `.runs/0101-slimdown-audit/cli/2026-01-03T07-17-56-725Z-a701a5aa/manifest.json`.

# Task List Snapshot — Codex Orchestrator NPM Companion Package (0914)

- Update - Planning: PRD/tech spec/action plan/checklist/mini-spec drafted; docs-review manifest captured at `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.
- Notes: Export `MCP_RUNNER_TASK_ID=0914-npm-companion-package` before orchestrator commands. Guardrails required: `node scripts/spec-guard.mjs --dry-run`, `npm run build`, `npm run lint`, `npm run test`, `npm run docs:check`, `node scripts/diff-budget.mjs`, `npm run review`.

## Checklist Mirror
Mirror status with `tasks/tasks-0914-npm-companion-package.md` and `.agent/task/0914-npm-companion-package.md`. Keep `[ ]` until evidence is recorded.

### Foundation
- [x] Collateral drafted (PRD/tech spec/action plan/checklist/mini-spec) - Evidence: this commit.
- [x] Docs-review manifest captured (pre-implementation) - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.
- [x] Metrics/state snapshots updated - Evidence: `.runs/0914-npm-companion-package/metrics.json`, `out/0914-npm-companion-package/state.json`.
- [x] Mirrors updated in `docs/TASKS.md`, `.agent/task/0914-npm-companion-package.md`, and `tasks/index.json` - Evidence: this commit.
- [x] PRD approval recorded in `tasks/index.json` gate metadata - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.

### Packaging & Tarball Controls
- [x] Update package publish metadata and allowlist - Evidence: `package.json`, `.runs/0914-npm-companion-package/cli/2025-12-28T16-12-48-461Z-041b4764/manifest.json`.
- [x] Add LICENSE file for publication - Evidence: `LICENSE`, `.runs/0916-npm-companion-package-publishability/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [x] Add clean step and pack audit script.
- [x] Tighten pack audit dist allowlist to runtime subtrees.
- [x] Add pack smoke test for the tarball - Evidence: new script + manifest.
- [x] Add CI gate for pack audit and smoke test - Evidence: workflow + manifest.

### Schema Resolution & Runtime Assets
- [x] Implement Pattern A resolver with fallback - Evidence: code + tests.
- [x] Ensure `schemas/manifest.json` is shipped and validated - Evidence: pack audit + tests.

### CLI Companion Surface
- [x] Add `codex-orchestrator mcp serve`.
- [x] Enforce or verify downstream `codex` stdout stays protocol-only for `mcp serve`.
- [x] Replace user-facing MCP scripts with CLI subcommands - Evidence: CLI + docs updates.
- [x] Add `codex-orchestrator self-check --format json` - Evidence: CLI implementation + tests.
- [x] Add `codex-orchestrator --version` output - Evidence: CLI implementation + tests.
- [x] Verify shebang preservation and ESM consistency - Evidence: tests.
- [x] Enforce user-controlled run dirs for all CLI outputs - Evidence: code review + tests.
- [x] Ensure telemetry/network calls are disabled by default - Evidence: tests.

### Templates & Init
- [x] Add `templates/` with README disclaimer + version markers - Evidence: new templates.
- [x] Add `codex-orchestrator init codex` - Evidence: CLI implementation + tests.

### Optional Dependencies + Doctor
- [x] Move Playwright-class deps to optional peer deps and add dynamic loader - Evidence: package metadata + tests.
- [x] Add `codex-orchestrator doctor` - Evidence: CLI implementation + tests.

### Release Workflow
- [x] Add tag-driven release workflow - Evidence: workflow + release run.
- [x] Document release asset download fallbacks - Evidence: spec update.
- [x] Update README with companion package usage and release flow - Evidence: README change + manifest.

### Guardrails & Handoff (post-implementation)
- [x] `npm run review` is non-interactive in CI (flag/env enforced; fails fast on prompts).
- [x] `node scripts/spec-guard.mjs --dry-run` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] `npm run build` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] `npm run lint` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] `npm run test` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] `npm run docs:check` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] `node scripts/diff-budget.mjs` passes - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.
- [x] Diff budget override recorded (`DIFF_BUDGET_OVERRIDE_REASON`) - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/commands/06-diff-budget.ndjson`.
- Note: CI diff budget override requires label `diff-budget-override` and PR body line `Diff budget override: ...`.
- [x] `npm run review` captured with NOTES - Evidence: `.runs/0914-npm-companion-package/cli/2025-12-28T17-26-47-817Z-8acb43f6/manifest.json`.

# Task List Snapshot — Dead Code Pruning & Evidence (0801)

- **Update — Planning:** Diagnostics captured at `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`; dead-code deletions and archive relocations complete (archives parked under `.runs/0801-dead-code-pruning/archive/2025-12-08T10-01-24Z/` with README pointers) and guardrails/tests rerun on 2025-12-09.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0801-dead-code-pruning` before running orchestrator commands; guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test` (and `npm run build` if touching orchestrator packages).

## Checklist Mirror
Mirror status with `tasks/tasks-0801-dead-code-pruning.md` and `.agent/task/<id>-<slug>.md` (if created). Keep `[ ]` until manifest path is recorded.

### Foundation
- [x] Diagnostics/plan manifest captured — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0801-dead-code-pruning/metrics.json`, `out/0801-dead-code-pruning/state.json`.
- [x] PRD/spec/tasks mirrors updated with manifest links — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.

### Remediation Plan
- [x] Unused CLI/learning/SDK helpers removed or justified — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Aggregator entrypoints/pattern registries evaluated and pruned or documented — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Evaluation harness + mirror server + design sample handled (delete/archive/justify) — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Archives decision (keep with README pointer or relocate to archive folder) — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.
- [x] Guardrails/tests executed — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test` (and `npm run build` when orchestrator code touched); Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.

### Review & Handoff
- [x] Reviewer hand-off run (`npm run review --manifest <latest>`) with approvals captured — Evidence: `.runs/0801-dead-code-pruning/cli/2025-12-09T03-51-52-584Z-93e9a77f/manifest.json`.

# Task List Snapshot — Codex Orchestrator Slimdown (0707)

- **Update — Planning:** PRD + tech spec published; CI/local test coverage policy recorded (core vs full-matrix lanes). Awaiting first diagnostics manifest under `.runs/0707-orchestrator-slimdown/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Notes:** Export `MCP_RUNNER_TASK_ID=0707-orchestrator-slimdown` for orchestrator commands so manifests, metrics, and `out/**` land in the correct directories.

## Checklist Mirror
Mirror status with `tasks/tasks-0707-orchestrator-slimdown.md` and `.agent/task/0707-orchestrator-slimdown.md`. Keep `[ ]` until a manifest path such as `.runs/0707-orchestrator-slimdown/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.

### Foundation
- [x] Diagnostics manifest captured — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-01T09-37-11-576Z-1a60ebea/manifest.json`.
- [x] Metrics/state snapshots updated — Evidence: `.runs/0707-orchestrator-slimdown/metrics.json`, `out/0707-orchestrator-slimdown/state.json`.
- [x] CI/test coverage policy mirrored across PRD/spec/tasks — core PR lane runs `npm run build`, `npm run lint`, `npm run test`; full-matrix PR lane (label `full-matrix` or adapters/evaluation/design/patterns paths) runs `npm run build:all`, `npm run lint`, `npm run test`, `npm run test:adapters`, `npm run test:evaluation`, `npm run eval:test` when fixtures/optional design deps installed; release/RC always full matrix; local baseline = core with full matrix locally when touching adapters/evaluation/design/patterns or release prep after `npm run setup:design-tools && npx playwright install` + fixtures (note if skipped). Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.

### Deliverables
- [x] Manifest single-source + generated TS types/AJV validator; duplicate schema removed — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Unused agent SDK deps removed with usages pruned/shimmed — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Core build split (`npm run build` core, `npm run build:all` full matrix) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Design deps optional/lazy across toolkits + mirror scripts with runtime guidance — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Patterns lint guard builds `dist/patterns/linters/index.js` only when missing/outdated — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Exec command modularized without behavior change — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Scoped test scripts added (`test:orchestrator`, `test:adapters`, `test:evaluation`; default `npm test` = core) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Characterization tests for execution-mode resolution (flags, metadata modes, parallel override) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Execution-mode logic unified behind a shared helper with no behavior changes — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Task/run ID sanitization unified behind a shared helper with identical error messages — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Shared lock retry helper extracted for TaskStateStore and ExperienceStore — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Atomic write behavior verified (directory creation, temp naming) before unification — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Atomic write helpers unified with explicit options after verification (Needs Verification) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] CLI pipeline result wrappers simplified with explicit result storage — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Enforcement-mode parsing shared between control-plane and privacy guard — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Error string expectations verified before centralizing error formatting — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.
- [x] Error message formatting centralized without changing prefixes or strings (Needs Verification) — Evidence: `.runs/0707-orchestrator-slimdown/cli/2025-12-20T00-28-00-131Z-bd705bcf/manifest.json`.

# Task List Snapshot — Design Reference Pipeline (0401-design-reference)

- **Update — 2025-11-21:** Diagnostics + review run captured at `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`; use this evidence path across mirrors.
- **Update — Configuration planning:** `design.config.yaml` schema drafted alongside pipeline toggles documentation; manifest reference set to `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.
- **Notes:** Optional tool setup lives behind `npm run setup:design-tools`; retention/expiry policies will reference `design.config.yaml > metadata.design.retention`.

## Checklist Mirror
Mirror status with `tasks/design-reference-pipeline.md` and `.agent/task/design-reference-pipeline.md`. Keep `[ ]` until a manifest path such as `.runs/0401-design-reference/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.

### Foundation
- [x] Collateral synchronized — `docs/design/PRD-design-reference-pipeline.md`, `docs/design/specs/DESIGN_REFERENCE_PIPELINE.md`, `tasks/index.json`, `.agent/task/design-reference-pipeline.md`, `docs/TASKS.md`; Evidence: `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.
- [x] Pipeline toggles wired — `design.config.yaml` template + CLI/ENV triggers (`--pipeline design-reference`, `DESIGN_PIPELINE=1`) documented; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Setup tooling — `npm run setup:design-tools` captures Playwright/FFmpeg optional installs without impacting baseline CI; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Pipeline Stages
- [x] Playwright extractor implemented — stages DOM/CSS/screenshots with privacy approvals logged; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Reference page builder shipped — `motherduck.html` staged under `design/reference/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Componentization stage delivered — `packages/design-system` assets staged under `design/components/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Advanced assets optionality — Framer Motion + FFmpeg outputs gated by config quotas; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Manifest & Guardrails
- [x] Manifest schema updates — `packages/shared/manifest/types.ts` + `packages/shared/manifest/writer.ts` persist `design_artifacts`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] DesignArtifactWriter output — `out/0401-design-reference/design/runs/<run>.json` summary written with retention/privacy fields; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Retention & privacy controls — expiry automation/docs and approval logging established; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Guardrail integration — `scripts/spec-guard.mjs` covers `docs/design/specs/**`; `npm --prefix packages/design-system run test:visual` hooked into pipeline; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.

### Verification & Approvals
- [x] Visual regression evidence — diff artifacts + pass/fail summaries staged under `design/visual-regression/`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Diagnostics run — `npx codex-orchestrator start diagnostics --pipeline design-reference --format json`; Evidence: `.runs/0401-design-reference/cli/2025-11-06T11-59-59-680Z-34fe7972/manifest.json`.
- [x] Reviewer hand-off — `npm run review` references latest design-reference manifest and approvals; Evidence: `.runs/0401-design-reference/cli/2025-11-21T08-15-57-435Z-851d3781/manifest.json`.

# Task List Snapshot — Hi-Fi Design Toolkit (0410-hi-fi-design-toolkit)

- **Update — Pending kickoff:** PRD, spec, and task mirrors drafted; awaiting diagnostics run to capture `.runs/0410-hi-fi-design-toolkit/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Update — External toolkit:** Autonomous hi-fi design starter will be synchronized into this repo with compliance permits before extractor work begins.
- **Notes:** Always export `MCP_RUNNER_TASK_ID=0410-hi-fi-design-toolkit` so manifests, metrics, and out files land under the correct directories.

## Checklist Mirror
Mirror status with `tasks/hi-fi-design-toolkit.md` and `.agent/task/hi-fi-design-toolkit.md`. Keep `[ ]` until a manifest path such as `.runs/0410-hi-fi-design-toolkit/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.

### Foundation
- [x] Collateral minted — `docs/design/PRD-hi-fi-design-toolkit.md`, `docs/design/specs/HI_FI_DESIGN_TOOLKIT.md`, `tasks/index.json`, `.agent/task/hi-fi-design-toolkit.md`, `docs/TASKS.md`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.
- [x] External toolkit synchronized — vendored `/home/jr_ga/code/ASABEKO/autonomous-hi-fi-design-starter` with snapshot metadata in `packages/design-reference-tools/VENDOR.md`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.
- [x] Compliance permits imported — `compliance/permit.json` mirrors upstream approvals and is referenced by docs; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-19-35-861Z-962b4c81/manifest.json`.

### Pipeline Enablement
- [x] Extractor stage wired — `scripts/design/pipeline/toolkit/extract.ts` enforces permits + approvals and stages context assets; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Tokens + style guide stage — `tokens.ts` + styleguide wrapper emit token bundles + markdown docs with manifest metrics; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Reference & self-correction stage — `reference.ts` + optional `self-correct` loops capture diff reductions + FFmpeg approvals; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Publish integration — toolkit outputs merged into `packages/design-system` with `npm --prefix packages/design-system run test:visual` logged; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.

### Guardrails & Evidence
- [x] Spec guard stage embedded — `design-spec-guard` runs `node scripts/spec-guard.mjs --dry-run` inside the hi-fi diagnostics pipeline before artifact writes; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Manifest/schema updates — `design_toolkit_artifacts` + summary persisted to manifests and `out/0410-hi-fi-design-toolkit/design/runs/<run>.json`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Retention/privacy automation — retention window + purge command (`npm run design:purge-expired`) documented, approvals recorded; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Diagnostics run — `npx codex-orchestrator start hi-fi-design-toolkit --format json`; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.
- [x] Reviewer hand-off — `npm run review` cites latest toolkit manifest and approvals; Evidence: `.runs/0410-hi-fi-design-toolkit/cli/2025-11-07T03-54-09-660Z-35b0a68c/manifest.json`.

# Task List Snapshot — Frontend Design Pipeline v2 (0412-frontend-design-pipeline-v2)

- **Update — Planning:** Fresh + clone-informed pipeline PRD/spec drafted; awaiting diagnostics run to seed `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- **Update — Schema & snippet:** Manifest support for design plan/guardrail/history/style profiles plus `prompt-snippets/frontend-aesthetics-v1.md` landed; guardrail metrics/style-overlap gate documented for parity tests.
- **Notes:** Modes differ only in aesthetic plan derivation (brief vs brief+Hifi style profile); artifacts will mirror design pipeline layouts with added guardrail/history outputs.

## Checklist Mirror
Mirror status with `tasks/frontend-design-pipeline-v2.md` and `.agent/task/frontend-design-pipeline-v2.md`. Keep `[ ]` until a manifest path such as `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` is recorded.

### Foundation
- [ ] Collateral synchronized — `docs/design/PRD-frontend-design-pipeline-v2.md`, `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`, `tasks/index.json`, `.agent/task/frontend-design-pipeline-v2.md`, `docs/TASKS.md`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Spec guard coverage — `node scripts/spec-guard.mjs --dry-run` watches `docs/design/specs/FRONTEND_DESIGN_PIPELINE_V2.md`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.

### Pipeline Stages
- [ ] Style ingestion (Hifi) — `hifi_style_profile.json` emitted with approvals + similarity level; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Design brief normalization — `frontend-design-brief.json` staged with required fields + hash; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Aesthetic axes plan — `frontend-aesthetic-plan.json` captures axes + `avoid` lists + snippet version; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Implementation + complexity metadata — `implementation-metadata.json` links plan to framework/density expectations; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Aesthetics guardrail — `design-review-report.json` with originality/accessibility/brief-alignment/slop scores + pass/fail; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Design diversity memory — `frontend-design-history.json` bounded + mirrored to `out/0412-frontend-design-pipeline-v2/design/history.json`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Frontend aesthetics snippet library — `prompt-snippets/frontend-aesthetics-v1.md` versioned and referenced by plans/guardrails; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.

### Artifacts, Guardrails, Validation
- [ ] Artifact layout + writer — artifacts under `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/artifacts/design/**`, summary `out/0412-frontend-design-pipeline-v2/design/runs/<run>.json`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Manifest/schema updates — manifest sections for `design_plan`, `design_guardrail`, `design_history`, style profile metadata with approvals/retention; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Metrics/telemetry — metrics (`aesthetic_axes_completeness`, `originality_score`, `accessibility_score`, `brief_alignment_score`, `slop_risk`, `diversity_penalty`, `similarity_to_reference`, `style_overlap`, `style_overlap_gate`, `snippet_version`) emitted to manifest + `out/**`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Retention/legal logging — retention enforced (style profiles may use shorter window), approvals + `do_not_copy` markers captured; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Mode parity — Fresh vs clone-informed runs show identical stage set; manifests capture mode + reference style id; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Guardrail efficacy — AI-slop mock fails and compliant mock passes with differing `slop_risk`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Style-overlap gate — Clone-informed runs compute `style_overlap` (max of palette/typography/motion/spacing similarities) and fail guardrail when >0.10; manifests + `design-review-report.json` record per-axis scores and `style_overlap_gate`; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Diversity penalty check — history reuse increases `diversity_penalty` surfaced in guardrail report; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.
- [ ] Reviewer hand-off — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run review` executed with latest manifest cited; Evidence: `.runs/0412-frontend-design-pipeline-v2/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`.

# Task List Snapshot — Codex Orchestrator Autonomy Enhancements (0303)

- **Update — 2025-11-05:** Multi-instance autonomy upgrade validation run recorded; manifest `.runs/autonomy-upgrade/cli/2025-11-05T13-30-00Z-upgrade/manifest.json` captures control-plane enforcement, scheduler fan-out, streaming handles, and privacy guard enforcement.
- **Update — 2025-11-06:** Efficiency optimizations (guard decision pruning, replay window reuse, stdio sliding buffer, `mergeSnapshot` O(1) append) validated; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`.
- **Update — 2025-11-04:** Unified exec runtime (session manager + event streaming) completed; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- **Update — 2025-11-04:** CLI command stages now emit unified exec lifecycle events with streaming logs; manifest `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`.
- **Update — 2025-11-04:** Tool orchestrator layer implemented with manifest evidence `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.
- **Update — 2025-11-04:** Diagnostics run `2025-11-04T01-59-37-568Z-8065982c` captured guardrail execution; manifest at `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- **Gate Status:** Planning approved — greenlight to begin ToolOrchestrator implementation. Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-46-22-699Z-8be8efb9/manifest.json`.
- **Notes:** Upgrade metrics recorded at `.runs/autonomy-upgrade/metrics.json` with aggregates in `.runs/autonomy-upgrade/metrics/post-rollout.json`, `.runs/autonomy-upgrade/metrics/completeness.json`, and MTTR delta tracked in `out/autonomy-upgrade/metrics/mttr-delta.json`. Legacy diagnostics remain at `.runs/0303-orchestrator-autonomy/metrics.json`; state snapshot refreshed at `out/0303-orchestrator-autonomy/state.json`.

## Checklist Mirror
Mirror status with `tasks/tasks-0303-orchestrator-autonomy.md` and `.agent/task/0303-orchestrator-autonomy.md`. Each `[x]` entry must cite the manifest path that satisfied the acceptance criteria.

### Foundation
- [x] Synchronize collateral — `tasks/index.json`, `docs/PRD-codex-orchestrator-autonomy.md`, `docs/TECH_SPEC-codex-orchestrator-autonomy.md`, `docs/ACTION_PLAN-codex-orchestrator-autonomy.md`, `.agent/task/0303-orchestrator-autonomy.md` reference Task 0303; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json` (diagnostics run 2025-11-03T23:58:59Z).
- [x] Prepare run directories — Initialize `.runs/0303-orchestrator-autonomy/cli/` via diagnostics run; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-03T23-58-59-546Z-49371323/manifest.json`.
- [x] Environment defaults — `MCP_RUNNER_TASK_ID` exported in shell / CI and recorded in diagnostics manifest task id + approval profile; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (manifest records `approval_policy: read/edit/run/network`).

### Tool Orchestrator Layer
- [x] Implement centralized `ToolOrchestrator` service with approval cache reuse and sandbox retry policy; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.
- [x] Persist approval/retry metadata into manifests (`toolRuns[].approvalSource`, `toolRuns[].retryCount`, `toolRuns[].sandboxState`) with unit coverage; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-16-58-286Z-eeec1865/manifest.json`.

### Unified Exec Runtime
- [x] Build `ExecSessionManager` supporting reusable PTY handles, opt-out flows, and environment snapshots; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.
- [x] Update unified exec runner to emit `exec:begin|chunk|end` events, stream stdout/stderr under 64 KiB caps, and honor sandbox retries; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T01-59-37-568Z-8065982c/manifest.json`.

### CLI & SDK Interfaces
- [x] Ship `codex-orchestrator exec` command with `--json`, `--jsonl`, `--otel-endpoint`, and `--notify` support mirroring Codex CLI; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Extend Node.js SDK to spawn the exec command, stream JSONL events, and expose resume/retry helpers; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Telemetry & Notifications
- [x] Implement OTEL exporter module with graceful retry/backoff and manifest metrics; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Add notification hooks for summarized run events with configuration precedence (CLI > env > config); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Instruction Hierarchy & Schema
- [x] Deliver hierarchical instruction loader merging `AGENTS.md` → `docs/AGENTS.md` → `.agent/AGENTS.md`, recording hashes in manifest metadata; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 
- [x] Update manifest/config schemas for new fields and document JSONL event format; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json`. 

### Efficiency Optimizations
- [x] Prune `handle.decisions` along with the frame buffer to keep guard metadata bounded; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/orchestrator/tests/HandleService.test.ts`.
- [x] Replay subscriptions and snapshots reuse the stored frame window (O(replayed frames) per observer); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/orchestrator/tests/HandleService.test.ts`.
- [x] Replace quadratic stdio concatenation with an O(chunk) sliding window; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `packages/shared/tests/StdioTracker.test.ts`.
- [x] Make `TaskStateStore.mergeSnapshot` O(1) for append-only runs while keeping replacements ordered; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`, tests `orchestrator/tests/TaskStateStore.test.ts`.
- [x] Diagnostics + guardrails rerun after efficiency fixes (`npm run test`, `node scripts/spec-guard.mjs --dry-run`); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-06T07-19-49-813Z-8dd5ff38/manifest.json`.

### Verification & Guardrails
- [x] Run diagnostics (`npx codex-orchestrator start diagnostics --format json`) and record manifest link; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-44-59-137Z-de57c4d7/manifest.json`.
- [x] Guardrails — `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures ready); Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T04-55-02-406Z-9663b24b/manifest.json` (diagnostics run captures guardrail execution summary).
- [x] Reviewer hand-off — Execute `npm run review` using latest manifest; Evidence: `.runs/0303-orchestrator-autonomy/cli/2025-11-04T00-31-05-908Z-9d1b561c/manifest.json` (review outcome “Skip for now” logged).

---

# Task List Snapshot — Orchestrator Resilience Hardening (0202)

- **Update — 2025-10-31:** Diagnostics run `2025-10-31T22-56-34-431Z-9574035c` succeeded; manifest recorded under `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- **Gate Status:** Resilience enhancements implemented; awaiting reviewer sign-off.
- **Notes:** Metrics appended to `.runs/0202-orchestrator-hardening/metrics.json`; state snapshot refreshed at `out/0202-orchestrator-hardening/state.json`.

## Checklist Mirror
Mirror status with `tasks/tasks-0202-orchestrator-hardening.md` and `.agent/task/0202-orchestrator-hardening.md`. Each `[x]` entry must cite the manifest path that satisfied the acceptance criteria.

- Documentation Sync — `[x]` Collateral references Task 0202 and ties to diagnostics manifest; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Persistence Reliability — `[x]` Lock retry/backoff shipped with passing tests; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Heartbeat Safety — `[x]` Awaited heartbeat queue implemented; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Output Bounding — `[x]` Command buffer and error truncation verified via tests; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.
- Guardrails & Review — `[x]` `spec-guard`, `npm run lint`, `npm run test`, and `npm run review` executed; Evidence: `.runs/0202-orchestrator-hardening/cli/2025-10-31T22-56-34-431Z-9574035c/manifest.json`.

Update checklist entries with the exact `.runs/0202-orchestrator-hardening/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json` path once runs complete.

# Task List Snapshot — TF-GRPO Integration (0506)

- **Update — 2025-11-21:** `tfgrpo-learning` run succeeded (3 epochs, G=2, rewarders=`gt,relative`, temps 0.7/0.7/0.3) with manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`; prompt-pack stamps recorded and spec-guard passed. Diagnostics-with-eval guardrail run succeeded under `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json` (build/lint/test/eval/spec-guard).
- **Gate Status:** TF-GRPO enablement in planning; implementation gated on Experience Store + prompt pack landing behind `FEATURE_TFGRPO_GROUP`.
- **Guardrails:** Enforce `G ≥ 2`, ≤32-word experiences, three epochs (~100 samples) with train temp 0.7 / eval temp 0.3, stamped instruction sources only, and `node scripts/spec-guard.mjs --dry-run` before review.

## Checklist Mirror
Mirror status with `tasks/tasks-0506-tfgrpo.md` and `.agent/task/0506-tfgrpo-integration.md`. Flip `[ ]` to `[x]` only after attaching the manifest path (e.g., `.runs/0506-tfgrpo-integration/cli/2025-12-29T06-49-38-980Z-85ac2153/manifest.json`).

### PR-1 Prompt Packs & Loader
- [x] Stamped prompt-pack manifests wired into `packages/orchestrator/src/instructions/loader.ts`; tests: `packages/orchestrator/tests/instructions/PromptPackLoader.test.ts`, `packages/orchestrator/tests/InstructionsLoader.test.ts`. Evidence: prompt_packs stamps in `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.

### PR-2 Metrics (Per-Tool & Per-Epoch)
- [x] Emit per-tool, per-epoch token/cost/latency metrics via exec command → recorder/aggregator/OTEL; tests: `orchestrator/tests/MetricsAggregator.test.ts`, `orchestrator/tests/ExecCommand.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-3 Experience Store & Injection
- [x] Persist ≤32-word stamped experiences and inject them into prompt packs; tests: `orchestrator/tests/ExperienceStore.test.ts`, `orchestrator/tests/PromptExperienceInjection.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-4 Trajectory Summary & Optimizer
- [x] Summarize exec events into trajectory frames, stamp, and re-inject; tests: `orchestrator/tests/ExecCommand.test.ts`, `orchestrator/tests/ExperienceStore.test.ts`. Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-11T05-12-24-697Z-15088fb0/manifest.json`.

### PR-5 Rewarders (GT + Relative Rank)
- [x] Evaluation harness exposes deterministic GT + relative ranking rewarders; tests: `evaluation/tests/harness.test.ts` (RewarderExactMatch, RelativeRankingRewarder suites). Evidence: tfgrpo-learning run used `TFGRPO_REWARDERS=gt,relative` (runner log `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/commands/01-tfgrpo-loop.ndjson`).

### PR-6 Learning Schedule
- [x] Three-epoch (~100 sample) schedule with temperature overrides and tfgrpo-learning pipeline wiring; tests: `evaluation/tests/harness.test.ts` (LearningScheduleLoop), `orchestrator/tests/ControlPlaneValidator.test.ts` (PipelineTemperatureConfig). Evidence: runner log shows epochs 1–3 at temps 0.7/0.7/0.3 with 100 samples each; manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.

### PR-7 Config Guardrails
- [x] Request builder enforces `groupSize ≥ 2` and instruction loader filters stamped sources; tests: `orchestrator/tests/ControlPlaneValidator.test.ts`, `packages/orchestrator/tests/instructions/InstructionGuard.test.ts`. Evidence: command recorded `TFGRPO_GROUP_SIZE=2` with stamped instruction sources + prompt pack stamps in manifest `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`.

### PR-8 Group Runner (Feature Flagged)
- [x] TaskManager + Scheduler run grouped subtasks when `FEATURE_TFGRPO_GROUP` is set; tests: `orchestrator/tests/TaskManager.test.ts`, `orchestrator/tests/SchedulerPlan.test.ts`. Evidence: grouped vitest run with `FEATURE_TFGRPO_GROUP=1 TFGRPO_GROUP_SIZE=2` (`.runs/0506-tfgrpo-integration/manual/2025-11-21-group-tests.log`).

- **Update — 2025-11-21:** First full tfgrpo-learning loop captured guardrail evidence and prompt-pack stamps under `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json`; guardrail suite (build/lint/test/eval/spec-guard) passed under `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json`.

### Verification & Guardrails
- [x] Diagnostics / tfgrpo-learning pipeline run recorded under `.runs/0506-tfgrpo-integration/cli/2025-11-21T05-56-32-837Z-430b2d9d/manifest.json` (spec-guard passed).
- [x] Guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`, `npm run eval:test` (when fixtures exist). Evidence: `.runs/0506-tfgrpo-integration/cli/2025-11-21T07-09-08-052Z-ac3a1d09/manifest.json`.
- [ ] Reviewer hand-off via `npm run review` referencing the latest TF-GRPO manifest.
