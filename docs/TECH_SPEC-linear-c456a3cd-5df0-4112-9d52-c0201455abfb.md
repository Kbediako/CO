---
id: 20260520-linear-c456a3cd-5df0-4112-9d52-c0201455abfb
title: "CO-565 Codex CLI 0.131.0 release-intake"
relates_to: docs/PRD-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md
risk: high
owners:
  - Codex
last_review: 2026-05-19
related_action_plan: docs/ACTION_PLAN-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md
task_checklists:
  - tasks/tasks-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md
---

## Canonical Reference
- Linear issue: `CO-565` / `c456a3cd-5df0-4112-9d52-c0201455abfb`
- PRD: `docs/PRD-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- Canonical task spec: `tasks/specs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- Task checklist: `tasks/tasks-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- `.agent` mirror: `.agent/task/linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- Source anchor: `ctx:sha256:2bc9d835d25cc769df42134a55d81362f859e6e881c0ba271234658d26152a4b#chunk:c000001`
- Canonical owner key: `codex-cli-release-intake:stable:0.131.0`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`

## Summary
- Objective: complete CO-565 as the candidate `0.131.0` Codex CLI release-intake packet, evidence record, and closeout classification.
- Scope: release-intake packet, registry mirrors, task snapshot, version-policy classification, and evidence capture.
- Constraints: preserve exact release-intake wording, avoid source/package/workflow/generated/test/template edits, avoid release publishing/local install/model-default changes, and keep Linear/GitHub lifecycle changes limited to governed workpad/PR handoff.

## Issue-Shaping Contract
- User-request translation carried forward: CO-565 should bootstrap candidate `0.131.0` release intake, using `codex-cli-release-intake:stable:0.131.0` as the canonical owner key and `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0` as the marker, then classify local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes before any adoption, hold, archive-only, or follow-up decision.
- Protected terms / exact artifact and surface names: candidate Codex CLI release `0.131.0`, canonical owner key `codex-cli-release-intake:stable:0.131.0`, canonical marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`, do not auto-promote `0.131.0`, local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, release notes, supersedes/holds matrix, closeout classification gates, `.agent/task/templates/codex-cli-release-intake-template.md`, `docs/guides/codex-version-policy.md`, `docs/codex-posture-matrix.json`.
- Nearby wrong interpretations to reject: npm latest alone is enough, a GitHub tag alone is enough, local CLI success alone is enough, workflow pins should move automatically, model posture can drift as a side effect, cloud or package holds can be hidden as archive-only, or this lane should mutate source files, package/workflow pins, local install state, release publishing, or model defaults.
- Explicit non-goals carried forward: no source code, package files, workflows, generated outputs, tests, templates, release promotion, workflow pin update, cloud-canary rebaseline, local `0.131.0` install, package/downstream smoke rebaseline, model posture change, or release publishing.

## Parity / Alignment Matrix
- Current truth: read-only repo policy currently records Codex CLI `0.130.0` as latest audited local ChatGPT-auth/appserver command/runtime posture, release-facing package/downstream smoke pins held at `0.125.0`, `cloud-canary` held at `0.124.0`, and model posture held at `gpt-5.5` / `xhigh` with portable `gpt-5.4` fallback.
- Reference truth: release-intake requires separate evidence axes for local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes, plus supersedes/holds, closeout classification, and closure gates.
- Target truth / intended delta: parent has a candidate-specific `0.131.0` packet keyed by `codex-cli-release-intake:stable:0.131.0` that can be used to collect evidence and close out with explicit adopt/latest, intentionally hold, or demote/archive-only classifications.
- Explicitly out-of-scope differences: direct posture promotion, source edits, historical release evidence-page rewrites, workflow pin changes, cloud pin promotion, package publishing, local install, runtime-mode canary, generated output edits, unrelated docs churn, and lifecycle mutations beyond governed workpad/PR handoff. Parent-owned registry mirrors, version-policy classification, and bounded release evidence probes are in scope for this lane.

## Readiness Gate
- Not done if:
  - candidate `0.131.0`, canonical owner key `codex-cli-release-intake:stable:0.131.0`, canonical marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`, no-auto-promotion language, or any required evidence axis is missing
  - any release-intake evidence axis is absent or collapsed into a generic validation flag
  - supersedes/holds matrix rows are missing for local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, or release notes
  - closeout classification omits adopt latest, intentionally hold, or demote/archive-only states
  - closure can pass while stale current-facing docs, workflow pins, prior evidence pages, package/downstream holds, cloud-canary blockers, or model posture claims remain unclassified
  - this lane edits source behavior, package/workflow pins, generated outputs, local install state, release publishing, or model defaults
- Pre-implementation issue-quality review evidence:
  - 2026-05-19: approved for release-intake packet/classification. The micro-task path is not appropriate because correctness depends on exact release-intake wording, protected terms, evidence axes, and closeout classification.
  - 2026-05-19: source payload pointer from the parent prompt was checked at `../../.runs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb/cli/2026-05-19T20-55-42-862Z-928a3f57/memory/source-0/source.txt`; the source payload, parent prompt, and release-intake template are the operative issue-shaping contract for this packet.
- Safeguard ownership split:
  - docs child lane owned the initial six-file packet scaffold
  - parent lane owns source reconciliation, registry mirrors, Linear/workpad state, evidence collection, validation, PR lifecycle, and final patch integration

## Technical Requirements
- Functional requirements:
  1. Create the CO-565 PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, and `.agent` mirror.
  2. Preserve all protected terms exactly.
  3. Include immediate traceability with source anchor, source object id, manifest pointer, canonical owner key, and canonical marker.
  4. Include the issue intent checksum, non-goals, Not Done If, and acceptance criteria.
  5. Include all release-intake evidence axes.
  6. Include supersedes/holds matrix rows for all required surfaces.
  7. Include closeout classification and closure gate checklists.
  8. Complete all release evidence and final classification in the parent lane.
  9. State that source behavior, package/workflow pins, local install state, and model defaults are out of scope.
- Non-functional requirements:
  - packet wording must fail closed against blind candidate adoption
  - evidence rows must stay concrete where verified and fail closed where held
  - no unrelated docs churn
  - no source mutation
- Interfaces / contracts:
  - parent release-intake implementation uses canonical owner key `codex-cli-release-intake:stable:0.131.0`
  - parent integration may use marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`
  - parent owns future `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` registration if needed

## Architecture & Data
- Architecture / design adjustments: CO-565 is a candidate-specific release-intake record: gather release facts, classify evidence axes, update/demote/hold surfaces, then close only when every required gate is classified.
- Data model changes / migrations: no runtime migration and no source data model mutation.
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
- [x] local CLI evidence: installed local `/opt/homebrew/bin/codex --version` remains `codex-cli 0.130.0`; local `features list`, `debug models`, and help-surface probes preserve current `0.130.0` posture. Candidate `0.131.0` is not installed as local posture in this lane.
- [x] package/downstream smoke evidence: npm `@openai/codex` reports `latest=0.131.0`, `alpha=0.132.0-alpha.1`, and `time["0.131.0"]=2026-05-18T18:08:19.710Z`; isolated `npx` `0.131.0` smoke passed version, plugin marketplace, `doctor`, and `remote-control` help probes.
- [x] cloud-canary evidence: required cloud canary failed `configuration (environment_not_found)` for configured environment id `6999395fcc448191b865917084f21c6f`; blank-env fallback contract failed `configuration (env_config)` / `missing_environment`.
- [x] workflow pins evidence: release-facing `core-lane`, `release`, and `pack-smoke-backstop` pins intentionally remain on `@openai/codex@0.125.0`, and `cloud-canary` remains on `@openai/codex@0.124.0`.
- [x] model posture evidence: `gpt-5.5` / `xhigh`, portable `gpt-5.4` fallback, and `explorer_fast` exception remain unchanged.
- [x] docs surfaces evidence: CO-565 packet and `docs/guides/codex-version-policy.md` now separate latest upstream/package-audited `0.131.0` truth from local `0.130.0`, release-facing `0.125.0`, cloud `0.124.0`, and model-posture holds.
- [x] release notes evidence: official `rust-v0.131.0` release and npm publish timestamps are captured; `doctor`, plugin marketplace, remote-control/runtime API, remote env, default hook, Python SDK, and permission/state deltas are classified as package-audited, held, or no-op unless a separate governed lane needs them.

## Supersedes / Holds Matrix

| Surface | Prior release evidence page or posture surface | Classification | Reason | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| local CLI | `0.130.0` current local ChatGPT-auth/appserver command/runtime posture from CO-518. | Intentionally hold local posture; adopt `0.131.0` only as latest upstream/package-audited candidate. | Local installed CLI remains `0.130.0`; this lane did not install `0.131.0` locally or rerun runtime-mode canary against a local `0.131.0` posture. | `local-cli-version.log`, `local-features-0130.log`, `local-debug-models.log`, local help logs. | Future local promotion requires local install and runtime-mode/cloud gates. |
| package/downstream smoke | Release-facing package/downstream smoke target held at `0.125.0`; CO-518 package evidence covered `0.130.0`. | Adopt candidate as package-audited evidence; intentionally hold release-facing workflow pins. | npm and isolated `npx` smoke passed for `0.131.0`, but workflow pins remain cloud-gate guarded. | `npm-0131.json`, `package-version-0131.log`, `package-plugin-marketplace-0131.log`, `package-doctor-0131.log`, `package-remote-control-0131.log`. | None for package command-surface evidence. |
| cloud-canary | `0.124.0` cloud-canary candidate and existing CO-518 cloud hold. | Intentionally hold. | Required cloud canary still fails before cloud execution because configured env id is not visible; fallback contract with blank env fails on missing environment configuration. | Required and fallback CO-565 cloud manifests. | None filed here; this remains a configured cloud environment blocker. |
| workflow pins | Release-facing workflow pins and cloud-canary pin surfaces. | Intentionally hold. | Workflow pins are not automatic mirrors of npm latest; clean cloud gates remain required before release-facing promotion. | Version policy current posture rows and cloud canary manifests. | None until cloud gates pass. |
| model posture | Current local `gpt-5.5` / `xhigh`, portable `gpt-5.4` fallback, and `explorer_fast` exception. | Adopt current posture unchanged. | `0.131.0` release intake found no model-posture reason to move defaults. | `model-posture-summary.tsv`, `local-debug-models.log`, version policy model rows. | None. |
| docs surfaces | Version policy, posture matrix, registry/freshness surfaces, task packet, and CO-518 release-intake rows. | Adopt latest upstream/package-audited candidate; intentionally hold local/release/cloud posture; demote no live blocker as archive-only. | Version policy now separates latest upstream stable candidate `0.131.0` from current local `0.130.0`, release-facing `0.125.0`, and cloud `0.124.0` holds. | CO-565 packet, `docs/guides/codex-version-policy.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`. | None. |
| release notes | Official release notes, npm version/time, local/package help deltas, and classified CO impact. | Adopt-compatible package evidence; no-op or hold for default provider authority. | Release-note deltas do not alter CO workflow pins or provider authority without separate governed evidence. | `github-release.json`, npm evidence, package help logs. | Separate governed lanes only if a release-note item becomes a concrete CO product change. |

## Closeout Classification Gates
- [x] Adopt latest: upstream/npm release-intake marker, package command-surface evidence, CO-565 packet, and version-policy candidate audit notes now adopt `0.131.0` as the latest stable candidate.
- [x] Intentionally hold: local CO-local ChatGPT-auth/appserver command/runtime posture stays on installed `0.130.0`; release-facing package/downstream pins stay on `@openai/codex@0.125.0`; `cloud-canary` stays on `@openai/codex@0.124.0`; model posture stays `gpt-5.5` / `xhigh` with portable `gpt-5.4` fallback.
- [x] Demote/archive-only: no new live blocker is demoted as archive-only; `0.128.0` remains superseded lineage and historical `0.124.0` remains archive-only per existing policy, while `0.130.0` remains current local posture.
- [x] Stale current-facing docs are classified, demoted, or linked to a blocking follow-up.
- [x] Workflow pins remain unclassified nowhere: every pin is intentionally held and cited.
- [x] Release-intake closeout states which surfaces adopt latest, which intentionally hold, and which docs are demoted/archive-only.
- [x] Package/downstream and cloud-canary holds are never hidden as archive-only.

## Closure Gate
- [x] No stale current-facing docs remain unclassified.
- [x] No workflow pins remain unclassified.
- [x] No prior release evidence page remains current-facing without a deliberate supersedes/holds row.
- [x] No model posture surface carries forward a stale claim without a current evidence row.
- [x] No package/downstream or cloud-canary hold is hidden as archive-only.
- [x] Any out-of-scope cleanup is filed as a linked follow-up instead of expanding this release-intake issue. Evidence: no new follow-up was needed; cloud remains a known environment-configuration hold.

## Validation Plan
- Child-lane checks:
  - protected-term scan across the six packet/checklist files
  - scoped `git diff --check --` over declared files
  - changed-file review to confirm declared file scope only
- Parent-owned checks:
  - registry mirror integration if accepted
  - docs-review before implementation
  - issue-body reconciliation against current Linear/workpad truth
  - local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes evidence collection
  - docs:check, docs:freshness, and normal validation floor when parent implementation changes surfaces
- Rollout verification: parent records final `0.131.0` release-intake classification in workpad, task mirrors, PR, and current docs surfaces.

## Risks
- Parent source payload is external to the issue worktree.
  - Mitigation: preserve the parent-provided source anchor and payload pointer, and verify the source payload in the parent artifact root before closeout.
- Candidate existence is mistaken for adoption approval.
  - Mitigation: release evidence axes and closure gates are checked only after concrete evidence and explicit hold classifications exist.
- Archive-only classification hides live blockers.
  - Mitigation: closeout requires intentional holds or linked blockers for unresolved current surfaces.
- Workflow pins move without cloud/package proof.
  - Mitigation: workflow pins evidence is a separate axis and cannot be satisfied by GitHub, npm, or local CLI alone.

## Completion Criteria
- CO-565 packet and mirrors exist in declared paths.
- Protected-term scan confirms release-intake wording, canonical owner key, and canonical marker.
- Scoped diff review shows no edits outside declared file scope.
- Parent can continue with registry integration, evidence collection, implementation, validation, and lifecycle handoff.

## Approvals
- Reviewer: bounded same-issue docs child lane.
- Date: 2026-05-19
