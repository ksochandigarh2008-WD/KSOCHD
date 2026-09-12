# Progress checkpoint

Written so a failed turn costs nothing. **Read this first when resuming.**

Last verified state: **`npm test` → 564 PASS / 0 FAIL**, `npx vite build` ✓ (12 s).
Environment note: `node_modules` is NOT persisted between sessions — run `npm ci` first (≈7 s).

---

## What is done

| Work | State |
|---|---|
| Membership + finance management | Done |
| NGO double-entry core, statements, 80G + utilisation certificate PDFs | Done |
| Grant recording (Admin → Reports → Grants) | Done |
| Admin panel module split (13 nav items, ⌘K) | Done |
| Settings review: all 4 **P0** findings | Done |
| **Production mode** (part 1 of 3) | Done |
| **Maintenance mode** (part 2 of 3) | Done |
| **Hosting packaging** (part 3 of 3) | Done |
| **Analytics, behind consent** (setting P1-6) | Done |
| **Static identifier scan** (`npm run test:scan`) | Done |

## Production mode — part 1, complete

- `src/lib/production.js` — go-live checklist, production restrictions, maintenance helpers.
- `src/components/admin/ForcedPasswordChange.jsx` — navy screen that blocks the panel until the
  seeded password (`ksochd2026`) is changed. Refuses to accept the old password as the new one.
- Store: `settings.productionMode`, `settings.maintenance`, `mustChangePassword`,
  `resetDemoRows()` now returns `false` in production mode, password change is audited.
- `Admin → System → Production mode`: toggle, restriction list, and the checklist
  (10 blocking items, 4 warnings, each naming where to fix it).
- Demo badge hidden in production mode (`OverviewTab`).

## Maintenance mode — part 2, complete

- `src/components/MaintenanceScreen.jsx` — navy/cream holding page; keeps the organisation name,
  address, phone and email on screen; links to `/admin`.
- `App.jsx` — `PublicLayout` returns the holding page when maintenance is on and `authed` is false.
- `Admin → System → Maintenance mode` — toggle, editable heading and message, and a warning that
  it is live.
- Tests: 8 SSR checks on the logic and copy fallbacks; both new screens render-checked;
  7 DOM checks covering the switch, the store state and the copy fields.

## Hosting packaging — part 3, complete

- `netlify.toml` (build command, publish dir, noindex on `/admin`)
- `vercel.json` (SPA rewrite, asset caching, noindex on `/admin`)
- `public/_redirects` — SPA fallback for Netlify **and** Cloudflare Pages
- `public/_headers` — immutable caching for hashed assets, `no-cache` for `index.html`
- `public/404.html` — GitHub Pages deep-link fallback, paired with a restore in `src/main.jsx`
- `scripts/make-sitemap.mjs` + `npm run sitemap` (refuses to run without `SITE_URL`)
- `GO_LIVE.md` — pre-deploy checklist, env vars, per-host deploy steps, post-deploy tests
- Verified: every route and every host file serves 200 from the production build; **2.4 MB** total,
  ≈131 kB gzipped on first paint.

Note: the `X-Robots-Tag: noindex` on `/admin` is applied by the host, not by `vite preview`, so it
cannot be checked locally — only after a real deploy.

## Since the checkpoint

- **Analytics (P1-6)** — `src/lib/analytics.js`, `src/lib/useAnalytics.js`, `src/components/ConsentBanner.jsx`,
  panel in Admin → System → Analytics. GA4 or Plausible, ID from settings or `VITE_ANALYTICS_ID`.
  Nothing loads until the visitor allows it; "Privacy choices" in the footer re-opens the choice.
- **Fixed a dangling pointer I left** — the go-live checklist said "System → Analytics" when no
  such screen existed (the same defect class as the grants empty state). The screen exists now.
- **Static identifier scan** (`tests/scan-identifiers.mjs`, runs first in `npm test`) — catches JSX
  components used without an import. Verified by removing the `SEL` import: it fails, then passes.
- **SSR harness now renders all 11 public pages**, not just admin tabs — this is what catches
  undefined *variables*, which the scanner cannot see without a real parser.
- **Fixed a pre-existing duplicate React key** in the footer: "Corporate partnerships" and
  "Contact" both pointed at `/contact`, so one could be silently dropped. The test filter only
  matched one phrasing of the warning, so it had gone unnoticed; the filter is widened.

## Membership revision (correctness + editable tiers + receipts/dues)

`src/lib/membership.js` is new — pure functions, no React, no store.

- **Member numbers** were `Math.floor(Math.random() * 9000) + 1000`, which collides
  (53 duplicates per 1000 draws, and the range overlaps the seeded KSO-1001…KSO-1012).
  Now `nextMemberNo()` derives the next number from the records that exist. Assigned in
  `src/lib/db.js` via a `prepare` hook, so it holds for local, REST **and** Supabase;
  `store.addRow` keeps a second guard for local writes that bypass `db`.
- **Fee cycles.** `renew()` treated every cycle except monthly as annual, so a one-time
  or no-fee member could be renewed and charged forever. `isRenewable()`/`nextRenewalDate()`
  now own the policy; the other two cycles return `null` and the UI refuses with a reason.
- **Status truth.** Stored status and renewal date disagreed, so "Active" could sit on a
  lapsed membership. `effectiveStatus()` reconciles (Suspended/Inactive/Pending always win)
  and the directory flags the divergence. The header's **Reconcile N statuses** button
  applies it; KPIs count from the date, not the stored string.
- **Editable tiers.** Tiers/fees moved to `settings.membership` (defaults still from
  `seedData.js`, so old stores resolve unchanged). Rename cascades to the members on that
  tier; a repricing never rewrites a member's own fee; an occupied tier needs confirming
  and the last tier cannot be removed at all.
- **Dues.** `membershipDues()` per financial year: annual = 1× fee, monthly = 12×,
  one-time = 1× ever, none = n/a. New **Dues** column, **Arrears** KPI, and a breakdown on
  the member profile. Donations never count as fees.
- **Fee receipts.** `KSO/MEM/{fy}/{n}` in its own `feeReceipts` collection.
  Deliberately NOT the 80G series: `nextReceiptNo` counts any receipt whose number
  contains `/{fy}/`, so mixing them would skip 80G numbers — proven in a test.
  `buildFeeReceipt` says on its face that it is not a donation and makes no 80G claim.
  `missingCompliance(..., { require80G: false })` stops a fee receipt demanding a
  80G validity date it never uses.
- Member profile gained a **Renew** button (it was reachable only from the kebab menu).

## Supabase row mapping (the backend was non-functional)

`src/lib/rowmap.js` is new. The database columns are snake_case (`renews_on`, `fee_amount`);
the app speaks camelCase. `src/lib/db.js` had **no mapping at all**, so Supabase mode read
`undefined` for every camelCase field — each member rendered "No date", no number and a ₹0 fee —
and it inserted camelCase keys as columns that do not exist.

- `ROW_COLUMNS` holds the app-key → column contract for all 9 resources; `toRow` renames **and
  drops keys with no column** (seeded rows carry `demo`, which would fail the insert);
  `fromRow` restores camelCase, so everything above the data layer stays backend-agnostic.
- Wired into all three Supabase call sites: `list` → `fromRows`, `create`/`update` → `toRow`
  then `fromRow` on the returned row. A snake_case row now re-saves idempotently.
- The test block parses the DDL straight out of `DEPLOY.md`, so code and schema cannot drift:
  **9/9 tables exact match** (members 21 cols, transactions 14, pledges 10, budgets 6,
  accounts 10, grants 11, receipts 10, fee_receipts 13, vouchers 18) and a sample row round-trips
  per resource. Writing that test found three DDL gaps, now fixed in `DEPLOY.md`:
  transactions were missing `fund`, vouchers `member_id`, and budgets declared `year int not null`
  where the app writes `fy text` — so a budget could never have been saved.

## Content coverage audit

`tests/scan-content-coverage.mjs` (in `npm test` as `test:content`) walks every leaf of
`defaultContent` and every path the admin actually addresses, and fails on anything uncovered or
dangling. `set(` is only read in files that bind `setContentPath`, otherwise the Ledger and
Accounting form setters look like content paths.

**102 leaves / 110 addressed paths / 0 uncovered / 0 dangling.** Mutation-proven: redirecting the
faqs addressing makes it report `faqs[].a`, `faqs[].q` plus 3 dangling paths and exit 1.

## GitHub Pages — file ready, activation blocked

`.github/workflows/deploy-pages.yml` (moved out of `docs/`, YAML validated) builds with
`BASE_PATH` (default `/KSOCHD` for the project site `…github.io/KSOCHD/`) and deploys `dist`
with `actions/deploy-pages@v4`. The example's `cp dist/index.html dist/404.html` step was
**removed, not ported**: it would overwrite `public/404.html`, the deep-link interceptor that
pairs with the `spa-redirect` restore in `src/main.jsx`, so a shared link would boot on the wrong
route. The step now asserts `dist/404.html` exists instead. Verified: a `BASE_PATH=/KSOCHD` build
emits `/KSOCHD/`-prefixed assets and keeps the interceptor.

Everything else from this round is on `origin/main`; the workflow file is the only thing held back,
in a local commit sitting on top of it. Pushing it was refused verbatim:
`refusing to allow a Personal Access Token to create or update workflow '.github/workflows/deploy-pages.yml' without 'workflow' scope`.
The token also cannot enable Pages — `POST /repos/…/pages` returns `403 Resource not accessible by
personal access token`, so that is a Settings click, not a script.

**Two manual actions are still required:**

1. Push the workflow file with a token that has the **`workflow`** scope.
2. Repo **Settings → Pages → Source = "GitHub Actions"** (and optionally the variable
   `BASE_PATH=/KSOCHD`, which the code already defaults to).

The Pages API refused to enable it: `POST /repos/…/pages` → `403 Resource not accessible by
personal access token`. That is a token-scope limit, not a repo setting that can be worked around
from here.

## UI/UX review round — four defects fixed

Reviewed by rendering the running app in a real Chromium (1440 · 1280 · 768 · 390 · 320), 41
screenshots, plus automated contrast, overflow and truncation sweeps. Findings and the fixing
work are in `ux-review/UI-UX-REVIEW.html` outside this repo, with screenshots in `ux-review/shots/`.

- **The hero card's headline was invisible** — white on white, contrast **1:1**. The hero
  `<section>` sets `text-white`; the card set `bg-white` but no text colour. Now 17.85:1.
- **The "Who we are" image 404'd.** `photo-1593113566592…` is dead (the same URL was gallery
  tile 8). Because the URL lives in *persisted* content, correcting the default alone would
  have left every existing install broken, so there is a **v8 → v9 migration** that rewrites it
  in place — targeted (an exact URL match, so a photo the organisation picked itself is never
  touched), idempotent, and proven against a real v8 store in a browser.
- **`foundedYear` was a placeholder shown to visitors** — `— confirm founding year —` rendered
  on the home page, About (twice), the footer, and inside the assistant's answers. New shared
  `isYear()` guard: no year, no claim. The admin panel still shows the field as the to-do it is.
- **Membership KPI captions were truncated** (`Expired or due withi…`). `StatCard`'s hint now
  wraps instead of clipping.

Tests: **522 PASS / 0 FAIL** (was 510 — 12 new, none relaxed), 0 console errors, build clean.
`store version is 8` was asserted against a hardcoded literal, which is the one thing that check
exists to prevent; it now reads the constant. New tests cover the migration end to end, plus
"every shipped photo is a complete Unsplash URL" — the dead image got in because nothing checked.

**Still open** (recorded, not fixed): the assistant's opening line is clipped, `describeAmount`
prints "1 ×" for a single unit, duplicate volunteer role chips, the 404 page tells visitors to use
the admin panel, no webfont, and P1s from the review (dark-on-dark sub-heading, 2.8:1 accent
badges, "Unique donors" counting event and in-kind payers, the chat pill covering the footer's
80G line, nav labels ellipsised).

## Admin / core functional audit

Full report: `ux-review/ADMIN-FUNCTIONAL-AUDIT.md` (outside this repo). Six findings, all
executed rather than inferred. The suite is strong on pure functions and accounting maths but
blind on **whether the panel's own instructions lead anywhere** and on **what happens to related
records when something is deleted**.

- **F1 (compliance, high).** `nextReceiptNo` counts the rows in the year instead of taking
  max+1, so deleting a receipt **reissues its number**. Proven by driving the UI: issue 0001 and
  0002, delete 0001 (one click, no confirmation), re-issue → two donors hold
  `KSO/80G/2026-27/0002`. The correct implementation is 15 lines below in the same file —
  `nextFeeReceiptNo` does max+1 and its comment names exactly this hazard.
- **F2.** The `demoBadge` go-live item is unsatisfiable: it needs `showDemoBadge === false`, and
  the only writer is `clearDemoData`, which has no caller. 0 of 52 controls in the System tab
  touch it.
- **F3.** Two of the 14 checklist `where` pointers name controls that do not exist
  (`Members → Clear demo data`; `System → Production mode` for the badge). Same class as the
  Analytics pointer fixed earlier — the checklist's logic is tested, its pointers are not.
- **F4.** Deleting a grant orphans its vouchers: `removeRow` cascades only transactions.
  Deleting one seeded grant left 9 of 59 vouchers pointing at nothing; the money stays in the
  books but can never be attributed to a grant again (a re-created grant gets a new id).
- **F5.** Dead store surface: `clearDemoData`, `setRows`, `updateAdminUser` have no callers.
- **F6 (security).** `toCSV` escapes quotes and commas but not a leading `=`, so a hostile name
  from a public form reaches an admin's Excel through the exported audit trail.

Sound and worth recording: backup/restore round-trips all 14 collections byte-identically and
`importAll` type-checks every collection; transaction→voucher add/edit/delete wiring is correct
including the cascade; every action the UI calls exists; the audit trail has a viewer; the Inbox
clear is honestly labelled.

## Admin / core audit — all six fixed (plus a seventh)

Suite: **564 PASS / 0 FAIL** (was 522; 42 new checks, none removed). 0 console errors.

- **F1 (the compliance one).** `nextReceiptNo` takes max+1 within its own series instead of
  counting rows. Re-running the exact UI scenario that produced a duplicate — issue 0001 and
  0002, delete 0001, re-issue — now yields **0003**. The receipt delete sits behind a confirm
  dialog that says the number is never reissued, and cancelling keeps the row.
- **F2.** A **Show the demo-data banner** toggle beside production mode, and the checklist item
  now also accepts production mode (which always hid the banner). Proven: banner visible → toggle
  → gone.
- **F3.** The `demoData` pointer names the real button (Remove demo rows). A test parses all 14
  `where` pointers and asserts each names a control that exists in the tab it names — that class
  of drift cannot come back silently.
- **F4.** Deleting a grant keeps the spend and clears `grantId`, so no voucher points at a dead
  grant. The dialog now says so and names the count: *"The 11 vouchers posted against it stay in
  the books, but will lose their link to this grant…"*
- **F5.** `clearDemoData`, `setRows` and `updateAdminUser` deleted — no callers.
- **F6.** `toCSV` defuses a leading `= + - @` on text cells so a hostile name from a public form
  cannot execute in an admin's spreadsheet. Numbers are left numeric.
- **F7 (found while fixing F4).** Deleting a member left the same orphans — transactions,
  vouchers, receipts, fee receipts and pledges pointing at a dead id. Same fix; a store-wide
  sweep now asserts no collection references a row that no longer exists.

One test-side fix worth noting: an earlier test cleaned up its own fixture with a raw `setState`
filter that forgot vouchers, which is exactly how a dangling reference is born. It deletes through
`removeRow` now — the path the UI uses.

## Not started

Nothing outstanding in code. Two blockers, both listed above and both outside the repo: the
Pages activation + workflow-scoped push, and the items already recorded as not planned
(server-side auth for real security, settings from a server, scheduled backups, i18n, multi-currency).

## Standing constraints

- Org: **Kuki Students' Organisation Chandigarh (KSOCHD)**, Regd. No. 2991/79, "Learn • Unite • Serve".
- Stack is fixed by the user's intake form: React + Vite + Tailwind + Lucide, Zustand store,
  localStorage with REST bindings, CloudFront for static assets. Hosting: **free tier**.
- Login page uses navy `#1e3a6e` on cream `#faf6ee`; admin and public site stay teal.
- Auth is **email + password only** (no passcode fallback).
- Membership tiers: **Individual ₹500 / Family ₹1,000**, household members stored.
- Statements: NGO financial statements, **true double-entry**, full compliance set.
- **Not doing** client-side role enforcement (security theatre over `localStorage`) — queued for
  server-side auth. Also **not doing** i18n or multi-currency.
