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
| `/browse` | Wireframe 1 — browse/filter/search listings, list & map view, ratings |
| `/post-item` | Wireframe 2 — two-step "Post an item" form (requires login) |
| `/business` | Wireframe 3 — business bulk-upload dashboard (requires `business` or `admin` role) |
| `/admin` | Admin overview placeholder (requires `admin` role) |
| `/login`, `/signup` | Authentication |

**Demo accounts for testing role-based access:**
- Admin (seeded): `admin@ecoloop.com` / `admin123`
- Individual / Business: register your own via `/signup`

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

**BR (C.1) — Authentication**
`src/composables/useAuth.js` implements real registration and login against
a users collection (`ecoloop_users` in localStorage): registering hashes the
password with SubtleCrypto (SHA-256) before it's ever stored, and logging in
re-hashes the entered password and compares it against the stored hash — no
plain-text passwords, and no "any input logs you in" shortcut. A seeded demo
admin account (see table above) lets markers test role-gated pages without
needing an open "sign up as admin" form.

*Honest limitation:* there is no backend server in this phase, so this is a
client-only approximation of authentication — a user with local access to
their own browser could still edit localStorage directly. The composable is
deliberately structured (a users collection + a session + roles) so it can
be swapped for real Firebase Authentication in BR (D.1) with minimal changes
to the rest of the app.

**BR (C.2) — Role-based authorisation (3 roles)**
Roles are `individual`, `business` and `admin`, stored on each user record.
`src/router/index.js` declares `meta.requiresAuth` and `meta.allowedRoles`
per route and enforces them in a single `router.beforeEach` navigation
guard — unauthorised visits are redirected with an on-screen explanation
(`src/composables/useFlash.js` + the banner in `App.vue`), rather than
silently failing. `/business` requires `business` or `admin`; `/admin`
requires `admin`; `/post-item` and rating requires being logged in at all.

**BR (C.3) — Aggregated ratings (two rated aspects)**
`src/composables/useRatings.js` supports rating two different things:
individual listings, and sellers (a trust/reputation score) — separate
localStorage collections, separate averages. `StarRating.vue` renders both
the interactive 1–5 star input and the read-only "average + count" display;
`RatingModal.vue` handles submission. Ratings require being logged in.

**BR (C.4) — Security**
1. **XSS**: Vue's `{{ }}` interpolation auto-escapes HTML by default, and
   this app never uses `v-html` on user-supplied content, so injected
   markup (e.g. typing `<script>` into a listing description) is rendered
   as inert text rather than executed.
2. **Defense-in-depth**: `src/utils/sanitize.js` strips tag-like syntax out
   of free-text fields (titles, descriptions, request messages, rating
   comments) *before* they're persisted, so the stored data is clean
   regardless of how it's later rendered.
3. **Client-side validation**: the five validator types from BR (B.1) apply
   here too — required fields, length limits, email format, numeric
   ranges and password confirmation all reduce malformed/malicious input
   at the source.

*Honest limitation:* the brief's example of "client **and server-side**"
validation can't be fully met yet because there is no server in this
phase — server-side enforcement (Firestore Security Rules) is planned for
when Firebase is introduced in Category D.

## Notes for markers

- The "map view" on `/browse` is a lightweight, dependency-free radial
  placement (no external map API/key required) — it visualises relative
  distance, not literal geography.
- Photo uploads on `/post-item` use `URL.createObjectURL` for local preview;
  since there is no backend, image files themselves aren't persisted to
  localStorage (only listing text data is).
- Authentication is a front-end mock (no server) for demonstration of
  validated forms and persisted session state only.
