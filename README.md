# EcoLoop

A local circular-economy marketplace for GreenLoop Collective (Melbourne),
built for FIT5032 A1 as a Vue 3 multi-page web application.

## Getting started

Requires Node.js 20+ (the Cloud Functions run on Node 22).

```bash
npm install
cp .env.example .env   # then fill in the values — see "Setup" below
npm run dev            # http://localhost:5173
npm run build          # production build -> dist/
```

## Setup (Firebase, Mapbox, SendGrid)

The app talks to three outside services. Each needs a one-time setup.

### 1. Firebase (authentication, database, cloud functions, hosting)

1. Create a project at <https://console.firebase.google.com>, then add a **Web app**
   and copy its config values into `.env` (`VITE_FIREBASE_*`).
2. **Authentication → Sign-in method:** enable **Email/Password** and **Google**.
3. **Firestore Database:** create a database (production mode, region `australia-southeast1`).
4. **Upgrade to the Blaze plan.** Cloud Functions require it. Usage for this project
   stays inside the free quota; set a budget alert in Google Cloud to be safe.
5. Install the CLI and link the project:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add          # pick your project; this updates .firebaserc
   ```
6. **Make the first admin:** sign up in the app, then in the Firebase console open
   Firestore → `users` → your document and change `role` to `admin`. This is only
   needed once; after that, admins change other users' roles from the Admin page.
   (Security rules stop anyone from giving themselves admin through the app.)

### 2. Mapbox (map, place search, directions)

Create a free account at <https://account.mapbox.com>, copy your **public** token
(`pk.…`) into `VITE_MAPBOX_TOKEN` in `.env`. Under the token's **URL restrictions**,
add `http://localhost:5173` and your deployed site URL so nobody else can use it.

### 3. SendGrid (emailing PDF reports)

1. Sign up at <https://sendgrid.com> (new accounts get a 60-day trial).
2. **Settings → Sender Authentication → Verify a Single Sender** with your email.
3. **Settings → API Keys → Create API Key** with "Mail Send" permission.
4. Store the key in Google Secret Manager (it never goes into the code):
   ```bash
   firebase functions:secrets:set SENDGRID_API_KEY
   ```
5. Create `functions/.env` (copy `functions/.env.example`) and set
   `SENDGRID_FROM` to the sender address you verified.

### Deploy

```bash
cd functions && npm install && cd ..
npm run deploy        # builds the app, then deploys hosting, functions and Firestore rules
```

The site is served at `https://<your-project-id>.web.app`.

## Pages

| Route | Purpose |
|---|---|
| `/` | Landing page — hero, how-it-works, about |
| `/browse` | Wireframe 1 — browse/filter/search listings, ratings; Map view with place search + directions |
| `/post-item` | Wireframe 2 — two-step "Post an item" form (requires login) |
| `/business` | Wireframe 3 — business bulk-upload dashboard (requires `business` or `admin` role) |
| `/reports` | Data & reports — two interactive tables, CSV/PDF export, email PDF (requires login) |
| `/admin` | Admin: account counts, and a user table where admins change roles (requires `admin` role) |
| `/forgot-password` | Request a password reset email |
| `/login`, `/signup` | Authentication |

**Testing role-based access:** sign up as an Individual or Business from `/signup`.
Admin accounts can't be self-registered — promote an account by setting its `role`
to `admin` in Firestore (see Setup step 1.6).

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
Now provided by Firebase Authentication — see BR (D.1) below. (Phase 1 used a
localStorage mock with SHA-256-hashed passwords; that has been fully replaced.)

**BR (C.2) — Role-based authorisation (3 roles)**
Roles are `individual`, `business` and `admin`, stored on each user record.
`src/router/index.js` declares `meta.requiresAuth` and `meta.allowedRoles`
per route and enforces them in a single `router.beforeEach` navigation
guard — unauthorised visits are redirected with an on-screen explanation
(`src/composables/useFlash.js` + the banner in `App.vue`), rather than
silently failing. `/business` requires `business` or `admin`; `/admin`
requires `admin`; `/post-item` and rating requires being logged in at all.

**Deleting listings** follows the same rules: each listing records the
Firebase user id of whoever posted it (`ownerId`), and the delete button
on a listing card only appears for that owner or an admin. The check
(`canDeleteListing` in `src/composables/useListings.js`) runs again inside
`removeListing`, so hiding the button isn't the only safeguard. Deleting
asks for confirmation first, in an accessible dialog whose focus starts on
Cancel.

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

4. **Server-side validation** (added in Category D/E): `firestore.rules`
   validates every profile write on Google's servers — new accounts can
   only be `individual` or `business`, names must be 2–80 characters, and
   nobody can change their own role. The email Cloud Function re-validates
   its input (`functions/validate.js`: recipient format, PDF signature and
   size, filename) and HTML-escapes user text before putting it in the email.
5. **Secrets stay off the client:** the SendGrid API key lives in Google
   Secret Manager and is only readable by the Cloud Function.
6. **CSV injection:** exported cells that start with `=`, `+`, `-` or `@`
   are prefixed so spreadsheet apps don't run them as formulas.

**BR (D.1) — External authentication (Firebase Auth)**
`src/firebase.js` initialises Firebase; `src/composables/useAuth.js` uses
`firebase/auth` for sign-up, log-in (email/password **and** Google), log-out
and session restore (`onAuthStateChanged`). Passwords are handled entirely by
Firebase — the app never sees or stores them. Each user's display name and
role are kept in Firestore at `users/{uid}`; the router guard waits for
Firebase to restore the session before checking access, so a page refresh
doesn't bounce logged-in users to the login page.

**Password reset:** "Forgot password?" on the login page opens
`/forgot-password`, which uses Firebase's `sendPasswordResetEmail`. Firebase
emails a single-use link, so the app never handles the new password. The
page shows the same confirmation whether or not the email has an account,
so it can't be used to find out who is registered (email enumeration).

**Robust sign-in:** emails are normalised to the form Firebase stores, and a
failure to load a profile after a successful sign-in no longer shows an
error; the person is signed in and the profile is recreated if missing.

**BR (D.2) — Email with attachment (SendGrid)**
On `/reports`, **Email PDF** builds a PDF of the table's current rows in the
browser and calls the `sendReportEmail` Cloud Function, which sends it as an
attachment through the SendGrid API (`functions/index.js`). The recipient
defaults to the logged-in user's email and can be changed; an optional note
is included in the email body.

**BR (D.3) — Interactive tables**
`src/components/InteractiveTable.vue` is one reusable component used for two
tables on `/reports`:
1. **Marketplace listings** — the live listings from the app's data store.
2. **Exchange history** — 86 rows of mock data generated by
   `scripts/generate-mock-exchanges.mjs` (Mockaroo-style fields, seeded so
   the data is the same every time).

Each table supports **sorting** (click any column header; numbers and dates
sort numerically, not alphabetically), a **search across all columns**,
**search by individual column** (a text box or dropdown under every header),
and **10 rows per page** with numbered pagination. The filter/sort/paginate
logic is in `src/utils/tableEngine.js`, separate from the UI.

**BR (D.4) — Deployment to the cloud**
Deployed on **Firebase Hosting** (`firebase.json`), alongside the Cloud
Functions and Firestore rules, with one command: `npm run deploy`.
Live URL: https://fit5032-89bf5.web.app

**BR (E.1) — Cloud Functions**
`functions/index.js` defines two callable Firebase Cloud Functions (2nd gen,
region `australia-southeast1`), each doing work that must not happen in the
browser:

1. `sendReportEmail`: emails a PDF via SendGrid (see D.2). The API key lives
   in Secret Manager and never reaches the browser.
2. `setUserRole`: lets an admin change another user's role from the Admin
   page. The function looks up the *caller's* role on the server with the
   Admin SDK (a role sent from the browser is never trusted), validates the
   new role and user id, stops admins changing their own role (so the site
   can't be locked out of admin), and records who made the change and when.
   `firestore.rules` blocks role changes from the browser, so this audited
   function is the only way to change a role.

Both functions reject signed-out callers, validate all input on the server,
cap instances to limit cost, and log outcomes. Business rules are kept in
plain modules (`validate.js`, `roles.js`) with unit tests:
`cd functions && npm test` (12 tests).

**BR (E.2) — Geo location (Mapbox)**
`/browse` → **Map view** (`src/components/ListingMap.vue`) shows every
matching listing on a Mapbox map, with two non-trivial features:
1. **Place search** — search any suburb, street or landmark (Mapbox
   Geocoding API, biased to Melbourne) or use your device's location; the
   chosen point becomes your start point and every listing is ranked by real
   distance from it.
2. **Directions** — pick a listing and get a walking, cycling or driving
   route to its pickup area (Mapbox Directions API), drawn on the map with
   total distance, travel time and turn-by-turn instructions.

New listings posted through `/post-item` are geocoded from their pickup
point so they appear in the right place. For privacy, pins mark the pickup
*area* (near the suburb centre), never a home address.

**BR (E.3) — Accessibility (WCAG 2.1 AA)**
Checked with axe-core (the engine used by most WCAG checkers) on every page,
plus the map view and each dialog: **0 WCAG 2.1 A/AA violations**. Changes made:
- **Keyboard:** skip link to main content; every action is a real
  `<button>`/link; the CSV drop zone has a "Choose CSV file" button; the
  photo picker is reachable by Tab; star ratings are a radio group (arrow
  keys change the value); map pins are focusable buttons.
- **Dialogs** (`src/composables/useDialog.js`): focus moves into the dialog,
  Tab is trapped inside, Escape closes, and focus returns to the button that
  opened it. Dialogs use `role="dialog"`, `aria-modal` and a labelled title.
- **Forms:** every input has a label (or `aria-label`); errors are linked
  with `aria-describedby` and marked `aria-invalid`; `autocomplete` is set on
  name, email and password fields (1.3.5); radio groups use `fieldset`/`legend`.
- **Text alternatives:** listing photos have descriptive `alt` text;
  decorative icons are `aria-hidden`; star ratings read as "Rated 4.0 out of
  5 from 3 ratings"; the map has a full text list of the same listings and
  the route is given as numbered turn-by-turn steps.
- **Contrast:** faint text, form borders, link buttons and code text were
  darkened to meet 4.5:1 (text) and 3:1 (UI components); links inside text
  are underlined so they don't rely on colour alone.
- **Navigation:** each route sets a unique page `<title>`; after navigating,
  focus moves to the new page's heading so screen readers announce it;
  result counts and toasts use `role="status"` live regions.
- **Reflow:** no horizontal page scrolling at 320 px wide; wide tables
  scroll inside their own keyboard-focusable region.
- **Motion:** animations are disabled when the OS "reduce motion" setting is on.

**BR (E.4) — Export**
Both tables on `/reports` have **Export CSV** and **Export PDF** buttons
(`src/utils/exporters.js`). Exports contain exactly what the table is
showing — after search, column filters and sort — across all pages. CSV is
UTF-8 with proper quoting so it opens correctly in Excel; PDF is generated
with jsPDF + AutoTable (automatically landscape for wide tables).

## Category F — Innovation (BR F.1)

### F.1 (1) Admin dashboard with interactive charts
`/admin` (admin role only) is a dashboard for GreenLoop Collective staff:

- **Community:** account totals and a breakdown by role (individual,
  business, admin) as tiles and a chart, plus the user table where admins
  change roles (via the `setUserRole` Cloud Function).
- **Exchange activity:** read live from the Firestore `exchanges`
  collection. One filter row (period and category) rescopes every number
  and chart below it: total exchanges, completed exchanges, kilograms kept
  out of landfill and completion rate, a monthly "kg kept out of landfill"
  chart and a stacked "exchanges by status" chart.
- **Interactive:** hover or tap a bar for its exact value, click a legend
  item to hide a status, and filters animate the charts in place.
- **Accessible:** each chart has a text summary for screen readers and a
  "Show as table" toggle with the same numbers, so nothing depends on
  seeing the chart or using a mouse. Status colours are always paired with
  text labels.
- **Data:** an admin can load the 86-row demo history into Firestore with
  one button (`seedDemoExchanges` Cloud Function, admin-only and
  idempotent). Firestore rules let only admins read `exchanges`; nobody
  can write to it from the browser.
- Charts use Chart.js through a reusable `ChartCard.vue`; the maths lives
  in `src/utils/dashboardStats.js` (pure functions, unit-tested).

### F.1 (2) Bulk email to selected users
On the Admin dashboard, admins tick users in the user table (or "Select all
shown" after searching or filtering, e.g. all business accounts) and press
**Email selected** to write an announcement.

- The `sendBulkEmail` Cloud Function re-checks that the caller is an admin,
  validates the subject and message (including blocking newlines in the
  subject, a header-injection trick), and accepts **user ids only**: it looks
  up email addresses itself, so a tampered request can't use EcoLoop's
  SendGrid account to email arbitrary people.
- Each person gets their own copy starting "Hi <name>,", so nobody sees the
  other recipients' addresses. Up to 100 recipients per send.
- Every send is recorded in the `announcements` collection (who, when, how
  many) for accountability; only admins can read it.
- Validation is unit-tested (`functions/bulk.test.js`).

### F.1 (3) Offline features
Volunteers and residents often use EcoLoop on phones with patchy signal.
Three offline features keep it usable:

1. **Online/offline detection** (`src/composables/useOnline.js`,
   `ConnectionBanner.vue`): a banner announces when the device goes offline
   (and briefly when it reconnects; screen readers hear both). Actions that
   need the internet (logging in, emailing, map search and directions,
   admin changes) are paused with a short explanation instead of failing
   with an error. Exporting CSV/PDF and browsing keep working.
2. **Works with no connection** (`vite-plugin-pwa`, Workbox): a service
   worker caches the app itself, so after one visit EcoLoop opens and
   navigates even fully offline. Product photos are cached when first
   viewed; Firebase, SendGrid and Mapbox requests are never cached. The
   web app manifest and icons make it installable to a phone's home screen.
   `firebase.json` serves `sw.js` and `index.html` with `no-cache`, so new
   deployments reach users straight away.
3. **Automatic draft saving** (Post an item): everything typed is saved to
   this device as you go (localStorage), restored next time with a notice
   and a "Start over" option, and cleared when the item is posted. A dropped
   connection or closed tab never loses a half-written listing. Posting
   itself also works offline (the pickup location falls back to the suburb
   centre when the map service can't be reached).

## Notes for markers

- Configuration lives in `.env` (see `.env.example`); no keys are committed.
- Photo uploads on `/post-item` use `URL.createObjectURL` for local preview;
  image files themselves aren't persisted (listing text data is).
- Listings and ratings are still stored in localStorage (BR B.2); user
  accounts and roles are in Firebase Auth + Firestore.
