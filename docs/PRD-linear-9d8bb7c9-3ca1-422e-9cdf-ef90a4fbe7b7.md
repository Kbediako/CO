# PRD: CO-331 queue cap and follow-up admission truth

## Traceability

- Linear issue: `CO-331`
- Issue id: `9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Task id: `linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Registry id: `20260423-linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7`
- Source anchor: `ctx:sha256:baea476992e02ddae2d101831f55c08787b93c5aefb8b73b992a2ac1d788fabd#chunk:c000001`
- Declared manifest: `.runs/linear-9d8bb7c9-3ca1-422e-9cdf-ef90a4fbe7b7/cli/2026-04-23T08-13-32-404Z-6a3dbcd8/manifest.json`

## User Request Translation

Fix the live control-host queue contract where freshly created follow-up issues that were explicitly placed in `Backlog` can appear in `Ready` immediately afterward, while provider intake can track more active claims than `max_allowed`. The fix must keep Linear state, `provider-intake-state.json`, and `co-status` aligned about active issue identifiers and must not treat retrying or resumable work as harmless just because it is not currently `running`.

## Problem Statement

The queue currently has two linked failure modes. First, helper-created follow-up issues can leave `Backlog` through normal backlog promotion before an operator deliberately sequences them or completes the required traceability packet. Second, resumable claims and queued retry claims can survive refresh/recovery in a way that lets admission logic reason from an undercounted active set, so `co-status` can report more active issue identifiers than `max_allowed`.

The operator-facing result is queue drift: new follow-up issue admission is not deliberate, provider intake can overrun the cap during resumable/retry rehydration, and `co-status` evidence can disagree with the intended admission contract.

## Desired Outcome

- Newly created or explicitly backlogged follow-up issues remain in `Backlog` until a real queue policy promotes them.
- Provider admission treats resumable claims and queued retry claims as capacity-occupying work for `max_allowed`.
- `provider-intake-state.json` summary truth and `co-status` active issue identifiers stay aligned with the cap contract.
- Operator-facing evidence records when a `Backlog` follow-up is held or when capacity is exhausted by retry/resumable work.

## Protected Terms

- `Backlog`
- `Ready`
- `provider-intake-state.json`
- `co-status`
- `max_allowed`
- active issue identifiers
- resumable claims
- follow-up issue admission

## Wrong Interpretations To Reject

- This is not only the older `CO-317` remaining-ready backfill gap.
- This is not explained away by runtime/provider failures on `CO-329` or `CO-330`.
- Retry work still counts against queue truth; it is not acceptable because retries are not technically `running`.
- The fix must not rely on manually moving issues around instead of fixing queue truth.

## Non-Goals

- No weakening of admission caps to hide the mismatch.
- No broad scheduler rewrite.
- No reliance on manual control-host restarts as the primary fix.
- No implementation of the runtime failure content of `CO-329` or `CO-330`.

## Current / Reference / Target Parity Matrix

| Surface | Current Behavior | Reference Behavior | Target Behavior |
| --- | --- | --- | --- |
| `Backlog` follow-up issue admission | A helper-created follow-up in `Backlog` can be promoted to `Ready` as the next backlog head. | Follow-up packets say registry mirrors must be updated before the issue leaves `Backlog`. | Helper-created follow-ups remain held with explicit evidence until deliberate sequencing or packet completion. |
| Provider admission cap | Direct admission primarily counts starting/resuming/running rows and live run records. | `max_allowed` is a cap on active provider claims, not only live process count. | Resumable claims and queued retry claims occupy capacity before fresh admission. |
| `provider-intake-state.json` summary | Active claim projection can miss queued retry rows if the persisted state looks terminal. | Summary truth should match active queue pressure. | Active issue identifiers include retry/resumable capacity occupants used by admission. |
| `co-status` | Can report active issue identifiers above `max_allowed`. | Operator evidence must make over-cap pressure explicit and bounded. | Counts and reasons reflect cap exhaustion instead of silently admitting beyond the cap. |

## Acceptance Criteria

- Newly created or explicitly backlogged follow-up issues remain non-admitted until a real queue policy promotes them.
- Active provider claims never exceed configured `max_allowed`, even under resumable/retry rehydration.
- Regression coverage proves backlog/ready/admitted state stays aligned across Linear, provider intake, and `co-status`.
- Operator-facing evidence makes queue-cap or promotion drift explicit when it occurs.

## Not Done If

- Freshly created backlog follow-ups can still become `Ready` / active without deliberate sequencing.
- Active provider claims can still exceed `max_allowed` during resumable/retry rehydration.
- `co-status`, provider-intake state, and live Linear issue state can still disagree about which issues are truly active.
- The fix hides drift by weakening `max_allowed` or pruning audit history.
