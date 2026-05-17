---
id: 20260416-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1
title: CO Codex CLI 0.121.0 Sandbox/Security Preflight Policy Classification
relates_to: docs/PRD-linear-2a8f00cf-a39a-4b15-aeca-23bacd618af1.md
risk: high
owners:
  - Codex
last_review: 2026-04-16
---

## Summary
- Objective: classify Codex CLI `0.121.0` sandbox/security changes into `local-only`, `cloud-only`, `both`, or `not applicable` preflight policy buckets before parent implementation.
- Scope: docs-first registration, issue-shaping contract, protected terms, classification matrix, parent-owned validation checklist, and assumptions about missing source payload access.
- Constraints: no Linear mutation from this child lane, no implementation changes, no credential/profile rotation fixes, no sandbox default weakening, and no broad cloud runtime redesign.

## Issue-Shaping Contract
- User-request translation carried forward: CO-199 is a same-version follow-up to CO-195 that turns 0.121 sandbox/security release deltas into explicit local/cloud preflight policy classes before implementation.
- Protected terms / exact artifact and surface names: Codex CLI `0.121.0`, Codex CLI `0.118.0`, `rust-v0.121.0`, `CODEX_CLOUD_ENV_ID`, `CODEX_CLOUD_CANARY_REQUIRED=1`, `CLOUD_CANARY_EXPECT_FALLBACK=1`, `danger-full-access`, macOS sandbox, private DNS, Unix socket allowlists, secure devcontainer profile, bubblewrap, WSL1 bubblewrap limitations, WSL2 behavior, MCP sandbox-state metadata, exec-server filesystem sandbox helper, app-server filesystem metadata, `thread/shellCommand`.
- Nearby wrong interpretations to reject: local-only sandbox details as cloud blockers, cloud-only failure messaging as local runtime regression, sandbox default weakening, CO-195 credential/profile replay, broad cloud runtime redesign, marketplace packaging, MCP Apps authority expansion, and provider-worker appserver migration.
- Explicit non-goals carried forward: no credential/profile rotation fixes, no sandbox default weakening, no broad cloud runtime redesign, no marketplace/plugin packaging adoption, no provider-worker appserver migration.

## Parity / Alignment Matrix
- Current truth: CO-195 holds active policy at Codex CLI `0.118.0` while naming `0.121.0` as the latest audited candidate; promotion remains blocked by missing `CODEX_CLOUD_ENV_ID`.
- Reference truth: `rust-v0.121.0` includes sandbox/security-adjacent deltas across secure devcontainer behavior, macOS private DNS and Unix sockets, Windows elevated denial, WSL1 bubblewrap, exec-server filesystem sandboxing, remote exec environment policy, websocket token hash auth, pinned inputs, `danger-full-access`, `thread/shellCommand`, and MCP sandbox-state metadata.
- Target truth / intended delta: parent implementation can update policy/docs/tests only after each relevant 0.121 delta is classified as local-only, cloud-only, both, or not applicable.
- Explicitly out-of-scope differences: auth/profile rotation, sandbox default loosening, cloud runtime redesign, marketplace support, MCP Apps metadata authority, and appserver provider supervision.

## Technical Requirements
- Functional requirements:
  1. Register the CO-199 docs-first packet and mirrors.
  2. Preserve parent source-0 reconciliation evidence: the prompt-provided source payload contained run metadata and prompt-pack provenance only, not extra classification rows.
  3. Classify release deltas using the four explicit buckets: `local-only`, `cloud-only`, `both`, and `not applicable`.
  4. Keep classification rows tied to exact surfaces rather than generic "sandbox changed" language.
  5. Define parent implementation acceptance criteria without editing code in this child lane.
  6. Preserve CO-195 posture: `0.121.0` remains candidate-only until required cloud evidence exists.
- Non-functional requirements (performance, reliability, security): no secret exposure, no authority expansion, no default sandbox weakening, and no broad validation suite from the child lane.
- Interfaces / contracts: `docs/guides/codex-version-policy.md`, cloud preflight wrapper, runtime-mode canary, docs catalog/freshness registry, app-server/MCP help surfaces, and parent Linear workpad.

## Classification Requirements

| Surface | Required class | Parent acceptance condition |
| --- | --- | --- |
| Secure devcontainer behavior | local-only | Parent documents this as local development/container posture unless a future cloud image lane records direct dependency evidence. |
| macOS private DNS handling | local-only | Local macOS guidance/checks can mention it; cloud canary decisions cannot cite it as a blocker. |
| macOS Unix socket handling | local-only | Platform-specific local socket behavior is isolated from cloud policy. |
| Windows elevated denial | local-only | Elevated local Windows posture is reported as unsupported local posture, not cloud readiness evidence. |
| WSL1 bubblewrap behavior | local-only | `doctor --cloud-preflight` can warn when WSL1 is detectable while preserving cloud canary semantics. |
| exec-server filesystem sandboxing | local-only | Parent keeps provider workers on current `codex exec`/`resume` supervision and scopes app-server filesystem behavior to local runtime policy. |
| Remote exec environment policy | cloud-only | Cloud remote execution policy remains behind cloud preflight, `CODEX_CLOUD_ENV_ID`, and cloud canary gates. |
| Websocket token hash auth | local-only | App-server/control websocket auth stays local; `executionMode=cloud` with `runtimeMode=appserver` remains fail-fast unsupported. |
| Pinned inputs | not applicable | Treat as release/build hygiene unless future evidence shows a CO preflight dependency. |
| `danger-full-access` behavior | local-only | CO reports top-level `sandbox_mode = "danger-full-access"` as a local-only advisory and does not weaken local defaults. |
| `thread/shellCommand` sensitive unsandboxed surface | local-only | Keep it out of default provider-worker authority unless a future cloud-bridge lane proves exposure. |
| MCP sandbox-state metadata | both | Metadata is consumed or documented without expanding MCP tool authority or replacing canary evidence. |

## Validation Plan
- Child-lane checks:
  - JSON parse for `tasks/index.json` and `docs/docs-freshness-registry.json`.
  - Exact target-file existence check.
  - Registry path check for CO-199 docs/task mirrors.
- Parent-lane checks:
  - `node scripts/delegation-guard.mjs`
  - `node scripts/spec-guard.mjs --dry-run`
  - focused policy/docs tests for the preflight classification surface parent touches
  - `npm run docs:check`
  - `npm run docs:freshness`
  - docs-review before implementation handoff
  - implementation-gate only after parent code/docs changes
- Rollout verification: parent attaches PR/workpad evidence and records any line-budget/archive fallback for `docs/TASKS.md`.

## Open Questions
- Parent source-0 reconciliation found only run metadata and prompt-pack provenance, with no additional sandbox/security classification rows.
- Secure devcontainer behavior stays local-only for current CO preflight policy because no cloud image dependency evidence is present.
- MCP sandbox-state metadata remains a shared metadata row only; CO-199 does not expand MCP tool authority.

## Approvals
- Reviewer: pending parent docs-review.
- Date: 2026-04-16
