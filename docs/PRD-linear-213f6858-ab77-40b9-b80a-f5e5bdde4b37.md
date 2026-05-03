# PRD - CO-450 Codex binary provenance in doctor

## Traceability
- Linear issue: `CO-450`
- Task id: `linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37`
- Canonical spec: `tasks/specs/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- Task checklist: `tasks/tasks-linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37.md`
- Workpad: Linear comment `54e50811-73ab-4d03-bade-01519d2324e6`
- Source anchor: `ctx:sha256:4bb38ecfbfaf8477dbb8461eadaeea6b1f9d89470a325a5106c4cc2cc9baa533#chunk:c000001`
- Source payload: `.runs/linear-213f6858-ab77-40b9-b80a-f5e5bdde4b37/cli/2026-05-01T00-50-57-225Z-f49f588f/memory/source-0/source.txt`

## Summary
- Problem Statement: CO doctor currently reports the selected Codex command as if there is one meaningful Codex version. On macOS, the active CLI resolved through `CODEX_CLI_BIN` or `PATH` can differ from `/Applications/Codex.app/Contents/Resources/codex`, so release-intake and model-posture audits can silently cite the wrong binary.
- Desired Outcome: `codex-orchestrator doctor` names the active Codex executable path and version it audited, reports the Codex app bundle CLI separately when present, and emits advisory version drift when the app bundle and active CLI differ.

## User Request Translation
- User intent / needs: Make binary provenance explicit in a read-only doctor/status surface without switching, replacing, or blocking either binary.
- Success criteria / acceptance:
  - Doctor output names the active Codex executable path it audited.
  - Doctor output reports app-bundle CLI version separately when `/Applications/Codex.app/Contents/Resources/codex` exists.
  - Divergent active CLI and app-bundle versions produce clear advisory drift wording.
  - Matching versions remain non-noisy.
  - Focused tests cover no app bundle, matching versions, divergent versions, and explicit `CODEX_CLI_BIN` override.
  - The packet links this follow-up to checkout-posture and release-intake lineage without replacing either concern.
- Constraints / non-goals:
  - Do not auto-switch the operator to another binary.
  - Do not block usage just because the app bundle and active CLI differ.
  - Do not overwrite `CODEX_CLI_BIN` or managed CLI settings.
  - Do not conflate stale checkout posture with binary-provenance drift.
  - Do not make a version-promotion decision.

## Intent Checksum
- Protected terms: `command -v codex`, `/opt/homebrew/bin/codex`, `/Applications/Codex.app/Contents/Resources/codex`, `codex --version`, `CODEX_CLI_BIN`, `codex-orchestrator doctor`, active Codex binary, app bundle binary, binary provenance, version drift.
- Wrong interpretations to reject:
  - treating the app-bundle CLI as the active CLI just because Codex.app is running
  - changing managed CLI selection or `CODEX_CLI_BIN` override behavior
  - turning version drift into checkout-posture staleness
  - treating app/CLI divergence as a release promotion or rollback decision

## Lineage Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out of scope |
| --- | --- | --- | --- | --- |
| Checkout posture | Doctor can warn when a checkout is stale relative to `origin/main`. | Checkout staleness and binary provenance are separate audit axes. | Binary drift appears under Codex CLI provenance, not checkout posture. | Changing checkout freshness logic. |
| Release intake | Release audits inspect `codex --version` and installed CLI posture. | Audits must state which executable produced a version. | Doctor reports active path/version plus app-bundle path/version when present. | Promoting or rejecting a Codex release. |
| Managed CLI | `CODEX_CLI_BIN` override and managed opt-in select the active CLI. | Override and managed selection remain authoritative. | Provenance reports the resolved active binary without mutating selection. | Auto-switching managed/global/app binaries. |
| Codex app bundle | App bundle may include its own `codex` executable. | App-bundle CLI is separate evidence from `PATH`/override CLI. | App-bundle version is reported separately and compared advisorially. | Replacing, deleting, or upgrading the app bundle. |

## Not Done If
- Doctor/status still reports only one implicit Codex version when app bundle and active CLI differ.
- An operator cannot tell which executable was audited.
- Divergent app-bundle versus active CLI versions can still be mistaken for a checkout or docs-posture bug.
- The change auto-selects, modifies, or installs a different Codex binary.

## Goals
- Add active binary path and active `--version` output to doctor JSON/text output.
- Add app-bundle binary presence/version reporting on macOS when the bundle path exists.
- Add a clear advisory when active and app-bundle versions differ.
- Preserve existing managed CLI and `CODEX_CLI_BIN` behavior.

## Non-Goals
- No automatic binary replacement or migration.
- No requirement that the app bundle and global CLI match.
- No destructive cleanup of local installs.
- No version-promotion decision.

## Stakeholders
- Product: CO operators using doctor output to decide release and model posture.
- Engineering: doctor/readiness, Codex CLI setup, release-intake, and checkout-posture maintainers.
- Design: N/A.

## Metrics & Guardrails
- Primary success: focused tests prove absent app bundle, matching versions, divergent versions, and explicit override behavior.
- Guardrails: no mutation of `CODEX_CLI_BIN`, managed CLI config, app bundle files, or checkout-posture status.

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Doctor Codex CLI summary | Singular implicit Codex version/command assumption. | remove fallback | CO-450 | `codex-orchestrator doctor` reports Codex CLI posture. | existing behavior | 2026-05-01 | N/A after removal | Doctor reports active path/version and app-bundle version separately. | Focused doctor tests and output inspection. |
| Managed CLI selection | `CODEX_CLI_BIN` and managed opt-in selection remain selection contracts. | justify retaining fallback | CO-450 | Operator has explicit override or managed CLI config. | existing behavior | 2026-05-01 | Non-expiring operator-selection contract | Only replace through a separately approved CLI-selection policy. | Override regression proves active audited executable is the explicit override. |

## Open Questions
- None blocking. Exact output wording can be refined during implementation as long as it stays advisory and names both executables.
