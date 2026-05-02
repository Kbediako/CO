# PRD - CO-485 Codex CLI 0.128 permission-profile/trust-flow rebaseline

## Traceability
- Linear issue: `CO-485` / `77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf`
- Linear URL: https://linear.app/asabeko/issue/CO-485
- Task registry id: `20260502-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf`
- MCP Task ID: `linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf`
- Canonical spec: `tasks/specs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- TECH_SPEC mirror: `docs/TECH_SPEC-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- Task checklist: `tasks/tasks-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf.md`
- Canonical owner key: `codex-cli-0128:permission-profile-trust-flow-rebaseline`
- Child lane manifest: `.runs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf-docs-packet-bootstrap/cli/2026-05-02T12-25-28-667Z-edf96fa7/manifest.json`
- Source anchor: `ctx:sha256:7b8009ed1070b9651f8299646e34cc07a9edf0d71d948584365cd01269075452#chunk:c000001`
- Parent source payload: `.runs/linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf-docs-packet-bootstrap/cli/2026-05-02T12-25-28-667Z-edf96fa7/memory/source-0/source.txt`
- Source payload note: the referenced `.runs` payload path is not present in this child checkout, so this packet uses the parent-provided issue contract, protected terms, source anchor, and manifest pointer as the authoritative docs-first contract.

## Summary
- Problem Statement: CO-466 already owns the broad Codex CLI 0.128.0 release-intake classification, but current-facing CO docs and provider-worker prompts still need a narrow rebaseline for permission profiles, sandbox profile config controls, cwd controls, active-profile metadata, `--full-auto` deprecation, and trust flows.
- Desired Outcome: parent implementation has a concise CO-485 packet that separates permission-profile posture from broad release-intake posture, keeps sandbox/approval safety intact, and defines how doctor/default setup and provider-worker prompts should detect or surface profile-backed posture drift.

## User Request Translation
- User intent / needs: bootstrap the CO-485 docs-first packet and registry mirrors only. The packet must preserve the exact Codex CLI 0.128.0 permission-profile and trust-flow terms while leaving source edits, docs-review, live command evidence, Linear state, workpad, PR lifecycle, and final validation to the parent lane.
- Success criteria / acceptance:
  - current-facing docs and provider-worker prompts stop recommending `--full-auto` as normal flow
  - permission profiles and sandbox profile config controls are distinguished from older approval/sandbox shorthand
  - cwd controls and trust flows are represented as governed setup choices, not incidental prompt text
  - active-profile metadata gives operators enough evidence to identify the active posture
  - doctor/default setup can identify profile-backed posture drift
  - validation includes focused tests or live command evidence for the rebaseline

## Intent Checksum
- Protected terms:
  - Codex CLI 0.128.0
  - permission profiles
  - sandbox profile config controls
  - cwd controls
  - active-profile metadata
  - `--full-auto` deprecation
  - trust flows
  - doctor/default setup
  - provider-worker prompts
- Nearby wrong interpretations to reject:
  - duplicating the broad `0.128.0` release-intake work already owned by CO-466
  - changing portable `gpt-5.4` fallback defaults as a side effect
  - weakening sandbox/approval safety because a permission profile is selected
  - rewriting historical specs solely because they mention old flags
  - treating `--full-auto` as the standard operator-facing recommendation
  - collapsing permission profiles into generic sandbox or approval modes

## Parity / Alignment Matrix

| Surface | Current truth | Reference truth | Target truth | Explicitly out-of-scope differences |
| --- | --- | --- | --- | --- |
| Codex CLI posture | CO-466 classified Codex CLI 0.128.0 broadly across local, package, cloud, and docs surfaces. | CO-466 remains the release-intake owner. | CO-485 handles only permission-profile and trust-flow rebaseline wording and checks. | No broad release-intake duplicate and no workflow pin promotion. |
| Permission profiles | Some guidance can still rely on older approval/sandbox shorthand or `--full-auto` examples. | Codex CLI 0.128.0 exposes permission profiles and sandbox profile config controls as the current posture vocabulary. | Current-facing docs and provider-worker prompts name permission profiles, sandbox profile config controls, cwd controls, and active-profile metadata explicitly. | No automatic weakening of sandbox or approval safety. |
| Trust flows | Trust can be implied by cwd or default setup prose. | Trust flows and cwd controls are separate operator-facing controls. | Guidance states which cwd controls and trust flows apply before provider-worker launch or doctor/default setup. | No broad auth, Agent Identity, or cloud trust refactor. |
| `--full-auto` deprecation | Historical docs may mention `--full-auto`; current-facing docs/prompts must not recommend it as normal. | Deprecated flag references may remain only as historical or migration context. | Current guidance prefers permission profiles and flags stale `--full-auto` wording for removal or migration. | No historical-spec churn unless current-facing guidance imports stale wording. |
| Doctor/default setup | Defaults can drift when config is profile-backed but checks only compare old sandbox/approval fields. | Doctor/default setup should explain the active profile-backed posture. | Doctor/default setup identifies profile-backed posture drift and reports active-profile metadata. | No portable `gpt-5.4` fallback default changes. |

## Not Done If
- Current-facing docs or provider-worker prompts recommend `--full-auto` as normal.
- Permission-profile distinction is omitted or collapsed into generic sandbox/approval prose.
- Doctor/default setup cannot identify profile-backed posture drift.
- Validation lacks focused tests or live command evidence.

## Goals
- Create the CO-485 docs-first packet and registry mirrors inside the declared docs scope.
- Preserve the exact permission-profile, trust-flow, and `--full-auto` deprecation language needed by parent implementation.
- Make CO-466's broad release-intake ownership explicit so this lane stays narrow.
- Define parent-owned validation expectations for focused tests or live command evidence.

## Non-Goals
- No broad `0.128.0` release-intake duplicate; CO-466 remains the broad release-intake owner.
- No portable `gpt-5.4` fallback default changes.
- No automatic weakening of sandbox/approval safety.
- No historical-spec churn unless current-facing guidance imports stale wording.
- No implementation, package, workflow, test, template, Linear, GitHub, workpad, PR, or lifecycle edits from this child lane.

## Metrics & Guardrails
- Primary Success Metrics:
  - all six packet and mirror files exist
  - `tasks/index.json` uses task id `20260502-linear-77fc72a8-6cc4-4a47-84cd-7b0dfd18bfaf`
  - registry mirrors include canonical owner key `codex-cli-0128:permission-profile-trust-flow-rebaseline`
  - protected-term scan finds every requested term
  - changed-file review stays inside declared docs/task scope
- Guardrails / Error Budgets:
  - zero source/test/package/workflow edits from this child lane
  - zero release-intake adoption claims beyond CO-466's existing ownership
  - zero safety weakening around sandbox, approval, cwd, or trust posture

## Technical Considerations
- Architectural Notes:
  - Permission profiles should become the current-facing posture vocabulary where old `--full-auto` or approval/sandbox shorthand appears in operator guidance.
  - Active-profile metadata should be machine-readable enough for provider-worker prompts and doctor/default setup to explain the selected posture.
  - Cwd controls and trust flows should remain separate checks so a trusted cwd does not imply broader sandbox or approval weakening.
- Dependencies / Integrations:
  - docs and prompt surfaces that mention Codex CLI 0.128.0 permission profiles or `--full-auto`
  - doctor/default setup checks
  - provider-worker prompts
  - focused tests or live command evidence selected by parent implementation

## Fallback / Refactor Decision
- Applies to fallback, compatibility, legacy, stale, cached, break-glass, or minor-seam behavior? `Yes`.
- Large-refactor decision: not required for this bounded rebaseline; ownership remains in existing current-facing docs, doctor/default setup, and review-wrapper surfaces.
- Minor-seam decision: acceptable only for the temporary legacy Codex config retry while 0.124/0.125 release-facing pins still reject `default_permissions`.

| Surface | Fallback / seam | Decision | Owner | Trigger | Introduced date | Review date | Maximum lifetime | Removal condition | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `--full-auto` examples | Current-facing docs or provider-worker prompts can import stale normal-flow wording. | remove fallback | CO-485 | `--full-auto` appears as normal guidance instead of deprecated or historical context. | pre-0.128 guidance | 2026-05-02 | N/A after removal from current guidance | Current-facing docs/prompts prefer permission profiles and mark deprecated examples as migration-only. | Protected-term scan plus focused docs/prompt test or live command evidence. |
| Profile-backed posture drift | Doctor/default setup can compare older config fields without active-profile metadata. | expire fallback | CO-485 | Active profile differs from expected sandbox profile config controls or cwd controls. | 2026-05-02 | 2026-05-02 | 2026-06-01 | Doctor/default setup reports active-profile metadata and profile-backed drift directly. | Parent-owned focused test or live doctor/default setup command evidence. |
| Trust-flow shorthand | Trust flows can be implied from cwd language. | remove fallback | CO-485 | Current-facing guidance treats cwd trust as equivalent to full permission posture. | pre-0.128 guidance | 2026-05-02 | N/A after removal | Guidance separates cwd controls, trust flows, permission profiles, and sandbox profile config controls. | Parent-owned prompt/docs scan plus focused validation. |

## Open Questions
- Parent should choose the exact focused test or live command evidence once implementation surfaces are selected.
- Parent should decide whether active-profile metadata is emitted by existing doctor/default setup output or needs a narrow source change.

## Approvals
- Product: Linear CO-485, pending parent review
- Engineering: parent docs-review / implementation review, pending
- Design: N/A
