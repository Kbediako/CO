# Task Checklist - linear-c456a3cd-5df0-4112-9d52-c0201455abfb

- Linear Issue: `CO-565` / `c456a3cd-5df0-4112-9d52-c0201455abfb`
- MCP Task ID: `linear-c456a3cd-5df0-4112-9d52-c0201455abfb`
- Registry Task ID: `20260520-linear-c456a3cd-5df0-4112-9d52-c0201455abfb`
- Primary PRD: `docs/PRD-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- Canonical TECH_SPEC: `tasks/specs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`
- Parent manifest pointer: `../../.runs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb/cli/2026-05-19T20-55-42-862Z-928a3f57/manifest.json`
- Source anchor: `ctx:sha256:2bc9d835d25cc769df42134a55d81362f859e6e881c0ba271234658d26152a4b#chunk:c000001`
- Source object id: `sha256:2bc9d835d25cc769df42134a55d81362f859e6e881c0ba271234658d26152a4b`
- Canonical owner key: `codex-cli-release-intake:stable:0.131.0`
- Canonical owner marker: `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`

## Docs-First
- [x] Source payload path checked in the parent artifact root and reconciled to this packet. Evidence: `../../.runs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb/cli/2026-05-19T20-55-42-862Z-928a3f57/memory/source-0/source.txt` exists and records provider-linear-worker run source metadata for CO-565.
- [x] PRD drafted for CO-565 Codex CLI candidate `0.131.0` release-intake. Evidence: `docs/PRD-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`.
- [x] TECH_SPEC mirror drafted with protected terms, evidence axes, supersedes/holds matrix, closeout classification, closure gate, and lane boundaries. Evidence: `docs/TECH_SPEC-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`.
- [x] Canonical task spec drafted with the same release-intake contract. Evidence: `tasks/specs/linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`.
- [x] ACTION_PLAN drafted for evidence collection, registry integration, and closeout sequencing. Evidence: `docs/ACTION_PLAN-linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-c456a3cd-5df0-4112-9d52-c0201455abfb.md`.
- [x] Registry mirrors integrated by parent. Evidence: `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.

## Source / Assumptions
- [x] Parent prompt and `.agent/task/templates/codex-cli-release-intake-template.md` carried as the issue-shaping contract.
- [x] Protected terms preserved. Evidence: candidate Codex CLI release `0.131.0`, canonical owner key `codex-cli-release-intake:stable:0.131.0`, canonical marker `codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0.131.0`, do not auto-promote `0.131.0`, local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, release notes, supersedes/holds matrix, and closeout classification gates.
- [x] Child lane did not call Linear mutation helpers. Evidence: no Linear commands or mutation helpers were run.

## Packet Content
- [x] Codex CLI release-intake is framed as evidence classification, not blind candidate adoption. Evidence: PRD and TECH_SPEC `Not Done If` sections.
- [x] All release-intake evidence axes are present and classified. Evidence: local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes checklists are checked with concrete proof.
- [x] Supersedes/holds matrix rows cover all required surfaces. Evidence: PRD, TECH_SPEC mirror, canonical task spec, and version policy candidate audit notes.
- [x] Closeout classification and closure gate checklists are complete. Evidence: PRD, TECH_SPEC mirror, canonical task spec, and `docs/guides/codex-version-policy.md`.
- [x] Registry, evidence, validation, and lifecycle boundaries are explicit. Evidence: packet non-goals, ACTION_PLAN follow-on plan, registry mirrors, and workpad updates.

## Release Evidence Axes
- [x] Local CLI evidence captured. Evidence: `/opt/homebrew/bin/codex --version` returned `codex-cli 0.130.0`, with `local-cli-version.log`, `local-features-0130.log`, `local-debug-models.log`, and local help logs under `out/linear-c456a3cd-5df0-4112-9d52-c0201455abfb/manual/release-intake-0131/`.
- [x] Package/downstream smoke evidence captured. Evidence: npm `latest=0.131.0`, `alpha=0.132.0-alpha.1`, `time["0.131.0"]=2026-05-18T18:08:19.710Z`; isolated `npx` smoke passed version, plugin marketplace, `doctor`, and `remote-control` help probes.
- [x] Cloud-canary evidence captured with explicit hold. Evidence: required cloud canary failed `environment_not_found`; blank-env fallback contract failed `missing_environment`.
- [x] Workflow pins audited and classified. Evidence: version policy keeps release-facing `@openai/codex@0.125.0` pins and `cloud-canary` `@openai/codex@0.124.0` pin as intentional holds.
- [x] Model posture verified as unchanged. Evidence: `model-posture-summary.tsv` and version policy keep `gpt-5.5` / `xhigh`, portable `gpt-5.4` fallback, and `explorer_fast` exception.
- [x] Docs surfaces audited and classified. Evidence: CO-565 packet plus `docs/guides/codex-version-policy.md` separate latest upstream/package-audited `0.131.0` from local/release/cloud/model holds.
- [x] Release notes evidence captured and classified. Evidence: official `rust-v0.131.0` release and npm publish timestamps are recorded; release-note deltas are package-audited, held, or no-op unless separate governed product work needs them.

## Validation
- [x] Protected-term scan covers the CO-565 packet files. Evidence: scoped `rg -n "0\\.131\\.0|codex-cli-release-intake:stable:0\\.131\\.0|codex-orchestrator:canonical-owner-key=codex-cli-release-intake:stable:0\\.131\\.0|do not auto-promote|local CLI|package/downstream smoke|cloud-canary|workflow pins|model posture|docs surfaces|release notes|supersedes/holds matrix|closeout classification gates|Not Done If|Non-Goals|Acceptance Criteria" ...` returned matches across the six packet/checklist files.
- [x] JSON parse check for `tasks/index.json` and `docs/docs-freshness-registry.json` passes. Evidence: `node -e "const fs=require('fs'); JSON.parse(fs.readFileSync('tasks/index.json','utf8')); JSON.parse(fs.readFileSync('docs/docs-freshness-registry.json','utf8')); console.log('json ok')"` returns `json ok`.
- [x] Package/current cloud probes captured. Evidence: `npm run build` passed; required cloud canary failed with `environment_not_found`; fallback cloud contract failed with `missing_environment`.
- [x] Scoped markdown whitespace hygiene passes. Evidence: scoped `rg -n "[[:blank:]]+$" ...` over the packet/checklist/policy files returned no matches.
- [x] Scoped diff review confirms only release-intake docs/registry/policy surfaces are edited. Evidence: `git status --short` lists CO-565 packet files, registry mirrors, task snapshot, and version policy only.

## Handoff Status
- [x] Child lane leaves workspace changes in place for parent patch export. Evidence: six uncommitted packet/checklist files remain in this workspace.
- [x] Parent reconciles packet against current CO-565 Linear issue/workpad truth. Evidence: live issue-context moved from Ready to In Progress and the single workpad was maintained.
- [x] Parent owns registry mirror integration. Evidence: `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` include CO-565.
- [ ] Parent owns PR lifecycle and Linear state. Evidence: PR/review handoff remains pending final validation, standalone review, elegance review, PR creation, ready-review drain, and issue transition.

## Notes
- Final classification: adopt `0.131.0` for upstream/npm release-intake marker and package command-surface evidence only.
- Intentional holds: local CO-local ChatGPT-auth/appserver posture remains installed `0.130.0`; release-facing package/downstream pins remain `@openai/codex@0.125.0`; `cloud-canary` remains `@openai/codex@0.124.0`; model posture remains unchanged.
- Archive-only/demotion: no live blocker is hidden as archive-only; `0.130.0` remains current local posture, not historical-only.
- No out-of-scope follow-up was filed because release-note deltas did not require same-issue product work and the cloud hold remains the known configured environment class.
