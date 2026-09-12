# Settings review — Admin, Site and System

Audit of every configurable surface in the app: what exists, what is missing, and what I would
build first. Grounded in the code as it stands (store `version: 8`), not in a generic checklist.

Scope: `src/store/useSite.js` · `src/pages/admin/{SiteContentTab,SystemTab,AiTab,CollectionsTab}.jsx`
· `src/pages/admin/schemas.js` · `src/api/client.js` · `src/data/defaultContent.js`

---

## Summary

The settings surface is **thin and unvalidated**. Five keys in `settings`, three in `theme`,
nineteen in `ai`, and the rest spread across sixteen content slices. None of it is validated,
none of it is logged, and none of it can reach a server.

Four things stand out:

1. **Nothing records who changed what.** No audit trail exists anywhere. Bank details, the UPI ID,
   member records and money entries can all be edited with no trace. For an NGO that handles
   donations, this is the most serious gap in the app.
2. **Contact and volunteer messages are never delivered.** They are written to `localStorage` and
   sit there until someone opens the Inbox. There is no email, no webhook, no notification setting.
3. **No settings are validated.** `schemas.js` covers members, transactions, pledges and budgets —
   nothing else. The `validateEmail` / `validatePhone` helpers exist and are used on the *public*
   forms, but the admin never calls them. A typo in the donation email goes live silently.
4. **Two live defects, now fixed** — the placeholder organisation name ("Kalyan Sewa Organisation")
   was still in the AI assistant's system prompt and in the site's SEO meta description, so the
   chatbot introduced itself by the wrong name. Fixed in the defaults **and** migrated for existing
   browsers (v7 → v8), with tests. Details at the end.

---

## What exists today

### Site settings — Admin → Site content

| Panel | What it covers |
|---|---|
| Organisation | Short name, legal name, tagline, founded, city, areas, address, phone, email, hours, registration no., 80G text, FCRA text |
| — social links | Facebook, Instagram, Twitter, YouTube, LinkedIn |
| — payment | UPI ID, bank name, account number, IFSC |
| Homepage hero | Heading, sub, image, buttons |
| Donation settings | Heading, sub-heading, preset amounts (add / remove) |
| SEO | Meta description, plus "extra notes for the AI assistant" |

Admin → Collections edits the content lists: programs, events, stories, gallery, team,
testimonials and FAQs.

### System settings — Admin → System

| Panel | What it covers |
|---|---|
| Colours | Brand + accent hex, five presets |
| Logo | Upload (stored as a data URL) |
| Security | Named accounts, add/remove, change own password |
| Compliance & signatory | 80G number and validity, PAN, registration, address, place, signatory name + designation |
| Backup | Export all as JSON, import JSON, reset everything |
| Hosting | Copy-paste deploy commands for Vercel / Netlify / Pages / S3 |

### Admin / AI settings — Admin → AI assistant

Provider (`offline` / OpenAI-compatible), base URL, model, API key, temperature, persona name,
system prompt, greeting, suggested questions, widget visibility toggle, offline knowledge base.

### Store shape

```
settings: { logo, adminUsers[], aiWidgetEnabled, showDemoBadge, compliance{…} }
theme:    { brand, accent, radius }        ← radius is stored but never read
ai:       { enabled, provider, baseUrl, model, apiKey, temperature, personaName,
            systemPrompt, greeting, suggestions[], … }
content:  { org, hero, stats, about, programs, impact, events, stories, gallery,
            team, testimonials, faqs, donationPresets, donationCopy, ai, seo }
```

---

## Status of the findings (updated)

| # | Finding | Status |
|---|---|---|
| P0-1 | No audit trail | **Implemented** |
| P0-2 | Submissions never delivered | **Implemented** — settings + webhook; needs a URL you supply |
| P0-3 | No validation on settings | **Implemented** — organisation + compliance, reported inline |
| P0-4 | No session timeout | **Implemented** — configurable, default 30 min |
| P1-5 | Global-only SEO | Next |
| P1-6 | No analytics / consent | Next |
| P1-7 | No media library | Queued |
| P1-8 | No draft/preview | Queued |
| P1-9 | No undo | Queued |
| P1-10 | Settings not server-backed | **Blocked** until a backend exists |
| P1-11 | No CSV import | Queued |
| P1-12 | `theme.radius` is dead | Queued (small) |
| P1-13 | AI ops invisible | Queued (small) |
| P2-14 | No i18n | **Not planned** — a rewrite, not a setting |
| P2-15 | No locale/currency | **Not planned** — INR-only is correct for this org |
| P2-16 | No dark mode | Queued |
| P2-17 | No scheduled backup | **Blocked** until a backend exists |
| P2-18 | No feature flags | Queued (small) |
| P2-19 | No runtime env view | Queued (small) |

### What the P0 work changed

**Audit trail.** Every create, update and delete of a member, transaction, grant, budget, account or
receipt, every settings and content edit, every sign-in and sign-out is recorded with who did it and
when, in Admin → System → Activity. A burst of typing collapses into one entry instead of one row per
keystroke; the trail is capped at 500 entries, and can only be exported — never cleared from the panel.

**Delivery.** A browser cannot send email, and a mail API key in a static bundle is public, so
delivery is delegated: paste a URL that accepts a POST (Formspree, Make, n8n, a Supabase Edge
Function, your own endpoint) and every submission is forwarded there. Messages stay in the Inbox
regardless, so a failed delivery never loses one. Nothing leaves the browser until that URL is set.

**Validation.** The organisation block and the compliance block are checked for format — email, phone,
UPI ID, IFSC, account number, PAN, 80G validity period. Problems show inline and never block saving:
locking the admin out of all settings until they know their 80G number would be worse than a wrong one
they can see flagged.

**Session timeout.** Configurable idle sign-out (15 min / 30 min / 1 hr / 2 hr / never), watching
mouse and keyboard activity. A convenience guard, not a security boundary — the boundary is
server-side auth.

---

## What is missing

Priorities: **P0** = can embarrass, lose money or lose data · **P1** = capability a site like this
is expected to have · **P2** = polish.

### P0

| # | Gap | Why it matters | Effort |
|---|---|---|---|
| 1 | **No audit trail** | Anyone with panel access can change the bank account or delete a donor record and nothing records it. The books are double-entry and careful; the settings around them are not. | M |
| 2 | **No email / notification delivery** | Contact and volunteer forms write to `submissions` in the browser only. No SMTP setting, no webhook, no notification. A donation enquiry can sit unseen for weeks. | M |
| 3 | **No validation on settings or content** | `schemas.js` has four schemas; settings has none. Email, phone, UPI ID, PAN, dates and social URLs all accept anything. | S |
| 4 | **No session timeout or auto-logout** | `authed` is correctly not persisted, but nothing expires an idle session or re-asks for a password before destructive actions. (Roles — Admin/Editor/Viewer — are stored but unenforced by design until there is server-side auth.) | S |

### P1

| # | Gap | Why it matters | Effort |
|---|---|---|---|
| 5 | **SEO is global-only** | Only `metaDescription` is editable — `titleSuffix` exists in the data with no field. No per-page titles or descriptions, no OG image, no Twitter card, no sitemap/robots, no `Organization` structured data. | M |
| 6 | **No analytics or consent** | No GA/Plausible, no cookie banner. You cannot tell whether the donate page works. | S |
| 7 | **No media library** | Images are hand-typed URLs (Unsplash). Only the logo can be uploaded. No asset manager, no alt text, no resizing. | M |
| 8 | **No draft / preview / maintenance mode** | Content edits are live the instant you type. No preview, no scheduled publish, no coming-soon page. | M |
| 9 | **No undo or version history** | A mistyped edit is live until retyped; the only safety net is the whole-store JSON backup. | M |
| 10 | **Settings are not server-backed** | `api` exposes content, rows, submissions and chat — but no `settings`, `theme`, `users` or `audit` endpoints. Config cannot be shared across devices. | M |
| 11 | **No CSV import** | Export exists for members, transactions, receipts and statements. Import exists only as whole-store JSON, so bulk-adding members from a spreadsheet is impossible. | S |
| 12 | **`theme.radius` is dead** | Stored, never read, never editable. Either wire it up or remove it. | S |
| 13 | **AI operations invisible** | No usage, cost or latency view; no guardrail tests; no fallback message when the provider call fails; `ai.extraKnowledge` is edited under the SEO panel, where nobody would look for it. | S |

### P2

| # | Gap |
|---|---|
| 14 | No multi-language. The assistant replies in the visitor's language; the site itself is English-only. |
| 15 | No locale, currency or date-format settings — `en-IN` is hardcoded. |
| 16 | No dark mode or typography controls. Only brand and accent are editable; fonts are fixed. |
| 17 | No scheduled or offsite backup, no restore preview, no partial export. |
| 18 | No feature flags (e.g. temporarily disable donations). `aiWidgetEnabled` is the only one. |
| 19 | No runtime environment view — the API base URL is build-time only; the panel shows "Supabase connected / Local" but you cannot change it. |

### Verified present — not gaps

Bank name, account number, IFSC **and** UPI ID are all editable (Site content → Organisation →
payment). Logo upload, colour presets, admin accounts, password change, the compliance block,
JSON export/import/reset, hosting commands, CSV export everywhere, ⌘K palette and all thirteen
nav modules are in place.

---

## Schema and module layer

**Validation.** `schemas.js` holds `memberSchema`, `transactionSchema`, `pledgeSchema`,
`budgetSchema`. There is no schema for accounts, vouchers, grants, receipts, settings, compliance
or content. Two consequences: settings accept anything, and the four schemas that do exist are the
only guard on money.

**API bindings.** `src/api/client.js` exposes:

```
content (get/save) · members · transactions · pledges · budgets
accounts · vouchers · grants · receipts · submissions (create only) · ai.chat
```

Missing: `settings`, `theme`, `users`, `audit`, `media`, `notifications`. Until those exist, the
settings you set in the panel cannot be shared, backed up server-side or restored on another device.

**Migrations.** v1 → v8, all unit-tested (`tests/run-ssr.mjs`, "Store migrations"). v8 is the
organisation-name correction below. Any new settings block should ship with a migration, since
existing browsers will not otherwise pick up new keys.

---

## Two defects found and fixed during this audit

The placeholder name **"Kalyan Sewa Organisation"** — which you corrected months ago — was still
in two places that ship to visitors:

1. `defaultAiSettings.systemPrompt` — the assistant opened with *"You are the official assistant for
   KSO (Kalyan Sewa Organisation)…"*
2. `content.seo.metaDescription` — the text Google shows under the site's link.

Both defaults are corrected. Because the AI prompt is persisted per browser and is user-editable,
a **v8 migration** rewrites the stale text where it is still present and leaves hand-edited prompts
alone. Four tests cover it, including that an edited prompt is untouched.

If your browser already has a store, reload the admin once and check Admin → AI → System prompt
reads *"Kuki Students' Organisation Chandigarh (KSO)"*.

---

## Recommended build order

1. **Audit trail** (P0-1) — an append-only log of who changed what, surfaced in System. Highest
   value per hour for an NGO handling donations.
2. **Notification delivery** (P0-2) — at minimum, email on new contact/volunteer submission, with
   SMTP (or provider) settings in System.
3. **Validate settings** (P0-3) — zod schemas for org, compliance and the payment fields, with
   inline errors. Small, and it prevents a class of embarrassing typos.
4. **Per-page SEO + structured data** (P1-5) — titles/descriptions per route, OG image,
   `Organization` JSON-LD, sitemap.
5. **Media library** (P1-7) — upload, alt text, and a picker instead of typed URLs.
6. **Draft / preview** (P1-8) — or at least a "last edited" marker and an undo for content fields.
7. **CSV import** (P1-11) — members first, then transactions.

I would not go near roles enforcement, scheduled backups or i18n until there is server-side auth —
each of them is either meaningless or much more expensive without it.
