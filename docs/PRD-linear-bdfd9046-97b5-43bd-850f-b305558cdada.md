# PRD - CO-466 Codex CLI 0.128.0 release-intake

## Traceability
- Linear issue: `CO-466` / `bdfd9046-97b5-43bd-850f-b305558cdada`
- Linear URL: https://linear.app/asabeko/issue/CO-466
- Task id: `linear-bdfd9046-97b5-43bd-850f-b305558cdada`
- Canonical spec: `tasks/specs/linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- Canonical owner key: `codex-cli-release-intake:stable:0.128.0`
- Parent manifest: `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-docs-packet-bootstrap/cli/2026-05-01T13-19-25-864Z-a46f6e90/manifest.json`
- Docs packet child source anchor: `ctx:sha256:246da4b00bfe547dbd454953dbd4a371e6bc66dc1103e2c6e042e09fcf424425#chunk:c000001`
- Parent source payload: `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-docs-packet-bootstrap/cli/2026-05-01T13-19-25-864Z-a46f6e90/memory/source-0/source.txt`
- Source payload note: the referenced `.runs` payload path was not present in this child checkout, so this packet uses the parent-provided issue description, protected terms, source anchor, and `.agent/task/templates/codex-cli-release-intake-template.md` as the authoritative docs-first contract.

## Summary
- Problem Statement: CO has a governed release-intake template, but candidate `0.128.0` still needs a candidate-specific CO-466 packet that compares upstream Codex CLI release detection, GitHub release truth, npm @openai/codex dist-tags/time, the CO version-policy target, and workflow pins before any adoption, hold, or demotion decision.
- Desired Outcome: create the CO-466 docs-first packet and registry mirrors for Codex CLI candidate `0.128.0`, with canonical owner key `codex-cli-release-intake:stable:0.128.0`, all CO-386 release-intake evidence axes, supersedes/holds rows, closeout classification, and closure gates ready for parent-owned evidence collection.

## User Request Translation
- User intent / needs: bootstrap the CO-386 release-intake docs-first packet for Codex CLI candidate `0.128.0` inside this bounded child lane. The packet must preserve the exact protected surfaces, use the release-intake template shape, and leave Linear state, workpad, implementation, validation, PR lifecycle, and final closeout classification to the parent lane.
- Success criteria / acceptance:
  - PRD, TECH_SPEC mirror, canonical task spec, ACTION_PLAN, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` exist for `linear-bdfd9046-97b5-43bd-850f-b305558cdada`
  - protected terms remain visible: upstream Codex CLI release detection, GitHub release truth, npm @openai/codex dist-tags/time, CO version-policy target, workflow pins, candidate `0.128.0`, and canonical owner key `codex-cli-release-intake:stable:0.128.0`
  - local CLI evidence, package/downstream smoke evidence, cloud-canary evidence, workflow pins evidence, model posture evidence, docs surfaces evidence, and release notes evidence are separate gates
  - the supersedes/holds matrix contains rows for local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes
  - closeout classification and closure gate checklists are explicit and cannot be satisfied by blind promotion or unresolved live blockers
- Constraints / non-goals:
  - child lane edits only declared docs packet, task mirror, task registry, task snapshot, and docs freshness registry files
  - no implementation, package, workflow, test, template, Linear, GitHub, workpad, or PR lifecycle changes
  - no full repo validation suites from this child lane
  - no release promotion, workflow pin update, cloud-canary rebaseline, package/downstream smoke rebaseline, or model posture change in this child lane

## Intent Checksum
- Candidate Codex CLI release: `0.128.0`
- Previous current release posture: CO version-policy target remains the parent-owned comparison surface; current in-repo version policy records the prior completion marker as `codex-cli-release-intake:stable:0.125.0`.
- Scope boundaries: docs packet and registry mirrors only; parent owns live release evidence, Linear mutation, implementation, validation, and PR lifecycle.
- Exact user wording / phrases to preserve:
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
- Nearby wrong interpretations to reject:
  - "candidate 0.128.0 should be adopted because it exists upstream"
  - "GitHub release truth alone is enough without npm @openai/codex dist-tags/time"
  - "npm latest or local codex --version alone can move workflow pins"
  - "CO-452 js_repl removal work is a substitute for release-intake closeout"
  - "archive-only classification can hide unresolved cloud-canary, workflow-pin, package/downstream, or model posture blockers"
  - "this child lane should create/update Linear, edit workflow pins, or perform package/cloud smoke"

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
| local CLI | Current CO version-policy target and prior local CLI release evidence, including `0.125.0` posture records. | Initial scoping only; final classification below. | Candidate `0.128.0` local CLI evidence must prove command-surface and auth/provider compatibility before adoption. | Parent-owned local CLI probe, `codex --version`, command help deltas, and auth/provider notes. | File or link a blocker if local command/auth evidence is incomplete. |
| package/downstream smoke | Prior package/downstream smoke evidence and release-facing pack-smoke pins. | Initial scoping only; final classification below. | npm @openai/codex dist-tags/time must agree with package install and downstream smoke behavior. | Parent-owned npm registry capture, install smoke, marketplace/plugin smoke, and package-smoke workflow evidence. | Hold or follow up if package behavior diverges from GitHub release truth. |
| cloud-canary | Prior required cloud-canary and fallback cloud contract evidence. | Initial scoping only; final classification below. | Cloud execution can intentionally lag local/package posture when required cloud canary fails. | Parent-owned required cloud canary, fallback cloud contract, environment id, and hold reason. | Link a blocker if cloud remains unavailable or fails closed. |
| workflow pins | Release-facing workflow pins, cloud-canary pin, package-smoke pin, and downstream-smoke pins. | Initial scoping only; final classification below. | Workflow pins are evidence surfaces, not automatic mirrors of candidate `0.128.0`. | Parent-owned workflow pin audit against CO version-policy target and npm/GitHub release truth. | Pin update or intentional-hold follow-up only after evidence gates pass. |
| model posture | Current local model posture, delegated/review posture, portable fallback posture, and unsupported-provider notes. | Initial scoping only; final classification below. | Codex CLI release intake must not silently rewrite model posture or provider compatibility. | Parent-owned model list, delegated/review smoke, runtime-mode canary, and unsupported-provider notes. | Separate model-posture follow-up if `0.128.0` changes model/provider behavior. |
| docs surfaces | README, book index, public posture docs, downstream setup docs, version policy, docs catalog, evidence pages, and task packets. | Initial scoping only; final classification below. | Current-facing docs must either adopt `0.128.0`, intentionally hold, or demote old evidence to archive-only. | Parent-owned docs surface audit and docs-freshness/docs-check output. | File docs cleanup follow-up for stale current-facing surfaces not owned by CO-466. |
| release notes | Official release notes, npm version/time, local help deltas, and classified CO impact. | Initial scoping only; final classification below. | Release notes must be classified into CO impact before any posture claim changes. | Parent-owned GitHub release notes, npm publish time, local help diff, and CO impact classification. | Follow up for release-note items outside CO-466 scope. |

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

## Parent Closeout Evidence - 2026-05-01
- [x] local CLI evidence: `/opt/homebrew/bin/codex --version` returned `codex-cli 0.128.0`; ChatGPT auth was active; `codex exec`, `codex review`, `codex app-server`, `codex plugin marketplace`, `codex sandbox`, and `codex cloud` help surfaces preserved the expected commands.
- [x] package/downstream smoke evidence: `npm run build` and `npm run pack:smoke` passed on local `0.128.0`; release-facing workflow pins still intentionally hold pending required cloud evidence.
- [x] cloud-canary evidence: required cloud canary failed closed with configured environment id `6999395fcc448191b865917084f21c6f` not visible (`environment_not_found`); fallback cloud contract passed with expected missing-env MCP fallback.
- [x] workflow pins evidence: `.github/workflows/core-lane.yml`, `.github/workflows/release.yml`, `.github/workflows/pack-smoke-backstop.yml`, and `tests/pack-smoke.spec.ts` remain intentionally held at `@openai/codex@0.125.0`; `.github/workflows/cloud-canary.yml` and cloud expectation tests remain intentionally held at `@openai/codex@0.124.0`.
- [x] model posture evidence: `codex debug models --bundled` showed `gpt-5.5` and `gpt-5.4` with `xhigh` support; current posture remains `gpt-5.5` / `xhigh` for validated ChatGPT-auth/appserver use with portable `gpt-5.4` / `xhigh` fallback.
- [x] docs surfaces evidence: README, repository guide, public posture, downstream setup, book setup/index/archive, AGENTS templates, shipped delegation guidance, posture matrix, and version policy now classify `0.128.0` local adoption while preserving `0.125.0` release-facing and `0.124.0` cloud holds.
- [x] release notes evidence: official `rust-v0.128.0` release and npm latest timestamps match the issue truth; release-note deltas are classified as local adoption (`/goal`, permission/sandbox profiles, appserver/plugin/MultiAgentV2 command surfaces), confirmed removed (`js_repl` / `js_repl_tools_only`), or no release-facing promotion without cloud.

| Surface | Prior release evidence page or posture surface | Classification | Reason | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| local CLI | Prior `0.125.0` local CLI posture in `docs/guides/codex-version-policy.md` and posture matrix. | Adopt latest. | Local `0.128.0` command/auth/model/runtime smoke passed with no P0/P1 regression. | `codex-cli 0.128.0`, local help/auth probes, runtime-mode canary 20/20. | None. |
| package/downstream smoke | CO-355 `0.125.0` pack-smoke compatibility and workflow pins. | Evidence passes, release-facing target intentionally holds. | `npm run pack:smoke` passed on local `0.128.0`, but release-facing promotion is gated by required cloud. | `npm run build`; `npm run pack:smoke`. | Required cloud environment visibility remains the blocker before pin promotion. |
| cloud-canary | `cloud-canary` `0.124.0` candidate and prior environment-id blocker. | Intentionally hold. | Required cloud canary failed before task submission with `environment_not_found`; fallback contract passed. | `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-cloud-required-0128/.../manifest.json`; `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-cloud-fallback-0128/.../manifest.json`. | Fix visible cloud env before cloud/release promotion. |
| workflow pins | Release-facing `0.125.0` pins and cloud `0.124.0` pin. | Intentionally hold. | Pins are release/cloud surfaces and the required cloud gate is red. | Pin audit in workflows and `tests/pack-smoke.spec.ts`. | None in this lane; rerun release-intake after cloud gate passes. |
| model posture | CO-352 `gpt-5.5` / `xhigh` local posture with portable `gpt-5.4` fallback. | Adopt latest CLI carrier; model posture unchanged. | `0.128.0` local CLI supports the existing model posture; no new provider promotion. | `codex debug models --bundled`; local auth state; runtime-mode canary. | None. |
| docs surfaces | Current-facing posture docs and archive-only `0.124.0` evidence page. | Adopt latest locally; intentionally hold release/cloud; demote/archive-only historical evidence remains. | Docs now distinguish local `0.128.0`, release-facing `0.125.0`, and cloud `0.124.0`. | Updated posture matrix, version policy, front-door/public/book/agent/skill docs. | None. |
| release notes | Official release notes and npm dist-tag/time evidence. | Adopt/hold/no-op classified. | Local command/runtime changes are compatible; `js_repl` removal is confirmed; cloud/release promotion holds. | GitHub `rust-v0.128.0` published `2026-04-30T16:40:28Z`; npm `0.128.0` published `2026-04-30T16:43:46.064Z`. | None. |

## Final Closeout Classification - 2026-05-01
- [x] Adopt latest: local ChatGPT-auth/appserver CLI command/runtime posture and `latest_audited_candidate_cli_version` now use `0.128.0`.
- [x] Intentionally hold: release-facing downstream/package smoke workflow pins remain `0.125.0`; cloud-canary remains `0.124.0`; required cloud remains blocked by `environment_not_found`.
- [x] Demote/archive-only: historical `0.124.0` evidence stays archive-only; prior `0.125.0` release-intake evidence is superseded for local posture but retained as the package/downstream compatibility hold.
- [x] Stale current-facing docs are classified through the posture matrix, version policy, public/book/downstream setup docs, AGENTS templates, and shipped delegation guidance.
- [x] Workflow pins remain unclassified nowhere: every pin is either intentionally held (`0.125.0` package/release, `0.124.0` cloud) or described as blocked by required cloud.
- [x] Release-intake closeout states which surfaces adopt latest, intentionally hold, and remain archive-only.

## Final Closure Gate - 2026-05-01
- [x] No stale current-facing docs remain unclassified.
- [x] No workflow pins remain unclassified.
- [x] No prior release evidence page remains current-facing without a deliberate supersedes/holds row.
- [x] No model posture surface carries forward a stale claim without a current evidence row.
- [x] Any out-of-scope cleanup is filed as a linked follow-up instead of expanding this release-intake issue; no new follow-up was needed.

## Not Done If
- The packet omits upstream Codex CLI release detection, GitHub release truth, npm @openai/codex dist-tags/time, CO version-policy target, workflow pins, candidate `0.128.0`, or canonical owner key `codex-cli-release-intake:stable:0.128.0`.
- Any CO-386 evidence axis is collapsed into a generic "validated" flag.
- The supersedes/holds matrix lacks a row for any required surface.
- Closeout can complete while a stale current-facing doc, workflow pin, or model posture claim remains unclassified.
- Candidate `0.128.0` is framed as adopted before local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes are classified.
- This child lane mutates Linear/GitHub state, edits implementation/workflow/package/test/template files, runs full repo validation, or commits.

## Goals
- Create the CO-466 docs-first packet and registry mirrors inside the declared docs scope.
- Preserve candidate `0.128.0` and canonical owner key `codex-cli-release-intake:stable:0.128.0`.
- Carry forward the CO-386 release-intake template as the closeout contract.
- Make parent-owned evidence collection and classification explicit before implementation or review handoff.

## Non-Goals
- No automatic release-facing package/downstream or cloud promotion; any local posture adoption or version-policy update must be parent-owned and evidence-classified before closeout.
- No workflow pin update.
- No package/downstream smoke, cloud-canary, runtime-mode canary, or marketplace smoke execution from this child lane.
- No model posture change.
- No implementation, package, workflow, test, or template edit.
- No Linear mutation, GitHub mutation, workpad update, PR creation, PR update, or PR review action from this child lane.
- No broad stale-doc cleanup beyond registering this packet and required freshness rows.

## Metrics & Guardrails
- Primary Success Metrics:
  - all six packet and mirror files exist
  - `tasks/index.json` and `docs/docs-freshness-registry.json` parse as JSON
  - protected-term scan finds all required issue terms across the packet
  - changed-file review stays inside the declared file scope
- Guardrails / Error Budgets:
  - zero source code, workflow, package, test, template, Linear, GitHub, or PR lifecycle edits
  - zero release adoption claims without parent evidence
  - no unresolved blocker is described as archive-only

## Technical Considerations
- Architectural Notes:
  - CO-466 is the candidate-specific release-intake owner for `0.128.0`, not a generic release detector and not an adoption lane.
  - The canonical owner key `codex-cli-release-intake:stable:0.128.0` should be used by parent integration to deduplicate or update the canonical intake surface.
  - The CO-386 release-intake template is the checklist authority for closeout classification.
- Dependencies / Integrations:
  - `.agent/task/templates/codex-cli-release-intake-template.md`
  - `docs/guides/codex-version-policy.md`
  - GitHub release truth for upstream Codex CLI
  - npm @openai/codex dist-tags/time
  - release-facing workflow pins
  - package/downstream smoke validation
  - cloud-canary validation
  - model posture and docs surface audits

## Closeout Questions Resolved
- Prior `0.124.0` evidence remains archive-only; prior `0.125.0` evidence is superseded for local posture but retained as the release-facing package/downstream compatibility hold.
- Candidate `0.128.0` does not require a model-posture follow-up: it carries the existing `gpt-5.5` / `xhigh` local posture and portable `gpt-5.4` / `xhigh` fallback unchanged.
- No release-facing workflow pin adopts `0.128.0` in this lane because the required cloud canary failed with `environment_not_found`; package/release pins hold at `0.125.0`, and cloud holds at `0.124.0`.

## Approvals
- Product: parent CO-466 release-intake classification complete; final PR lifecycle remains active.
- Engineering: docs-review complete; final standalone review, PR handoff, and ready-review drain remain active.
- Design: N/A
