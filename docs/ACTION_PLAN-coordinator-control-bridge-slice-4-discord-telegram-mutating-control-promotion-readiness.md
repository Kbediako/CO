# ACTION_PLAN - Coordinator Control Bridge Slice 4 + Discord/Telegram Mutating Control Promotion Readiness

## Summary
- Goal: complete the 0996 promotion-decision closeout docs lane for mutating transport-control readiness.
- Scope: docs artifacts + registry/snapshot updates + validation evidence + checklist notes, with an explicit historical HOLD/NO-GO decision artifact and final GO approval artifact.
- Current blocker posture: kill-switch/rollback drill evidence is present; explicit HOLD -> GO approval evidence was the final promotion blocker before GO approval on 2026-03-05.
- Extension: preserve residual-r4 through residual-r10 evidence lineage while treating residual-r9/r10 and post-closeout P1 cancel-confirmation transport-scope remediation as resolved prerequisites rather than active blockers.
- Docs stream task id for evidence: `0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs`.

## Milestones & Sequencing
1) Capture pre-edit docs-review baseline evidence
- Run docs-review before 0996 edits.
- Record delegation override reason for this bounded docs stream.

2) Author 0996 docs-first artifacts
- Create PRD/TECH_SPEC/ACTION_PLAN/spec/checklist + `.agent` mirror.
- Encode qmd timing explicitly:
  - direct runtime adoption HOLD in qmd posture,
  - sidecar docs retrieval GO now (optional stream),
  - read-only adapter pilot later gate, non-blocking.

3) Define HOLD -> GO acceptance gates
- Identity binding.
- Nonce/expiry replay protection.
- Idempotency window/index.
- Full traceability schema.
- Kill-switch + rollback drills.

4) Register 0996 in task/doc registries
- Add 0996 task item + spec entry in `tasks/index.json`.
- Add 0996 snapshot line in `docs/TASKS.md`.
- Add 0996 entries to `docs/docs-freshness-registry.json`.

5) Post-edit validation and review evidence
- Run post-edit docs-review and capture manifest/log path.
- Run `npm run docs:check` and `npm run docs:freshness`.
- Run standalone review checkpoint (`npm run review`) for 0996 docs stream.
- Record explicit elegance/minimality note in checklist notes.

6) Handoff boundary to implementation stream
- Keep direct runtime adoption HOLD in qmd posture (separate from 0996 promotion-readiness closeout).
- Keep read-only adapter pilot as later non-blocking gate.
- Require recurring subagent standalone/elegance checkpoints for future implementation bursts.

7) Residual-r4 docs-first lane open (no new task id)
- Add residual-r4 scope to PRD/TECH_SPEC/ACTION_PLAN/spec.
- Add unchecked residual-r4 implementation checklist items in both task mirrors.
- Update `tasks/index.json` phase + `docs/TASKS.md` snapshot to reflect opened residual-r4 lane while retaining `in-progress`.

8) Residual-r5 docs-first lane open (historical no new task id; NO-GO pre-closeout)
- Add residual-r5 scope to PRD/TECH_SPEC/ACTION_PLAN/spec:
  - P1 consume nonce on cancel replay path (`orchestrator/src/cli/control/controlServer.ts`),
  - P2 avoid consuming nonce before durable persist (`orchestrator/src/cli/control/controlServer.ts`).
- Add unchecked residual-r5 implementation checklist items in both task mirrors for defect fixes + targeted validation + manual simulation + rerun closeout.
- Update `tasks/index.json` phase + `docs/TASKS.md` snapshot to reflect residual-r5 lane opened and explicit NO-GO technical state pending fixes.

9) Residual-r6 docs-first lane open (historical no new task id; NO-GO pre-closeout)
- Add residual-r6 scope to PRD/TECH_SPEC/ACTION_PLAN/spec:
  - P2 include canonical traceability in cancel replay idempotent responses (`orchestrator/src/cli/control/controlServer.ts`).
- Add unchecked residual-r6 implementation checklist items in both task mirrors for defect fix + targeted validation + manual replay traceability check + rerun closeout.
- Update `tasks/index.json` phase + `docs/TASKS.md` snapshot to reflect residual-r6 lane opened from run `66338252` and explicit NO-GO technical state pending fix validation.

10) Residual-r7 docs-first lane open (historical no new task id; NO-GO pre-closeout)
- Add residual-r7 scope to PRD/TECH_SPEC/ACTION_PLAN/spec from run `0ef17be6`:
  - P1 preserve canonical IDs in cancel replay traceability (`orchestrator/src/cli/control/controlServer.ts`).
  - P1 keep replay audit IDs sourced from replay index (`orchestrator/src/cli/control/controlServer.ts`).
- Add unchecked residual-r7 implementation checklist items in both task mirrors for both fixes + expanded targeted tests + manual simulation + rerun closeout.
- Update `tasks/index.json` phase + `docs/TASKS.md` snapshot to reflect residual-r7 lane opened from run `0ef17be6` and explicit NO-GO technical state pending fix validation.

11) Residual-r9 docs-first lane open (historical no new task id; NO-GO pre-closeout)
- Add residual-r9 scope to PRD/TECH_SPEC/ACTION_PLAN/spec from run `3d002f4b`:
  - P1 reject transport metadata without a transport discriminator (`orchestrator/src/cli/control/controlServer.ts`).
  - P2 require transport-scoped replay match for cancel requests (`orchestrator/src/cli/control/controlServer.ts`).
- Add unchecked residual-r9 implementation checklist items in both task mirrors for both fixes + expanded targeted tests + manual simulation + rerun closeout.
- Update `tasks/index.json` phase + `docs/TASKS.md` snapshot to reflect residual-r9 lane opened from run `3d002f4b` and explicit NO-GO technical state pending fix validation.

12) Residual-r10 docs-first lane open (historical no new task id; NO-GO pre-closeout)
- Add residual-r10 scope to PRD/TECH_SPEC/ACTION_PLAN/spec from run `09e690f6`:
  - P1 reject metadata-only transport calls before delegation forwarding (`orchestrator/src/cli/delegationServer.ts`).
- Add unchecked residual-r10 implementation checklist items in both task mirrors for fix + expanded targeted tests + manual simulation + rerun closeout.
- Update `tasks/index.json` phase + `docs/TASKS.md` snapshot to reflect residual-r10 lane opened from run `09e690f6` and explicit NO-GO technical state pending fix validation.

13) Promotion-decision closeout docs lane (historical pre-approval NO-GO stream)
- Add a concise HOLD -> GO evidence matrix artifact in `out/.../manual/<timestamp>-promotion-decision-closeout-docs/` using existing gate evidence.
- Resolve stale PRD/TECH_SPEC wording that still implies residual-r9/r10 are open blockers.
- Resolve canonical spec open questions with explicit decisions:
  - mutating transport controls historically remained HOLD/NO-GO until explicit approval was recorded on 2026-03-05,
  - read-only pilot is the next-slice non-blocking scope,
  - qmd remains sidecar/docs-retrieval-only for this slice.
- Refresh `tasks/index.json`, `docs/TASKS.md`, and checklist mirrors to reflect promotion-decision closeout status.

14) Post-closeout P1 remediation mirror sync (historical pre-approval NO-GO stream)
- Add explicit checklist/spec narrative entries for `20260304T221505Z-p1-cancel-confirmation-transport-scope-bind` (targeted tests, manual simulation, review summary, elegance note).
- Move authoritative closeout pointers from the older `20260305T011056-r10-terminal-closeout` bundle to `20260305T092559-post-p1-terminal-closeout`.
- Update authoritative step11 run pointer to terminal succeeded `2026-03-04T22-35-57-207Z-867d92df` across checklist/spec/docs/index.
- Keep historical HOLD/NO-GO semantics explicit: no promotion GO claim unless explicit approval artifact exists.

15) Kill-switch/rollback drill evidence sync (historical HOLD baseline stream)
- Execute targeted validation without source edits for default-off gate, nonce rollback safety, confirmation-scope mismatch guard, and delegation fail-closed behavior.
- Capture manual simulation logs for transport fail-closed and confirmation-scope scenarios.
- Record concise artifacts `08-drill-summary.md` + `09-hold-go-approval-record.md` in `out/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/manual/20260304T231451Z-killswitch-rollback-drill/`.
- Sync PRD/TECH_SPEC/spec/checklist/index/TASKS wording so kill-switch drill evidence is marked present and only explicit GO approval remains.

## Evidence Commands (0996 docs stream)
- docs-review baseline/post-edit:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 docs-first planning stream runs as delegated worker in shared checkout; no additional subagents are spawned for this bounded docs-only slice." npx codex-orchestrator start docs-review --format json --no-interactive`
- docs checks:
  - `npm run docs:check`
  - `npm run docs:freshness`
- standalone review checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs NOTES="Goal: 0996 docs-first planning checkpoint | Summary: encode qmd timing and HOLD->GO gates; sync mirrors/registries | Risks: shared-checkout unrelated diffs can widen review scope" npm run review`
- residual-r4 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r4 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens the next implementation checklist without code edits." npx codex-orchestrator start docs-review --format json --no-interactive`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r4 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r4 docs-first checkpoint | Summary: open replay traceability metadata parity follow-up lane under existing task 0996 | Risks: shared-checkout non-0996 diffs may inflate review scope" npm run review`
- residual-r5 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r5 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens nonce residual implementation checklist items without code edits." npx codex-orchestrator start docs-review --format json --no-interactive`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r5 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r5 docs-first checkpoint | Summary: open nonce replay/persist-ordering residual lane under existing task 0996 and mark NO-GO pending fixes | Risks: shared-checkout non-0996 diffs may inflate review scope" npm run review`
- residual-r6 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r6 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens cancel replay traceability checklist items without code edits." npx codex-orchestrator start docs-review --format json --no-interactive --task 0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r6 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r6 docs-first checkpoint | Summary: open cancel replay response traceability residual lane from run 66338252 and keep NO-GO pending validation | Risks: shared-checkout non-0996 diffs may inflate review scope" MANIFEST=.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T08-00-10-026Z-66338252/manifest.json npm run review -- --manifest .runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T08-00-10-026Z-66338252/manifest.json`
- residual-r7 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r7 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens replay-ID canonicalization checklist items without code edits." npx codex-orchestrator start docs-review --format json --no-interactive --task 0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r7 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r7 docs-first checkpoint | Summary: open replay-ID canonicalization residual lane from run 0ef17be6 and keep NO-GO pending validation | Risks: shared-checkout non-0996 diffs may inflate review scope" MANIFEST=.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T09-23-36-723Z-0ef17be6/manifest.json npm run review -- --manifest .runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T09-23-36-723Z-0ef17be6/manifest.json`
- residual-r9 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r9 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens transport discriminator/replay-scope checklist items without code edits." npx codex-orchestrator start docs-review --format json --no-interactive --task 0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r9 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r9 docs-first checkpoint | Summary: open transport discriminator and transport-scoped cancel replay residual lane from run 3d002f4b and keep NO-GO pending validation | Risks: shared-checkout non-0996 diffs may inflate review scope" MANIFEST=.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T11-29-27-215Z-3d002f4b/manifest.json npm run review -- --manifest .runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T11-29-27-215Z-3d002f4b/manifest.json`
- residual-r10 docs-first refresh checkpoint:
  - `MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs DELEGATION_GUARD_OVERRIDE_REASON="0996 residual-r10 docs-first stream runs as delegated worker in shared checkout; this lane is docs-only and opens delegation metadata discriminator checklist items without code edits." npx codex-orchestrator start docs-review --format json --no-interactive --task 0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness`
  - `DIFF_BUDGET_OVERRIDE_REASON="0996 residual-r10 docs-only review in shared checkout" MCP_RUNNER_TASK_ID=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness-docs TASK=0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness NOTES="Goal: 0996 residual-r10 docs-first checkpoint | Summary: open delegation metadata discriminator fail-closed residual lane from run 09e690f6 and keep NO-GO pending validation | Risks: shared-checkout non-0996 diffs may inflate review scope" MANIFEST=.runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T12-47-18-555Z-09e690f6/manifest.json npm run review -- --manifest .runs/0996-coordinator-control-bridge-slice-4-discord-telegram-mutating-control-promotion-readiness/cli/2026-03-04T12-47-18-555Z-09e690f6/manifest.json`

## Risks & Mitigations
- Risk: qmd decisions are copied as prose without execution timing.
- Mitigation: enforce explicit placement/timing table in PRD/spec/action plan.
- Risk: authority boundary drifts during transport promotion planning.
- Mitigation: hard-code invariants in each artifact and checklist acceptance items.
- Risk: review output includes unrelated shared-checkout noise.
- Mitigation: scope edits to 0996-owned docs and annotate shared-checkout context in checklist notes.
- Risk: residual-r5 defects are interpreted as GO because rerun `d9f360c2` succeeded.
- Mitigation: explicitly track NO-GO technical state in PRD/spec/checklist/docs snapshot until residual-r5 implementation evidence is complete.
- Risk: cancel replay responses omit canonical traceability on idempotent replay and allow downstream actor attribution drift.
- Mitigation: open residual-r6 as explicit NO-GO lane with required targeted/manual/terminal validation checklist items before promotion.
- Risk: replay traceability IDs in cancel replay paths can drift from canonical replay-index IDs in request-only/intent-only flows.
- Mitigation: open residual-r7 as explicit NO-GO lane with required fix/test/manual/terminal validation checklist items before promotion.
- Risk: transport-bound metadata and cancel replay matching can drift across transport boundaries when discriminator/replay-scope checks are missing.
- Mitigation: open residual-r9 as explicit NO-GO lane with required P1/P2 fix/test/manual/terminal validation checklist items before promotion.
- Risk: delegation path can fail open by forwarding metadata-only transport calls when discriminator fields are missing.
- Mitigation: open residual-r10 as explicit NO-GO lane with required P1 fix/test/manual/terminal validation checklist items before promotion.
