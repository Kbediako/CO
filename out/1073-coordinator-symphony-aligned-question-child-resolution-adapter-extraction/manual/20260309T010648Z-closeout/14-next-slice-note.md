# Next Slice Note

The next bounded Symphony-aligned lane should stay on autonomous question-coordination internals, not provider/channel polish.

Recommended next slice: isolate and harden question-read resolution sequencing so freshly expired child questions are not immediately re-queued for a second resolution attempt during `GET /questions`.

Why this seam is next:
- the current `expireQuestions(...)` then `list()` then `queueQuestionResolutions(...)` flow in [`controlServer.ts`](../../../../../../orchestrator/src/cli/control/controlServer.ts) still produces the noisy late `fetch failed` logs visible in [`05b-targeted-tests.log`](./05b-targeted-tests.log) for expired-question paths;
- it is a core autonomous child-run coordination issue, not a Telegram/Linear surface concern;
- it naturally complements the completed `1073` adapter extraction by separating read-side projection from follow-up child-resolution scheduling.

Keep out of scope for that slice:
- Telegram/provider-specific rendering changes,
- broad question controller extraction,
- generic queue/event abstractions.
