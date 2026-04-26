# PRD - CO-373 CloudPreflight Fake Codex CLI Flake

## Summary
- Problem Statement: Core Lane can fail CloudPreflight cloud-list tests before the intended assertion path because the temporary fake Codex CLI reports `codex_unavailable` from the `--version` probe instead of reaching `codex cloud list`.
- Desired Outcome: CO-373 makes the CloudPreflight test harness deterministic in the full CI matrix while preserving the production rule that a real `codex --version` failure remains `codex_unavailable`.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): keep the CO-361 release lane moving without gambling on CI reruns; observed release/archive blockers should become explicit Linear implementation work with evidence, labels, validation, and a narrow fix.
- Success criteria / acceptance:
  - Cloud-list-focused CloudPreflight tests exercise the intended `codex cloud list` branch deterministically.
  - Real Codex CLI startup or version-check failures still classify as `codex_unavailable`.
  - PR #668 or its replacement archive path can clear Core Lane without relying on reruns.
  - CO-361 is not tagged or released while this blocker remains unresolved.
- Constraints / non-goals:
  - Do not weaken cloud preflight pass/fail semantics.
  - Do not mask real Codex CLI unavailability as an environment issue.
  - Do not broaden this lane into release publication, package versioning, or cloud-canary policy changes.

## Intent Checksum
- Exact user wording / phrases to preserve: `CO-361`, `PR #668`, `Core Lane`, `CloudPreflight.test.ts`, `codex_unavailable`, `--version`, `codex cloud list`, and `release blocker`.
- Protected terms / exact artifact and surface names: `orchestrator/tests/CloudPreflight.test.ts`, `orchestrator/src/cli/utils/cloudPreflight.ts`, `runCloudPreflight`, `runCommand`, `codex --version`, `codex cloud list`, `environment_unavailable`, `environment_not_found`, and `missing_environment`.
- Nearby wrong interpretations to reject: only rerunning CI, changing product classification to hide version-check failures, skipping CloudPreflight tests, or folding this into CO-361 without a separate implementation trail.

## Parity / Alignment Matrix
- Current truth: two Core Lane runs have shown CloudPreflight cloud-list tests receiving `Codex CLI is unavailable (... --version failed)` before the intended cloud-list assertions.
- Reference truth: cloud-list-focused tests should use a deterministic fake CLI so failures describe cloud environment classification, while real command startup failures remain covered separately.
- Target truth / intended delta: the fake CLI harness is robust enough for CI, and the unavailable-Codex regression remains explicit and focused.
- Explicitly out-of-scope differences: cloud runtime policy, CO-361 release notes, npm publish behavior, Codex model posture, and provider-worker lifecycle behavior.

## Not Done If
- The fix is only a CI rerun.
- `codex --version` production failures stop producing `codex_unavailable`.
- Cloud-list classification tests can still fail before invoking the fake `cloud list` command.
- CO-361 release tagging proceeds while archive/Core Lane evidence is still blocked by this flake.

## Goals
- Stabilize the CloudPreflight fake Codex CLI harness.
- Preserve existing CloudPreflight product behavior.
- Reopen the blocked archive/release path with machine-checkable CI evidence.

## Non-Goals
- No package version changes.
- No release tag creation in this issue.
- No cloud-mode policy change.
- No broad CloudPreflight redesign.

## Stakeholders
- Product: CO operator shepherding release readiness.
- Engineering: CloudPreflight, Core Lane, archive automation, and release maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: focused CloudPreflight tests pass locally and in CI-shaped mode; Core Lane clears on the PR that carries the fix.
- Guardrails / Error Budgets: zero weakening of real CLI unavailable classification; no test skips; no secrets in probe output.

## User Experience
- Personas: CO maintainer reading CI failures; release operator deciding whether CO-361 can proceed; reviewer checking archive automation health.
- User Journeys: maintainer sees cloud-list assertion failures only when the cloud-list classification logic regresses, not when a fake executable harness flakes.

## Technical Considerations
- Architectural Notes: prefer a test-harness-only fix unless source inspection proves product code is wrong. Keep the existing synchronous spawn failure coverage from CO-372 intact.
- Dependencies / Integrations: Node child process execution, Vitest, GitHub Core Lane, tasks archive automation, and Linear CO-361 release state.

## Open Questions
- The exact harness shape is implementation-owned: a hardened fake executable, focused mocking seam, or equivalent deterministic fixture is acceptable if product behavior remains unchanged.

## Approvals
- Product: Linear issue CO-373.
- Engineering: Orchestrator-created docs packet on 2026-04-25.
- Design: Not applicable.
