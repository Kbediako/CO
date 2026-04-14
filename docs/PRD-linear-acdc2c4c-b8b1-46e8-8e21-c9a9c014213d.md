# PRD - CO Codex CLI 0.120.0 Adoption Posture

## Summary
Local CO now runs `codex-cli 0.120.0` while active public and contributor surfaces still name Codex CLI `0.118.0` as the compatibility target. CO-180 must turn that baseline drift into an evidence-backed adoption decision, not a blind string bump.

## User Request Translation
- Capture task-scoped Codex CLI `0.120.0` audit evidence under `.runs/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/` and `out/linear-acdc2c4c-b8b1-46e8-8e21-c9a9c014213d/manual/`.
- Run or explicitly block/waive the policy-required runtime-mode canary, required cloud canary contract, and cloud fallback contract.
- Decide whether CO promotes active policy/docs to Codex CLI `0.120.0` or intentionally holds `0.118.0` with current rationale.
- Confirm provider-worker `codex exec` / `codex exec resume` assumptions and review-wrapper assumptions have no P0/P1 regression.

## Intent Checksum
Protected terms: Codex CLI `0.120.0`, Codex CLI `0.118.0`, `docs/guides/codex-version-policy.md`, `codex exec`, `codex exec resume`, `codex review`, `codex login --device-auth`, runtime-mode canary, cloud canary contract, cloud fallback contract, provider-worker exec/resume assumptions, review-wrapper assumptions.

Protected surfaces: `AGENTS.md`, `docs/AGENTS.md`, `README.md`, `docs/README.md`, `docs/public/downstream-setup.md`, `docs/guides/codex-version-policy.md`, `docs/docs-catalog.json`, `scripts/docs-hygiene.ts`, `scripts/cloud-canary-ci.mjs`, `scripts/runtime-mode-canary.mjs`, and task evidence under this issue's `.runs` and `out` roots.

Wrong interpretations to reject: version-string-only bump, unrelated CO-77 public-doc cleanup, resident app-server/provider-worker runtime rewrite without a concrete `exec` / `resume` regression, and claiming cloud success when the provider workspace only supports an explicit waiver.

## Parity / Alignment Matrix
- Current truth: local `codex --version` reports `codex-cli 0.120.0`, while active docs-catalog checked docs still declare Codex CLI `0.118.0`.
- Reference truth: `docs/guides/codex-version-policy.md` requires candidate posture evidence before carrying forward or promoting a Codex CLI target after baseline drift.
- Target truth: active policy and docs either promote to verified Codex CLI `0.120.0` with evidence paths, or intentionally hold `0.118.0` with a dated rationale for why local `0.120.0` drift is acceptable.
- Explicitly out-of-scope differences: broader public-doc cleanup owned by CO-77, CO-89 resident-session implementation, and generic Codex CLI feature adoption unrelated to the protected command surfaces.

## Not Done If
- The lane only bumps `0.118.0` strings without gate evidence.
- Runtime-mode canary, cloud canary, or cloud fallback contract gaps are neither run nor explicitly waived with concrete blocker evidence.
- Active docs-catalog checked docs disagree about the current Codex CLI target after the decision.
- Provider-worker exec/resume or review-wrapper compatibility is assumed without current command-surface evidence.

## Goals
- Preserve a task-scoped evidence pack for the `0.120.0` audit.
- Make one explicit adoption posture decision.
- Keep active truth surfaces consistent with the decision.
- Leave unrelated runtime architecture unchanged unless the audit finds a real P0/P1 regression.

## Non-Goals
- No blind version-string bump.
- No CO-89 resident app-server control-seam work unless a concrete `codex exec` / `codex exec resume` regression appears.
- No broad CO-77 public release cleanup.

## Metrics & Guardrails
- Command-surface evidence covers `codex --version`, `codex exec --help`, `codex exec resume --help`, `codex review --help`, and the `codex login --device-auth` surface.
- Policy-required gates are either green or recorded as blocked/waived with exact environment constraints.
- `docs:check` and `docs:freshness` verify docs-catalog version posture consistency after edits.

## Approvals
- Product: Linear issue CO-180.
- Engineering: docs-review, validation gates, standalone review, and elegance pass evidence recorded in the workpad/checklist.
- Design: Not applicable.
