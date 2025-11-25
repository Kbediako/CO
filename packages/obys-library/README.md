# Obys Library Clone

Pixel-perfect local clone of https://library.obys.agency for HiFi toolkit testing. All fonts, textures, images, and scripts are bundled in `public/` with analytics stripped.

## Run locally

1. `cd packages/obys-library`
2. `npm start` (uses the built-in static server on port 4173; override with `PORT=5000 npm start`)
3. Open `http://localhost:4173` and interact across About/Books/Credits/Contacts and all book detail pages. Canvas, GSAP, Three.js, drawing mode, draggable nav, and particle hover are fully functional.

## Structure

- `public/` — mirrored HTML for all routes (`/`, `/books`, `/credits`, `/contacts`, `/books/*`), assets, fonts, textures, manifests, and icons.
- `server.js` — minimal static file server with long-term caching for hashed assets and no-cache for HTML.
- `package.json` — scripts for serving the site; no external dependencies required.

## Notes

- Google Analytics/gtag removed; no third-party trackers load.
- Manifest/icons and offline-safe assets are served locally, so the site runs without network access once fetched.
