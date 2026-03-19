# Next Slice Note

`1148` completed the read-service ownership extraction, but it did not extract the read contract itself out of Telegram ownership. The remaining truthful Symphony-aligned seam is to move the three-read-method contract and payload types out of `telegramOversightBridge.ts` into a coordinator-owned oversight contract file, then have the Telegram bridge consume that neutral contract.

That follow-on should stay bounded:

- move `TelegramOversightReadAdapter` and the related payload typings behind a coordinator-owned oversight contract
- keep bridge runtime lifecycle, poll/update ownership, and projection delivery behavior unchanged
- avoid reopening dispatch/question helper semantics or introducing non-Telegram consumers in the same lane
