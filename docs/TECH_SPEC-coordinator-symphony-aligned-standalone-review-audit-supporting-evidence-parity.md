# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Audit Supporting-Evidence Parity

## Goal

Keep audit-mode standalone review bounded and useful by allowlisting `run-runner-log` as explicit audit evidence alongside `run-manifest`, while preserving the meta-surface guard for unrelated drift.

## Scope

- Update the audit-mode allowed meta-surface list in `scripts/run-review.ts`.
- Preserve the existing `run-runner-log` classifier in `scripts/lib/review-execution-state.ts` and ensure it remains limited to explicit runner transcript surfaces.
- Add focused regression coverage in `tests/run-review.spec.ts` for audit-mode runner transcript access.
- Update operator docs to reflect the new audit evidence boundary.

## Out of Scope

- Native-review controller replacement.
- Default `diff`-mode boundary changes beyond the already-landed `1094` contract.
- Broad new `.runs` allowlists or arbitrary transcript families.
- Resuming the authenticated-route Symphony extraction in the same slice.

## Design

### 1. Explicit audit supporting-evidence parity

Audit mode currently allowlists only `run-manifest` even though the classifier recognizes `run-runner-log`. Expand the audit-mode allowlist to:

- `run-manifest`
- `run-runner-log`

This keeps the contract explicit: audit can inspect the manifest and the runner transcript, but not unrelated wrapper/support surfaces.

### 2. Guard remains fail-closed for unrelated drift

Do not relax the meta-surface expansion guard itself. Audit mode should still fail when it broadens into:

- memories/skills
- review artifacts
- review docs
- review-support helpers
- unrelated `.runs` plumbing outside manifest/runner transcript evidence

### 3. Regression coverage

Add or update tests covering:

- audit mode succeeds when repeated meta-surface activity is limited to `run-manifest` and `run-runner-log`
- audit mode still fails when unrelated meta surfaces persist
- prompt/runtime operator messaging reflects the expanded audit evidence allowlist

### 4. Docs

Update `docs/standalone-review-guide.md` so the operator-facing audit guidance matches the actual runtime allowlist.
