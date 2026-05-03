# ACTION_PLAN - CO-450 Codex binary provenance in doctor

## Added by Bootstrap (refresh as needed)

## Summary
- Goal: Make `codex-orchestrator doctor` report active CLI path/version and Codex.app bundled CLI path/version separately, with advisory drift on mismatch.
- Scope: Doctor provenance probing, doctor summary output, focused tests, and task mirrors.
- Assumptions: The active CLI remains selected by existing `CODEX_CLI_BIN`, managed CLI, and `PATH` behavior.

## Issue Readiness Gate
- Intent checksum / protected terms carried forward: `command -v codex`, `/opt/homebrew/bin/codex`, `/Applications/Codex.app/Contents/Resources/codex`, `codex --version`, `CODEX_CLI_BIN`, `codex-orchestrator doctor`, active Codex binary, app bundle binary, binary provenance, version drift.
- Not done if: Doctor still implies a singular Codex version, audited executable path is unclear, app-bundle drift is reported as checkout/docs posture, or override/managed selection changes.
- Pre-implementation issue-quality review: The task is sufficiently scoped to the doctor/read-only surface; nearby wrong interpretations and non-goals are captured in PRD and spec.
- Fallback / refactor decision: This removes the singular-version doctor seam and retains `CODEX_CLI_BIN`/managed selection as a non-expiring operator contract. No larger CLI setup refactor is required for this bounded provenance patch.
- Durable retention evidence: Override and managed selection are preserved by focused tests.
- Large-refactor check: A larger binary-management refactor is deferred because CO-450 is advisory read-only provenance, not selection policy.

## Milestones & Sequencing
1. Inspect current doctor and Codex CLI resolution seams.
2. Add provenance probing and doctor output fields.
3. Add focused tests for absent app bundle, matching app bundle, divergent app bundle, and explicit `CODEX_CLI_BIN`.
4. Run validation floor, standalone review, elegance review, PR lifecycle, and ready-review drain.

## Dependencies
- Existing `resolveCodexCliBin`, `isManagedCodexCliEnabled`, and managed readiness behavior.
- Optional macOS app bundle path `/Applications/Codex.app/Contents/Resources/codex`.

## Validation
- Checks / tests: focused doctor tests, then repo floor listed in the workpad.
- Rollback plan: Revert the doctor provenance fields/tests; no external state is mutated.

## Risks & Mitigations
- Risk: version probe failures make doctor noisy. Mitigation: report unavailable details without throwing and only warn on confirmed mismatch.
- Risk: override behavior regresses. Mitigation: explicit `CODEX_CLI_BIN` test asserts the active audited path is the override.

## Approvals
- Reviewer: Codex provider worker
- Date: 2026-05-01
