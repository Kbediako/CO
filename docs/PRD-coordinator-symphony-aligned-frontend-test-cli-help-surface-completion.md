# PRD: Coordinator Symphony-Aligned Frontend-Test CLI Help Surface Completion

## Summary

After `1299` confirmed that the remaining frontend-test seam is subcommand-help handling, the next truthful nearby move is a bounded help-surface completion lane for `frontend-test`.

## Problem

The binary help surface documents `frontend-test`, but live `frontend-test --help` probing still falls through into execution instead of returning help. That leaves frontend-test unlike its neighboring CLI wrappers and keeps the remaining local pocket from freezing honestly.

## Goal

Add the missing frontend-test subcommand help handling and focused parity so the local wrapper can freeze truthfully afterward.

## Non-Goals

- changing lower frontend-testing pipeline behavior
- reopening the already-extracted request shell
- widening into unrelated CLI families

## Success Criteria

- `frontend-test --help` and `frontend-test help` return bounded help output instead of entering pipeline execution
- the binary wrapper matches the thin parse/help/handoff posture used by neighboring CLI surfaces
- focused parity proves the help path without regressing existing frontend-test behavior
