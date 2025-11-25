# Obys Library Clone

Pixel-perfect local clone of https://library.obys.agency for HiFi toolkit testing. All fonts, textures, images, and scripts are bundled in `public/` with analytics stripped.

## Run locally

1. `cd packages/obys-library`
2. `npm start` (shared mirror harness defaults to port 4173, honor `PORT`, CSP flag `MIRROR_CSP=self|strict|off`, and byte-range support for media)
3. Open `http://localhost:4173` and interact across About/Books/Credits/Contacts and all book detail pages. Canvas, GSAP, Three.js, drawing mode, draggable nav, and particle hover are fully functional.

## Structure

- `public/` — mirrored HTML for all routes (`/`, `/books`, `/credits`, `/contacts`, `/books/*`), assets, fonts, textures, manifests, and icons.
- `server.js` — ESM mirror server shared with the root harness (traversal guard, HTML no-cache, immutable assets, optional CSP, optional Range).
- `mirror.config.json` — origin/routes/rewrites used by the root mirror:fetch + mirror:check scripts.
- `package.json` — scripts for serving the site; no external dependencies required.

## Notes

- Google Analytics/gtag removed; no third-party trackers load.
- Manifest/icons and offline-safe assets are served locally, so the site runs without network access once fetched.
