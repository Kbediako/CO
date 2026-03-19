# 1147 Next Slice Note

After `1147`, the remaining mismatch is that the coordinator-owned facade still composes a Telegram-named read adapter underneath it. The next truthful seam is therefore a coordinator-owned oversight read service boundary that replaces `createControlTelegramReadAdapter(...)` inside the facade without reopening Telegram polling, state-store, env/config, or command-authority surfaces.

That follow-on should stay bounded to read assembly and naming/ownership alignment only. The Telegram bridge, runtime lifecycle, and broader control authority model do not need another forced refactor from this baseline.
