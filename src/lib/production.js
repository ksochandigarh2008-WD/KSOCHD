import { complianceOf, missingCompliance } from './documents'

/**
 * Everything here exists because the gap between "it works on my laptop" and
 * "it is live with the real bank account on it" is where NGOs get hurt.
 *
 * None of it is a security boundary — that needs a server. It is a checklist and a
 * set of guard rails that make the obvious mistakes hard to make by accident.
 */

/** The password that ships with the seeded account. Production mode refuses to run on it. */
export const SEEDED_PASSWORD = 'ksochd2026'

/** Placeholder text in `defaultContent` that must be replaced before going live. */
const looksUnfilled = (value) => {
  const v = String(value || '').trim()
  return !v || /^(—|-|–)\s*(add|add\s|confirm|your)/i.test(v) || /^(—|-|–)/.test(v)
}

/**
 * The go-live list. Items are ordered so the ones that can cost money or mislead a
 * donor come first. `blocking` items are what production mode insists on; the rest
 * are warnings that are worth seeing but should not stop a launch.
 */
export function goLiveChecklist({ settings, content, memberships = [], transactions = [] } = {}) {
  const org = content?.org || {}
  const compliance = complianceOf(settings)
  const errors = orgErrors(org)
  const admins = settings?.adminUsers || []
  const usingSeededPassword = admins.some((u) => u.password === SEEDED_PASSWORD)
  const hasDemoData = [...memberships, ...transactions].some((r) => r.demo)
  const g80Expired = Boolean(
    compliance.g80ValidUpto && new Date(compliance.g80ValidUpto) < new Date(),
  )

  return [
    {
      id: 'password',
      label: 'Change the seeded admin password',
      why: 'The account ships as admin@ksochd.org with a published default. Anyone who has seen the README can sign in.',
      where: 'System → Security',
      done: admins.length > 0 && !usingSeededPassword,
      blocking: true,
    },
    {
      id: 'account',
      label: 'Real bank account number',
      why: 'A donor who transfers money to a placeholder is donating to nobody.',
      where: 'Site content → Organisation',
      done: !looksUnfilled(org.bankAccount) && !errors.bankAccount,
      blocking: true,
    },
    {
      id: 'ifsc',
      label: 'Real IFSC code',
      why: 'The account number is useless without it, and a wrong one sends the transfer to the wrong branch.',
      where: 'Site content → Organisation',
      done: !looksUnfilled(org.bankIfsc) && !errors.bankIfsc,
      blocking: true,
    },
    {
      id: 'upi',
      label: 'Real UPI ID',
      why: 'Printed on the donate page and quoted by the AI assistant.',
      where: 'Site content → Organisation',
      done: !looksUnfilled(org.upiId) && !errors.upiId,
      blocking: true,
    },
    {
      id: 'contact',
      label: 'Contact email and phone',
      why: 'The first thing a donor or a volunteer uses to reach you.',
      where: 'Site content → Organisation',
      done: Boolean(org.email) && !errors.email && Boolean(org.phone) && !errors.phone,
      blocking: true,
    },
    {
      id: 'pan',
      label: 'Organisation PAN',
      why: 'Printed on every 80G receipt. A wrong one makes the receipt useless to the donor.',
      where: 'System → Compliance & signatory',
      done: /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/.test(String(compliance.pan || '').trim()),
      blocking: true,
    },
    {
      id: 'g80no',
      label: '80G registration number',
      why: 'Donors claim a deduction against it. Blank means the receipt is decorative.',
      where: 'System → Compliance & signatory',
      done: Boolean(String(compliance.g80No || '').trim()),
      blocking: true,
    },
    {
      id: 'g80valid',
      label: '80G validity has not expired',
      why: 'An expired registration number on a live receipt is a misrepresentation.',
      where: 'System → Compliance & signatory',
      done: Boolean(compliance.g80ValidUpto) && !g80Expired,
      blocking: true,
    },
    {
      id: 'signatory',
      label: 'Authorised signatory and designation',
      why: 'A receipt with no signatory looks like a forgery.',
      where: 'System → Compliance & signatory',
      done: Boolean(compliance.signatoryName) && Boolean(compliance.signatoryDesignation),
      blocking: true,
    },
    {
      id: 'address',
      label: 'Registered address',
      why: 'Printed in the receipt header, and the first thing a grant reviewer checks.',
      where: 'System → Compliance & signatory',
      done: Boolean(compliance.address || org.address) && !looksUnfilled(org.address),
      blocking: true,
    },
    {
      id: 'demoData',
      label: 'Demo members and transactions removed',
      why: 'Fake donors in a published annual report is the kind of thing that ends up in a newspaper.',
      where: 'Members → Remove demo rows',
      done: !hasDemoData,
      blocking: false,
    },
    {
      id: 'demoBadge',
      label: 'Demo badge hidden',
      why: 'Visitors do not need to know the site is a work in progress.',
      where: 'System → Production mode',
      // Production mode hides the banner too, so the item is satisfied by either
      // route. It used to read `showDemoBadge === false` alone, and the only thing
      // that wrote that flag was an action nothing called — so the item could never
      // be ticked. The banner is now toggleable directly, next to production mode.
      done: settings?.showDemoBadge === false || Boolean(settings?.productionMode),
      blocking: false,
    },
    {
      id: 'delivery',
      label: 'Contact form goes somewhere',
      why: 'Without a delivery URL, enquiries sit in a browser nobody else can open.',
      where: 'System → Notifications & delivery',
      done: Boolean(String(settings?.notifications?.webhookUrl || '').trim()),
      blocking: false,
    },
    {
      id: 'analytics',
      label: 'Analytics connected (optional)',
      why: 'The only way to know whether the donate page works.',
      where: 'System → Analytics',
      done: Boolean(settings?.analyticsId || import.meta.env?.VITE_ANALYTICS_ID),
      blocking: false,
    },
  ]
}

/** Field-level format problems in the organisation block, reused by the admin panel. */
export function orgErrors(org = {}) {
  const out = {}
  const email = String(org.email || '').trim()
  const phone = String(org.phone || '').trim()
  const upi = String(org.upiId || '').trim()
  const account = String(org.bankAccount || '').trim()
  const ifsc = String(org.bankIfsc || '').trim()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) out.email = 'Does not look like an email address'
  if (phone && !/^(\+91[\s-]?)?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ''))) out.phone = 'Use 10 digits starting 6-9'
  if (upi && !/^[\w.-]{2,}@[a-zA-Z]{2,}$/.test(upi)) out.upiId = 'A UPI ID looks like name@bank'
  if (account && !/^\d{9,18}$/.test(account)) out.bankAccount = 'Account numbers are 9–18 digits'
  if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())) out.bankIfsc = 'An IFSC looks like SBIN0001234'
  return out
}

export const blockingIssues = (items = []) => items.filter((i) => i.blocking && !i.done)

/**
 * Maintenance mode: visitors get a holding page, the team does not.
 *
 * The test is deliberately `authed` — signed into the admin in this browser — rather
 * than anything stronger, because there is nothing stronger available client-side.
 * Someone who wants past it can; the point is stop a half-finished page being public
 * while you are editing it, not to keep a determined stranger out.
 */
export const defaultMaintenance = () => ({
  enabled: false,
  heading: 'We will be right back',
  message: 'This site is being updated. Please check again shortly.',
})

export const shouldShowMaintenance = (settings, authed) =>
  Boolean(settings?.maintenance?.enabled) && !authed

/** The holding page's own copy, with sensible fallbacks. */
export const maintenanceCopy = (settings) => ({
  heading: String(settings?.maintenance?.heading || '').trim() || 'We will be right back',
  message:
    String(settings?.maintenance?.message || '').trim() ||
    'This site is being updated. Please check again shortly.',
})

/**
 * Production mode is a switch in Admin → System. Turning it on does three things:
 * it hides the demo badge, it refuses to re-seed demo data, and it insists the seeded
 * password is changed. It does NOT pretend to be security — see DEPLOY.md.
 */
export const isProduction = (settings) => Boolean(settings?.productionMode)

/** What production mode takes away, so the UI can explain itself rather than just refusing. */
export const productionRestrictions = (settings) =>
  isProduction(settings)
    ? [
        'Demo members, transactions and grants cannot be re-seeded',
        'The demo badge is hidden whatever its own setting says',
        'Signing in with the seeded password forces a password change',
      ]
    : []
