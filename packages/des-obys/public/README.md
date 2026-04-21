# Des-Obys Mirror Assets

`packages/des-obys/public/` is rebuilt on demand and no historical snapshot is tracked in fresh checkouts after Task 0801 dead-code pruning.

- Regenerate fresh assets: `npm run mirror:fetch -- --project des-obys`
- Validate the rebuilt mirror: `npm run mirror:check -- --project des-obys`
- Serve locally: `npm run mirror:serve -- --project des-obys --port 4173`
