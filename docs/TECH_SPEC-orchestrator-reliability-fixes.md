# Technical Spec — Orchestrator Reliability Fixes (Task 0902)

## Objective
Apply minimal code changes to resolve the nine reliability issues validated in Task 0901, with regression tests and guardrail evidence.

## Fixes
1. **Sub‑pipeline errors finalize parent manifest**
   - File: `orchestrator/src/cli/orchestrator.ts`
   - Approach: Wrap sub‑pipeline `this.start()` call in try/catch, mark parent entry failed/skipped, emit `stageCompleted`, and ensure manifest status/detail is finalized.
   - Tests: Add unit coverage around orchestrator stage finalization on thrown sub‑pipeline.

2. **CLI exec passes unified exec args**
   - File: `orchestrator/src/cli/services/execRuntime.ts`
   - Approach: Forward `request.args` through `spawn` (non‑shell) or concatenate safely when `shell: true` is required.
   - Tests: Unit test via `UnifiedExecRunner` ensuring args are observed.

3. **Session reuse honors env overrides**
   - File: `packages/orchestrator/src/exec/session-manager.ts`
   - Approach: On reuse, update stored `envSnapshot` (or explicitly reject mutable overrides). Chosen path: apply latest overrides and update snapshot.
   - Tests: Persistent session reuse test showing env changes take effect.

4. **Retry defaults resist `undefined` overrides**
   - Files: `orchestrator/src/persistence/TaskStateStore.ts`, `orchestrator/src/persistence/ExperienceStore.ts`
   - Approach: Merge retry options field‑wise, ignoring `undefined` values so defaults stand.
   - Tests: Unit tests passing partial retry configs with `undefined` fields.

5. **`isIsoDate` strict ISO‑8601**
   - File: `packages/shared/manifest/artifactUtils.ts`
   - Approach: Validate against strict ISO‑8601 date/time format and ensure round‑trip via `Date.toISOString()` matches input.
   - Tests: Unit tests for accepted/rejected examples; update strict callers if needed.

6. **Instruction loader warns on unstamped optional files**
   - File: `packages/orchestrator/src/instructions/loader.ts`
   - Approach: Treat missing/invalid stamp as warning and skip, except for required root `AGENTS.md` which remains strict.
   - Tests: Fixture/unit test verifying behavior for unstamped optional candidates.

7. **Cross‑platform timeout termination**
   - File: `evaluation/harness/index.ts`
   - Approach: Use `SIGTERM` first, fallback to `SIGKILL` on non‑Windows or after grace period; avoid invalid signals on Windows.
   - Tests: Unit test simulating timeout path on win32 and non‑win32.

8. **Temp dirs cleaned on success/failure**
   - Files: `orchestrator/src/learning/crystalizer.ts`, `packages/sdk-node/src/orchestrator.ts`
   - Approach: Add try/finally cleanup (`rm(..., { recursive:true, force:true })`) for temp work dirs/artifact roots.
   - Tests: Unit tests verifying cleanup functions invoked.

9. **ESLint plugin has no implicit build**
   - File: `eslint-plugin-patterns/index.cjs`
   - Approach: Remove auto‑build. If artifacts missing/outdated, throw actionable error instructing to run `npm run build:patterns` explicitly.
   - Tests: Node unit test verifying plugin load does not invoke build.

## Testing Strategy
- Update/extend Vitest suites adjacent to each fix location.
- Run full guardrails: `node scripts/spec-guard.mjs --dry-run`, `npm run lint`, `npm run test`.

## Evidence
- Diagnostics manifest: `.runs/0902-orchestrator-reliability-fixes/cli/2025-12-12T02-34-20-318Z-847a8138/manifest.json`.
