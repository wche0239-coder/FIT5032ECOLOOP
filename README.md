# EcoLoop

A local circular-economy marketplace for GreenLoop Collective (Melbourne),
built for FIT5032 A1 as a Vue 3 multi-page web application.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build      # production build -> dist/
npm run preview    # preview the production build
```

Requires Node.js 18+.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — hero, how-it-works, about |
| `/browse` | Wireframe 1 — browse/filter/search listings, list & map view |
| `/post-item` | Wireframe 2 — two-step "Post an item" form |
| `/business` | Wireframe 3 — business bulk-upload dashboard |
| `/login`, `/signup` | Mock authentication (front-end only) |

## How the business requirements are met

**BR (A.1) — VueJS 3 with Composition API**
Every component uses `<script setup>` (the Composition API sugar syntax).
Shared reactive state lives in composables under `src/composables/`
(`useListings.js`, `useAuth.js`, `useLocalStorage.js`).

**BR (A.2) — Responsiveness**
Built on Bootstrap 5's grid and utility classes (`row`/`col-*`, `d-flex`,
breakpoint-prefixed classes) layered with custom CSS tokens in
`src/style.css`. Layouts collapse from a 3-column listing grid down to a
single column, and the nav becomes a hamburger menu, below the `lg`
breakpoint. Test by resizing the browser or using dev-tools device mode.

**BR (B.1) — Input validation (≥2 types)**
`src/utils/validators.js` implements five reusable validator types, used
across the Post Item, Business Dashboard, Login and Signup forms:
1. **Required** — presence checks
2. **Length** — minimum character counts (titles, descriptions, passwords)
3. **Format (regex)** — email shape validation
4. **Numeric / positive number or integer** — prices and bulk-upload quantities
5. **Equality** — signup password-confirmation matching

Errors are shown inline per field, on blur and on submit.

**BR (B.2) — Dynamic data from JS structures, persisted via localStorage**
`src/composables/useListings.js` holds one reactive `listings` array
(seeded from `src/data/seedListings.js`) that every page reads from and
writes to — the homepage stats, the browse grid, and everything posted
through "Post an item" or the business bulk-upload flow. `useLocalStorage.js`
wraps this state so it survives page reloads and new sessions, per the
assignment's Local Storage hint.

## Notes for markers

- The "map view" on `/browse` is a lightweight, dependency-free radial
  placement (no external map API/key required) — it visualises relative
  distance, not literal geography.
- Photo uploads on `/post-item` use `URL.createObjectURL` for local preview;
  since there is no backend, image files themselves aren't persisted to
  localStorage (only listing text data is).
- Authentication is a front-end mock (no server) for demonstration of
  validated forms and persisted session state only.
