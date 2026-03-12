# 1124 Deliberation - Telegram Oversight Bridge Presenter/Controller Split

## Decision

Open the next lane as `1124-coordinator-symphony-aligned-telegram-oversight-bridge-presenter-controller-split`.

## Why This Slice

- After `1123`, there is no similarly sized remaining `ControlServer` seam that would be truthful to keep extracting.
- `telegramOversightBridge.ts` is now the largest remaining mixed operator surface in the coordinator control package.
- Earlier lanes already established the needed prerequisites:
  - Telegram read-adapter boundaries,
  - control-runtime/read-model seams,
  - bootstrap and lifecycle ownership splits.
- Real Symphony’s transport/controller shells stay thin and rely on dedicated presenter shaping; CO now has the same opportunity on the Telegram read side.

## Evidence

- CO scout: the post-`1123` high-signal seam is the Telegram oversight bridge presenter/controller split, not `controlRuntime`, `linearDispatchSource`, or another `ControlServer` helper.
- Symphony scout: `presenter.ex` owns snapshot shaping while controller shells remain thin; CO’s Telegram bridge still performs equivalent read-side shaping inline.
- Review scout: remaining standalone-review drift is no longer blocker-grade and can wait until after another product/runtime seam.

## Guardrails

- Keep `applyControlCommand(...)` in `telegramOversightBridge.ts`.
- Keep Telegram polling, sendMessage/getUpdates transport, bridge state persistence, and config parsing untouched.
- Do not widen into Linear provider work or another standalone-review lane in this slice.
