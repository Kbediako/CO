---
id: 20260327-linear-da290822-55a2-4794-8caa-3a6f1d9c3eff
title: CO Evaluate DNS-aware Runtime-Proof Reviewer Reachability Checks
relates_to: docs/PRD-linear-da290822-55a2-4794-8caa-3a6f1d9c3eff.md
risk: high
owners:
  - Codex
last_review: 2026-04-27
---

## Canonical Reference
- Canonical TECH_SPEC: `tasks/specs/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff.md`
- PRD: `docs/PRD-linear-da290822-55a2-4794-8caa-3a6f1d9c3eff.md`
- ACTION_PLAN: `docs/ACTION_PLAN-linear-da290822-55a2-4794-8caa-3a6f1d9c3eff.md`
- Task checklist: `tasks/tasks-linear-da290822-55a2-4794-8caa-3a6f1d9c3eff.md`

## Traceability
- Linear issue: `CO-23` / `da290822-55a2-4794-8caa-3a6f1d9c3eff`
- Linear URL: https://linear.app/asabeko/issue/CO-23/co-evaluate-dns-aware-runtime-proof-reviewer-reachability-checks

## Summary
- Objective: build on the runtime-proof helper baseline now present on current `main`, keep the default handoff path deterministic, and add an explicit opt-in DNS-aware reachability check only if the contract remains honest and fail closed.
- Scope:
  - extend the existing CO-8 `linear runtime-proof` helper surface already present on current `main`
  - preserve deterministic permit-backed policy and blocked-host/IP validation as the default path
  - add an explicit opt-in `--reachability-mode` contract for worker-local DNS public-resolution checks
  - update prompt/help/docs/tests for the clarified posture
- Constraints:
  - default behavior must not require network or DNS availability
  - DNS-aware mode must not claim to prove universal reviewer reachability
  - fail closed on DNS ambiguity, offline workers, lookup failure, zero answers, or any non-public answer

## Technical Requirements
- Functional requirements:
  - `linear runtime-proof` must remain usable with deterministic validation only when `--reachability-mode` is omitted
  - the default mode must continue to derive policy from checked-in permit data and explicit blocked hostname/IP heuristics only
  - when `--reachability-mode dns-public` is selected, hostname-based proof URLs must be resolved through the worker-local resolver and all resolved answers must be public for the check to pass
  - DNS-aware failures must be explicit and machine-readable
  - successful DNS-aware output must carry a caveat that the result is worker-local DNS evidence, not a universal reviewer guarantee
- Non-functional requirements:
  - deterministic mode stays auditable and hermetic relative to checked-in permit data
  - DNS-aware mode remains bounded to one URL lookup path and does not widen into active network probing beyond name resolution
  - output remains script-friendly JSON plus the existing workpad/PR markdown handoff content
- Interfaces / contracts:
  - CLI surface: add `--reachability-mode <deterministic|dns-public>` to `linear runtime-proof`
  - structured output: include reachability metadata describing the mode, whether DNS ran, and the caveat scope
  - worker prompt/help/docs: document default deterministic posture and the explicit DNS-aware opt-in semantics

## Architecture & Data
- Architecture / design adjustments:
  - extend the existing CO-8 runtime-proof helper and supporting CLI/audit wiring already present on current `main`
  - encapsulate URL reviewer-reachability validation behind a small helper that can run deterministic-only or DNS-aware mode
  - use Node DNS lookup in opt-in mode only, requesting all answers so mixed public/private results fail closed
- Data model changes / migrations:
  - add reachability metadata to the runtime-proof result payload
  - no permit schema change is required for CO-23; permit policy remains the authority for proof kinds, while DNS-aware validation only evaluates the reviewer proof URL when explicitly requested
- External dependencies / integrations:
  - `scripts/design/pipeline/permit.js`
  - Node `dns.promises.lookup`
  - provider-worker prompt/help surfaces

## Contract Decision
- Default mode:
  - Name: `deterministic`
  - Behavior: validate permit posture, normalize the proof URL, reject credentials/local paths/non-http(s), and block explicit loopback/reserved/non-public hostname and IP patterns without live DNS resolution
  - Reason: this preserves the CO-8 fail-closed contract while keeping the default path deterministic, offline-capable, and auditable from checked-in data plus explicit code rules
- Opt-in mode:
  - Name: `dns-public`
  - Behavior: after deterministic validation succeeds, resolve the hostname with the worker-local resolver and require every returned address to be public; IP literals skip DNS and are evaluated by the existing literal-IP rules
  - Failure modes:
    - offline / resolver failure / `ENOTFOUND` / `EAI_AGAIN` / zero answers: fail closed
    - any non-public answer: fail closed
    - mixed public/private answers: fail closed
  - Caveat: a pass means "worker-local DNS currently resolves only to public addresses"; it does not prove that all reviewers, networks, or future resolutions will reach the same host
- Split-horizon semantics:
  - Worker-local private answers remain a failure in `dns-public` mode even if some other environment might resolve publicly
  - this is intentional because the opt-in mode is a worker-local runtime signal, not a canonical replacement for the deterministic default

## Validation Plan
- Tests / checks:
  - docs-review on the CO-23 task packet before implementation
  - focused unit tests for deterministic behavior, DNS-public success, DNS failure, zero-answer failure, mixed/non-public answer failure, and IP-literal behavior
  - CLI/help/prompt coverage for the new mode
  - required repo validation floor after implementation
- Rollout verification:
  - confirm deterministic mode still works without DNS stubs or network dependencies
  - confirm `dns-public` mode rejects resolver failures and mixed/private answers
  - confirm the JSON payload and docs include the worker-local caveat
- Monitoring / alerts:
  - retain runtime-proof helper audit entries
  - use the Linear workpad as the operator-facing status surface

## Payload Notes
- The success payload keeps `resolved_addresses` explicit. Deterministic mode returns an empty list because no DNS lookup runs; `dns-public` returns the worker-local resolved addresses that were checked and accepted so operators can audit exactly what the reachability decision used.

## Approvals
- Reviewer: delegated docs-review guard stages passed; forced review stage drifted, so manual pre-implementation approval is recorded with an override note
- Date: 2026-03-27

## Manifest Evidence
- Baseline audit: `out/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff/manual/20260327T075424Z-baseline-audit.md`
- Docs review manifest: `.runs/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff-docs-review/cli/2026-03-27T07-59-26-687Z-b3902cf6/manifest.json`
- Docs review override: `out/linear-da290822-55a2-4794-8caa-3a6f1d9c3eff/manual/20260327T080637Z-docs-first/05-docs-review-override.md`
