# Task Checklist - linear-f838cbde-8bb6-46de-bde2-b749f2e64422

- Linear Issue: `CO-379` / `f838cbde-8bb6-46de-bde2-b749f2e64422`
- MCP Task ID: `linear-f838cbde-8bb6-46de-bde2-b749f2e64422`
- Primary PRD: `docs/PRD-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- TECH_SPEC: `tasks/specs/linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`
- Source anchor: `ctx:sha256:36aecdd1d31f000742d130136fe00806039121e7d92db144db5a9726604ea238#chunk:c000001`

## Docs-First
- [x] Source payload checked. Evidence: `.runs/linear-f838cbde-8bb6-46de-bde2-b749f2e64422/cli/2026-04-26T11-14-26-687Z-a01e7b92/memory/source-0/source.txt`.
- [x] PRD drafted. Evidence: `docs/PRD-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`.
- [x] Canonical TECH_SPEC drafted. Evidence: `tasks/specs/linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`.
- [x] TECH_SPEC mirror drafted. Evidence: `docs/TECH_SPEC-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`.
- [x] ACTION_PLAN drafted. Evidence: `docs/ACTION_PLAN-linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`.
- [x] Checklist mirrored to `.agent/task`. Evidence: `.agent/task/linear-f838cbde-8bb6-46de-bde2-b749f2e64422.md`.
- [x] Task index and docs freshness registry updated. Evidence: `tasks/index.json`, `docs/docs-freshness-registry.json`.
- [x] Docs-review run completed before implementation or documented with a break-glass reason. Evidence: `.runs/linear-f838cbde-8bb6-46de-bde2-b749f2e64422-docs-review-r2/cli/2026-04-26T11-29-46-614Z-d37f9112/manifest.json`; initial P2 path evidence finding resolved in the task packet.

## Implementation
- [x] Same-issue child lane `index-readme-version-audit` completed and parent accepted/rejected/invalidated it with evidence. Evidence: `.runs/linear-f838cbde-8bb6-46de-bde2-b749f2e64422-index-readme-version-audit/cli/2026-04-26T11-17-37-002Z-f511c963/manifest.json`; parent accepted the patch.
- [x] Old `0.124.0` evidence page moved or renamed into a clearly historical/archive path. Evidence: `docs/book/archive/codex-cli-0124-adoption.md`.
- [x] Book index, README links, version-policy references, posture matrix, and docs catalog audited and updated as needed. Evidence: `README.md`, `docs/README.md`, `docs/book/README.md`, `docs/guides/codex-version-policy.md`, `docs/codex-posture-matrix.json`, `docs/docs-catalog.json`.
- [x] CO-341/CO-345 historical evidence preserved. Evidence: `docs/book/archive/codex-cli-0124-adoption.md`.
- [x] Current posture surfaces still state Codex CLI `0.125.0` plus `gpt-5.5` / `xhigh` for validated local ChatGPT-auth/appserver use and keep `gpt-5.4` only as intentional fallback wording. Evidence: `README.md`, `docs/README.md`, `docs/guides/codex-version-policy.md`, `docs/codex-posture-matrix.json`.
- [x] Focused docs-hygiene coverage updated for the historical/archive evidence path. Evidence: `tests/docs-hygiene.spec.ts`.

## Validation
- [x] Focused docs-hygiene coverage. Evidence: `npx vitest run --config vitest.config.core.ts tests/docs-hygiene.spec.ts` passed, 70 tests.
- [x] Focused stale-reference audit for active `codex-cli-0124-adoption.md` paths. Evidence: `rg -n "\\]\\([^)]*codex-cli-0124-adoption\\.md" README.md docs tasks .agent --glob '!docs/book/archive/codex-cli-0124-adoption.md'` returns only the intended archive link and posture-matrix expectation.
- [x] `npm run docs:check`. Evidence: passed standalone and in the full validation chain.
- [x] `npm run docs:freshness`. Evidence: passed standalone and in the full validation chain (`4815` docs, `4818` registry entries).
- [x] `node scripts/diff-budget.mjs`. Evidence: passed standalone and in the full validation chain (`files=20/25`, `lines=568/1200`, `+470/-98`).
- [x] Standalone review and elegance/minimality pass completed or waiver recorded. Evidence: review telemetry `.runs/linear-f838cbde-8bb6-46de-bde2-b749f2e64422/cli/2026-04-26T11-14-26-687Z-a01e7b92/review/telemetry.json` reports `status=succeeded`, `review_outcome=clean-success`; elegance pass recorded at `out/linear-f838cbde-8bb6-46de-bde2-b749f2e64422/manual/elegance-review.md`.

## Progress Log
- 2026-04-26: Provider worker confirmed live Linear state `In Progress`, created the persistent workpad, recorded `parallelize_now` / `independent_scope_available`, and launched same-issue child lane `index-readme-version-audit`.
- 2026-04-26: Provider worker refreshed the issue workspace from stale detached HEAD to branch `linear/co-379-retire-0124-residue` tracking current `origin/main` before repo edits.
- 2026-04-26: Full validation chain passed: `node scripts/delegation-guard.mjs && node scripts/spec-guard.mjs --dry-run && npm run build && npm run lint && npm run test && npm run docs:check && npm run docs:freshness && node scripts/diff-budget.mjs`.
- 2026-04-26: Final standalone review completed cleanly; elegance/minimality pass found no simplification patch needed.

## Notes
- Keep this lane docs-only unless validation exposes a concrete docs-hygiene issue that must be fixed in test coverage.
- Do not delete historical release evidence.
- Do not change runtime, workflow, package, or model target posture.
