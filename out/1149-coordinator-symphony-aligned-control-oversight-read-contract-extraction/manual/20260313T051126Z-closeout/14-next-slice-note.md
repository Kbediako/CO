# Next Slice Note

`1149` removed Telegram ownership of the read contract, but `controlTelegramBridgeLifecycle.ts` still depends on the aggregate `ControlOversightFacade` shape, which mixes the neutral read contract with the runtime subscription hook used for projection updates.

The next truthful Symphony-aligned seam is to extract that remaining coordinator-owned subscription/update contract so Telegram lifecycle wiring can consume a neutral oversight port instead of a facade-specific type.

That follow-on should stay bounded:

- move only the `subscribe(...)` / update-side contract boundary out of the facade-specific surface
- keep Telegram bridge runtime lifecycle, polling, and projection-delivery behavior unchanged
- avoid reopening read payloads, read-controller presentation, or broader `controlServer` seams in the same lane
