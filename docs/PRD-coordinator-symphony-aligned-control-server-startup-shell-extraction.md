# PRD - Coordinator Symphony-Aligned Control Server Startup Shell Extraction

## Summary

After `1082`, `ControlServer.start()` is down to one remaining top-level startup shell: it binds the HTTP server, derives the base URL, starts the bootstrap lifecycle, and closes on startup failure. This slice extracts that startup shell into one bounded helper so the main server method becomes a thinner composition entrypoint.

## Problem

`ControlServer.start()` still owns:
- server bind/listen error handling,
- base URL derivation,
- final bootstrap lifecycle start,
- close-on-startup-failure behavior.

That shell is now the next remaining cohesive concern after bootstrap collaborator assembly moved out in `1082`.

## Goals

- Extract the remaining startup shell from `ControlServer.start()` into one helper.
- Keep `ControlServer.start()` focused on top-level composition and final instance return.
- Preserve bind/listen behavior, base URL derivation, bootstrap startup, and failure cleanup exactly.

## Non-Goals

- Request-context/store seeding changes at the top of `ControlServer.start()`.
- Changes to `controlBootstrapAssembly.ts`.
- Route handling/controller changes.
- `close()` shutdown ordering changes.

## User Value

- Continues the Symphony-aligned thin-shell direction for `ControlServer`.
- Makes future startup hardening easier by isolating bind/listen plus bootstrap-start ownership behind one explicit seam.

## Acceptance Criteria

- One helper owns server bind/listen, base URL derivation, final `bootstrapLifecycle.start(...)`, and close-on-failure startup sequencing.
- `ControlServer.start()` delegates that startup shell while preserving current behavior and error handling.
- Focused regressions prove startup sequencing and failure cleanup remain unchanged.
