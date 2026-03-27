# PRD - CO Evaluate DNS-aware Runtime-Proof Reviewer Reachability Checks

## Added by Bootstrap 2026-03-27

## Traceability
- Linear issue: `CO-23` / `da290822-55a2-4794-8caa-3a6f1d9c3eff`
- Linear URL: https://linear.app/asabeko/issue/CO-23/co-evaluate-dns-aware-runtime-proof-reviewer-reachability-checks

## Summary
- Problem Statement: the CO-8 runtime-proof helper design is permit-gated and deterministic by default. It rejects obviously local or non-public reviewer proof URLs through explicit blocked-hostname/IP rules, but it does not resolve DNS. That leaves an evaluation gap for split-horizon DNS, wildcard mappers, or other hostnames that look public syntactically while resolving to worker-local or otherwise non-reviewable addresses.
- Desired Outcome: current `main` keeps the bounded CO-8 runtime-proof helper baseline now present upstream, while the CO-23 slice decides and documents whether DNS-aware reviewer reachability belongs in the handoff contract. If adopted, the DNS-aware behavior must be explicit opt-in and must not weaken the deterministic default path.

## User Request Translation (Context Anchor)
- User intent / needs (in your own words): complete Linear issue `CO-23` by evaluating DNS-aware reviewer reachability for runtime-proof handoff, keeping the default path deterministic and auditable, and only adding live DNS checks behind an explicit fail-closed opt-in contract.
- Success criteria / acceptance:
  - decide whether DNS resolution belongs in the runtime-proof handoff contract or stays out of scope for the default path
  - if DNS-aware validation is adopted, define behavior for offline workers, DNS failures, split-horizon results, and reviewer-reachability semantics before implementation
  - any implementation keeps the default runtime-proof path deterministic and auditable from checked-in permit data unless the operator explicitly opts into the runtime check
  - docs and tests cover the chosen posture, including DNS lookup failures and non-public resolutions
- Constraints / non-goals:
  - do not make the default runtime-proof path environment-dependent
  - do not present worker-local DNS results as a global proof that every reviewer will resolve the same host
  - stay bounded to the runtime-proof CLI/helper/prompt/docs/test seam rather than widening into general network probing

## Goals
- Build on the CO-8 runtime-proof helper baseline now present on current `main`.
- Preserve the deterministic permit-backed default path for runtime-proof policy and baseline reviewer URL validation.
- Decide whether an explicit opt-in DNS-aware reviewer reachability mode is appropriate, and if so implement it with fail-closed behavior and explicit caveats.
- Surface the contract clearly in CLI help, worker guidance, docs, and structured output.
- Cover deterministic and DNS-aware behavior with focused tests.

## Non-Goals
- Replacing permit policy with live network reachability checks.
- Making runtime-proof success depend on DNS/network availability by default.
- Guaranteeing universal reviewer reachability across split-horizon, rebinding, CDN, or future DNS changes.

## Stakeholders
- Product: CO operator / Linear worker owner
- Engineering: Codex
- Design: N/A

## Metrics & Guardrails
- Primary Success Metrics:
  - workers have one explicit runtime-proof helper path on current `main`
  - default helper behavior remains deterministic and auditable from checked-in permit data plus explicit blocked-host/IP rules
  - DNS-aware validation, if present, is explicit opt-in and fails closed on ambiguity or resolver failure
- Guardrails / Error Budgets:
  - no hidden network dependency in the default path
  - no success verdict when worker-local DNS returns non-public or mixed public/private answers
  - no contract wording that overclaims reviewer reachability beyond worker-local DNS evidence

## User Experience
- Personas: provider worker preparing review handoff; reviewer expecting truthful runtime proof; operator auditing permit and handoff behavior
- User Journeys:
  - worker inspects permit posture and deterministic runtime-proof readiness without requiring network access
  - worker opts into DNS-aware validation when they want an extra worker-local public-resolution check before handoff
  - worker receives a fail-closed error when DNS is unavailable, lookup fails, or the hostname resolves to non-public space

## Technical Considerations
- Architectural Notes:
  - current `main` already contains the CO-8 runtime-proof helper baseline from PR `#308`
  - CO-23 should extend that existing helper only where needed for the explicit reviewer-reachability contract
  - the evaluated surface belongs under the worker-visible Linear CLI/helper path rather than a separate subsystem
- Dependencies / Integrations:
  - `bin/codex-orchestrator.ts`
  - `orchestrator/src/cli/linearCliShell.ts`
  - `orchestrator/src/cli/providerLinearWorkerRunner.ts`
  - the existing runtime-proof helper under `orchestrator/src/cli/control/providerLinearRuntimeProof.ts`
  - `scripts/design/pipeline/permit.js`
  - Node DNS APIs for the explicit opt-in mode only

## Open Questions
- Should the opt-in mode be exposed as `--reachability-mode dns-public` or a narrower equivalent? The interface should make it obvious that the check is worker-local DNS public-resolution validation, not an authoritative reviewer guarantee.

## Approvals
- Product: Self-approved from the Linear issue scope and acceptance criteria
- Engineering: Pending docs-review plus implementation validation
- Design: N/A

## Manifest Evidence
- Baseline audit: `out/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff/manual/20260327T075424Z-baseline-audit.md`
