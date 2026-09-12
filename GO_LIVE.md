# Going live

Everything here is for a static host on the **free tier**. The site is a single-page app
with no server of its own: `npm run build` produces a `dist/` folder, and any host can
serve it.

Current size: **2.4 MB** total, about **131 kB gzipped** on first paint. The heavy chunks
(admin panel, charts, PDF generation) are lazy — a visitor never downloads them. Every free
tier is comfortably large enough (GitHub Pages allows 1 GB).

---

## 1. Before you deploy

Work through **Admin → System → Production mode**, which checks these for you:

- [ ] Change the seeded admin password (`admin@ksochd.org` / `ksochd2026`)
- [ ] Real bank account number, IFSC and UPI ID
- [ ] Working contact email and phone
- [ ] PAN, 80G registration number, validity dates, signatory, registered address
- [ ] Remove demo members, transactions and grants
- [ ] Turn **Production mode** on

Then generate the sitemap with your real domain:

```bash
SITE_URL=https://your-domain.org npm run sitemap
```

and uncomment the `Sitemap:` line in `public/robots.txt`.

## 2. Environment

Copy `.env.example` to `.env.local` and fill in what you need. Every variable is optional —
the site runs with none of them set, storing data in the browser.

| Variable | Needed for |
|---|---|
| `VITE_API_BASE_URL` | Real backend instead of browser storage |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Postgres-backed members and ledger |
| `VITE_ANALYTICS_ID` | Analytics |
| `VITE_RAZORPAY_KEY_ID` | Real online donations |
| `BASE_PATH` | GitHub Pages project sites (leave `/` otherwise) |

## 3. Deploy

**Netlify** — connect the repo. `netlify.toml` sets the build command and publish folder;
`public/_redirects` handles the SPA fallback. No further configuration.

**Vercel** — connect the repo. `vercel.json` provides the rewrite. Framework preset: Vite.

**Cloudflare Pages** — build command `npm run build`, output `dist`. `public/_redirects` and
`public/_headers` are both read automatically.

**GitHub Pages** —
```bash
BASE_PATH=/your-repo-name npm run build
npm run deploy:pages
```
`public/404.html` catches unknown paths and hands them back to the app, so deep links like
`/donate` keep working after a refresh. If you use a custom domain at the root, set
`BASE_PATH=/` and the 404 fallback still applies.

## 4. After the first deploy

- [ ] Load `/donate`, then refresh — it must not 404 (that is the SPA fallback working)
- [ ] Load a deep link, e.g. `/programs/<slug>`, the same way
- [ ] Submit the contact form and confirm it lands in **Admin → Inbox**
- [ ] Set **Admin → System → Notifications** to a webhook URL so enquiries reach a real inbox
- [ ] Confirm `/admin` is not indexed: `robots.txt` disallows it and it sends `X-Robots-Tag: noindex`
- [ ] Check the site on a phone

---

## The part that is not solved

**Sign-in is checked in the browser.** Anyone can open devtools and read the account list, so
the admin panel is guarded against casual visitors, not against someone who means it. Production
mode does not change that — it stops accidents, not attackers.

Before the site carries real money or real member data, gate `/admin` behind something
server-side:

- Netlify site protection or Cloudflare Access (host-level password — a few minutes, no code), or
- set `VITE_API_BASE_URL` and authenticate on your backend, or
- move to Supabase and enforce Row Level Security (see `DEPLOY.md` §1b).

Until then, treat the admin panel as private-by-obscurity and keep real data out of the
public pages.
