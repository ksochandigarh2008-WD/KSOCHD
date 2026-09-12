# Flexibility of the reporting and financial systems

How much of the finance stack can be adapted without touching code, and what is fixed by design.
Checked against the code as it stands, not assumed.

---

## Verdict

**The engine is principled; the configuration around it is thin.** Double-entry, fund accounting,
grant tracking and the statutory statements are all genuinely built — but several of the things an
NGO would want to *change* (funds, categories, payment methods, grant records) are module constants
with no screen.

The single worst gap was **grants**: the entire data layer existed — store, db, API, hooks — with no
UI to create one, so every grant report was permanently limited to the four demo grants. That is
fixed in this pass (see below).

---

## What is flexible today

| Axis | How flexible | Notes |
|---|---|---|
| Chart of accounts | **Good** | Add / edit / delete accounts in Admin → Accounts. Classification is by code prefix (1xxx assets … 5xxx expenditure), so new heads slot in correctly. |
| Reporting period | **Good (Reports)** | Presets *plus* a custom date range, applied to every statement. |
| Programmes | **Good** | Content-driven. Add a programme and it appears across budgets, programme split, grants and CSVs. |
| Grants | **Good (as of now)** | Create, edit, delete. See below. |
| Accounting basis | **Both** | Receipts & Payments (cash) and Income & Expenditure (accrual) are both produced from the same vouchers. |
| Budgets | **Moderate** | Per programme, per financial year. Not head-wise, not phased by quarter. |
| Export | **Moderate** | CSV everywhere; PDF for 80G receipts and utilisation certificates. No PDF for the statements themselves. |
| Journals | **Moderate** | Vouchers are derived from transactions. Manual journal vouchers are preserved by migration but there is no UI to post one. |

---

## What is fixed (and needs a code change today)

| Axis | State | What it would take |
|---|---|---|
| **Funds** | `FUNDS = ['Unrestricted', 'Restricted', 'Corpus', 'FCRA']` — a constant | A settings-backed list with a migration. Small, but touches `fundSummary`, the Balance Sheet and the fund register. |
| **Categories, payment methods, member types, tiers, centres** | Constants in `seedData.js`, consumed as dropdown options | A generic "option lists" editor in Settings. No schema change — the lists are only options. |
| **Financial year start** | Hardcoded 1 April (`fyStart`) | Correct for every Indian NGO. Changing it is a config value plus tests. |
| **Currency** | Single INR, hardcoded formatter | Multi-currency is a large change (rates, revaluation, FCRA reporting). Not worth it unless you actually receive foreign currency. |
| **Analytic dimensions** | Programme + fund + grant only | No cost centre, department or location. A second dimension is a schema change across transactions and vouchers. |
| **Statement formats** | Fixed set: R&P, I&E, Balance Sheet, Trial Balance, fund summary, FCRA register, 80G register, grant utilisation | A report builder is a much bigger build. The fixed set covers what Indian NGOs are asked for. |
| **Period control in Finance** | Presets only (Reports has custom range) | Reuse the Reports range picker. |

### Fixed on purpose — and should stay fixed

- **Vouchers are derived from transactions**, never typed freehand. That is what keeps the balance
  sheet honest. A "quick journal" would reintroduce the two-sources-of-truth problem the quick
  ledger retirement removed.
- **April–March financial year** and **INR** — correct for the jurisdiction.
- **Numbers on certificates come from the books**, not from typed totals. `received` and `utilised`
  on a grant are computed, never stored, so a utilisation certificate cannot claim a figure the
  accounts cannot support. This is enforced in `grantSchema` as well as the UI.

---

## Changed in this pass: grants are now recordable

`useCreateGrant`, `useUpdateGrant` and `useDeleteGrant` already existed and the grants table was
already in the store, the db layer and the API client — but no screen used them. The only grants
that could ever exist were the four seeded demo ones, and the empty state pointed at a screen that
did not exist ("Add grants in the finance system").

Added:

- `GrantForm` (`src/pages/admin/finance/GrantForm.jsx`) — funder, purpose, sanction number,
  sanctioned amount, period, programme, fund, status.
- Create / edit / delete from Admin → Reports → Grants, with a confirmation on delete.
- `grantSchema` — requires funder, purpose and a period; rejects negative amounts and an end date
  before the start date; and deliberately has **no** `received` or `utilised` field.
- Corrected `budgetSchema`, which still validated `year` after budgets moved to financial years in
  v7. It now validates `fy`.
- Tests: 8 schema checks plus a DOM flow that records a grant through the real form and asserts it
  lands in the store with the amount as a number (4 → 5 grants).

---

## Roadmap for flexibility, in the order I would do it

1. **PDF for the statutory statements** — R&P, I&E, Balance Sheet, Trial Balance. The jsPDF layer and
   the print layout work from the 80G receipt and the utilisation certificate are already written, so
   this is mostly layout, not plumbing. Funders and trustees ask for these as documents, not CSVs.
2. **Editable option lists** — categories, payment methods, centres, tiers. One settings panel, no
   migration, removes the most common "why can't I add this" friction.
3. **Custom date range in Finance** — the Reports tab already has one; lift it.
4. **Extensible funds** — needed only if you want a fund beyond the four (a designated or building
   fund, say). Larger than it looks because the Balance Sheet groups by fund.
5. **Manual journal vouchers** — the one legitimate gap in "everything posts from a transaction":
   accruals, depreciation and corrections. Worth doing carefully, with an audit trail, rather than as
   a free-text voucher.

I would not do multi-currency, a report builder or a second analytic dimension unless a real
requirement arrives. Each is a schema change across the whole book, and the current model already
covers what an Indian NGO is asked to produce.
