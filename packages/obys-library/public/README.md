# Obys Library Assets

`packages/obys-library/public/` is rebuilt on demand and no historical snapshot is tracked in fresh checkouts after Task 0801 dead-code pruning.

- Regenerate fresh assets: `npm run mirror:fetch -- --project obys-library`
- Validate the rebuilt mirror: `npm run mirror:check -- --project obys-library`
- Serve locally: `npm run mirror:serve -- --project obys-library --port 4173`
