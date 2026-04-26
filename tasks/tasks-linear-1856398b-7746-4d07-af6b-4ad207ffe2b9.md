# Task Checklist - linear-1856398b-7746-4d07-af6b-4ad207ffe2b9

- Linear Issue: `CO-387` / `1856398b-7746-4d07-af6b-4ad207ffe2b9`
- MCP Task ID: `linear-1856398b-7746-4d07-af6b-4ad207ffe2b9`
- Primary PRD: `docs/PRD-linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md`
- TECH_SPEC: `tasks/specs/linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md`
- Parent manifest: `.runs/linear-1856398b-7746-4d07-af6b-4ad207ffe2b9-docs-packet-v2/cli/2026-04-26T02-11-12-522Z-470a967d/manifest.json`
- Source anchor: `ctx:sha256:363de60f154c2d3fe3216bec435c5fdadf6c34c16a7095552bda42dd1832bf8a#chunk:c000001`

## Docs-First
- [x] Source payload availability checked. Evidence: local `.runs/` directory is absent in this child checkout, so source payload path is unavailable here.
- [x] Parent-provided issue text translated into PRD. Evidence: `docs/PRD-linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md`.
- [x] Canonical TECH_SPEC drafted with protected surfaces, issue-shaping contract, and validation requirements. Evidence: `tasks/specs/linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md`.
- [x] TECH_SPEC mirror drafted for docs navigation/freshness consumers. Evidence: `docs/TECH_SPEC-linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md`.
- [x] ACTION_PLAN drafted for parent implementation sequencing. Evidence: `docs/ACTION_PLAN-linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-1856398b-7746-4d07-af6b-4ad207ffe2b9.md`.
- [x] Task index registration added. Evidence: `tasks/index.json`.

## Parent-Owned Implementation
- [x] Parent runs docs-review before implementation. Evidence: `.runs/linear-1856398b-7746-4d07-af6b-4ad207ffe2b9-docs-review/cli/2026-04-26T02-19-54-008Z-7196f0b0/manifest.json` failed on expected pre-implementation matrix/docs-path gaps, then parent resolved the lane-local blockers.
- [x] Parent introduces the machine-readable Codex posture matrix or equivalent canonical data source. Evidence: `docs/codex-posture-matrix.json` and `docs/docs-catalog.json`.
- [x] Parent validates README, docs/book or current navigation, public posture, downstream setup docs, version policy, workflow pins, and pack-smoke expectations against the matrix. Evidence: `scripts/docs-hygiene.ts`, `scripts/lib/docs-catalog.js`, and `MCP_RUNNER_TASK_ID=linear-1856398b-7746-4d07-af6b-4ad207ffe2b9 npm run docs:check` returned `docs:check: OK`.
- [x] Parent enforces historical/archive status for superseded release evidence pages that would otherwise remain active/current-facing. Evidence: `codex-posture-history-active` rule plus focused tests in `tests/docs-hygiene.spec.ts`.
- [x] Parent adds focused docs-hygiene tests for stale active release evidence residue, including the `0.124` book-style case. Evidence: `npx vitest run --config vitest.config.core.ts tests/docs-hygiene.spec.ts` passed 68 tests on the rebased branch.
- [x] Parent preserves historical evidence through archive/demotion/status metadata instead of deletion. Evidence: matrix historical metadata path and tests allow explicit historical status; no historical evidence deletion was used.
- [x] Parent confirms runtime targets and workflow pins did not move without an evidence-backed posture decision. Evidence: after rebasing onto current `origin/main`, matrix records CO-local/package posture `0.125.0`, cloud canary `0.124.0`, model `gpt-5.5`, default runtime `appserver`, and the workflow files were not changed by this branch.

## Validation
- [x] Child-lane scope kept to declared docs/task files and `tasks/index.json`.
- [x] Child-lane JSON parse check for `tasks/index.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); console.log('tasks/index ok')"` returned `tasks/index ok`.
- [x] Child-lane scoped diff review before patch export. Evidence: `git status --short`, `git diff --name-only`, and `git ls-files --others --exclude-standard` show only the declared CO-387 packet files and `tasks/index.json`.
- [x] Parent focused tests and docs validation floor after implementation. Evidence: after replaying the CO-387 patch onto current `origin/main`, focused docs-hygiene tests passed 68 tests; `npm run build`, `npm run lint`, `npm run test` passed 4879 tests, `npm run docs:check`, `npm run docs:freshness`, `npm run repo:stewardship`, and diff-budget with explicit override passed.
- [x] Parent addressed standalone-review findings before final handoff review. Evidence: manifest-backed review reported P2 gaps for neutral navigation links to stale release evidence, malformed matrix surfaces, active candidate/pin false positives, malformed matrix requirements, empty matrix surface requirements, historical matrix surface status, JSON-matrix compatibility versions, and version-only historical-evidence exemptions; parent added link-target enforcement, malformed-row reporting, active matrix-managed pin allowances, no-requirements reporting, historical-surface demotion handling, JSON-derived compatibility allowances, explicit path/status evidence authorization, and regression tests. Final handoff review/elegance outcome is recorded in the Linear workpad before review handoff.

## Progress Log
- 2026-04-26: bounded same-issue child lane created the CO-387 docs-first packet and left changes uncommitted for parent patch export.
- 2026-04-26: parent implemented matrix-backed posture enforcement, restored pre-existing referenced CO-276 packet files so `docs:check` remains honest, registered CO-387 freshness entries, addressed standalone review P2s, and reran validation.

## Notes
- Do not call Linear mutation helpers from this child lane.
- Do not edit implementation files from this child lane.
- Do not move Codex runtime targets or workflow pins as part of this docs packet.
- Do not delete historical release evidence.
- Do not duplicate CO-379 immediate `0.124` cleanup.
