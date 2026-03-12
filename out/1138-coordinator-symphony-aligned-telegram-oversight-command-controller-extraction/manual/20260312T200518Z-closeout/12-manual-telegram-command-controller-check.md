# 1138 Manual Telegram Command Controller Check

- Verified `orchestrator/src/cli/control/controlTelegramCommandController.ts` now exposes only `dispatchMutatingCommand(...)` and returns `null` for non-mutating commands, so the extracted seam is limited to `/pause` and `/resume`.
- Verified `orchestrator/src/cli/control/telegramOversightBridge.ts` still owns:
  - message/chat admission,
  - authorized-chat filtering,
  - plain-text `Use /help for available commands.`,
  - slash-command normalization,
  - read-controller dispatch,
  - unknown-command fallback,
  - reply send-path ownership.
- Verified the focused final-tree Telegram regressions in `05-targeted-tests.log` passed `17/17`, including the extracted mutating helper tests and the unchanged bridge integration path.
- Verified the final full suite in `06-test.log` passed `195/195` files and `1422/1422` tests.
- Verified the forced bounded review in `10-review.log` returned a no-findings verdict after staying on the changed Telegram surface and nearby tests.
