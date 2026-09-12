import { z } from 'zod'

/** Indian mobile: optional, but if present must be 10 digits starting 6-9. */
const phone = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^(\+?91[- ]?)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')), 'Enter a valid 10-digit mobile number')

export const memberSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  email: z.string().trim().optional().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), 'Enter a valid email'),
  phone,
  type: z.string().min(1, 'Pick a member type'),
  tier: z.string().min(1, 'Pick a tier'),
  status: z.string().min(1, 'Pick a status'),
  centre: z.string().optional().default(''),
  joined: z.string().optional().default(''),
  renewsOn: z.string().optional().default(''),
  skills: z.string().optional().default(''),
  city: z.string().optional().default(''),
  address: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  avatar: z.string().optional().default(''),
  feeAmount: z.coerce.number().min(0, 'Fee cannot be negative').default(0),
  feeCycle: z.string().min(1),
  eventsAttended: z.coerce.number().min(0).default(0),
  household: z
    .array(z.object({ name: z.string().trim().default(''), relation: z.string().trim().default('Spouse') }))
    .default([]),
})

export const transactionSchema = z.object({
  date: z.string().min(1, 'Pick a date'),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'Pick a category'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  program: z.string().optional().default(''),
  party: z.string().trim().min(1, 'Add a donor, vendor or description'),
  method: z.string().min(1, 'Pick a method'),
  reference: z.string().optional().default(''),
  status: z.string().min(1),
  note: z.string().optional().default(''),
  memberId: z.string().optional().default(''),
})

export const pledgeSchema = z.object({
  name: z.string().trim().min(2, 'Add a name'),
  amount: z.coerce.number().positive('Amount must be greater than zero'),
  frequency: z.string().min(1),
  startDate: z.string().optional().default(''),
  nextDue: z.string().optional().default(''),
  program: z.string().optional().default(''),
  status: z.string().min(1),
  note: z.string().optional().default(''),
})

export const budgetSchema = z.object({
  program: z.string().min(1, 'Pick a programme'),
  // Budgets are keyed by financial year ("2026-27") since v7 — see migrations.
  fy: z.string().regex(/^\d{4}-\d{2}$/, 'Pick a financial year'),
  amount: z.coerce.number().min(0, 'Budget cannot be negative'),
})

/**
 * Grants carry the sanction, not the spending. `received` and `utilised` are
 * worked out from the vouchers by grantUtilisation(), so they are not fields
 * here — a certificate must not claim a figure the books cannot support.
 */
/**
 * Organisation and compliance settings.
 *
 * These validate FORMAT, and they deliberately do not block: a half-filled profile
 * still saves, it just says so. Blocking would be worse — the admin would be locked
 * out of saving anything else until they knew the 80G number.
 */
const panRe = /^[A-Z]{5}[0-9]{4}[A-Z]$/
const ifscRe = /^[A-Z]{4}0[A-Z0-9]{6}$/
const upiRe = /^[\w.-]{2,}@[a-zA-Z]{2,}$/

export const orgSchema = z.object({
  shortName: z.string().trim().min(1, 'Short name is required'),
  fullName: z.string().trim().min(1, 'Full legal name is required'),
  foundedYear: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{4}$/.test(v), 'Use a four-digit year'),
  email: z.string().trim().refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), 'Does not look like an email address'),
  phone: z.string().trim().refine((v) => !v || /^(\+91[\s-]?)?[6-9]\d{9}$/.test(v.replace(/[\s-]/g, '')), 'Use 10 digits starting 6-9'),
  upiId: z.string().trim().refine((v) => !v || upiRe.test(v), 'A UPI ID looks like name@bank'),
  bankAccount: z
    .string()
    .trim()
    .refine((v) => !v || /^\d{9,18}$/.test(v), 'Account numbers are 9–18 digits'),
  bankIfsc: z.string().trim().refine((v) => !v || ifscRe.test(v.toUpperCase()), 'An IFSC looks like SBIN0001234'),
})

export const complianceSchema = z
  .object({
    pan: z.string().trim().optional().refine((v) => !v || panRe.test(v.toUpperCase()), 'A PAN looks like ABCDE1234F'),
    g80No: z.string().trim().optional().refine((v) => !v || /^[A-Za-z0-9/\-]{8,}$/.test(v), 'Too short to be a registration number'),
    g80ValidFrom: z.string().trim().optional(),
    g80ValidUpto: z.string().trim().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.g80ValidFrom && val.g80ValidUpto && val.g80ValidUpto < val.g80ValidFrom) {
      ctx.addIssue({ code: 'custom', path: ['g80ValidUpto'], message: 'Cannot expire before it starts' })
    }
  })

/**
 * Flatten a zod result into a { field: firstMessage } map for inline display.
 * Settings are saved as you type, so we report rather than refuse.
 */
export function fieldErrors(schema, values) {
  const res = schema.safeParse(values || {})
  if (res.success) return {}
  const out = {}
  for (const issue of res.error.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!out[key]) out[key] = issue.message
  }
  return out
}

export const grantSchema = z.object({
  donor: z.string().min(1, 'Who is funding this?'),
  purpose: z.string().min(1, 'What is the grant for?'),
  sanctionNo: z.string().optional().default(''),
  sanctioned: z.coerce.number().min(0, 'Sanctioned amount cannot be negative'),
  startDate: z.string().min(1, 'A start date is needed for the certificate'),
  endDate: z.string().min(1, 'An end date is needed for the certificate'),
  program: z.string().optional().default(''),
  fund: z.string().min(1, 'Pick a fund'),
  status: z.enum(['Active', 'Closed']),
}).refine((v) => !v.endDate || !v.startDate || v.endDate >= v.startDate, {
  message: 'The end date must be after the start date',
  path: ['endDate'],
})
