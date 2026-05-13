# Task Checklist - linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43

- Linear Issue: `CO-488` / `4cbc2024-e85b-469d-adbc-7ee6f4ff2d43`
- Task registry id: `20260513-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43`
- MCP Task ID: `linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43`
- Primary PRD: `docs/PRD-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- TECH_SPEC: `tasks/specs/linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`
- Canonical owner key: `codex-cli-0128:plugin-hook-import-governance`

## Docs-First
- [x] PRD drafted with intent checksum, parity matrix, explicit non-goals, Not Done If, and fallback/refactor decision. Evidence: `docs/PRD-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`.
- [x] TECH_SPEC drafted with issue-shaping contract, readiness gate, technical requirements, fallback/refactor decision, and validation plan. Evidence: `tasks/specs/linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`, `docs/TECH_SPEC-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`.
- [x] ACTION_PLAN drafted for packet setup and parent/provider-worker sequencing. Evidence: `docs/ACTION_PLAN-linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-4cbc2024-e85b-469d-adbc-7ee6f4ff2d43.md`.
- [x] Task registration mirrors updated in declared scope. Evidence: `tasks/index.json`, `docs/TASKS.md`, `docs/docs-freshness-registry.json`.
- [x] Packet validation completed. Evidence: `git diff --check`, `node scripts/spec-guard.mjs --dry-run`, JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`, protected-term scan, and `npm run docs:check` passed on 2026-05-13; `npm run docs:freshness` remains red only on inherited CO-522 baseline with zero missing registry entries, zero invalid entries, and no CO-488 stale entries in `out/local/docs-freshness.json`.
- [x] Existing PR opened and attached. Evidence: PR #802 (`CO-488 add plugin governance traceability packet`) is attached to Linear CO-488.
- [ ] Existing PR reviewed and drained after implementation update. Evidence: pending standalone review, PR checks, and `pr ready-review`.

## Protected Issue Terms
- [x] plugin-bundled hooks
- [x] hook enablement state
- [x] remote plugin bundle cache
- [x] remote uninstall
- [x] external-agent config import
- [x] marketplace install flow
- [x] pack-smoke
- [x] downstream packaged plugin governance
- [x] `codex-cli-0128:plugin-hook-import-governance`
- [x] `backlog_head_follow_up_traceability_pending`

## Non-Goals
- [x] No broad plugin marketplace command rewrite.
- [x] No binary provenance work owned by CO-450.
- [x] No blanket plugin disabling.
- [x] No arbitrary imported hook/config adoption.
- [x] No source/test implementation before packet registration.
- [x] No Linear/GitHub/workpad lifecycle mutation from packet setup.

## Not Done If
- CO-488 leaves Backlog without packet files and registry mirrors.
- Plugin-bundled hooks or imported config can silently alter packaged CO behavior.
- Pack-smoke ignores hook/cache/import surfaces that affect downstream packaged users.
- The implementation duplicates marketplace command rebaseline work.
- The implementation absorbs CO-450 binary provenance or trusts imported hook/config behavior without validation.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? Yes.
- Decision: remove the silent-trust hook/import seam and expire unvalidated cache/uninstall assumptions.
- Owner: CO-488.
- Trigger: Plugin hook/config import/cache/uninstall behavior affects packaged CO behavior.
- Introduced date: 2026-05-03.
- Review date: 2026-05-13.
- Maximum lifetime: hook/import silent trust is not retained; cache/uninstall assumption expires by 2026-06-12.
- Removal condition: Hook/import/cache/uninstall behavior is governed and validated, or fails closed.
- Validation: protected-term scan, JSON checks, spec guard, docs checks, and later focused plugin/pack-smoke tests.
- Large-refactor check: bounded guard changes are acceptable while authority remains inside existing `pack-smoke`; future hook/import support must consolidate authority instead of adding another seam.
- Minor-seam decision: bounded guard changes are acceptable because this lane removes silent trust rather than adding a second runtime path.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Plugin hook/import governance | Plugin-bundled hooks or imported external-agent config can be trusted without CO safety checks. | remove fallback | CO-488 | Plugin hook/config import behavior affects packaged CO behavior. | 2026-05-03 | 2026-05-13 | N/A after implementation | Hook/import behavior is governed and validated, or fails closed. | Focused plugin/hook/import tests plus pack-smoke coverage or explicit non-applicability evidence. |
| Remote plugin bundle cache/uninstall | Cached remote plugin bundles or uninstall behavior can bypass packaged smoke expectations. | expire fallback | CO-488 | Remote plugin cache or uninstall behavior is used by packaged downstream users without deterministic CO coverage. | 2026-05-03 | 2026-05-13 | 2026-06-12 | Pack-smoke or focused validation covers cache/uninstall semantics, or the surface is documented as out of scope with fail-closed behavior. | Pack-smoke and focused cache/uninstall regression evidence. |

## Packet Scope
- [x] Packet branch created from current `main` at `06cdbf961a`.
- [x] Stayed docs/registry only. Evidence: declared files are packet docs, task mirrors, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] Live Linear context checked. Evidence: initial CO-488 packet setup found Backlog with `Lifecycle: Implementation`, `Area: DevOps`, `Area: Docs`, `Area: Agents`, `Priority: P2`, and `Improvement`; implementation continued on attached PR #802.

## Provider-Worker Implementation / Closeout
- [x] Run provider-worker implementation after packet registration and queue admission. Evidence: live issue-context showed CO-488 in `In Progress`; work continued on PR #802.
- [x] Audit plugin hook/cache/import source surfaces. Evidence: Codex CLI `0.128.0` npm/version/help evidence and upstream `rust-v0.128.0` release notes cite marketplace installation, remote bundle caching, remote uninstall, plugin-bundled hooks, hook enablement state, and external-agent config import.
- [x] Add focused tests or pack-smoke coverage for the selected governance contract. Evidence: `scripts/pack-smoke.mjs` now rejects ungoverned packaged/cached hook/import artifacts and `npm run test:core -- tests/pack-smoke.spec.ts` passed 15 tests on 2026-05-13.
- [x] Document allowed/blocked/out-of-scope hook/cache/import behavior. Evidence: `docs/book/setup.md` and `docs/guides/codex-version-policy.md`.
- [ ] Run required validation and current-head reviews.
- [ ] Merge implementation PR and transition CO-488 to Done only after review and merge gates pass.

## Validation
- [x] JSON parse check for `tasks/index.json`. Evidence: `node -e "JSON.parse(require('fs').readFileSync('tasks/index.json','utf8')); JSON.parse(require('fs').readFileSync('docs/docs-freshness-registry.json','utf8')); console.log('json ok')"` returned `json ok`.
- [x] JSON parse check for `docs/docs-freshness-registry.json`. Evidence: same JSON parse command returned `json ok`.
- [x] Protected-term coverage scan across packet files and mirrors. Evidence: scoped `rg` found CO-488, the Linear UUID, plugin-bundled hooks, hook enablement state, remote plugin bundle cache, remote uninstall, external-agent config import, marketplace install flow, pack-smoke, downstream packaged plugin governance, canonical owner key, and `backlog_head_follow_up_traceability_pending`.
- [x] Scoped status review confirms edits stayed inside declared file scope. Evidence: `git status --short --branch` showed only the six CO-488 packet files plus `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json`.
- [x] `node scripts/spec-guard.mjs --dry-run`. Evidence: command returned `Spec guard: OK`.
- [x] `npm run docs:check`. Evidence: command returned `docs:check: OK`.
- [x] `npm run docs:freshness` or inherited CO-522 baseline classification. Evidence: `npm run docs:freshness` failed only on inherited baseline stale docs; `out/local/docs-freshness.json` reports zero missing registry entries, zero invalid entries, zero uncatalogued docs, and zero CO-488 stale entries.
- [x] Focused pack-smoke regression. Evidence: `npm run test:core -- tests/pack-smoke.spec.ts` passed 15 tests on 2026-05-13.

## Progress Log
- 2026-05-13: Parent orchestration created packet branch `kb/co-488-traceability-packet` in a separate worktree from clean latest main.
- 2026-05-13: Packet preserves plugin-bundled hooks, hook enablement state, remote plugin bundle cache, remote uninstall, external-agent config import, marketplace install flow, pack-smoke, and downstream packaged plugin governance while leaving implementation to the provider-worker lane.
- 2026-05-13: Packet validation passed diff hygiene, JSON parse, protected-term scan, spec guard, and docs:check. Docs freshness remains red only on inherited CO-522 baseline with no CO-488 packet-local registry failure.
- 2026-05-13: Provider-worker implementation added pack-smoke governance for ungoverned packaged/cached plugin hooks, hook state, and external-agent import artifacts; docs child lane `docs-governance` was accepted after producing setup/version-policy docs updates.

## Notes
- This packet now tracks the active implementation; review handoff still requires full validation, standalone review, elegance pass, PR checks, and ready-review drain.
