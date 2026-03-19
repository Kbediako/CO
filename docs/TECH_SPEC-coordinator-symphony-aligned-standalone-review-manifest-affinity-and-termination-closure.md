# TECH_SPEC - Coordinator Symphony-Aligned Standalone Review Manifest Affinity and Termination Closure

## Goal

Close the remaining standalone-review lifecycle gaps after `1066` by fixing manifest affinity and bounded termination closure without widening beyond the wrapper-owned surface.

## Scope

- Refine manifest/run resolution in `scripts/run-review.ts`.
- Keep artifact directory resolution aligned with the same resolved run lineage.
- Change bounded termination flow so timeout/stall/boundary failures wait for child closure before surfacing failure.
- Add targeted `tests/run-review.spec.ts` coverage for both seams.

## Design

### 1. Prefer active run lineage over raw newest-mtime manifest selection

The current fallback path resolves manifests by newest file mtime inside the task runs tree. That is too loose for stacked task lanes with multiple docs-review and implementation-gate manifests.

This slice should narrow the fallback order:

1. explicit `--manifest`
2. explicit env manifest (`MANIFEST` / `CODEX_ORCHESTRATOR_MANIFEST_PATH`)
3. active run-dir lineage when `CODEX_ORCHESTRATOR_RUN_DIR` is set and contains a sibling `manifest.json`
4. only then, task-scoped manifest discovery fallback

That keeps existing explicit controls authoritative while making the default fallback less error-prone.

### 2. Keep artifacts bound to the resolved run lineage

`prepareReviewArtifacts(...)` already writes under the resolved manifest/run dir. This slice should preserve that posture and ensure the same lineage choice feeds both the prompt/output artifacts and the evidence manifest reference.

### 3. Wait for child closure before bounded failure returns

`waitForChildExit(...)` currently calls `requestTermination(...)`, signals the child, and rejects immediately. That leaves a race where the wrapper exits while the child tree is still alive.

This slice should convert bounded termination into:

- request termination,
- arm kill escalation,
- wait for child `close`,
- then surface the bounded failure using the current runtime state.

The wrapper should remain thin; lifecycle ownership should stay concentrated inside the existing child-wait path rather than being split across ad hoc call sites.

## Constraints

- No redesign of pipeline-level process management.
- No widening into generic implementation-gate or full-suite lifecycle repair.
- No policy changes to bounded-review command classification beyond lifecycle correctness.

## Validation

- targeted `tests/run-review.spec.ts` cases for manifest affinity and deterministic termination closure
- standard build/lint/test/docs checks
- `pack:smoke`
