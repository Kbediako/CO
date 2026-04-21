# Eminente Mirror Assets

`packages/eminente/public/` is rebuilt on demand and no historical snapshot is tracked in fresh checkouts after Task 0801 dead-code pruning.

- Regenerate fresh assets: `npm run mirror:fetch -- --project eminente`
- Validate the rebuilt mirror: `npm run mirror:check -- --project eminente`
- Serve locally: `npm run mirror:serve -- --project eminente --port 4173`
