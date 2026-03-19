# 1045 Next Slice Note

- Recommended next seam: the inline confirmation nonce issue and consume routes in `orchestrator/src/cli/control/controlServer.ts`.
- Why they are next: after extracting `/api/v1/*`, `/ui/data.json`, `/auth/session`, `/integrations/linear/webhook`, `/events`, `/questions*`, `/security/violation`, and `/delegation/register`, the confirmation issue and consume branches are the next smallest cohesive HTTP adapter boundary before the harder `/confirmations/validate` and `/control/action` authority paths.
- Keep in `controlServer.ts`: top-level route ordering, auth and runner-only gating, broader control-plane policy, shared expiry/background hooks, and the remaining `/confirmations/validate` plus `/control/action` authority logic.
- Candidate task slug: `1046-coordinator-symphony-aligned-confirmation-issue-consume-controller-extraction`.
