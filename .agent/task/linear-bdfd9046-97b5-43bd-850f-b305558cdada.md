# Task Checklist - linear-bdfd9046-97b5-43bd-850f-b305558cdada

- Linear Issue: `CO-466` / `bdfd9046-97b5-43bd-850f-b305558cdada`
- MCP Task ID: `linear-bdfd9046-97b5-43bd-850f-b305558cdada`
- Primary PRD: `docs/PRD-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- Canonical TECH_SPEC: `tasks/specs/linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`
- Parent manifest: `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-docs-packet-bootstrap/cli/2026-05-01T13-19-25-864Z-a46f6e90/manifest.json`
- Source anchor: `ctx:sha256:246da4b00bfe547dbd454953dbd4a371e6bc66dc1103e2c6e042e09fcf424425#chunk:c000001`
- Canonical owner key: `codex-cli-release-intake:stable:0.128.0`

## Docs-First
- [x] Source payload path checked in this child workspace and recorded as unavailable. Evidence: `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-docs-packet-bootstrap/cli/2026-05-01T13-19-25-864Z-a46f6e90/memory/source-0/source.txt` was not present in the child checkout.
- [x] PRD drafted for CO-466 Codex CLI candidate `0.128.0` release-intake. Evidence: `docs/PRD-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`.
- [x] TECH_SPEC mirror drafted with protected terms, evidence axes, supersedes/holds matrix, closeout classification, closure gate, and parent-owned boundaries. Evidence: `docs/TECH_SPEC-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`.
- [x] Canonical task spec drafted with the same release-intake contract. Evidence: `tasks/specs/linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`.
- [x] ACTION_PLAN drafted for parent-owned evidence collection and closeout sequencing. Evidence: `docs/ACTION_PLAN-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`.
- [x] Registry and snapshot updated for the CO-466 packet. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Source / Assumptions
- [x] Parent prompt and `.agent/task/templates/codex-cli-release-intake-template.md` carried as the issue-shaping contract because source payload was unavailable in this checkout.
- [x] Protected terms preserved. Evidence: upstream Codex CLI release detection, GitHub release truth, npm @openai/codex dist-tags/time, CO version-policy target, workflow pins, candidate `0.128.0`, and canonical owner key `codex-cli-release-intake:stable:0.128.0`.
- [x] Child lane did not call Linear mutation helpers. Evidence: no Linear commands or mutation helpers were run.

## Packet Content
- [x] Codex CLI release-intake is framed as evidence classification, not blind candidate adoption. Evidence: PRD and TECH_SPEC `Not Done If` sections.
- [x] All CO-386 release-intake evidence axes are present. Evidence: local CLI, package/downstream smoke, cloud-canary, workflow pins, model posture, docs surfaces, and release notes checklists.
- [x] Supersedes/holds matrix rows cover all required surfaces. Evidence: PRD, TECH_SPEC mirror, and canonical task spec.
- [x] Closeout classification and closure gate checklists are present. Evidence: PRD, TECH_SPEC mirror, and canonical task spec.
- [x] Parent-owned implementation and lifecycle boundaries are explicit. Evidence: packet non-goals and ACTION_PLAN parent-owned follow-on plan.

## Validation
- [x] Protected-term scan covers the CO-466 packet files. Evidence: scoped `rg` over protected release-intake terms returned matches, and a Node inclusion check returned `protected terms ok`.
- [x] JSON parse check for `tasks/index.json` and `docs/docs-freshness-registry.json` passes. Evidence: `node -e "JSON.parse(...); console.log('json ok')"` returned `json ok`.
- [x] Scoped markdown diff hygiene passes. Evidence: `git diff --check -- <declared files>` exited cleanly.
- [x] Scoped diff review confirms no edits outside declared file scope. Evidence: `git status --short`, `git diff --name-only`, and `git ls-files --others --exclude-standard` listed only the declared CO-466 packet, task registry, task snapshot, and docs freshness registry files.

## Handoff Status
- [x] Parent reconciled packet against current CO-466 Linear issue/workpad truth. Evidence: issue-context confirmed `CO-466` and workpad reuse; child patch accepted into parent workspace.
- [x] Parent ran docs-review before implementation. Evidence: `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-docs-review-pre-implementation/cli/2026-05-01T13-33-57-985Z-824f7284/manifest.json`.
- [x] Parent collected release evidence for candidate `0.128.0`. Evidence: GitHub release `rust-v0.128.0`, npm `@openai/codex@0.128.0`, local CLI/help/auth/model probes, runtime-mode canary, pack smoke, cloud required/fallback canaries at `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-cloud-required-0128/cli/2026-05-01T13-25-57-476Z-518dbd5d/manifest.json` and `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada-cloud-fallback-0128/cli/2026-05-01T13-27-36-042Z-2cd22803/manifest.json`, and workflow pin audit.
- [x] Parent completed closeout classification. Evidence: `docs/guides/codex-version-policy.md`, `docs/codex-posture-matrix.json`, `docs/PRD-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`, `docs/TECH_SPEC-linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`, and `tasks/specs/linear-bdfd9046-97b5-43bd-850f-b305558cdada.md`.
- [x] Parent final validation floor passed. Evidence: delegation guard, spec guard, build, lint, test with review env cleared, docs:check, docs:freshness, repo:stewardship, diff-budget, and pack:smoke passed.
- [x] Parent standalone review and elegance pass completed. Evidence: review telemetry `status: succeeded`, `review_outcome: bounded-success` at `.runs/linear-bdfd9046-97b5-43bd-850f-b305558cdada/cli/2026-05-01T13-16-41-875Z-1cd32bb9/review/telemetry.json`; elegance artifact `out/linear-bdfd9046-97b5-43bd-850f-b305558cdada/manual/elegance-review.md`.
- [ ] Parent owns PR lifecycle and Linear state. Evidence: pending PR attach, ready-review drain, and review-state handoff.

## Release Evidence Closeout - 2026-05-01
- [x] Local CLI evidence captured. Evidence: active `/opt/homebrew/bin/codex` reports `codex-cli 0.128.0`; ChatGPT auth active; command help surfaces preserved.
- [x] Package/downstream smoke captured. Evidence: `npm run build` and `npm run pack:smoke` passed.
- [x] Cloud canary evidence captured. Evidence: required cloud failed `environment_not_found`; fallback cloud contract passed with expected missing-env MCP fallback.
- [x] Workflow pins classified. Evidence: package/release pins intentionally hold at `0.125.0`; cloud pin intentionally holds at `0.124.0`.
- [x] Model posture classified. Evidence: `gpt-5.5` / `xhigh` remains current validated local posture; portable `gpt-5.4` / `xhigh` fallback unchanged.
- [x] Docs surfaces classified. Evidence: posture matrix, version policy, front-door/public/book/agent/skill docs updated.
- [x] Release notes classified. Evidence: GitHub release and npm timestamps recorded; `js_repl` removal confirmed and treated as already retired active guidance.

## Notes
- Do not edit implementation, template, workflow, package, test, Linear, GitHub, workpad, or PR lifecycle surfaces in this child lane.
- Do not decide the final Codex CLI release posture, workflow pins, or model posture in this child lane.
- Do not use archive-only classification to hide live blockers.
