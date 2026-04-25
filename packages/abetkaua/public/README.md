# Abetka Mirror Assets

`packages/abetkaua/public/` is rebuilt on demand and no historical snapshot is tracked in fresh checkouts after Task 0801 dead-code pruning.

- Regenerate fresh assets: `npm run mirror:fetch -- --project abetkaua`
- Validate the rebuilt mirror: `npm run mirror:check -- --project abetkaua`
- Serve locally: `npm run mirror:serve -- --project abetkaua --port 4173`
