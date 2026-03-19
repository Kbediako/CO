# PRD: Coordinator Linear and Telegram Provider Setup and Smoke Testing

## Summary

With the local Symphony-alignment wrapper work exhausted, the next turn should move into provider setup and smoke testing for Linear and Telegram.

## Problem

The repo is approaching the point where architecture alignment is no longer the blocker. The next risk is provider-side setup quality: credentials, enablement flags, bootstrap wiring, and operator-facing smoke evidence for Linear and Telegram.

## Goal

Prepare a bounded next-turn lane for provider setup and smoke testing so the user can validate Linear and Telegram with minimal ceremony.

## Non-Goals

- reopening completed Symphony shell slices
- broad refactors across control-runtime internals before provider setup is exercised
- changing provider behavior without setup or smoke evidence

## Success Criteria

- the next turn has a registered docs-first packet for Linear and Telegram provider setup/testing
- the lane is explicitly scoped to auth/config/bootstrap checks plus bounded smoke validation
- setup/testing can begin immediately in the following turn
