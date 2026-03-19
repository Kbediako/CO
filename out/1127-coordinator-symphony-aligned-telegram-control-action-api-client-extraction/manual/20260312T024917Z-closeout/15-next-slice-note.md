# 1127 Next Slice Note

- The next review-reliability slice should be the explicit architecture-surface boundary recommended by the bounded scout: add a third `architecture` review surface, keep `diff` strictly bounded, keep `audit` checklist/evidence-focused, and stop treating history-style `git show rev:path` probes as normal diff startup anchors.
- On the Telegram/Symphony side, `telegramOversightBridge.ts` is now down to the polling/update lifecycle plus the remaining command-handling shell (`handleUpdate`, `dispatchCommand`, `applyControlCommand`). The next Telegram thinning slice should start with a bounded scout across that remaining cluster rather than assume a broader extraction up front.
