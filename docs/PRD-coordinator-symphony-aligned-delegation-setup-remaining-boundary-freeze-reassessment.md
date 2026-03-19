# PRD - Coordinator Symphony-Aligned Delegation Setup Remaining Boundary Freeze Reassessment

## Objective

Reassess the remaining `delegationSetup.ts` ownership after `1244` extracted fallback config parsing, and confirm whether another truthful follow-on seam exists or whether the local delegation-setup pocket should freeze.

## Problem Statement

`1244` removed the parser cluster from `delegationSetup.ts`, but the file still owns top-level readiness orchestration, CLI probe handling, command preview wiring, and the apply/remove/add flow. We need to verify that this remaining surface is still mixed ownership before opening another implementation slice.

## In Scope

- Read-only reassessment of `orchestrator/src/cli/delegationSetup.ts` and nearby helpers/tests.
- Confirmation of either `freeze` or one bounded next seam.
- Docs-first registration and closeout evidence only unless a real mixed-ownership seam is confirmed.

## Out of Scope

- New delegation setup behavior changes.
- Broader doctor/devtools/control extraction work.
- Cloud, Telegram, or Linear provider setup.
