# PRD: Coordinator Symphony-Aligned Orchestrator Start Preparation Shell Extraction

## Summary

After `1193` extracted the private control-plane lifecycle envelope, the next truthful seam is the remaining `start()` preparation shell before the control-plane handoff.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a cohesive `start()` preparation cluster:

- `prepareRun(...)`
- `generateRunId()`
- runtime-mode resolution
- `bootstrapManifest(...)`
- initial runtime-mode / summary application
- `ManifestPersister` construction

That keeps the public orchestrator entrypoint responsible for a non-trivial bootstrap shell even though route-entry, run-lifecycle orchestration, and control-plane lifecycle handling have already been split into bounded helpers.

## Goal

Extract the `start()` preparation shell into one bounded helper while preserving startup behavior and keeping broader public orchestrator ownership intact.

## Non-Goals

- changing `resume()` preparation or resume-token handling
- changing control-plane lifecycle shell behavior from `1193`
- changing run-lifecycle orchestration behavior
- changing routing or execution-mode policy helpers
- changing manifest, persistence, or runtime-mode semantics

## Success Criteria

- one bounded helper owns the `start()` preparation shell before the control-plane handoff
- `orchestrator.ts` no longer directly owns the manifest/bootstrap preparation cluster for `start()`
- focused regressions preserve `start()` bootstrap, manifest/runtime-mode setup, and lifecycle handoff behavior
