# PRD - Coordinator Symphony-Aligned Control Server Seed Loading Extraction

## Summary

After `1085`, `ControlServer.start()` still owns the five JSON seed reads that hydrate the control runtime before seeded runtime assembly: `control`, `confirmations`, `questions`, `delegationTokens`, and `linearAdvisory`. This slice extracts that seed-loading cluster into one bounded helper so the server method becomes a thinner composition shell around token generation, seed loading, seeded runtime assembly, request shell creation, bootstrap assembly, startup sequencing, and ready-instance return.

## Problem

`ControlServer.start()` still mixes startup composition with direct seed-file I/O:
- reading `control.json`,
- reading `confirmations.json`,
- reading `questions.json`,
- reading `delegation-tokens.json`,
- reading `linear-advisory-state.json`.

That work is cohesive and transport-agnostic, but it still lives inline in the server method.

## Goals

- Extract the seed-loading block from `ControlServer.start()` into one bounded helper.
- Keep `ControlServer.start()` focused on token generation, seeded runtime assembly, request shell creation, bootstrap assembly, startup sequencing, and ready-instance return.
- Preserve current missing-file tolerance and JSON read behavior exactly.

## Non-Goals

- Changing token generation.
- Changing seeded runtime assembly from `1084`.
- Changing request-shell behavior from `1085`.
- Changing bootstrap assembly or startup sequencing.
- Changing route logic or shutdown ordering.

## User Value

- Continues the Symphony-aligned thin-shell direction for the control server.
- Isolates seed hydration so future runtime/store hardening can change startup inputs without reopening request transport or lifecycle code.

## Acceptance Criteria

- One helper owns reading the five control-server seed files before seeded runtime assembly.
- `ControlServer.start()` delegates that seed-loading block while preserving current missing-file tolerance and JSON parsing behavior.
- Focused regressions prove seed-loading behavior remains unchanged, including missing-file fallbacks and preserved loaded payload shape.
