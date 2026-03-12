# 1141 Elegance Review

- The final shape is the smallest truthful cut for this seam:
  - the controller now depends only on push-local state and returns only a bridge-applied patch,
  - the push-state helper no longer leaks full bridge-state shape,
  - the bridge keeps the only remaining full-state responsibilities.
- I rejected broader alternatives:
  - no new Telegram-specific patch type beyond the existing bridge-state `Pick`,
  - no queue/lifecycle refactor,
  - no transport/read-controller redesign.
- The only extra refinement beyond the initial contract narrowing was the bridge-side monotonic `updated_at` merge. That was worth keeping because it fixes a real metadata-ownership edge without widening the slice.
