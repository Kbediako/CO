# PRD - CO: Classify Codex CLI 0.121.0 Sandbox/Security Preflight Policy Deltas

## Summary
- Problem Statement: CO-195 audited Codex CLI `0.121.0` and held promotion at the cloud gate, but the 0.121 release also includes sandbox/security-adjacent changes that need local-cloud policy classification before parent implementation. Without a written classification, CO risks either over-applying local sandbox findings to cloud preflight or weakening sandbox defaults while trying to make cloud canaries pass.
- Desired Outcome: produce a docs-first packet for CO-199 that classifies Codex CLI `0.121.0` sandbox/security changes as `local-only`, `cloud-only`, `both`, or `not applicable`, then defines the minimum parent-owned implementation and validation path for preflight policy alignment.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): treat CO-199 as a same-version follow-up to CO-195. The parent lane needs a bounded docs packet before implementation so it can classify each Codex 0.121 sandbox/security release delta by where it affects CO preflight policy: local execution, cloud execution, both, or neither.
- Success criteria / acceptance:
  - PRD, TECH_SPEC, ACTION_PLAN, task spec, task checklist, `.agent` mirror, `tasks/index.json`, `docs/TASKS.md`, and `docs/docs-freshness-registry.json` register CO-199.
  - The packet preserves exact protected terms and surfaces from CO-195 plus the new sandbox/security terms.
  - The classification matrix distinguishes local-only, cloud-only, both, and not-applicable changes.
  - Non-goals explicitly exclude credential/profile rotation fixes, sandbox default weakening, and broad cloud runtime redesign.
  - Parent implementation has a concrete validation checklist with scoped tests and policy docs checks.
- Constraints / non-goals: do not mutate Linear from this child lane; do not implement runtime changes here; do not rotate credentials, weaken sandbox defaults, or redesign cloud execution.

## Intent Checksum
- Exact user wording / phrases to preserve:
  - "CO-199"
  - "Codex 0.121 sandbox/security changes"
  - "local-only, cloud-only, both, or not applicable preflight policy"
  - "no credential/profile rotation fixes"
  - "no sandbox default weakening"
  - "no broad cloud runtime redesign"
- Protected terms / exact artifact and surface names:
  - Codex CLI `0.121.0`
  - Codex CLI `0.118.0`
  - `rust-v0.121.0`
  - `CODEX_CLOUD_ENV_ID`
  - `CODEX_CLOUD_CANARY_REQUIRED=1`
  - `CLOUD_CANARY_EXPECT_FALLBACK=1`
  - `danger-full-access`
  - macOS sandbox
  - private DNS
  - Unix socket allowlists
  - secure devcontainer profile
  - bubblewrap
  - WSL1 bubblewrap limitations
  - WSL2 behavior
  - MCP sandbox-state metadata
  - exec-server filesystem sandbox helper
  - app-server filesystem metadata
  - `thread/shellCommand`
- Nearby wrong interpretations to reject:
  - treating all 0.121 sandbox/security changes as cloud preflight blockers
  - treating all 0.121 sandbox/security changes as local-only CLI details
  - changing sandbox defaults to make a cloud canary pass
  - reopening CO-195 auth/profile rotation work
  - redesigning cloud runtime, provider-worker supervision, or app-server ownership
  - adopting marketplace/plugin packaging because it appeared in the same release

## Parity / Alignment Matrix
- Current truth: CO-195 holds the active Codex CLI target at `0.118.0`, records `0.121.0` as the latest audited candidate, and blocks promotion on missing `CODEX_CLOUD_ENV_ID`.
- Reference truth: official `rust-v0.121.0` release notes include sandbox/security-adjacent changes around secure devcontainers, macOS private DNS/Unix sockets, Windows elevated denial, WSL1 bubblewrap behavior, exec-server filesystem handling, remote exec environment policy, websocket token hash auth, pinned inputs, sandbox-state metadata, and `danger-full-access` behavior.
- Target truth / intended delta: CO-199 produces a dated classification and parent-owned policy plan that says which release deltas affect local preflight, cloud preflight, both, or neither.
- Explicitly out-of-scope differences: credential/profile rotation fixes, sandbox default weakening, broad cloud runtime redesign, marketplace packaging, MCP Apps metadata authority expansion, and provider-worker appserver migration.

## Preliminary Classification Matrix

| Release delta / surface | Final class | Preflight policy implication |
| --- | --- | --- |
| Secure devcontainer behavior | local-only | Keep as local development/container posture until a cloud lane records direct cloud image dependence. |
| macOS private DNS handling | local-only | Local macOS checks must not confuse private DNS sandbox/proxy behavior with cloud readiness. |
| macOS Unix socket handling | local-only | Platform-specific socket behavior stays isolated from cloud policy. |
| Windows elevated denial | local-only | Elevated local Windows posture is not a cloud canary blocker. |
| WSL1 bubblewrap behavior | local-only | Local doctor/preflight can warn on WSL1; WSL2/Linux remains the local replacement path. |
| exec-server filesystem sandboxing | local-only | Local app-server/exec-server handling stays separate from provider-worker `codex exec` supervision. |
| Remote exec environment policy | cloud-only | Cloud remote execution policy remains gated by cloud preflight and canary evidence. |
| Websocket token hash auth | local-only | Local app-server/control auth posture does not make `cloud` + `appserver` supported. |
| Pinned inputs | not applicable | Release/build hygiene only unless a future lane proves a CO preflight dependency. |
| `danger-full-access` behavior | local-only | Local policy must not rely on removed permissive behavior; do not weaken defaults to restore it. |
| `thread/shellCommand` sensitive unsandboxed surface | local-only | Keep it out of default provider-worker authority unless future cloud-bridge evidence changes the class. |
| MCP sandbox-state metadata | both | Local and cloud MCP servers can report sandbox state; CO may document or consume metadata without expanding tool authority. |

## Not Done If
- The parent implementation changes sandbox defaults without an explicit classification row and evidence.
- Local-only sandbox findings block cloud promotion by implication rather than by cloud evidence.
- Cloud-only preflight blockers are buried under generic "0.121 sandbox changed" wording.
- The final docs fail to distinguish policy denial, Guardian timeout, missing cloud env, and local platform sandbox behavior.
- CO-199 reopens credential/profile rotation, marketplace packaging, provider-worker appserver migration, or broad cloud runtime redesign.
- `docs/TASKS.md`, `tasks/index.json`, task mirrors, and docs freshness registry disagree on the CO-199 packet.

## Goals
- Register a CO-199 docs-first packet using the CO-195 packet structure.
- Preserve a classification matrix the parent lane can implement against.
- Keep implementation scope bounded to docs/policy/preflight interpretation and focused tests.
- Protect sandbox defaults and authority boundaries.

## Non-Goals
- Credential/profile rotation fixes.
- Sandbox default weakening.
- Broad cloud runtime redesign.
- Marketplace/plugin packaging adoption.
- MCP Apps metadata authority expansion.
- Provider-worker appserver migration.

## Stakeholders
- Product: CO operators deciding whether 0.121 sandbox/security deltas affect promotion posture.
- Engineering: CO runtime, cloud preflight, local preflight, app-server, MCP, review/delegation, and docs-hygiene maintainers.
- Design: Not applicable.

## Metrics & Guardrails
- Primary Success Metrics: classification matrix exists; parent implementation touches only scoped policy/docs/tests; cloud promotion remains gated by actual cloud evidence; local-only sandbox changes are not promoted to cloud blockers.
- Guardrails / Error Budgets: no sandbox weakening, no credential changes, no cloud runtime redesign, no authority expansion for MCP/app-server/thread command surfaces.

## User Experience
- Personas:
  - CO maintainer reading whether a 0.121 sandbox/security delta affects local or cloud readiness.
  - Provider-worker operator checking why a cloud preflight failed or was held.
  - Reviewer verifying the change did not convert a local platform fix into a cloud policy change.
- User Journeys:
  - Maintainer opens the CO-199 packet and sees the exact classification table.
  - Parent implementer updates the narrow policy surface and tests only the affected classes.
  - Reviewer confirms sandbox defaults stay unchanged while blocker messages become more precise.

## Technical Considerations
- Architectural Notes: parent implementation should prefer existing preflight/policy helpers and docs catalog checks. New abstractions are only justified if current local/cloud classification logic is duplicated or ambiguous.
- Dependencies / Integrations: official `openai/codex` `rust-v0.121.0` release notes (`https://github.com/openai/codex/releases/tag/rust-v0.121.0`), CO-195 adoption packet, `docs/guides/codex-version-policy.md`, cloud preflight wrapper, runtime/app-server policy docs, docs freshness registry.

## Assumptions
- Parent inspected the prompt-provided source-0 payload; it contains run metadata and prompt-pack provenance only, not additional sandbox/security classification rows. This packet uses the user prompt, CO-195 local packet, and official `rust-v0.121.0` release notes as source context.
- Parent lane owns Linear state, docs-review, implementation, validation, PR, and any evidence artifacts under `.runs/` or `out/`.

## Open Questions
- Which parent-owned source artifact should be treated as canonical for the detailed 0.121 sandbox/security delta list: the missing source-0 payload, official release notes, or CO-195 evidence bundle?
- Does any current cloud worker path actually consume the secure devcontainer profile or bubblewrap setup, or should that row stay advisory until cloud canary evidence exists?
- Does CO already surface MCP sandbox-state metadata anywhere parent implementation can reuse, or is this docs-only for now?

## Approvals
- Product: issue accepted via CO-199.
- Engineering: pending parent docs-review/implementation.
- Design: Not applicable.
