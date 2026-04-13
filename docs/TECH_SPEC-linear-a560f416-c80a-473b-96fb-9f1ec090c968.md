---
id: 20260414-linear-a560f416-c80a-473b-96fb-9f1ec090c968
title: CO: keep provider-worker handoff manifests truthful when guardrail summaries fail
relates_to: docs/PRD-linear-a560f416-c80a-473b-96fb-9f1ec090c968.md
risk: high
last_review: 2026-04-14
---
Contract/design/boundaries: provider-worker finalization must distinguish the primary `provider-linear-worker` outcome from secondary post-handoff cleanup, Linear refresh, and post-handoff guardrail-summary collection errors. If the worker has already reached a successful handoff/merge or terminal successful issue outcome, `final manifest status` remains successful and `final manifest summary` must lead with that primary outcome, not only `Guardrails: spec-guard command not found`. Guardrail-summary collection failures must still be recorded in an auditable manifest field or sidecar artifact. This lane does not disable `spec-guard`, skip guardrail collection, weaken delegation guard, reopen CO-54 temp-workspace fixture scope, transition unrelated active issues such as CO-92 or CO-94, or suppress real Linear/refresh/API errors without evidence.

Not done if: finalization lets secondary guardrail-summary collection overwrite a primary successful outcome; successful handoff/merge summaries are only or primarily `Guardrails: spec-guard command not found`; secondary cleanup, refresh, or guardrail-summary errors lack machine-checkable evidence; or the fix is only a documentation waiver.
