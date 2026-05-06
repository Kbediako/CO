# Task Checklist - linear-63b806b8-2a46-48ff-b330-eeee2f0038dd

- Linear Issue: `CO-505` / `63b806b8-2a46-48ff-b330-eeee2f0038dd`
- MCP Task ID: `linear-63b806b8-2a46-48ff-b330-eeee2f0038dd`
- Primary PRD: `docs/PRD-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- TECH_SPEC: `tasks/specs/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- `.agent` mirror: `.agent/task/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`
- Issue contract source anchor: `ctx:sha256:f6df0cd43c7fd87ced32d0e8e02d78b6c4bfecdd0101b7e7842036baee221aaf#chunk:c000001`
- Child-lane run source anchor: `ctx:sha256:9162b6d23db3df6c0bb33e8c326c782fc46c9471ade9462f9710744d3fec4728#chunk:c000001`

## Acceptance Criteria
- [x] Inventory current `docs/TASKS.md` machine-local absolute paths and upward-traversal run paths. Evidence: `rg` inventory found repo-owned CO checkout paths, no current upward-traversal run-path references, and 51 retained external home/LaunchAgent/user-report/sibling Symphony references covered by the file-level note.
- [x] Convert in-repo evidence references to repo-relative paths such as `.runs/...`, `out/...`, `orchestrator/...`, `tasks/...`, or `docs/...`. Evidence: `rg -n '/Users/kbediako/Code/CO|\.\./\.\./\.runs|\]\(\.\./' docs/TASKS.md` returns no matches.
- [x] Preserve or explicitly annotate genuinely external references that cannot be repo-relative. Evidence: `docs/TASKS.md` line 1 documents retained external home config, LaunchAgent, user-report, and sibling Symphony references.
- [x] Keep `CO-503` / PR `#781` scope limited to the path-hygiene follow-up rather than stale-spec classification. Evidence: diff touches only docs packet/mirror metadata and `docs/TASKS.md` path syntax; no CO-503 source-classification rows or stale-spec metadata changed.
- [x] Prove `npm run docs:check` and `npm run docs:freshness` after the cleanup. Evidence: both commands passed after the docs/TASKS.md normalization; `docs:check` passed after converting one normalized historical git-config reference from a checked path to prose.

## Docs-First
- [x] PRD drafted with user request translation, acceptance criteria, protected terms, Not Done If, Non-Goals, and parity matrix. Evidence: `docs/PRD-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, readiness gate, fallback/path decision, and validation plan. Evidence: `tasks/specs/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`, `docs/TECH_SPEC-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`.
- [x] ACTION_PLAN drafted with sequencing, dependencies, risks, and validation split. Evidence: `docs/ACTION_PLAN-linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`.
- [x] Task checklist and `.agent` mirror created. Evidence: this file and `.agent/task/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd.md`.
- [x] Parent registers the TECH_SPEC and task in `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` as needed. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.

## Parent Implementation
- [x] Inventory `docs/TASKS.md` references containing `/Users/kbediako`. Evidence: retained matches are the documented external set after repo-owned CO checkout paths were normalized.
- [x] Inventory `docs/TASKS.md` references containing upward-traversal run paths. Evidence: no current upward-traversal run-path references remain in `docs/TASKS.md`.
- [x] Classify each matched path as in-repo evidence or genuine external provenance. Evidence: in-repo CO checkout paths normalized; home config, LaunchAgents, user reports, and sibling Symphony paths retained externally.
- [x] Normalize in-repo `/Users/kbediako` references to repo-relative paths without changing historical meaning. Evidence: `docs/TASKS.md` no longer contains `/Users/kbediako/Code/CO`.
- [x] Normalize in-repo upward-traversal run references to `.runs/...`. Evidence: `docs/TASKS.md` has no current upward-traversal run-path references.
- [x] Annotate genuine external exceptions. Evidence: `docs/TASKS.md` file-level hygiene note.
- [x] Confirm `CO-503` stale-spec classification metadata, terminal-state decisions, and `last_review` evidence were not changed. Evidence: path-normalization diff leaves CO-503 classification metadata unchanged.

## Validation
- [x] `node scripts/delegation-guard.mjs`. Evidence: passed with 1 subagent manifest found.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: passed.
- [x] `npm run docs:check`. Evidence: passed after the historical git-config prose repair.
- [x] `npm run docs:freshness`. Evidence: passed with 5285 docs and 5288 registry entries.
- [x] Parent-required broader validation floor before review handoff. Evidence: `npm run build`, `npm run lint` (existing warnings only), `npm run test` (359 files / 5396 tests), `npm run repo:stewardship`, and `node scripts/diff-budget.mjs` passed.
- [x] Manifest-backed standalone review with clean verdict or documented waiver. Evidence: `.runs/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd/cli/2026-05-06T21-41-23-757Z-2b0a78b1/review/telemetry.json` reports `status=succeeded`, `review_outcome=bounded-success`, `review_verdict=clean`, and `finding_count=0`.
- [x] Explicit elegance/minimality pass. Evidence: no-change pass recorded at `out/linear-63b806b8-2a46-48ff-b330-eeee2f0038dd/manual/elegance-review.md`.
- [ ] PR attached and `pr ready-review` drain clean before review handoff.

## Child-Lane Notes
- 2026-05-07: docs-packet child lane created the six scoped packet files only. Parent remains owner of `docs/TASKS.md`, `tasks/index.json`, `docs/docs-freshness-registry.json`, Linear state, workpad, PR lifecycle, and full validation.
