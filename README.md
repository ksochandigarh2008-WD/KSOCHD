# KSO Chandigarh — NGO website

A complete, production-ready website for a non-profit, with an AI visitor assistant and a
built-in control panel. React + Vite + Tailwind, deployable free to Vercel, Netlify,
GitHub Pages or CloudFront/S3.

> **Placeholder notice** — KSO's legal name, registration numbers, address and phone are
> filled with clearly-marked samples. Replace them before going live (see *First 20 minutes*).

---

## Quick start

```bash
cd kso-website
npm install
npm run dev          # http://localhost:5173
```

- **Website** → `http://localhost:5173/`
- **Control panel** → `http://localhost:5173/admin` — passcode `kso2026`

```bash
npm run build        # production build → /dist
npm run preview      # serve the built output locally
```

---

## Sign in to the admin

Go to `/admin`. The portal is **Kuki Students' Organisation Chandigarh — Member & Finance Portal**
(Regd. No. 2991/79), styled navy-on-cream like your reference login.

Seeded account:

| Email | Password |
|---|---|
| `admin@ksochd.org` | `ksochd2026` |

**Change it the first time you sign in** — Admin → System → Security. There you can add accounts
(Admin / Editor / Viewer), remove them, and change your own password.

> Accounts are checked in the browser. That keeps casual visitors out of the panel; it does not stop
> anyone who opens devtools. Before going live, gate `/admin` behind your backend or host-level
> auth — see **DEPLOY.md → Securing the admin**.

## First 20 minutes

Everything below happens in the browser at `/admin` (passcode `kso2026`).

1. **Site content → Organisation** — real name, address, phone, email, registration number,
   80G number, UPI ID and bank details. Nothing else is organisation-specific.
2. **Theme · Backup · Deploy → Security** — change the admin passcode.
3. **Theme · Backup · Deploy → Colours / Logo** — brand colour + logo.
4. **Programmes · Events · Stories** — rename the four programmes, add real events.
5. **About · People · Gallery** — real team members, testimonials, photos.
6. **Membership / Finance → Remove demo rows**, **Inbox → Clear inbox** — deletes the sample data.
7. **Impact & reports** — swap in your real numbers and PDF links.

Changes are saved to your browser as you type and appear on the public site instantly.

---

## What's included

### Public site (13 pages)
| Page | What it does |
|---|---|
| `/` | Hero with animated counters, programmes, about teaser, featured stories, upcoming events, testimonials, FAQ accordion, CTA |
| `/about` | Mission/vision, story, values, milestone timeline, team |
| `/programs` + `/programs/:slug` | Programme list and detail pages with cost-per-beneficiary |
| `/impact` | Headline stats, fund allocation bar, year-on-year chart, live finance totals, report downloads |
| `/events` | Upcoming/past tabs with registration modal → admin inbox |
| `/gallery` | Masonry gallery with tag filters and a lightbox |
| `/stories` + `/stories/:slug` | Blog/field notes with featured story |
| `/volunteer` | Multi-role application form → roster + inbox |
| `/donate` | 4-step donation flow: amount → frequency → details → payment, with live impact maths |
| `/contact` | Contact form with topic routing → inbox |
| `/admin` | The control panel |

### AI assistant (visitor-facing chat widget)
- **Offline mode (default, free, private)** — retrieval over your own content: programmes, FAQs,
  events, costs, contact details. Handles the common questions (volunteering, donations, 80G,
  where money goes, upcoming events) with purpose-written answers, matches anything else to the
  closest passage, and hands over your email rather than inventing an answer.
- **LLM mode (optional)** — paste an API key in **Admin → AI assistant** for natural answers.
  Presets for **OpenAI**, **Groq** (free tier), **OpenRouter**, **Ollama** (self-hosted) and
  any custom OpenAI-compatible endpoint.
- If an LLM call fails for any reason, the widget silently falls back to offline mode.

### AI content studio (for your team)
Eight generators — field story, donation appeal email, social captions, volunteer recruitment
post, donor thank-you, event description, annual impact summary, CSR pitch. Works offline from
your own content, or via your LLM. One click saves a draft straight into Stories.

### Organisation identity
`src/data/defaultContent.js` → `org` holds the real details now: **Kuki Students' Organisation
Chandigarh**, Regd. No. **2991/79**, tagline **Learn • Unite • Serve**. The logo at
`public/ksochd-logo.jpg` is wired into the navbar and the login screen (change it in
Admin → System → Branding). Still to fill in: founding year, 80G number, FCRA status, address,
phone, bank/UPI details.

### Membership management (`/admin` → Membership)
A proper membership system, not a contact list:
- **Records** — membership number, type (Volunteer / Member / Donor / Patron / Board / Staff), tier
  (**Individual** ₹500/yr or **Family** ₹1,000/yr), centre or chapter, skills, joined + renewal
  dates, fee + cycle, notes, photo. Add/edit forms are validated with **react-hook-form + zod**.
- **Households** — a Family membership carries the people it covers (name + relation: Spouse, Child,
  Parent, Sibling, Other). They show in the member record, the directory roster count, the tiers
  panel ("18 people covered") and the CSV export.
- **Renewal tracking** — every row shows *Renews in 27d* / *Expired 12d ago* colour-coded; one click
  renews for a year (or a month) and optionally records the fee straight into the finance ledger.
- **Directory** — search, filter by type/tier/status, sort by name/joined/renewal/contributed,
  inline status changes (Active → Pending → Suspended), per-row actions, CSV export.
- **Insights** — membership-growth area chart, members-by-type donut, ranked top contributors,
  and a tiers panel showing expected renewal revenue and how many people each tier covers.
- Press **⌘K** (or the Search button) to jump here or add a member from anywhere.

### Financial management (`/admin` → Finance)
- **Transactions** — income and expense with category, programme allocation, donor/vendor, payment
  method, reference, and a **Cleared / Pending / Reconciled / Rejected** workflow.
- **Reporting** — period switcher (this month → financial year → all time) with KPI cards that show
  % change vs the previous period, income-vs-expense bars with a cumulative balance line, expense
  donut, funding-mix bars and a per-programme split.
- **Statutory documents** — 80G receipts and GFR 19-A utilisation certificates generated as PDFs
  straight from the books, with the amount spelled out in words (lakh / crore) as well as in figures.
  Details the law requires — 80G registration number, PAN, signatory — are set once in
  Admin → System → Compliance and print as `[add …]` placeholders until you fill them in.
- **Budgets** — annual budget per programme on the **Indian financial year (1 Apr – 31 Mar)**, with
  live *spent vs plan* progress and over/under flags, so it reads alongside the Income &
  Expenditure account and the Balance Sheet.
- **Commitments** — recurring pledges (monthly/quarterly/annual) with next-due dates, and one-click
  *Record receipt* that books the income and rolls the due date forward.
- **Exports** — filtered CSV for your accountant or auditor.
- **Quick entry** — a fast two-field form for recording money at an event or on the phone. Entries go
  into the same transactions as everything else; there is no separate scratchpad ledger.

### Accounting & statutory reports (`/admin` → Accounts, Reports)

The finance system above is the day-to-day record. Behind it sits a real
**double-entry ledger**, so the statements your auditor asks for come out of the same data:

- **Books** — every transaction posts a **balanced voucher** (Receipt / Payment / Journal) against a
  **chart of accounts** (1xxx assets · 2xxx liabilities · 3xxx funds · 4xxx income · 5xxx expenditure).
  Edit or delete a transaction and its voucher is re-posted automatically. You can also post manual
  journal vouchers (depreciation, accruals, corrections).
- **Accounts tab** — day book, chart of accounts with opening balances, per-account **ledger** with a
  running balance, and a **trial balance** as on any date.
- **Reports tab** —
  - **Receipts & Payments account** — cash and bank only, tying back to the cash ledger
  - **Income & Expenditure account** — surplus or deficit for any period
  - **Balance sheet** — assets vs funds and liabilities, carrying the year's surplus into the
    unrestricted fund
  - **Fund movement** — Corpus / Restricted / Unrestricted / **FCRA**, as fund accounting requires
  - **FCRA register** — every foreign-contribution voucher, kept separate
  - **80G receipts** — numbered `KSO/80G/2026-27/0001`, with donor PAN and address, and a queue of
    donations still awaiting a receipt
  - **Grants & CSR utilisation** — sanctioned vs received vs spent, per grant

Period defaults to the **Indian financial year (1 April – 31 March)**; custom ranges are supported.
Every statement exports to CSV.

Both systems run on **TanStack Query** over a single async data layer (`src/lib/db.js`) that writes
to localStorage by default and to **Supabase/Postgres** the moment you set two environment
variables — no component changes, and it degrades to local if the network fails.

---

## Project structure

```
kso-website/
├── index.html                  SEO, OpenGraph, JSON-LD (NGO schema)
├── vite.config.js              base path + host/allowedHosts config
├── tailwind.config.js          runtime-themeable palette (CSS variables)
├── src/
│   ├── main.jsx                entry (QueryClientProvider, toasts)
│   ├── App.jsx                 routes, layout, dynamic <title>, lazy admin
│   ├── index.css               design system (buttons, cards, fields)
│   ├── data/defaultContent.js  ← all seed content lives here
│   ├── store/useSite.js        Zustand store + localStorage persistence
│   ├── api/client.js           REST bindings (local-first, API-optional)
│   ├── ai/engine.js            retrieval, intents, LLM calls
│   ├── ai/studio.js            content templates
│   ├── data/seedData.js        membership + finance seed & reference lists
│   ├── data/accounts.js        chart of accounts, funds, seed grants
│   ├── lib/accounting.js       double-entry engine → trial balance, I&E, balance sheet
│   ├── lib/                    utils, icon map, cn, finance maths, db layer, supabase
│   ├── components/admin/ui/    shadcn-style primitives (Radix + cva)
│   ├── components/admin/       ⌘K command palette, login screen
│   ├── components/             Navbar, Footer, ChatWidget, UI kit
│   ├── pages/                  public pages
│   └── pages/admin/            control panel, its tabs, hooks + zod schemas
├── tests/                       render + navigation suites (`npm test`)
├── vercel.json  netlify.toml  .github/workflows/deploy-pages.yml
├── .env.example
└── DEPLOY.md                   hosting, payments, backend, go-live checklist
```

---

## How "control" works

**Zero-config mode (default).** Content is held in a Zustand store, persisted to
`localStorage`. It survives refresh and works on any static host with no backend and no
database. Perfect for one person maintaining the site.

**Team / multi-device mode.** Set `VITE_API_BASE_URL` and the same code issues real HTTP
calls (see `src/api/client.js` for the exact contract). If a request fails, it falls back to
localStorage, so the site never breaks.

**Backup.** Admin → Theme · Backup · Deploy → Export JSON. Copy that file to another browser
and import it, or commit it to git as your content source.

---

## Tech stack

React 18 · Vite 5 · Tailwind CSS 3 · Zustand 5 (persist) · React Router 6 · Lucide icons ·
TanStack Query 5 · Supabase JS · Recharts · react-hook-form + zod · Radix UI primitives ·
cmdk (⌘K palette) · sonner (toasts) · date-fns · uuid · marked.

No UI framework lock-in, no CSS-in-JS, no server required. The admin panel (Radix, Recharts,
cmdk, react-hook-form) is **code-split**, so public visitors download ~66 KB gzipped while the
control panel loads its own bundle only when someone opens `/admin`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server on `0.0.0.0:5173` |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm test` | Both suites: SSR render of every route/tab + jsdom navigation tests |
| `npm run test:ssr` | Renders all 14 public routes and all 11 admin tabs, checks data integrity |
| `npm run test:dom` | Mounts the real admin in jsdom: nav groups, badges, collapse, ⌘K palette |
| `BASE_PATH=/repo npm run build` | Build for a GitHub Pages project site |

Run `npm test` after any upgrade — it catches broken imports, crashed tabs and nav regressions
without clicking through the site.

See **DEPLOY.md** for hosting, custom domains, payment gateways and the go-live checklist.
