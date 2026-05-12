# PRD - Coordinator Symphony-Aligned Question-Read Retry Deduplication

## Summary

After `1073`, both the authenticated `GET /questions` route and the Telegram oversight question-read surface still run the same fragile sequence: expire queued questions, list the queue, then requeue child-resolution follow-ups for every non-queued record in the post-expiry snapshot. That means freshly expired child questions can be resolved once during expiry and then immediately retried a second time during the same read.

This slice hardens that shared question-read seam so read surfaces keep current question visibility while deduplicating same-request child-resolution retries.

## Problem

The current question-read flow still allows this sequence:
- expiry closes queued questions whose `expires_at` has elapsed,
- expiry immediately resolves those child runs,
- the post-expiry question list includes the freshly expired records,
- read-side follow-up scheduling requeues those records again because they are now non-`queued`.

That creates noisy late `fetch failed` logs on already-handled expired questions and blurs the boundary between read-time projection and legitimate retry scheduling.

## Goals

- Deduplicate same-request child-resolution retries for freshly expired questions on question-read surfaces.
- Keep the authenticated `GET /questions` route and Telegram oversight `readQuestions()` behavior aligned.
- Preserve retries for records that were already answered, dismissed, or expired before the read began.
- Keep the fix bounded to the question-read seam.

## Non-Goals

- Reworking `controlExpiryLifecycle.ts`.
- Rewriting `questionChildResolutionAdapter.ts`.
- Broad Telegram bridge refactors or rendering changes.
- New queue abstractions or generic orchestration containers.

## User Value

- Removes noisy duplicate child-resolution attempts from CO’s autonomous question-coordination core.
- Keeps question-read behavior aligned across API and Telegram operator surfaces.
- Moves CO closer to a hardened Symphony-like controller shape where reads do not accidentally perform repeated side effects.

## Acceptance Criteria

- Freshly expired questions are resolved exactly once per read request.
- Existing already-closed questions remain eligible for retry scheduling during question reads.
- The authenticated `/questions` route and Telegram oversight `readQuestions()` share the same deduplication semantics.
- Focused regressions cover both the route seam and the Telegram oversight read seam.
