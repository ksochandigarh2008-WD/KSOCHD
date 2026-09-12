# Deploying & upgrading the KSO website

This is a **static** React app: `npm run build` produces a `dist/` folder of HTML, CSS and JS
that any host can serve. There is no server to maintain.

---

## 1. Pick a host (all free tiers)

### Vercel — recommended
```bash
npm i -g vercel
vercel            # preview deploy
vercel --prod     # go live
```
Or push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new). Build command
`npm run build`, output `dist`. `vercel.json` is already committed — it handles client-side
routing and asset caching. **Every push to `main` auto-deploys.**

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```
Or drag `dist/` onto [app.netlify.com/drop](https://app.netlify.com/drop). `netlify.toml` is
already committed.

### GitHub Pages
The workflow in `.github/workflows/deploy-pages.yml` builds and deploys on every push to `main`.
Two things have to be done by hand, once:

1. **Settings → Pages → Source: GitHub Actions.** The workflow cannot do this for itself — the
   Pages API refuses it (`403 Resource not accessible by personal access token`) unless the token
   has explicit Pages permission.
2. If the token you push with has no **`workflow`** scope, GitHub rejects any commit that touches
   `.github/workflows/`. Commit the rest, push, and add the workflow from a token that has it (or
   from the GitHub web UI).

This repo deploys as a **project site** — `https://ksochandigarh2008-wd.github.io/KSOCHD/` — so
`BASE_PATH` must be `/KSOCHD`, which the workflow already defaults to. Set the repository variable
`BASE_PATH` only if that changes, e.g. to `/` for a custom domain at the root.

`public/404.html` (the deep-link interceptor, paired with the `spa-redirect` restore in
`src/main.jsx`) is what makes a shared link open the right page. Do **not** replace it with a copy
of `index.html`: the app would boot on the wrong route and silently drop the link.

### AWS S3 + CloudFront (for image/media heavy sites)
```bash
npm run build
aws s3 sync dist s3://your-bucket --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```
Point CloudFront's default root object at `index.html` and add a custom error response mapping
`403`/`404` → `/index.html` with a `200` status (that's what makes client-side routing work).
`vite.config.js` already fingerprints assets into `/assets/`, so you can cache them for a year.

### Traditional cPanel / shared hosting
Run `npm run build`, zip the contents of `dist/`, upload via File Manager to `public_html`, and
extract. Add this `.htaccess` so page refreshes don't 404:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### Custom domain
Every host above gives free SSL. Add your domain in the host's dashboard, then point your
registrar's DNS at the values they give you (usually an `A` record or a `CNAME`).

---

## 1b. Supabase (recommended if more than one person edits)

The membership and finance systems share one data layer. With no environment variables they run
against localStorage; add two and they talk to Postgres instead — same code, same UI.

```bash
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Create the tables in the Supabase SQL editor:

```sql
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  member_no text, name text not null, email text, phone text,
  type text, tier text, status text, centre text, city text, address text,
  joined date, renews_on date, skills text, notes text, avatar text,
  fee_amount numeric default 0, fee_cycle text, events_attended int default 0,
  -- people covered by a Family membership: [{"name":"…","relation":"Spouse"}]
  household jsonb default '[]'::jsonb
);

-- double-entry books
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, name text not null,
  "group" text not null, sub_group text, note text,
  opening numeric default 0, opening_type text default 'Dr',
  active boolean default true, system boolean default false
);

create table if not exists vouchers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  no text, date date not null, type text not null,
  party text, method text, reference text, narration text,
  program text, fund text, amount numeric default 0,
  status text default 'Posted',
  -- [{"account":"1002","debit":5000,"credit":0,"fund":"Unrestricted","program":""}]
  lines jsonb default '[]'::jsonb,
  source text default 'transaction', source_id text, grant_id text,
  member_id uuid references members(id) on delete set null
);

create table if not exists grants (
  id uuid primary key default gen_random_uuid(),
  donor text not null, purpose text, sanction_no text,
  sanctioned numeric default 0, received numeric default 0,
  start_date date, end_date date, program text, fund text, status text default 'Active'
);

create table if not exists receipts (
  id uuid primary key default gen_random_uuid(),
  no text not null, date date not null, voucher_id text,
  donor text, amount numeric default 0, method text, pan text, address text, narration text
);

-- Membership fee receipts. A SEPARATE book from the 80G donations above: a
-- membership fee is not a donation, it runs in its own KSO/MEM numbering series,
-- and mixing the two would corrupt the 80G sequence (nextReceiptNo counts every
-- receipt whose number contains the financial year).
create table if not exists fee_receipts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  no text not null unique,          -- KSO/MEM/2026-27/0001 — never reissued
  date date not null,
  kind text default 'membership-fee',
  member_id uuid references members(id) on delete set null,
  member_no text, member_name text,
  tier text, cycle text, period text,
  amount numeric default 0, method text
);

create index if not exists fee_receipts_member_idx on fee_receipts (member_id);
create index if not exists fee_receipts_date_idx   on fee_receipts (date desc);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  date date not null, type text not null, category text, amount numeric not null,
  program text, party text, method text, reference text, status text default 'Cleared',
  note text, member_id uuid references members(id) on delete set null,
  fund text
);

create table if not exists pledges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null, amount numeric not null, frequency text,
  start_date date, next_due date, program text, status text default 'Active', note text
);

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  program text not null, amount numeric not null,
  -- `fy` is the financial-year label ("2026-27"), which is what the app writes.
  -- `year` is kept nullable: budgets recorded before the FY switch still carry a
  -- calendar year, and finance.js budgetVsActual() reads both.
  fy text, year int
);

create index if not exists transactions_date_idx on transactions (date desc);
```

Row Level Security (start simple — tighten before going live):

```sql
alter table members      enable row level security;
alter table transactions enable row level security;
alter table pledges      enable row level security;
alter table budgets      enable row level security;
alter table fee_receipts enable row level security;

-- Service-role / trusted-client access. Replace with a policy tied to your admin
-- auth (e.g. auth.uid() in (select id from admins)) once you add real sign-in.
create policy "admin all" on members      for all using (true) with check (true);
create policy "admin all" on transactions for all using (true) with check (true);
create policy "admin all" on pledges      for all using (true) with check (true);
create policy "admin all" on budgets      for all using (true) with check (true);
create policy "admin all" on fee_receipts for all using (true) with check (true);
```

> Keep the anon key out of any public repository, and remember the anon key is readable in the
> browser — the RLS policy above is *not* production-grade. Before launch, either put `/admin`
> behind Supabase Auth, or route reads/writes through your own server.

## 2. Connect a backend (optional)

Without a backend, content lives in the browser that edited it. That's fine for one maintainer.
For a team, set:

```bash
# .env.local
VITE_API_BASE_URL=https://api.yourdomain.org
```

`src/api/client.js` then issues real HTTP calls and falls back to localStorage on any failure.
Expected endpoints:

| Method | Path | Body / notes |
|---|---|---|
| `GET` / `PUT` | `/content` | the full content object |
| `GET` / `POST` / `DELETE` | `/ledger`, `/ledger/:id` | `{ date, type, amount, program, donor, method, note }` |
| `GET` / `POST` / `DELETE` | `/members`, `/members/:id` | roster rows |
| `POST` | `/submissions` | contact / volunteer / event / donation payloads |
| `POST` | `/ai/chat` | `{ messages, context }` → `{ reply }` |

Any stack works — Node/Express, Fastify, Supabase, Firebase, a Django or Laravel API, or
serverless functions on Vercel/Netlify. Auth token: store it in `localStorage` under
`kso-admin-token`; it is sent as `Authorization: Bearer …`.

### Recommended: proxy the AI through your backend
Browsers expose any API key you paste into the page. For production, keep the key server-side:
implement `POST /ai/chat`, have it call your provider, and set `VITE_API_BASE_URL`. The app uses
it automatically and the key never reaches visitors.

---

## 3. Accept real donations

The donate flow is complete up to the payment step and records intent in the ledger. To collect
money:

**Razorpay (India, UPI + cards + netbanking)**
```bash
npm i razorpay
```
Add `VITE_RAZORPAY_KEY_ID` to `.env.local`, load `https://checkout.razorpay.com/v1/checkout.js`
in `index.html`, then in `src/pages/Donate.jsx` step 4 call your backend to create an order and
open Razorpay Checkout with `key`, `amount` (in paise), `order_id`, and `prefill`
(`name`, `email`, `contact`). On `handler` success, call `addLedger(...)` — the helper already
exists in the file.

**Stripe (international cards)** — same shape: create a PaymentIntent server-side, confirm it
with Stripe Elements, then record the ledger entry.

Keep `addLedger()` and `addSubmission()` calls exactly where they are — the ledger, dashboard,
impact page and CSV export all read from them.

---

## 4. Email notifications

The inbox is local until you wire it up. Cheapest path: on `POST /submissions` send one email
via **Resend**, **Postmark** or **Brevo** (all have free tiers), plus an auto-reply to the
sender. For donations, trigger your receipt email from the same place.

---

## 5. Analytics

Add Plausible or Google Analytics by pasting the script tag into `index.html`. For form
conversion tracking, call your analytics event inside the `submit`/`finish` handlers in
`Donate.jsx`, `Volunteer.jsx`, `Contact.jsx` and `Events.jsx`.

---

## 6. Go-live checklist

- [ ] Real organisation name, registration no., 80G no., address, phone, email
- [ ] Real UPI ID and bank details (test a ₹10 donation end to end)
- [ ] Admin passcode changed from `kso2026`
- [ ] Real team names, photos and testimonials
- [ ] Real programmes, events, stories and gallery photos (with consent)
- [ ] Real impact numbers, or a note saying which year they cover
- [ ] Annual report PDFs uploaded and linked
- [ ] Demo rows removed (**Membership → Remove demo rows**, **Finance → Remove demo rows**,
      **Quick ledger → Remove demo rows**, **Inbox → Clear inbox**)
- [ ] If using Supabase: tables created, RLS tightened, keys in the host's env settings
- [ ] AI assistant tested with 5–10 real visitor questions
- [ ] Privacy policy + refund/cancellation policy pages (required for Indian payment gateways)
- [ ] Custom domain connected, SSL active
- [ ] `/admin` behind real authentication if more than one person edits
- [ ] JSON backup exported and stored somewhere safe

---

## 6b. Membership & finance upgrades

| Change | Where |
|---|---|
| Add or reprice a membership tier | `MEMBER_TIERS` + `TIER_FEES` in `src/data/seedData.js` (bump the store `version` in `src/store/useSite.js` so existing data migrates) |
| Add an income/expense category | `INCOME_CATEGORIES` / `EXPENSE_CATEGORIES` in the same file |
| Change what a KPI measures | `financeKpis()` in `src/lib/finance.js` |
| Add a chart | Recharts is already a dependency — see `FinanceTab.jsx` |
| Add a field to a member | `memberSchema` (`schemas.js`) + the form grid in `MembershipTab.jsx` |
| Change validation rules | `src/pages/admin/schemas.js` |
| Switch storage backend | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (see §1b) |

## 7. Upgrading the site later

Nothing is locked in. Common upgrades:

| Change | Where |
|---|---|
| Add a page | create `src/pages/X.jsx`, add a `<Route>` in `src/App.jsx`, add a link in `src/components/layout/Navbar.jsx` |
| Add a content field | add it to `src/data/defaultContent.js`, then edit it from the admin panel |
| Change colours / fonts | Admin → Theme, or `src/index.css` for typography |
| Swap the AI provider | Admin → AI assistant → pick a provider, paste a key |
| Change what the AI knows | add content anywhere, or Admin → Site content → SEO → "Extra notes for the AI assistant" |
| Add a language | duplicate `defaultContent.js` as a second locale and switch on a route param |
| Move to a real database | set `VITE_API_BASE_URL` (see §2) — no component changes needed |

## 8. Performance notes

- Public bundle: ≈ 227 KB raw / **66 KB gzipped** (vendor + icons + app).
- Admin bundle: code-split — 434 KB (126 KB gzipped) plus the Recharts chunk, fetched only when
  someone opens `/admin`.
- Images are the heaviest thing on the site: compress before uploading, and prefer WebP.
- `vite.config.js` already splits vendor code and fingerprints assets for long caching.
- Put image/media behind CloudFront or an image CDN (Cloudinary, imgix) if traffic grows.

---

## Securing the admin

The portal ships with browser-side accounts (`settings.adminUsers` in the store): an email and
password checked in JavaScript, persisted to `localStorage`. That is enough to keep the panel out of
casual view while you are building. It is **not** authentication — anyone with devtools can read the
account list, and anyone can edit `localStorage` to set `authed` true.

Before real member or financial data goes in, pick one of these:

| Option | How | Effort |
|---|---|---|
| **Host-level protection** | Netlify site protection / password protect, Cloudflare Access, or Vercel password protection in front of `/admin` | Minutes |
| **Backend auth** | Set `VITE_API_BASE_URL`, have your API issue a session cookie, and gate `/admin` server-side so unauthenticated requests never receive the bundle | Hours |
| **Supabase Auth** | Enable email auth, gate the admin route on `supabase.auth.getUser()`, and apply the RLS policies in §1b | Hours |

Whichever you choose, keep the browser accounts as a second layer rather than the only one, and
rotate the seeded `admin@ksochd.org` password immediately.

### Rotating credentials
Admin → System → Security → *Change my password*, or add a separate account per office bearer
(Admin / Editor / Viewer) so access can be revoked per person.
