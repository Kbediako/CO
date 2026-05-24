---
id: 20260501-linear-bdfd9046-97b5-43bd-850f-b305558cdada
title: "CO-466 Codex CLI 0.128.0 release-intake"
relates_to: docs/PRD-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md
risk: high
owners:
  - Codex
last_review: 2026-05-24
related_action_plan: docs/ACTION_PLAN-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md
task_checklists:
  - tasks/tasks-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md
review_notes:
  - "2026-05-24: CO-579 pre-expiry review: retained active or blocked scope; no spec contract changes required."
---

## Canonical Reference
- PRD: `docs/PRD-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- Task checklist: `tasks/tasks-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- `.agent` mirror: `.agent/task/linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- Source anchor: `ctx:sha256:246da4b00bfe547dbd454953dbd4a371e6bc66dc1103e2c6e042e09fcf424425#chunk:c000001`
- Canonical owner key: `codex-cli-release-intake:stable:0.128.0`

## Summary
- Objective: define the CO-466 candidate `0.128.0` Codex CLI release-intake packet using the CO-386 release-intake template and closeout gates.
- Scope:
  - CO-466 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror
  - `tasks/index.json` registration
  - `docs/TASKS.md` snapshot
  - `docs/docs-freshness-registry.json` rows for all packet files
  - parent-owned requirements for upstream Codex CLI release detection, GitHub release truth, npm @openai/codex dist-tags/time, CO version-policy target, workflow pins, evidence axes, supersedes/holds rows, closeout classification, and closure gates
- Constraints:
  - child lane stays docs-only and does not edit implementation, package, workflow, test, template, Linear, GitHub, workpad, or PR lifecycle surfaces
  - parent owns final issue reconciliation, docs-review, implementation, validation, PR lifecycle, and Linear/workpad state
  - no full repo validation suites from this child lane

## Issue-Shaping Contract
- User-request translation carried forward: CO-466 is the candidate-specific release-intake lane for Codex CLI `0.128.0`; it must compare upstream Codex CLI release detection, GitHub release truth, npm @openai/codex dist-tags/time, CO version-policy target, and workflow pins before final adoption, intentional hold, or archive-only demotion.
- Protected terms / exact artifact and surface names:
  - upstream Codex CLI release detection
  - GitHub release truth
  - npm @openai/codex dist-tags/time
  - CO version-policy target
  - workflow pins
  - candidate `0.128.0`
  - canonical owner key `codex-cli-release-intake:stable:0.128.0`
  - `CO-386`
  - `CO-466`
  - `.agent/task/templates/codex-cli-release-intake-template.md`
  - `docs/guides/codex-version-policy.md`
- Nearby wrong interpretations to reject:
  - candidate `0.128.0` exists, therefore CO should adopt it
  - GitHub release truth, npm @openai/codex dist-tags/time, or local CLI evidence can each stand alone
  - workflow pins should automatically mirror npm latest
  - model posture changes are incidental side effects of CLI release intake
  - archive-only classification can resolve live blockers
  - this child lane should mutate Linear/GitHub or edit implementation/workflow/package/test/template files
- Explicit non-goals carried forward:
  - no release promotion or workflow pin decision in this child lane
  - no Linear/GitHub mutation helper calls
  - no package/downstream smoke, cloud-canary, runtime-mode canary, or marketplace smoke execution
  - no full validation suite
  - no broad stale-doc cleanup outside this packet and registry rows

## Parity / Alignment Matrix
- Current truth:
  - current CO version-policy posture is parent-owned and remains a comparison surface
  - the prior release-intake completion marker is for `codex-cli-release-intake:stable:0.125.0`
  - initial child-lane packet did not classify candidate `0.128.0`; final parent classification is recorded in `Parent Closeout Evidence - 2026-05-01`
- Reference truth:
  - the CO-386 release-intake template requires evidence axes, supersedes/holds matrix rows, closeout classification, and closure gates
  - GitHub release truth and npm @openai/codex dist-tags/time must both be represented
  - workflow pins and docs surfaces must be classified, not silently moved
- Target truth:
  - parent can use canonical owner key `codex-cli-release-intake:stable:0.128.0` to collect evidence and prevent duplicate intake
  - each evidence surface is classified as adopt latest, intentionally hold, or demote/archive-only before closeout
  - stale current-facing docs, workflow pins, prior evidence pages, and model posture claims cannot remain unclassified
- Explicitly out-of-scope differences:
  - workflow file edits
  - package/downstream smoke implementation changes
  - docs freshness policy changes
  - model default changes
  - implementation, template, Linear, GitHub, workpad, or PR lifecycle edits

## Readiness Gate
- Not done if:
  - any protected term is absent from the packet
  - any CO-386 evidence axis is absent or genericized
  - the supersedes/holds matrix is missing a required row
  - closeout classification and closure gate checklists are absent
  - candidate `0.128.0` is described as adopted without parent evidence
  - parent-owned implementation and lifecycle boundaries are unclear
- Pre-implementation issue-quality review evidence:
  - 2026-05-01: source payload path was unavailable in this child checkout; the parent prompt plus release-intake template are the authoritative docs contract.
  - 2026-05-01: micro-task path is not appropriate because correctness depends on exact protected terms, release evidence axes, supersedes/holds rows, and closeout gates.
- Safeguard ownership split:
  - child lane owns only the declared docs and registry files
  - parent owns issue body reconciliation, Linear/workpad state, docs-review, implementation, tests, validation, PR lifecycle, and final patch acceptance

## Technical Requirements
- Functional requirements:
  1. Create the CO-466 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
  2. Register the canonical spec in `tasks/index.json`.
  3. Add current CO-466 rows to `docs/TASKS.md` and `docs/docs-freshness-registry.json`.
  4. Preserve all protected CO-466 terms exactly.
  5. Include all CO-386 release evidence axes.
  6. Include a supersedes/holds matrix row for local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes.
  7. Include closeout classification and closure gate checklists.
  8. Reflect the current parent validation state: initial child-lane rows may stay pending only when explicitly labeled as initial scoping, while final closeout rows must carry completed evidence classifications.
- Non-functional requirements:
  - packet wording must remain concise and machine-checkable
  - no implementation drift outside declared docs scope
  - no lifecycle mutations
  - no weakening of cloud-canary, package/downstream smoke, workflow pin, or docs freshness gates
- Interfaces / contracts:
  - `tasks/index.json` remains canonical under `items[]`
  - `docs/TASKS.md` records the current task snapshot
  - `docs/docs-freshness-registry.json` tracks all packet files
  - parent release-intake surfaces must preserve adopt latest, intentionally hold, and demote/archive-only distinctions

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
| local CLI | Prior local CLI release evidence and current CO version-policy local posture. | Initial scoping only; final classification below. | Candidate `0.128.0` needs local CLI and auth/provider proof. | Parent-owned CLI probe and command help delta. | Blocker/follow-up if incomplete. |
| package/downstream smoke | Prior package/downstream smoke and marketplace/plugin compatibility evidence. | Initial scoping only; final classification below. | npm @openai/codex dist-tags/time must be paired with downstream behavior. | Parent-owned npm capture and smoke evidence. | Hold/follow-up if package compatibility fails. |
| cloud-canary | Prior required cloud canary and fallback cloud contract evidence. | Initial scoping only; final classification below. | Cloud posture can intentionally hold even if local evidence passes. | Parent-owned cloud manifests and hold reason. | Cloud blocker if required canary fails. |
| workflow pins | Release-facing workflow pins and package/cloud pin surfaces. | Initial scoping only; final classification below. | Every pin must be updated, held, or linked to a blocker. | Parent-owned workflow pin audit. | Pin update or hold issue. |
| model posture | Local, delegated/review, portable fallback, and unsupported-provider posture records. | Initial scoping only; final classification below. | Model posture cannot be silently changed by CLI intake. | Parent-owned model posture evidence. | Separate model posture follow-up if needed. |
| docs surfaces | README, book index, public posture docs, downstream setup docs, version policy, docs catalog, evidence pages, and task packets. | Initial scoping only; final classification below. | Stale current-facing docs must not survive closeout unclassified. | Parent-owned docs audit and docs checks. | Docs cleanup follow-up if outside CO-466. |
| release notes | Official release notes, npm version/time, local help deltas, and CO impact notes. | Initial scoping only; final classification below. | Release notes must be classified into CO impact. | Parent-owned release note evidence. | Follow-up for out-of-scope impact. |

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
  - protected-term scan across CO-466 packet files
  - JSON parse check for `tasks/index.json` and `docs/docs-freshness-registry.json`
  - scoped `git diff --check --` over declared files
  - scoped changed-file review
- Parent-owned checks:
  - docs-review before implementation
  - issue-body reconciliation against current Linear/workpad truth
  - release evidence collection for all CO-386 axes
  - focused tests or docs checks for any parent implementation surface
  - package/downstream smoke validation when package-facing surfaces change
  - cloud-canary validation when cloud posture changes
  - normal parent validation floor before PR handoff
- Rollout verification: parent records final `0.128.0` release-intake closeout classification in canonical workpad, registry, PR, and docs surfaces.

## Risks
- Source payload ambiguity.
  - Mitigation: packet records that the source path is unavailable and uses the parent prompt plus template contract.
- Release-intake becomes a blind promotion path.
  - Mitigation: separate evidence axes and closeout gates prevent adoption without parent proof.
- Archive-only classification hides live blockers.
  - Mitigation: archive-only is allowed only for superseded evidence; live blockers require holds or follow-ups.
- Scope creep into implementation from the child lane.
  - Mitigation: explicit ownership split and validation notes keep non-docs changes parent-owned.

## Completion Criteria
- CO-466 packet and mirrors exist in the declared paths.
- `tasks/index.json` and `docs/docs-freshness-registry.json` parse as JSON.
- Protected-term scan confirms the release-intake terms and canonical owner key are present.
- Scoped diff review shows no edits outside the declared file scope.
- Parent can continue with evidence collection, validation, and Linear/PR lifecycle.

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
