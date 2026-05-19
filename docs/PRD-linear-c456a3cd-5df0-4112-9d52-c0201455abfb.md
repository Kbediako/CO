# PRD - CO-565 Codex CLI 0.131.0 release-intake

## Immediate Traceability
- Linear issue: `CO-565` / `c456a3cd-5df0-4112-9d52-c0201455abfb`
- Linear URL: https://linear.app/asabeko/issue/CO-565
- Task id: `linear-c456a3cd-5df0-4112-9d52-c0201455abfb`
- Canonical spec: `tasks/specs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- Task checklist: `tasks/tasks-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- `.agent` mirror: `.agent/task/linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- Canonical owner key: `codex-cli-release-intake:stable:0.131.0`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`
- Source anchor: `ctx:sha256:2bc9d835d25cc769df42134a55d81362f859e6e881c0ba271234658d26152a4b#chunk:c000001`
- Source object id: `sha256:2bc9d835d25cc769df42134a55d81362f859e6e881c0ba271234658d26152a4b`
- Parent manifest pointer: `.runs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb/cli/2026-05-19T20-55-42-862Z-928a3f57/manifest.json`
- Parent source payload pointer: `.runs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb/cli/2026-05-19T20-55-42-862Z-928a3f57/memory/source-0/source.txt`
- Source payload note: the parent source payload exists at the pointer above and records provider-linear-worker run source metadata for CO-565; the accepted docs child-lane manifest remains separate packet-production evidence.

## Summary
- Problem Statement: CO has an evidence-gated Codex CLI release-intake workflow, and upstream GitHub/npm truth now identifies stable Codex CLI `0.131.0` as newer than the CO-518 `0.130.0` lane.
- Desired Outcome: complete the CO-565 release-intake packet for candidate `0.131.0`, keyed by `codex-cli-release-intake:stable:0.131.0`, with GitHub/npm truth, package smoke, local/cloud/workflow/model/docs classification, and an explicit adopt/hold/archive closeout that does not promote `0.131.0` by detection alone.

## User Request Translation
- User intent / needs: complete the CO-565 release-intake packet and classification for candidate Codex CLI release `0.131.0`. The lane must preserve canonical owner key `codex-cli-release-intake:stable:0.131.0`, canonical marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`, no automatic promotion, and separate classification for local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes.
- Success criteria / acceptance:
  - all six owned packet/checklist files exist in the declared file scope
  - protected terms remain visible: candidate Codex CLI release `0.131.0`, canonical owner key `codex-cli-release-intake:stable:0.131.0`, canonical marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`, do not auto-promote `0.131.0`, local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, release notes, supersedes/holds matrix, and closeout classification gates
  - local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes are separate release-intake evidence axes
  - the supersedes/holds matrix contains rows for local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes
  - closeout classification cannot pass while stale current-facing docs, workflow pins, prior evidence pages, model posture claims, package/downstream holds, or cloud-canary blockers remain unclassified
  - registry mirrors, version-policy docs, workpad, validation, PR lifecycle, and final Linear handoff are owned by this parent lane
- Constraints / non-goals:
  - no source code, package file, workflow pin, generated build output, release tag, npm publish, model default, or local Codex install change
  - no automatic release promotion, workflow pin update, cloud-canary rebaseline, package/downstream smoke rebaseline, or model posture change
  - no archive-only classification for live blockers

## Issue Intent Checksum
- Candidate Codex CLI release: `0.131.0`
- Canonical owner key: `codex-cli-release-intake:stable:0.131.0`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`
- Previous current release posture for comparison: repo policy records Codex CLI `0.130.0` as the current local ChatGPT-auth/appserver command/runtime posture, release-facing package/downstream-smoke pins held at `0.125.0`, `cloud-canary` held at `0.124.0`, and model posture held at `gpt-5.5` / `xhigh` with portable `gpt-5.4` fallback.
- Scope boundaries: release-intake packet, registry mirrors, current version-policy classification, live release evidence, workpad, validation, and PR lifecycle only; no source behavior, workflow pin, package pin, local install, cloud promotion, or model default change.
- Exact user wording / phrases to preserve:
  - candidate Codex CLI release `0.131.0`
  - canonical owner key `codex-cli-release-intake:stable:0.131.0`
  - marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`
  - do not auto-promote `0.131.0`
  - local CLI
  - package/downstream smoke
  - cloud-canary
  - workflow pins
  - model posture
  - docs surfaces
  - release notes
  - supersedes/holds matrix
  - closeout classification gates
- Nearby wrong interpretations to reject:
  - "candidate 0.131.0 should be adopted because release detection found it"
  - "npm latest, a GitHub tag, or local CLI success alone can close release intake"
  - "local CLI success can move release-facing workflow pins"
  - "cloud-canary, package/downstream smoke, workflow pins, docs surfaces, or model posture can be folded into one generic validation flag"
  - "archive-only classification can hide unresolved cloud-canary, workflow-pin, package/downstream, docs, or model blockers"
  - "this lane should edit source files, package/workflow files, generated outputs, release publishing, local install state, or model defaults"

## Parity / Alignment Matrix

| Surface | Current truth to verify | Reference truth | Target truth / intended delta | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| local CLI | Local `/opt/homebrew/bin/codex --version` remains `codex-cli 0.130.0`. | Release-intake requires installed or candidate executable version, command-surface smoke, and local auth/provider constraints. | CO-565 intentionally holds local posture at installed `0.130.0` while adopting `0.131.0` only as upstream/package-audited evidence. | No local install or runtime-mode canary for `0.131.0`. |
| package/downstream smoke | Repo policy currently holds release-facing package/downstream pins at `0.125.0`; parent must verify npm and downstream smoke truth for `0.131.0`. | Package evidence must be independent of upstream release existence and local CLI success. | CO-565 packet keeps package/downstream smoke as its own evidence axis and matrix row. | No package install, pack smoke, workflow pin edit, or publish action. |
| cloud-canary | Repo policy currently holds `cloud-canary` at `0.124.0`; CO-565 required/fallback probes both failed configuration gates. | Cloud promotion requires required cloud canary and fallback cloud contract evidence. | CO-565 keeps cloud-canary blockers visible as intentional holds until clean evidence exists. | No cloud pin promotion or canary rebaseline. |
| workflow pins | Existing release-facing and cloud workflow pins must be audited before any change. | Every workflow pin must be updated, intentionally held, or linked to a blocker. | CO-565 packet includes workflow pins as a separate closeout row. | No workflow file edits. |
| model posture | Repo policy currently records `gpt-5.5` / `xhigh` with portable `gpt-5.4` fallback; parent must verify no `0.131.0` model posture impact. | Model posture cannot drift as a side effect of CLI release intake. | CO-565 packet requires a current model posture row before closeout. | No model default or role changes. |
| docs surfaces | Current-facing docs may need adopt/hold/archive-only classification after evidence. | Stale current-facing docs must be classified, demoted, or linked to blockers. | CO-565 packet names docs surfaces as an evidence axis and closeout gate, including parent-owned version-policy and freshness registry classification. | No docs catalog edits or unrelated posture/docs churn outside the CO-565 release-intake classification. |
| release notes | Official GitHub release, npm version/time, package help deltas, and CO impact are captured. | Release-note deltas must be classified into local adoption, intentional hold, archive-only, no-op, or linked follow-up. | CO-565 classifies release notes as package-audited/latest-upstream evidence with no same-issue product adoption. | No default provider-authority change from release notes alone. |

## Release Evidence Axes
- [x] local CLI evidence: installed local `/opt/homebrew/bin/codex --version` remains `codex-cli 0.130.0`; local `features list`, `debug models`, `exec --help`, `review --help`, and `app-server --help` preserve the current `0.130.0` posture. Candidate `0.131.0` is not installed as local posture in this lane.
- [x] package/downstream smoke evidence: npm `@openai/codex` reports `latest=0.131.0`, `alpha=0.132.0-alpha.1`, and `time["0.131.0"]=2026-05-18T18:08:19.710Z`; `npx --yes -p @openai/codex@0.131.0` smoke passed `codex --version`, `codex plugin marketplace --help`, `codex doctor --help`, and `codex remote-control --help`.
- [x] cloud-canary evidence: after `npm run build`, required cloud canary failed with `configuration (environment_not_found)` for configured environment id `6999395fcc448191b865917084f21c6f`; the blank-env fallback contract failed with `configuration (env_config)` / `missing_environment`.
- [x] workflow pins evidence: release-facing package/downstream smoke pins remain on `@openai/codex@0.125.0`, and `cloud-canary` remains on `@openai/codex@0.124.0`; no workflow pin moves by release detection alone.
- [x] model posture evidence: current `gpt-5.5` / `xhigh`, portable `gpt-5.4` fallback, and `explorer_fast` exception remain unchanged; local `codex debug models` still lists the expected ChatGPT-auth catalog.
- [x] docs surfaces evidence: CO-565 packet and `docs/guides/codex-version-policy.md` classify `0.131.0` as the latest upstream/package-audited stable candidate while keeping local, release-facing, cloud, and model holds explicit.
- [x] release notes evidence: official GitHub release `rust-v0.131.0` was published `2026-05-18T17:39:34Z`; CO impact is classified as package-audited/latest-upstream adoption only, with `doctor`, plugin marketplace, remote-control, runtime API, remote env, Python SDK, and permission/state fixes held or no-op unless separate governed lanes need them.

## Supersedes / Holds Matrix
Every prior release evidence page and posture surface has one classified row; unresolved blockers remain intentional holds, not archive-only.

| Surface | Prior release evidence page or posture surface | Classification | Reason | Evidence | Follow-up |
| --- | --- | --- | --- | --- | --- |
| local CLI | `0.130.0` current local ChatGPT-auth/appserver command/runtime posture from CO-518. | Intentionally hold local posture; adopt `0.131.0` only as latest upstream/package-audited candidate. | Local installed CLI remains `0.130.0`; this lane did not install `0.131.0` locally or rerun the runtime-mode canary against a local `0.131.0` posture. | `local-cli-version.log`, `local-features-0130.log`, `local-debug-models.log`, local help logs. | None; future local promotion needs a separate local install/runtime-mode canary gate. |
| package/downstream smoke | Release-facing package/downstream smoke target held at `0.125.0`; CO-518 package evidence covered `0.130.0`. | Adopt candidate as package-audited evidence; intentionally hold release-facing workflow pins. | npm and isolated `npx` smoke passed for `0.131.0`, but workflow pins remain cloud-gate guarded. | `npm-0131.json`, `package-version-0131.log`, `package-plugin-marketplace-0131.log`, `package-doctor-0131.log`, `package-remote-control-0131.log`. | None for package command-surface evidence; cloud gate remains the promotion blocker. |
| cloud-canary | `0.124.0` cloud-canary candidate and existing CO-518 cloud hold. | Intentionally hold. | Required cloud canary still fails before cloud execution because configured env id is not visible; fallback contract with blank env now fails on missing environment configuration. | `.runs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb-cloud-required-0131/cli/2026-05-19T21-14-33-771Z-d7843ddf/manifest.json`, `.runs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb-cloud-fallback-0131/cli/2026-05-19T21-14-56-104Z-7183cdd3/manifest.json`. | None filed here; this is the same configured cloud environment class that blocks release-facing promotion. |
| workflow pins | Release-facing workflow pins and cloud-canary pin surfaces. | Intentionally hold. | Workflow pins are not automatic mirrors of npm latest; clean required and fallback cloud gates remain required before release-facing promotion. | Version policy current posture rows and cloud canary manifests. | None until cloud gates pass. |
| model posture | Current local `gpt-5.5` / `xhigh`, portable `gpt-5.4` fallback, and `explorer_fast` exception. | Adopt current posture unchanged. | `0.131.0` release intake found no model-posture reason to move defaults; local `codex debug models` still exposes the expected current catalog. | `model-posture-summary.tsv`, `local-debug-models.log`, version policy model rows. | None. |
| docs surfaces | Version policy, posture matrix, registry/freshness surfaces, task packet, and CO-518 release-intake rows. | Adopt latest upstream/package-audited candidate; intentionally hold local/release/cloud posture; demote no live blocker as archive-only. | Version policy now separates latest upstream stable candidate `0.131.0` from current local `0.130.0`, release-facing `0.125.0`, and cloud `0.124.0` holds. | CO-565 packet, `docs/guides/codex-version-policy.md`, `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`. | None. |
| release notes | Official release notes, npm version/time, local/package help deltas, and classified CO impact. | Adopt-compatible package evidence; no-op or hold for default provider authority. | `codex doctor` and package help surfaces are noted; remote-control/runtime APIs/default plugin hooks/remote env/Python SDK deltas do not alter CO workflow pins or provider authority without separate governed evidence. | `github-release.json`, npm evidence, package help logs. | Separate governed lanes only if a release-note item becomes a concrete CO product change. |

## Closeout Classification Gates
- [x] Adopt latest: upstream/npm release-intake marker, package command-surface evidence, CO-565 packet, and version-policy candidate audit notes now adopt `0.131.0` as the latest stable candidate.
- [x] Intentionally hold: local CO-local ChatGPT-auth/appserver command/runtime posture stays on installed `0.130.0`; release-facing package/downstream pins stay on `@openai/codex@0.125.0`; `cloud-canary` stays on `@openai/codex@0.124.0`; model posture stays `gpt-5.5` / `xhigh` with portable `gpt-5.4` fallback.
- [x] Demote/archive-only: no new live blocker is demoted as archive-only; `0.128.0` remains superseded lineage and historical `0.124.0` remains archive-only per existing policy, while `0.130.0` remains current local posture rather than archive-only.
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
- [x] Any out-of-scope cleanup is filed as a linked follow-up instead of expanding this release-intake issue. Evidence: no new follow-up was needed; the cloud hold remains the known configured environment class rather than a CO-565 scope expansion.

## Not Done If
- The packet omits candidate `0.131.0`, canonical owner key `codex-cli-release-intake:stable:0.131.0`, canonical marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`, no-auto-promotion language, or any required evidence axis.
- Any release-intake evidence axis is collapsed into a generic "validated" flag.
- The supersedes/holds matrix lacks a row for local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, or release notes.
- Closeout can complete while a stale current-facing doc, workflow pin, package/downstream hold, cloud-canary blocker, prior evidence page, or model posture claim remains unclassified.
- Candidate `0.131.0` is framed as adopted before local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes are classified.
- The release-intake diff mutates source behavior, package/workflow pins, generated build outputs, local install state, release publishing, or model defaults.

## Goals
- Create and complete the CO-565 docs-first packet/checklist inside the declared release-intake scope.
- Preserve candidate `0.131.0`, canonical owner key `codex-cli-release-intake:stable:0.131.0`, and canonical marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`.
- Carry forward the release-intake template as the closeout contract.
- Record final evidence collection and classification before review handoff.

## Non-Goals
- No automatic local, release-facing package/downstream, cloud-canary, workflow-pin, docs, or model posture promotion.
- No source code, package, workflow, generated output, test, template, release publishing, local install, or model-default edit.
- No workflow pin update.
- No runtime-mode canary, npm publish, release tag, or workflow pin promotion.
- No model posture change.
- No broad stale-doc cleanup beyond registering and classifying this release-intake packet.

## Acceptance Criteria
- Six declared packet/checklist files are present and uncommitted for parent patch export.
- Candidate `0.131.0`, canonical owner key, canonical marker, protected terms, evidence axes, supersedes/holds matrix, closeout classification gates, Not Done If, non-goals, and parent-owned boundaries are visible in the packet.
- Release evidence and classification rows are complete and fail closed on local/cloud/workflow holds.
- Scoped validation confirms protected terms, registry integration, docs surfaces, and no unclassified release-intake surface.

## Metrics & Guardrails
- Primary Success Metrics:
  - all six packet/checklist files exist
  - protected-term scan finds all required issue terms across the packet
  - changed-file review stays inside the declared file scope
  - release evidence is verified and every release-intake surface is classified
- Guardrails / Error Budgets:
  - zero source code, workflow, package, generated output, test, template, release publishing, local install, model default, or unrelated lifecycle edits; parent-owned registry mirrors, version-policy classification, bounded release evidence capture, workpad, PR, GitHub, and Linear handoff remain in scope
  - zero release adoption claims without parent evidence
  - no unresolved blocker is described as archive-only

## Technical Considerations
- Architectural Notes:
  - CO-565 is the candidate-specific release-intake record for `0.131.0`, not a generic release detector and not a broad adoption lane.
  - The canonical owner key `codex-cli-release-intake:stable:0.131.0` and marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0` should be used by parent integration to deduplicate or update canonical intake surfaces.
  - The release-intake template is the checklist authority for closeout classification.
- Dependencies / Integrations:
  - `.agent/task/templates/codex-cli-release-intake-template.md`
  - `docs/guides/codex-version-policy.md`
  - `docs/codex-posture-matrix.json`
  - GitHub release truth for upstream Codex CLI
  - npm @openai/codex dist-tags/time
  - release-facing workflow pins
  - package/downstream smoke validation
  - cloud-canary validation
  - model posture and docs surface audits

## Open Questions
- Local `0.131.0` posture promotion remains open for a future lane only if the local CLI is installed and runtime-mode/cloud gates are clean.
- No release-note item in CO-565 required a same-issue follow-up; future concrete product adoption for `doctor`, remote-control/runtime APIs, default plugin hooks, remote environments, or Python SDK changes should use separate governed lanes.

## Approvals
- Product: parent CO-565 release-intake owner to reconcile this packet against live issue/workpad truth.
- Engineering: docs packet child lane produced the six-file scaffold; parent owns registry integration, release evidence, validation, PR lifecycle, and Linear handoff.
- Design: N/A
