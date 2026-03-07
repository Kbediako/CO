# Recommended Next Slice

- Recommended next bounded seam: extract the inline `/questions*` route cluster from `orchestrator/src/cli/control/controlServer.ts` into a dedicated questions controller.
- Rationale: `/questions`, `/questions/enqueue`, `/questions/answer`, `/questions/dismiss`, and `/questions/:id` already form a cohesive route family around `QuestionQueue`, and they are the next smallest remaining inline controller surface after `/events`.
- Keep ownership boundaries tight in that follow-on slice: `controlServer.ts` should retain auth/CSRF ordering, route selection, runtime publish hooks, and Telegram projection signaling, while the new controller owns only request parsing and response shaping for the question endpoints.
