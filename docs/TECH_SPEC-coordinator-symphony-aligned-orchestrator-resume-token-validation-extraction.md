# TECH_SPEC: Coordinator Symphony-Aligned Orchestrator Resume Token Validation Extraction

- Date: 2026-03-15
- Owner: Codex (top-level agent)
- Task: `1199-coordinator-symphony-aligned-orchestrator-resume-token-validation-extraction`
- Status: Draft

## Background

`1195` extracted the `resume()` preparation shell and `1198` extracted the shared runtime-manifest mutation helper. The remaining truthful reusable seam in `orchestrator.ts` is the real `validateResumeToken(...)` behavior still injected into the extracted resume-preparation shell.

## Scope

- extract the real `validateResumeToken(...)` implementation from `orchestrator.ts` into one bounded helper under `orchestrator/src/cli/services/`
- move or delegate:
  - resume token file-read behavior
  - missing-token validation behavior
  - token mismatch validation behavior
- preserve exact error semantics and wiring for the existing resume-preparation shell contract

## Out of Scope

- runtime selection or runtime-manifest mutation behavior
- the resume pre-start failure persistence callback
- public `start()`, `resume()`, `status()`, or `plan()` shell behavior
- route-adapter, control-plane, or run-lifecycle orchestration

## Proposed Approach

1. Introduce one bounded resume-token validation helper under `orchestrator/src/cli/services/`.
2. Move the file-read and validation behavior out of `orchestrator.ts` into that helper.
3. Keep `orchestrator.ts` as the public entrypoint while delegating only the real resume-token validation contract.
4. Rewire the existing resume-preparation shell dependency surface to consume the extracted helper.
5. Add or adapt focused tests around missing-token, mismatch, and successful token validation behavior.

## Validation

- standard docs-first guards before implementation
- focused helper regressions during implementation:
  - token file-read behavior
  - missing-token rejection
  - mismatch rejection
  - successful validation path
- standard lane gate bundle plus explicit elegance review before closeout

## Risks

- changing resume-token error semantics would create resume behavior regressions
- widening into broader resume preparation or lifecycle work would break the bounded seam
- leaving the helper half-extracted would keep `orchestrator.ts` coupled to reusable file-I/O behavior
