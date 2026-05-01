---
id: 20260501-linear-bdfd9046-97b5-43bd-850f-b305558cdada
title: "CO-466 Codex CLI 0.128.0 release-intake"
relates_to: docs/PRD-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md
risk: high
owners:
  - Codex
last_review: 2026-05-01
related_action_plan: docs/ACTION_PLAN-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md
task_checklists:
  - tasks/tasks-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md
---

## Canonical Reference
- PRD: `docs/PRD-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- Canonical task spec: `tasks/specs/linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- Task checklist: `tasks/tasks-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- `.agent` mirror: `.agent/task/linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- Source anchor: `ctx:sha256:246da4b00bfe547dbd454953dbd4a371e6bc66dc1103e2c6e042e09fcf424425#chunk:c000001`
- Canonical owner key: `codex-cli-release-intake:stable:0.128.0`

## Summary
- Objective: register CO-466 as the candidate `0.128.0` Codex CLI release-intake packet using the CO-386 release-intake template.
- Scope: docs packet, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` only.
- Constraints: preserve exact release-intake wording, avoid implementation/workflow/package/test/template edits, do not mutate Linear/GitHub, and leave evidence collection plus final closeout to the parent lane.

## Issue-Shaping Contract
- User-request translation carried forward: CO-466 should bootstrap candidate `0.128.0` release intake, comparing upstream Codex CLI release detection, GitHub release truth, npm @openai/codex dist-tags/time, CO version-policy target, and workflow pins before any adoption, hold, archive-only, or follow-up decision.
- Protected terms / exact artifact and surface names: upstream Codex CLI release detection, GitHub release truth, npm @openai/codex dist-tags/time, CO version-policy target, workflow pins, candidate `0.128.0`, canonical owner key `codex-cli-release-intake:stable:0.128.0`, `CO-386`, `CO-466`, `.agent/task/templates/codex-cli-release-intake-template.md`, `docs/guides/codex-version-policy.md`.
- Nearby wrong interpretations to reject: npm latest alone is enough, a GitHub tag alone is enough, local CLI success alone is enough, CO-452 feature-removal work substitutes for release-intake closeout, workflow pins should move automatically, model posture can drift as a side effect, or this child lane should mutate Linear/GitHub.
- Explicit non-goals carried forward: no implementation, package, workflow, test, template, Linear, GitHub, workpad, PR, release promotion, workflow pin update, cloud-canary rebaseline, package/downstream smoke rebaseline, model posture change, or full repo validation from this child lane.

## Parity / Alignment Matrix
- Current truth: CO version policy records the prior release-intake completion marker for `codex-cli-release-intake:stable:0.125.0`; candidate `0.128.0` must be classified before it can replace, hold beside, or demote prior evidence.
- Reference truth: the CO-386 release-intake template requires separate evidence axes for local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes, plus supersedes/holds, closeout classification, and closure gates.
- Target truth / intended delta: parent has a candidate-specific `0.128.0` packet keyed by `codex-cli-release-intake:stable:0.128.0` that can be used to collect evidence and close out with explicit adopt/latest, intentionally hold, or demote/archive-only classifications.
- Explicitly out-of-scope differences: direct posture changes, workflow pin changes, cloud canary execution, package publishing or install smoke, marketplace smoke, runtime-mode canary, source edits, and lifecycle mutations.

## Readiness Gate
- Not done if:
  - upstream Codex CLI release detection, GitHub release truth, npm @openai/codex dist-tags/time, CO version-policy target, workflow pins, candidate `0.128.0`, or canonical owner key `codex-cli-release-intake:stable:0.128.0` is missing
  - any CO-386 evidence axis is absent or collapsed into a generic validation flag
  - supersedes/holds matrix rows are missing for local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, or release notes
  - closeout classification omits adopt latest, intentionally hold, or demote/archive-only states
  - closure can pass while stale current-facing docs, workflow pins, prior evidence pages, or model posture claims remain unclassified
  - this child lane edits out-of-scope files or mutates Linear/GitHub state
- Pre-implementation issue-quality review evidence:
  - 2026-05-01: approved for docs-only packet bootstrap. The micro-task path is not appropriate because correctness depends on exact release-intake wording, protected terms, evidence axes, and closeout classification.
  - 2026-05-01: referenced source payload path was unavailable in the child checkout, so the parent prompt and release-intake template are the operative issue-shaping contract.
- Safeguard ownership split:
  - child lane owns only the declared docs and registry files
  - parent owns source reconciliation, Linear/workpad state, evidence collection, docs-review, implementation, validation, PR lifecycle, and final patch integration

## Technical Requirements
- Functional requirements:
  1. Create the CO-466 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
  2. Register task id `20260501-linear-bdfd9046-97b5-43bd-850f-b305558cdada` in `tasks/index.json`.
  3. Add a current CO-466 snapshot to `docs/TASKS.md`.
  4. Add docs freshness rows for all six packet/mirror files.
  5. Preserve all protected terms exactly.
  6. Include all CO-386 release-intake evidence axes.
  7. Include supersedes/holds matrix rows for all required surfaces.
  8. Include closeout classification and closure gate checklists.
  9. Reflect the current parent validation state: initial child-lane rows may stay pending only when explicitly labeled as initial scoping, while final closeout rows must carry completed evidence classifications.
- Non-functional requirements:
  - packet wording must fail closed against blind candidate adoption
  - registry entries must remain valid JSON
  - docs freshness rows must be active with `last_review` `2026-05-01`
  - no unrelated registry churn
- Interfaces / contracts:
  - `tasks/index.json` remains canonical under `items[]`
  - `docs/docs-freshness-registry.json` tracks all packet files
  - `docs/TASKS.md` records the current task snapshot
  - parent release-intake implementation uses canonical owner key `codex-cli-release-intake:stable:0.128.0`

## Architecture & Data
- Architecture / design adjustments: none in this child lane. Parent should treat CO-466 as a candidate-specific release-intake record: gather release facts, classify evidence axes, update/demote/hold surfaces, then close only when every required gate is classified.
- Data model changes / migrations: no runtime migration. The packet introduces no new schema beyond `tasks/index.json` and docs freshness registry rows.
- External dependencies / integrations:
  - GitHub release truth for upstream Codex CLI
  - npm @openai/codex dist-tags/time
  - local CLI evidence
  - package/downstream smoke evidence
  - cloud-canary evidence
  - workflow pins evidence
  - model posture evidence
  - docs surfaces evidence
  - release notes evidence

## Release Evidence Axes
- [x] local CLI evidence: installed or candidate executable version, command-surface smoke, and local auth/provider constraints.
- [x] package/downstream smoke evidence: package install, marketplace/plugin smoke, and downstream workflow compatibility.
- [x] cloud-canary evidence: required cloud canary result, fallback cloud contract result, and any explicit hold reason.
- [x] workflow pins evidence: every release-facing workflow pin, cloud-canary pin, package-smoke pin, and intentional hold.
- [x] model posture evidence: current local model posture, delegated/review posture, portable fallback posture, and unsupported-provider notes.
- [x] docs surfaces evidence: README, book index, public posture docs, downstream setup docs, version policy, docs catalog, evidence pages, and task packets.
- [x] release notes evidence: official release notes, npm version/time, local help deltas, and classified CO impact.

## Supersedes / Holds Matrix

Initial scoping rows below are superseded by the completed parent closeout matrix in `Parent Closeout Evidence - 2026-05-01`.

| Surface | Prior release evidence page or posture surface | Classification | Reason | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| local CLI | Prior local CLI and command-surface evidence for current CO posture. | Initial scoping only; final classification below. | Candidate `0.128.0` must prove local command/auth compatibility. | Parent-owned local CLI probe and help delta. | File blocker if local CLI evidence fails or is incomplete. |
| package/downstream smoke | Prior package/downstream smoke evidence and release-facing pack-smoke pins. | Initial scoping only; final classification below. | Package behavior must be validated independently of upstream release existence. | Parent-owned npm capture and downstream smoke. | Hold or follow up if npm/package evidence diverges. |
| cloud-canary | Prior required cloud-canary and fallback cloud contract evidence. | Initial scoping only; final classification below. | Cloud may intentionally hold while local/package surfaces adopt. | Parent-owned required cloud and fallback manifests. | Link cloud blocker if required canary fails. |
| workflow pins | Release-facing workflow pins and package/cloud pin surfaces. | Initial scoping only; final classification below. | Pins must be updated, held, or linked to blockers explicitly. | Parent-owned workflow pin audit. | Pin update or intentional-hold follow-up. |
| model posture | Local, delegated/review, portable fallback, and unsupported-provider posture records. | Initial scoping only; final classification below. | Release intake must not carry stale model claims forward silently. | Parent-owned model posture and runtime evidence. | Separate posture follow-up if needed. |
| docs surfaces | Current-facing docs, public posture docs, version policy, docs catalog, evidence pages, and task packets. | Initial scoping only; final classification below. | Docs must adopt latest, intentionally hold, or demote/archive-only. | Parent-owned docs audit and docs checks. | File docs cleanup blocker for surfaces outside CO-466. |
| release notes | Official release notes, npm version/time, local help deltas, and CO impact notes. | Initial scoping only; final classification below. | Release notes must be classified into CO impact before closeout. | Parent-owned release note and help-delta capture. | Follow up for out-of-scope release-note impacts. |

## Closeout Classification
- [x] Adopt latest: list every surface that now adopts candidate `0.128.0`.
- [x] Intentionally hold: list every surface that keeps an older release and cite the blocking evidence.
- [x] Demote/archive-only: list every historical evidence page removed from current-facing navigation or classified as archive-only.
- [x] Stale current-facing docs are classified, demoted, or linked to a blocking follow-up.
- [x] Workflow pins remain unclassified nowhere: every pin is either updated, intentionally held, or linked to a blocking follow-up.
- [x] Release-intake closeout states which surfaces adopt latest, which intentionally hold, and which docs are demoted/archive-only.

## Closure Gate
- [x] No stale current-facing docs remain unclassified.
- [x] No workflow pins remain unclassified.
- [x] No prior release evidence page remains current-facing without a deliberate supersedes/holds row.
- [x] No model posture surface carries forward a stale claim without a current evidence row.
- [x] Any out-of-scope cleanup is filed as a linked follow-up instead of expanding this release-intake issue.

## Validation Plan
- Child-lane checks:
  - protected-term scan across the six packet/mirror files
  - JSON parse check for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - `git diff --check --` scoped to declared files
  - changed-file review to confirm declared file scope only
- Parent-owned checks:
  - docs-review before implementation
  - issue-body reconciliation against current Linear/workpad truth
  - local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes evidence collection
  - docs:check, docs:freshness, and normal validation floor when parent implementation changes surfaces
- Rollout verification: parent records final `0.128.0` release-intake classification in workpad, task mirrors, PR, and current docs surfaces.

## Risks
- Source payload unavailable in child checkout.
  - Mitigation: record the unavailable path and use parent-provided prompt plus template contract.
- Candidate existence is mistaken for adoption approval.
  - Mitigation: release evidence axes and closure gates stayed initial-scoping only until parent evidence existed; final closeout evidence is recorded below.
- Archive-only classification hides live blockers.
  - Mitigation: closeout requires intentional holds or linked blockers for unresolved current surfaces.
- Workflow pins move without cloud/package proof.
  - Mitigation: workflow pins evidence is a separate axis and cannot be satisfied by GitHub or npm alone.

## Completion Criteria
- CO-466 packet and mirrors exist in declared paths.
- `tasks/index.json` and `docs/docs-freshness-registry.json` parse as JSON.
- Protected-term scan confirms release-intake wording and canonical owner key.
- Scoped diff review shows no edits outside declared file scope.
- Parent can continue with evidence collection, implementation, validation, and lifecycle handoff.

## Parent Closeout Evidence - 2026-05-01
- [x] local CLI evidence: `codex-cli 0.128.0`, active ChatGPT auth, preserved `exec`, `review`, `app-server`, `plugin marketplace`, `sandbox`, and `cloud` help surfaces.
- [x] package/downstream smoke evidence: `npm run build` and `npm run pack:smoke` passed on local `0.128.0`; release-facing pins still intentionally hold because required cloud is red.
- [x] cloud-canary evidence: required cloud canary failed with `environment_not_found` for `CODEX_CLOUD_ENV_ID=6999395fcc448191b865917084f21c6f`; fallback cloud contract passed with expected missing-env MCP fallback.
- [x] workflow pins evidence: package/release workflows and pack-smoke tests intentionally hold at `@openai/codex@0.125.0`; `cloud-canary` intentionally holds at `@openai/codex@0.124.0`.
- [x] model posture evidence: `gpt-5.5` / `xhigh` remains the current validated ChatGPT-auth/appserver posture, with portable `gpt-5.4` / `xhigh` fallback unchanged.
- [x] docs surfaces evidence: posture matrix, version policy, README/docs README, public/book/downstream setup, AGENTS templates, archive wording, and shipped delegation guidance classify the local adopt/latest and release/cloud holds.
- [x] release notes evidence: GitHub `rust-v0.128.0` published `2026-04-30T16:40:28Z`, npm `@openai/codex@0.128.0` published `2026-04-30T16:43:46.064Z`, and `js_repl` / `js_repl_tools_only` removal is confirmed by local feature list.

| Surface | Classification | Evidence | Follow-up |
| --- | --- | --- | --- |
| local CLI | Adopt latest for local ChatGPT-auth/appserver command/runtime posture. | Local `codex-cli 0.128.0`, command help probes, runtime-mode canary 20/20. | None. |
| package/downstream smoke | Candidate smoke passes; release-facing target intentionally holds. | `npm run build`; `npm run pack:smoke`. | Required cloud environment visibility blocks pin promotion. |
| cloud-canary | Intentionally hold. | Required cloud manifest under `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-cloud-required-0128/...`; fallback manifest under `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-cloud-fallback-0128/...`. | Fix visible cloud environment before release/cloud promotion. |
| workflow pins | Intentionally hold. | Pin audit confirms `0.125.0` package/release pins and `0.124.0` cloud pin remain classified. | None in this lane. |
| model posture | Adopt latest CLI carrier; model posture unchanged. | Bundled model catalog contains `gpt-5.5` and `gpt-5.4` with `xhigh`; local auth/runtime evidence passed. | None. |
| docs surfaces | Adopt local `0.128.0`; hold release/cloud; preserve archive-only history. | Current-facing docs and posture matrix updated. | None. |
| release notes | Adopt/hold/no-op classified. | Official release/npm timestamps plus local help/features deltas. | None. |

## Final Closeout Classification - 2026-05-01
- [x] Adopt latest: local ChatGPT-auth/appserver CLI command/runtime posture and latest-audited-candidate marker now use `0.128.0`.
- [x] Intentionally hold: release-facing downstream/package smoke workflow pins stay on `0.125.0`; cloud-canary stays on `0.124.0`; required cloud is blocked by `environment_not_found`.
- [x] Demote/archive-only: historical `0.124.0` evidence remains archive-only; prior `0.125.0` posture is superseded locally but retained as the release-facing package/downstream compatibility hold.
- [x] Stale current-facing docs are classified and updated.
- [x] Workflow pins remain unclassified nowhere.
- [x] Release-intake closeout states adopt/latest, intentional holds, and archive-only history.

## Final Closure Gate - 2026-05-01
- [x] No stale current-facing docs remain unclassified.
- [x] No workflow pins remain unclassified.
- [x] No prior release evidence page remains current-facing without a deliberate supersedes/holds row.
- [x] No model posture surface carries forward a stale claim without a current evidence row.
- [x] No out-of-scope follow-up was needed.
