# ACTION_PLAN - CO-345 README front door and book-style docs

## Summary
- Goal: make the GitHub README concise and move detailed guidance into `docs/book/`.
- Scope: docs-first packet, README, book docs, downstream setup handoff wording, docs catalog/freshness registry, validation, review/elegance, workpad, PR handoff.
- Assumptions:
  - the clean issue workspace is the only editable checkout
  - existing public guides stay canonical for downstream/provider setup details
  - `0.124.0` evidence can be documented without promoting defaults

## Issue Readiness Gate
- Intent checksum / protected terms carried forward:
  - `README.md`
  - `docs/book/`
  - `/Users/kbediako/.codex/hooks/continue_co_orchestration.py`
  - `Codex CLI 0.124.0`
  - `CO-341`
  - `gpt-5.5`
  - `gpt-5.4`
  - `codex marketplace add`
- Not done if:
  - the README remains dense
  - book docs lack an index/table of contents
  - hook impact or `0.124.0` posture is asserted without evidence
  - detailed guidance is dropped instead of moved/linked
  - validation/review handoff gates are skipped without exact blocker evidence
- Pre-implementation issue-quality review:
  - 2026-04-24: scope matches the issue description and acceptance criteria.
  - 2026-04-24: micro-task path rejected because correctness depends on protected public docs wording and posture parity.

## Milestones & Sequencing
1. Create docs-first packet and registry mirrors.
2. Run docs-review before implementation edits.
3. Inspect local hook state, local Codex CLI version/model posture, repo posture docs, and official OpenAI Codex docs.
4. Incorporate the bounded child-lane evidence docs if the patch is valid.
5. Rewrite `README.md` as a concise front door.
6. Add `docs/book/` index and chapters for setup, operations, skills, public posture, hook impact, and `0.124.0` adoption.
7. Update docs catalog/freshness registry rows for touched docs.
8. Run required docs validation, link/format sanity checks, standalone review, and elegance pass.
9. Refresh workpad, open/update PR, attach it, drain ready-review, and move to `In Review` only when prerequisites are satisfied.

## Dependencies
- Linear issue `CO-345`
- OpenAI Developer Docs MCP
- `docs/guides/codex-version-policy.md`
- `docs/public/downstream-setup.md`
- `docs/public/provider-onboarding.md`
- local hook file and state JSON
- local `codex` binary

## Validation
- Checks / tests:
  - `node scripts/spec-guard.mjs --dry-run`
  - `npm run docs:check`
  - `npm run docs:freshness`
  - `node scripts/diff-budget.mjs`
  - README/book relative-link sanity check
  - markdown heading/line-count sanity check
  - package file-list sanity, `npm run build`, `npm run pack:audit`, and `npm run pack:smoke` when the README links require newly packaged docs
  - standalone review and elegance pass
- Rollback plan:
  - revert CO-345 docs packet, README/book docs, and catalog/registry rows if docs-review or validation proves the structure unsafe.

## Risks & Mitigations
- Risk: README loses important public setup truth.
  - Mitigation: book docs and existing public guides carry the moved detail; validation checks links.
- Risk: local `0.124.0` evidence is mistaken for generic adoption.
  - Mitigation: explicit adopted/held/follow-up matrix and no default changes.
- Risk: hook impact is overclaimed.
  - Mitigation: document exact hook predicates and state file.

## Approvals
- Docs-first packet: parent provider worker, 2026-04-24
- Docs-review: pending
- Implementation review/elegance: pending
