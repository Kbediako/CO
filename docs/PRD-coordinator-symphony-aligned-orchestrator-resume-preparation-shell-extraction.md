# PRD: Coordinator Symphony-Aligned Orchestrator Resume Preparation Shell Extraction

## Summary

After `1194` extracted the `start()` preparation shell, the next truthful seam is the remaining `resume()` preparation shell before the existing control-plane lifecycle handoff.

## Problem

`orchestrator/src/cli/orchestrator.ts` still owns a cohesive `resume()` preparation cluster:

- manifest load plus task-environment override
- repo/user config resolution and resume pipeline selection
- resume-token validation plus resume-event/reset/heartbeat mutation
- `prepareRun(...)` for resume
- config-notice append-if-missing
- runtime-mode resolution with manifest preference
- `plan_target_id` refresh
- `ManifestPersister` construction and initial schedule

That keeps the public orchestrator entrypoint responsible for one remaining non-trivial bootstrap shell even though `start()` and the downstream lifecycle shells are already bounded.

## Goal

Extract the `resume()` preparation shell into one bounded helper while preserving resume behavior and keeping broader public orchestrator ownership intact.

## Non-Goals

- changing the `start()` preparation shell from `1194`
- changing control-plane lifecycle shell behavior
- changing the inline `resume` pre-start failure callback or `resume-pre-start-failed` persistence contract
- changing run-lifecycle orchestration behavior
- changing status/plan flows
- changing manifest, persistence, or runtime-mode semantics

## Success Criteria

- one bounded helper owns the `resume()` preparation shell before the control-plane handoff
- `orchestrator.ts` no longer directly owns the inline resume bootstrap preparation cluster
- focused regressions preserve resume bootstrap, manifest/runtime-mode setup, pre-start persistence, and lifecycle handoff behavior
