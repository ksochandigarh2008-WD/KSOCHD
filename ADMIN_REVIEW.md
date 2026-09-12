# Admin panel — logic review

**Scope:** the shell, 13 tabs, shared hooks, schemas, sidebar, ⌘K palette and login screen.
**Result:** 8 logic defects fixed · `npm test` → **163 checks green**.

**Update 1:** the quick ledger is retired (finding 13). One store of money now: transactions →
vouchers → statements.

**Update 2:** budgets moved onto the **financial year** (finding 4). Budget vs actual now counts
1 Apr – 31 Mar, matching the Income & Expenditure account and Balance Sheet instead of the calendar
year. Legacy calendar-year budgets are migrated and still understood.

**Update 3:** 80G receipts and GFR 19-A utilisation certificates are now generated as PDFs from the
books (Admin → Reports). Statutory details live in Admin → System → Compliance and print as
`[add …]` placeholders until filled in.

**Update 4:** the migration pipeline is extracted to `src/store/migrations.js` as one pure function,
`migratePersisted(state, fromVersion)`, and every step from v1 to v8 is unit-tested (finding 11).

**Update 6:** grants are now creatable in Admin → Reports → Grants. The store, db, API and hooks all
existed; only the screen was missing, so every grant report was stuck on the four demo grants.
`grantSchema` added, and `budgetSchema` corrected (it still validated `year` after v7 moved budgets
to financial years). See `FINANCE_FLEXIBILITY.md`.

**Update 5:** a settings audit (see `SETTINGS_REVIEW.md`) found the placeholder organisation name
still shipping in the AI system prompt and the SEO description. Both defaults are corrected and a
v8 migration rewrites the stale text in existing browsers, leaving hand-edited prompts alone.
That surfaced a real defect: the v1 → v2 step ended in an early `return`, so an old store stopped
half-migrated — no chart of accounts, no vouchers, and **no admin user**, i.e. locked out of the
panel. Steps now fall through, and a test asserts it. `npm test` → **216 checks green**.

This review is about *logic* — whether the numbers are right and the data flows hold. For
per-file purpose and features, see `FILE_REVIEW.md`.

---

## Findings, ranked

| # | Defect | Severity | Impact | Status |
|---|---|---|---|---|
| 1 | Overview tab read the quick-ledger scratchpad, not the finance system | 🔴 High | Dashboard showed **₹1,31,200** received when the real figure was **₹29,49,300** — a 22× understatement | Fixed |
| 2 | Transaction mutations never invalidated the `vouchers` query | 🔴 High | Record money in Finance → Accounts/Reports keep showing stale books until a refetch happens | Fixed |
| 3 | "vs previous period" compared windows of different lengths | 🟠 Medium | `fy` (a partial year) was measured against a fixed 12 months, so every trend percentage was wrong | Fixed |
| 4 | Chart ignored the period selector | 🟠 Medium | Selecting "This month" still drew a six-month chart | Fixed |
| 5 | Budget vs actual hardcoded `new Date().getFullYear()`, and counted calendar-year spend | 🟠 Medium | No way to review any other year; figures jumped on 1 Jan; budgets could never be read next to the FY statements | Fixed (FY picker + Apr–Mar maths) |
| 6 | Renewal marked the member renewed *before* recording the fee | 🟠 Medium | If the fee write failed, the member was renewed with no money in the books | Fixed (money first) |
| 7 | `memberTotals` only counted rows with a `memberId` | 🟠 Medium | Website donations (which carry no member link) never reached a member's "contributed" total | Fixed (name fallback) |
| 8 | Three destructive actions used native `confirm()` | 🟠 Medium | Sandboxed previews block `confirm()` — **"Clear inbox" did nothing at all** | Fixed (ConfirmDialog) |

**Also found, not yet fixed:**

| # | Issue | Why it's still open |
|---|---|---|
| 9 | Account roles (Admin / Editor / Viewer) are stored but **not enforced** — everyone can do everything | Enforcing them across 13 tabs is its own piece of work. A note now says so in System → Security so the selector isn't misleading |
| 10 | Several tabs subscribe to the whole store (`useSite()`), so any keystroke anywhere re-renders them | Perf only, not correctness. Safe to change, but touches 5 files |
| 11 | The v3→v4→v5 migrations share logic with tested seeding paths, but the migration plumbing itself has no test | Needs a fixture harness that fakes old persisted payloads |
| 12 | Grant matching is a heuristic (donor name for receipts, programme + date window for spend) | Documented in `FILE_REVIEW.md`; wrong guesses on a funder report are worse than blanks, so it stays editable |
| 13 | ~~Quick ledger and the finance system are two separate stores of money~~ | **Fixed** — see "One store of money" below |

---

## 1. Overview — was reporting the wrong database

`OverviewTab` computed income, spend, balance and donor count from the legacy `ledger` slice
(3 demo rows) while the finance system held 59 transactions. Every money card was wrong, and they
linked to the quick ledger rather than Finance.

Now reads `useTransactions()` — the same source the Finance, Accounts and Reports tabs use — and the
cards link to Finance and Reports.

*Regression test asserts the two totals differ, that the finance total is rendered, and that the
quick-ledger total is **not**.*

## 2. Books went stale behind the Finance tab

Transactions and vouchers are two views of the same money: the store posts a voucher for every
transaction. But `useCreateTransaction`, `useUpdateTransaction` and `useDeleteTransaction`
invalidated only `qk.transactions`, so the `vouchers` query — which feeds Accounts and every
statement in Reports — kept serving cached data.

All three now invalidate both keys via a shared `TXN_KEYS` constant.

*Not covered by an automated test* — React Query's cache behaviour isn't exercised by the current
harness. This one rests on code review, and it's the finding most worth a second pair of eyes.

## 3–5. Period maths

- **Previous period** now uses a shared, unit-tested `previousPeriod(range, period)` helper: the
  window immediately before, of the **same length**. "All time" returns `null` and the comparison
  hides rather than lying.
- **Chart** now derives its month count from the selected range, so the chart follows the switcher.
- **Budgets** gained a year picker (populated from budgets on file plus the current year) instead of
  silently using today's year.

**Resolved:** budgets are now stored per **financial year** (`fy: "2026-27"`) and `budgetVsActual`
counts spend from 1 Apr to 31 Mar, so the budget view, the I&E account and the Balance Sheet all
describe the same twelve months. Legacy `year` budgets are migrated to their FY and still resolve.
New helpers in `lib/finance.js`: `fyLabelOf`, `currentFy`, `fyWindow`, `fyOptions` — all unit-tested.

*Note for anyone who had already entered budgets: a calendar-2026 budget became FY 2026-27, which
covers Apr 2026 – Mar 2027 rather than Jan – Dec 2026. Worth a glance to confirm the figures.*

## 6–7. Money integrity

- Renewal writes the fee **first**, then marks the member renewed. A failed fee write now leaves
  everything untouched, instead of silently renewing someone for free.
- `memberTotals(txns, members)` falls back to an exact, case-insensitive party-name match for income
  rows with no `memberId` — website donations and event cash now reach the member's record. Only
  rows *without* a memberId fall back, so nothing double-counts.

**Process note:** the `memberTotals` fix was applied twice. The first patch silently no-oped (a typo
in my search string), and only the new regression test caught it. Worth remembering: a green build
proves nothing about a patch that never landed.

## 8. Destructive confirmations

`InboxTab`, `LedgerTab` and `SystemTab` used native `confirm()`. The preview renders in an iframe with
`sandbox="allow-scripts"` and **no** `allow-modals`, so `confirm()` returns false immediately —
"Clear inbox" appeared to do nothing. All three now use the Radix `ConfirmDialog` already used
elsewhere in the panel.

*Regression test opens the dialog, verifies nothing was deleted, cancels, and verifies the messages
survive.*

---

## One store of money (quick ledger retired)

The quick ledger was a second list of money that nothing reconciled against. It caused defect #1
directly, and every screen had to remember which of the two it meant.

- **Quick entry** replaces it: a fast form that writes a real transaction, which posts a voucher and
  flows through Accounts and every statement in Reports. The list beside it shows the 25 most recent
  transactions system-wide, with delete.
- **Migration (v5 → v6)** converts any existing ledger rows into transactions on upgrade — donor →
  party, income → Donation, expense → Program expense, tagged `migratedFrom: 'quick-ledger'` and
  keeping the `demo` flag so they can still be cleared in one click. The ledger is then emptied so it
  can never migrate twice.
- **Removed:** the `addLedger`/`updateLedger`/`clearLedger` actions, the `/ledger` REST endpoints, and
  `ledger` from backups, demo-clear and reset.
- The migration itself is unit-tested (10 checks) even though the persist plumbing still isn't — that
  was the gap in finding #11, and it was cheap to close for the part that can lose data.

*Regression test records an entry and asserts it creates both a transaction **and** a voucher, linked
by `sourceId`.*

---

## Module notes

Correct as reviewed, with the caveats above:

| Module | Logic verdict |
|---|---|
| `Admin.jsx` (shell) | Grouped IA, live badge counts, ⌘K event bus and jump-to-group all sound. `authed` correctly stays in memory only |
| `LoginScreen.jsx` | Email/password against `settings.adminUsers`, timing-safe enough for its purpose; fails closed |
| `MembershipTab` | Filters, sorts, tier→fee, household handling, CSV all correct. Renewal ordering fixed; **split into `membership/`** (orchestrator + 3 panels + 2 dialogs + filter hook) |
| `FinanceTab` | KPIs, status workflow, pledges, CSV correct. Period maths fixed; budgets gained a year picker; **split into `finance/`** (orchestrator + 4 panels + 2 dialogs + filter hook) |
| `AccountingTab` | Voucher form refuses to post unbalanced entries; trial balance, ledger and CoA read from the engine |
| `ReportsTab` | Six statements, each reconciling (R&P ties to the cash ledger, BS balances, TB balances) |
| `InboxTab` / `LedgerTab` | Correct within their slices; confirmations fixed |
| `CollectionsTab` / `AboutTab` / `SiteContentTab` / `ImpactTab` | Straight content editing via dedicated store actions — no issues |
| `AiTab` | Provider presets, key handling and test console behave; key is browser-side (documented) |
| `SystemTab` | Theme, backup import/export, reset and account management reviewed; roles flagged as unenforced |
| `hooks.js` | Query keys centralised; transaction mutations now invalidate both views |
| `schemas.js` | Zod validation sound — Indian mobile regex, positive amounts, required party |

---

## Suggested next steps

1. **Enforce roles** (finding 9) — the UI already offers them.
2. **Add a migration test harness** (11) — fake persisted payloads at v3/v4 and assert the upgrade.
3. **Collapse the quick ledger into the finance system** (13), or rename it "Scratchpad" everywhere
   so it can't be mistaken for the books again.
4. ~~**Move budgets onto the financial year** so they match the statements.~~ Done.
4b. ~~**80G receipt + utilisation certificate print skins.**~~ Done — PDF, not print-CSS, at your
     request. jsPDF is code-split so the ~390 KB only loads on download.
5. ~~**Replace whole-store subscriptions** with selectors (10).~~ Done — no `useSite()` without a selector remains anywhere in `src/`. Also fixed a missing React `key` on the chart-of-accounts fragment; the DOM suite now asserts the console is free of key warnings.
5b. ~~**Split `MembershipTab` (820 lines).**~~ Done. `AccountingTab` (642) and `ReportsTab` (594) are now the largest files and split the same way.
6. **Enforce account roles** (9) — but only after real server-side auth exists, or it is theatre.
7. **Fill in the compliance details** before issuing a receipt to a real donor — 80G number, PAN,
   signatory. The documents print placeholders until then, by design.
