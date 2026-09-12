# File-by-file review — KSO website

**Reviewed:** 56 source files, 11,911 lines · **Result:** 2 live bugs fixed, 1 orphaned module rewired, 4 dead exports removed, 13 regression tests added · `npm test` → **137 checks green**.

**Update:** the accounting core landed — a double-entry engine, chart of accounts, vouchers and the statutory statements. See [module 4b](#4b-accounting-engine) and [module 10b](#10b-accounting--reports-tabs).

Health key: ✅ healthy · ⚠️ watch (size, duplication, coupling) · 🔴 issue (fixed in this pass)

---

## Module map

| Module | Files | Lines | Role |
|---|---:|---:|---|
| 1. Entry & config | 6 | 320 | Boot, routing, build, hosting |
| 2. State & persistence | 2 | 474 | Single store, UI prefs |
| 3. Data & integrations | 5 | 823 | Content, seed data, 3-tier backends |
| 4. Domain logic | 4 | 381 | Finance maths, helpers |
| 4b. **Accounting engine** | **2** | **700** | **Chart of accounts, double-entry, statements** |
| 5. AI | 2 | 606 | Assistant engine, content studio |
| 6. Public UI kit | 1 | 247 | Toasts, reveal, modal, fields |
| 7. Admin UI kit | 4 | ~980 | Radix primitives, sidebar, ⌘K, login screen |
| 8. Layout & widget | 4 | 512 | Nav, footer, hero, AI chat |
| 9. Public pages | 14 | 2,039 | The visitor-facing site |
| 10. Admin panel | 15 | 3,585 | Control panel + tabs |
| 10b. **Accounting & reports** | **2** | **1,201** | **Books, trial balance, statutory statements** |
| — | | | *Quick ledger retired: one store of money (transactions → vouchers → statements)* |
| 11. Tests | 5 | 380 | SSR + jsdom suites |

---

## 1. Entry & configuration

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `src/main.jsx` | 38 | Application boot | React root, BrowserRouter, QueryClient (10s stale, 1 retry), sonner `<Toaster>`, ToastProvider, TooltipProvider |
| `src/App.jsx` | 118 | Routing + shell | 14 public routes under `PublicLayout`, lazy `/admin` with Suspense skeleton, ScrollToTop, dynamic `<title>` + meta description from editable content |
| `src/index.css` | 149 | Design system | Tailwind layers; themeable CSS vars (brand/accent/ink); component classes (`.btn`, `.card`, `.field`, `.chip`, `.prose-kso`); reduced-motion guard |
| `tailwind.config.js` | 78 | Theme binding | Palette reads `rgb(var(--brand-500))`, custom fonts, shadows, keyframes; plugins `tailwindcss-animate` + `@tailwindcss/typography` |
| `vite.config.js` | 51 | Build | `0.0.0.0` host, `allowedHosts: true` (preview hosts), `BASE_PATH` for GitHub Pages, manual chunks (vendor/icons/charts) |
| `postcss.config.js` | 6 | CSS pipeline | tailwindcss + autoprefixer |

✅ **Healthy.** Code-splitting is doing its job: public bundle 230 KB raw / **67 KB gzipped**; admin (438 KB) and charts (434 KB) load only at `/admin`.

---

## 2. State & persistence

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `src/store/useSite.js` | 390 | Single source of truth | `content` (all site copy), `theme`, `settings`, `ai`, `memberships`, `transactions`, `pledges`, `budgets`, `accounts`, `vouchers`, `grants`, `receipts`, `submissions`, `authed`. Generic row CRUD (`addRow/updateRow/removeRow/setRows`), path-based content edits (`setContentPath`), list helpers, JSON export/import, demo-data clear, named-account auth, `applyTheme()` writing CSS vars |
| `src/store/migrations.js` | 196 | Versioned upgrade path | Pure `migratePersisted(state, fromVersion)` running steps v1→v8: roster→memberships, tier narrowing, double-entry books, named accounts, quick ledger folded in, budgets onto the FY, stale organisation name corrected. Also `buildBooks`, `DEFAULT_ADMIN_USERS`, `quickLedgerToTransactions`, `STORE_VERSION`. Fully unit-tested |
| `src/lib/useLocalStorage.js` | 28 | UI preferences | Persisted `useState`; used for nav collapse + group state (kept out of the site store on purpose) |

Notes:
- ⚠️ `authed` is deliberately **not** persisted — you sign in each session.
- ⚠️ **Accounts are browser-side.** `settings.adminUsers` is compared in JavaScript, so it deters casual visitors only. `DEPLOY.md → Securing the admin` documents backend, Supabase Auth and host-level options.
- ⚠️ Persist `version: 2` with a migration that converts the v1 roster into full membership records. Changing the shape again requires a new `version` + `migrate`, or existing installs will keep stale data.
- ⚠️ At 334 lines the store mixes content, finance, membership and auth. Fine at this size; split by domain if it passes ~600.

---

## 3. Data & integrations

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `src/data/defaultContent.js` | 382 | Seed content | Org details, hero, 4 programmes, about + values + milestones, impact, 3 events, 3 stories, 8 gallery images, team, testimonials, 6 FAQs, donation presets, SEO. Every value is admin-editable |
| `src/data/seedData.js` | 207 | Membership/finance seed + reference lists | 12 members (7 Individual / 5 Family with households), ~54 transactions across 6 months, 5 pledges, 4 budgets; constants (`MEMBER_TYPES`, `MEMBER_TIERS`, `TIER_FEES`, `HOUSEHOLD_RELATIONS`, `INCOME_/EXPENSE_CATEGORIES`, `PAYMENT_METHODS`, `TXN_STATUS`) |
| `src/lib/db.js` | 114 | Async data layer | **Three tiers:** Supabase → REST → localStorage. Identical interface, automatic fallthrough on failure. Powers all React Query hooks |
| `src/api/client.js` | 98 | REST tier 🔴 | Bearer-token fetch wrapper, returns `null` when unconfigured so callers fall back. Endpoints: content, members, transactions, pledges, budgets, ledger, submissions, ai/chat |
| `src/lib/supabase.js` | 22 | Supabase client | Created only when both env vars exist; table-name constants |

🔴 **Fixed this pass:** `api/client.js` had **zero importers** — a fully documented but dead module. It is now the REST tier inside `db.js`, so "connect your own backend" actually works for the membership and finance systems, not just content.

---

## 4. Domain logic

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `src/lib/documents.js` | 340 | Statutory documents | Pure builders `build80gReceipt` / `buildUtilisationCertificate` (80G deduction rules incl. the cash-over-₹2,000 exclusion, GFR 19-A rows and certified wording), `amountInWords`, and a thin jsPDF layout layer. jsPDF is imported on demand, so it ships as its own ~390 KB chunk and never loads unless a document is downloaded |
| `samples/` | — | Worked examples | `80g-receipt-sample.pdf` and `utilisation-certificate-sample.pdf`, generated from the seeded books |
| `src/lib/finance.js` | 202 → 250 | Finance maths (pure) + **financial-year helpers** (`fyLabelOf`, `currentFy`, `fyWindow`, `fyOptions`) and FY-aware `budgetVsActual` | `periodRange` (incl. Indian FY Apr–Mar), `inPeriod`, `monthlySeries`, `categoryBreakdown`, `programTotals`, `budgetVsActual`, `memberTotals`, `membershipGrowth`, `renewalState`, `financeKpis`, `money`/`compactMoney`, `toCSV` |
| `src/lib/utils.js` | 121 | General helpers | `cn`, `uid`, `slugify`, `formatCurrency`, `formatCompact`, `formatNumber`, `formatDate`, `isUpcoming`, hex→RGB + `mixHex` (theme ramp), `get`/`setImmutable`, download, clipboard, email/phone validators, file→dataURL |
| `src/lib/cn.js` | 6 | Class merger | `clsx` + `tailwind-merge` |
| `src/lib/iconMap.js` | 52 | Icon registry | 21 Lucide icons selectable in admin editors |

⚠️ **Duplication:** `money()` (finance.js) and `formatCurrency()` (utils.js) are the same `Intl` formatter; `formatDate` (utils) and `format()` (date-fns) are both in use. Low risk, but worth consolidating.

---

## 4b. Accounting engine

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `src/data/accounts.js` | 210 | Chart of accounts + funds | 40 accounts across 5 groups with opening balances; the **unrestricted fund is derived** so Assets = Liabilities + Funds always holds. Fund buckets (Unrestricted / Restricted / Corpus / FCRA); category→account and method→cash-account mapping; corporate-donor detection; 4 seed grants |
| `src/lib/accounting.js` | 490 | Double-entry engine (pure) | `transactionToVoucher` (single-entry → balanced voucher), `postings`, `closingBalances`, `trialBalance`, `ledger`, `receiptsPayments`, `incomeExpenditure`, `balanceSheet`, `fundSummary`, `fcraRegister`, `grantUtilisation`, 80G receipt numbering, Indian FY helpers |

Design decisions worth knowing:
- **The transaction stays the record the app talks to.** Donations, renewals and manual entries keep writing transactions; the store posts a voucher for each one and re-posts on edit, deletes it on removal. So nothing in the existing money flow had to change, and there is only one source of truth.
- **In-kind donations** post as a journal voucher (gifts-in-kind distributed ↔ donations in kind), leaving the surplus unaffected — the correct cash-basis treatment.
- **Grant matching** is a best guess (donor name for receipts, programme + date window for spend) and is editable, because guessing wrong on a funder report is worse than asking.
- Verified identities: trial balance Dr = Cr; Balance Sheet Assets = Liabilities + Funds; Receipts & Payments closing agrees with the cash and bank ledger. All three are asserted in `npm test`.

## 5. AI

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `src/ai/engine.js` | 349 | Visitor assistant | Knowledge builder (51 passages from live content), stemmed tokenizer, BM25-lite retrieval with IDF + title boost + **confidence gate** (guards junk matches), 6 intent handlers (tax → money-use → donate → volunteer → events → contact), OpenAI-compatible `chatOnline` with 5 provider presets, impact maths (`describeAmount`) |
| `src/ai/studio.js` | 257 | Team content generator | 8 templates (story, appeal email, social set, volunteer post, thank-you, event blurb, annual report, CSR pitch); offline template filler + LLM prompt builder |

✅ **Healthy.** The confidence gate was added after testing showed a nonsense query matching a random FAQ. Offline mode needs no key and invents nothing — it hands over your email instead.

---

## 6. Public UI kit

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `src/components/ui/index.jsx` | 247 | Shared primitives | Toast provider, `Reveal` (IntersectionObserver), `Counter`, `Modal` (portal, Esc, scroll lock), `Field`/`Toggle`/`Badge`/`SectionHeading`/`EmptyState`, `RichText` (**bold**/_italic_ renderer) |

⚠️ **Duplication:** `EmptyState` and `Badge` exist here *and* in the admin kit with different styling. Two toast systems coexist: this `ToastProvider` (public pages) and sonner (admin). Both render from `main.jsx`. Consolidating on sonner is the obvious cleanup.

---

## 7. Admin UI kit

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `src/components/admin/ui/index.jsx` | 505 | shadcn-style primitives | Button (cva), Input/Textarea/Label, Radix Select + `SelectField`, Dialog, AlertDialog→`ConfirmDialog`, Tabs, Badge, Card, Checkbox, Switch, Progress, Tooltip, DropdownMenu, Avatar, Separator, Popover, Skeleton, EmptyState, StatCard |
| `src/components/admin/SideNav.jsx` | 225 | Navigation | 5 grouped sections, collapsible groups + icon-only rail (both persisted), live badges, tooltips in collapsed mode, `aria-label` on every item, mobile grouped chip strip with auto-scroll, storage-mode footer |
| `src/components/admin/CommandPalette.jsx` | 120 | ⌘K palette | cmdk; mirrors the 5 nav groups + 6 actions; keyboard open/close |
| `src/components/admin/LoginScreen.jsx` | 130 | Admin sign-in | Email + password against `settings.adminUsers`; navy `#1e3a6e` on cream `#faf6ee` to match the KSOCHD portal; show/hide password, inline error, security caveat |

Notes:
- ⚠️ `Popover`, `Switch`, `Checkbox`, `Separator`, `CardHeader` are kit members not yet used by a tab — standard for a shadcn-style kit, but they are dead weight until something needs them.
- ✅ Collapsed items carry `aria-label` (added this pass after testing found icon-only buttons with no accessible name).

---

## 8. Layout & widget

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `src/components/layout/Navbar.jsx` | 137 | Public header | Utility bar (phone/email/admin), sticky blur on scroll, logo or monogram, 7 nav links, donate CTA, mobile drawer |
| `src/components/layout/Footer.jsx` | 112 | Public footer | 4-column layout, social icons (hidden when URL blank), contact block, registration/80G line |
| `src/components/PageHero.jsx` | 28 | Page banner | Shared hero for all inner pages, breadcrumb, optional background image |
| `src/components/ChatWidget.jsx` | 235 | Public AI assistant | Offline/LLM switch, streaming-free fetch with abort, graceful fallback on any error, suggested chips, amount quick-actions, conversation reset |

✅ **Healthy.** The widget never blocks the page: any AI failure silently degrades to the offline retriever.

---

## 9. Public pages

| File | LOC | Purpose | Notable features |
|---|---:|---|---|
| `Home.jsx` | 332 | Landing page | Hero + animated counters, 4 programmes, about teaser, featured stories, upcoming events, testimonials, FAQ accordion, CTA |
| `Donate.jsx` | 396 | Donation flow 🔴 | 4 steps (amount → frequency → details → payment), live impact maths per amount, presets + custom, PAN capture, anonymous option, UPI/card/bank instructions, confirmation with receipt promise |
| `Volunteer.jsx` | 219 | Applications 🔴 | "What to expect" steps, most-needed roles, multi-select roles + availability, validated form |
| `About.jsx` | 152 | About page | Mission/vision, story, registration table, values, milestone timeline, team grid |
| `Impact.jsx` | 153 | Transparency 🔴 | Counters, allocation bar, yearly bar chart, live ledger totals, report downloads |
| `Events.jsx` | 145 | Events | Upcoming/past tabs, registration modal → inbox, capacity, open/closed state |
| `Contact.jsx` | 133 | Contact | Topic routing, validated form, contact block, map slot |
| `Programs.jsx` | 72 | Programme list | Alternating layout, per-programme metrics, cost-per-unit |
| `ProgramDetail.jsx` | 113 | Programme page | Markdown-ish body, practice notes, sticky cost/impact aside, related programmes |
| `Stories.jsx` | 93 | Blog index | Category filters, featured hero story |
| `StoryDetail.jsx` | 81 | Article | Long-form, share-link copy, related stories |
| `Gallery.jsx` | 80 | Gallery | Masonry, tag filters, lightbox with prev/next |
| `ProgramDetail`/`NotFound` | 113 / 18 | Detail + 404 | — |

🔴 **Three fixes this pass:**
1. **`Volunteer.jsx` was broken** — it called `useSite((s) => s.addMember)`, an action deleted during the membership refactor. Every application threw `TypeError: addMember is not a function` after the inbox write. It now creates a proper **Pending membership record** via `addRow('memberships', …)`, so applications land in the Membership system instead of only the inbox.
2. **`Donate.jsx` bypassed the finance system** — donations went into the legacy quick ledger, so nothing appeared in Admin → Finance. It now persists through `db.transactions.create()` (Supabase / REST / local, whichever is live), with a `WEB-…` reference and `Pending` status for UPI/bank.
3. **`Impact.jsx` reported the wrong ledger** — switched to `transactions` so the public page reflects the finance system.

*These three were invisible to the previous test suites, which rendered pages but never submitted a form.* Two regression tests now cover them.

---

## 10. Admin panel

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `Admin.jsx` | 257 | Shell 🔧 | Grouped nav config (`ADMIN_GROUPS`), passcode gate, header (storage mode, unread count, Search, View site, Lock), live badge counts, ⌘K event-bus actions, lazy content grid |
| `membership/MembershipTab.jsx` | 234 | Membership system — orchestrator | Queries, mutations, KPI/stats maths, renewal (fee first, then the record), CSV export. Renders three panels; nothing in the folder touches the store |
| `membership/DirectoryPanel.jsx` | 165 | Directory tab | Search, three filters, four sorts, inline status, row actions (view / edit / renew / suspend / delete) |
| `membership/MemberForm.jsx` | 213 | Add/edit dialog | RHF + zod, with the conditional household editor for Family tiers |
| `membership/MemberDetail.jsx` | 119 | Profile dialog | Household, contributions, renewal state, progress |
| `membership/InsightsPanel.jsx` | 92 | Insights tab | Growth area chart, type mix donut, top contributors |
| `membership/TiersPanel.jsx` | 39 | Tiers & fees tab | Members per tier, renewal value, people covered |
| `membership/useMemberFilters.js` | 43 | Filter state | Search + three filters + sort, and the filtered rows |
| `finance/GrantForm.jsx` | 119 | Grant dialog | Record a grant or CSR commitment. `received` / `utilised` are computed from the books, deliberately not form fields |
| `FINANCE_FLEXIBILITY.md` | — | Review | What is configurable in the finance and reporting stack, what is fixed, and why |
| `SETTINGS_REVIEW.md` | — | Review | Gap audit of the admin, site and system settings surfaces |
| `src/lib/palette.js` | 3 | Chart palette | `CHART_COLORS`, shared by the finance and membership charts (previously duplicated) |
| `finance/FinanceTab.jsx` | 260 | Finance system — orchestrator | Owns the queries, mutations, period/KPI maths and CSV export, then renders four panels. Nothing else in the folder touches the store |
| `finance/OverviewPanel.jsx` | 121 | Overview tab | Income/expense + cumulative chart, expense donut, funding mix, programme split |
| `finance/TransactionsPanel.jsx` | 136 | Transactions tab | Filter bar plus the ledger table: status workflow, reconcile, edit, delete. Presentational — no data of its own |
| `finance/BudgetsPanel.jsx` | 96 | Budgets tab | Plan vs actual for one financial year, plus the form that sets budgets |
| `finance/PledgesPanel.jsx` | 69 | Commitments tab | Recurring pledges, what is due next, one-click receipt |
| `finance/TransactionForm.jsx` · `PledgeForm.jsx` | 110 · 79 | Row dialogs | Add/edit one transaction or commitment |
| `finance/useTransactionFilters.js` | 39 | Filter state | The five table filters plus the filtered rows, kept together so the panel stays presentational |
| `AiTab.jsx` | 285 | AI control | Provider presets, key storage, system prompt, live test console, content studio with "save as draft story" |
| `SystemTab.jsx` | 247 | System | Theme presets + colour pickers, logo upload, passcode, JSON backup/import/reset, deploy command reference |
| `CollectionsTab.jsx` | 185 | Content collections | Programme / event / story editors with reorder, metrics, image upload |
| `AboutTab.jsx` | 159 | About content | Body paragraphs, values, milestones, team, testimonials, gallery |
| `OverviewTab.jsx` | 168 | Dashboard | KPI grid, demo-data warning, recent ledger/inbox, AI status, upcoming events |
| `LedgerTab.jsx` | 137 | Quick ledger | Lightweight manual entries + CSV (now explicitly the scratchpad) |
| `ImpactTab.jsx` | 119 | Impact content | Stats, allocation, yearly figures, report links |
| `InboxTab.jsx` | 122 | Inbox | Filter by kind/status, expand, reply/call links, mark handled |
| `SiteContentTab.jsx` | 118 | Site content | Org details, socials, bank/UPI, hero copy, donation presets, SEO + AI notes |
| `components.jsx` | 156 | Admin form kit | `Panel`, `TF`, `TA`, `SEL`, `ImageField`, `ListEditor` |
| `hooks.js` | 85 | Data hooks | 16 React Query hooks (query + create/update/delete per resource) with cache invalidation |
| `schemas.js` | 59 | Validation | zod schemas for member, transaction, pledge (+ budget) |

Notes:
- **Subscriptions:** every store read goes through a selector (`useSite((s) => s.x)`); there are no
  whole-store subscriptions left, so editing content no longer re-renders the finance and membership
  tabs. The React `key` warning on the chart-of-accounts fragment is fixed, and the DOM suite fails
  if a key or nesting warning appears in the console again.

- ⚠️ Largest remaining files: `AccountingTab` (642) and `ReportsTab` (594). Both are tab containers with one `Panel` per statement, so they split the same way as `FinanceTab` and `MembershipTab` — which are now `finance/` (orchestrator 263 + 4 panels + 2 dialogs + filter hook) and `membership/` (orchestrator 234 + 3 panels + 2 dialogs + filter hook). Neither is urgent; both are mechanical.
- ✅ Nav preferences live in `useLocalStorage`, not the site store — they don't pollute backups.
- ⚠️ Two parallel UI kits are in use: this `components.jsx` (Tailwind-class forms) and `components/admin/ui` (Radix). New admin work should use the Radix kit; migrating the older tabs is cosmetic debt, not a bug.

---

## 10b. Accounting & reports tabs

| File | LOC | Purpose | Features |
|---|---:|---|---|
| `AccountingTab.jsx` | 642 | The books | Day book (search, type filter, CSV), chart of accounts with opening + closing balances, per-account ledger with running balance, trial balance as on any date; manual journal voucher form that refuses to post unless debits equal credits |
| `ReportsTab.jsx` | 559 | The statements | Receipts & Payments, Income & Expenditure, Balance Sheet, fund movement + FCRA register, 80G receipt issuing and register, grants & CSR utilisation. Period switcher defaults to the Indian FY; every statement exports to CSV |

Both are registered in the **People & money** nav group, taking the sidebar to 13 items and the ⌘K palette with it.

## 11. Tests

| File | LOC | Purpose |
|---|---:|---|
| `tests/entry.ssr.jsx` | 76 | SSR entry: renders every public route + all 11 admin tabs |
| `tests/run-ssr.mjs` | 44 → ~80 | Asserts routes render, all 13 tabs render, seed data + finance maths hold, and the books balance (13 double-entry checks) |
| `tests/entry.dom.jsx` | 52 | jsdom entry: mounts real Admin and public routes |
| `tests/run-dom.mjs` | 128 → ~230 | Nav IA, badges, collapse, group toggles, ⌘K, **volunteer submit**, **donation persistence**, **tier + household**, **books & reports tabs** |
| `tests/vite.config.js` | 18 | Builds entries into a Node-runnable bundle |

`npm test` runs both. Coverage gaps that remain: Events registration modal, Contact submit, donate multi-step navigation, and the AI chat send path.

---

## Cross-cutting findings

**Fixed in this pass**
| # | Finding | Severity | Action |
|---|---|---|---|
| 1 | `Volunteer.jsx` called a deleted store action | 🔴 Broken form | Now creates a Pending membership record |
| 2 | Donations never reached the finance system | 🔴 Silent data loss | Now writes via `db.transactions.create` |
| 3 | `Impact.jsx` showed the legacy ledger | 🟠 Wrong numbers | Switched to `transactions` |
| 4 | `api/client.js` had zero importers | 🟠 Dead documented feature | Wired as the REST tier in `db.js` |
| 5 | Dead exports: `SaveBar`, `useOrg`, `SelectGroup` | 🟢 | Removed |
| 6 | Collapsed nav items had no accessible name | 🟠 a11y | `aria-label` added + asserted |

**Remaining debt, ranked**
1. **Two UI kits / two toast systems / two money formatters.** Cosmetic, but every new file has to pick a side. Consolidating on the Radix kit + sonner + `money()` is a focused cleanup.
2. **Two largest tabs** (768 / 740 lines) — extract their dialog forms.
3. **Store at 334 lines** mixing four domains — split when it passes ~600.
4. **Test coverage** stops short of the donate multi-step, event registration, contact form, AI send path, the voucher entry form and the 80G issue flow — the exact class of gap that hid bugs 1–3.
5. **The store's v3 → v4 migration** (building vouchers for existing transactions) shares its logic with the tested seeding path, but the migration plumbing itself is not yet covered by a test.
5. **Security:** the admin passcode is browser-side (fine for casual protection; DEPLOY.md documents real auth options), and any LLM key in the browser is readable — proxy via `/ai/chat` for production.

**What I'd do next, in order:** consolidate the duplicated primitives → extract the two big tabs' forms → add the four missing interaction tests → then feature work.
