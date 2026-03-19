# 1038 Next Slice Note

- `1038` removes the inline `/api/v1/*` controller concentration from `controlServer.ts`, but the server still directly owns the standalone `/ui/data.json` route while auth/session/webhook/control endpoints share the same entrypoint.
- The next useful Symphony-aligned gap is a bounded UI-route controller extraction for `/ui/data.json` so selected-run presentation keeps its current seams while `controlServer.ts` narrows further toward transport/auth wiring.
- That follow-on should keep `selectedRunPresenter.ts` as the payload builder, preserve Telegram and compatibility API behavior, and avoid broad auth/session/control refactors in the same slice.
