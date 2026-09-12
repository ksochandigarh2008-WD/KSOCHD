# Progress checkpoint

Written so a failed turn costs nothing. **Read this first when resuming.**

Last verified state: **`npm test` → 480 PASS / 0 FAIL**, `npx vite build` ✓ (12 s).
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

## Not started

Nothing outstanding. Open items are the ones already recorded as blocked or not planned
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
