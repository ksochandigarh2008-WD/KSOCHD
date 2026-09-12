/**
 * STATUTORY DOCUMENTS
 *
 * Two documents an Indian NGO is asked for again and again:
 *   1. the 80G donation receipt, and
 *   2. the utilisation certificate (GFR 19-A) a grantor wants before releasing
 *      the next tranche.
 *
 * The builders below are pure — they take the books and the settings and return
 * a plain description of the document. The jsPDF renderers are a thin layout
 * layer on top, and jsPDF itself is imported dynamically so it is only fetched
 * when someone actually downloads a document, not on every page load.
 *
 * Money on the page is spelled out as well as printed, because a receipt that
 * only says "1,58,41,000" is the one that gets queried.
 */
import { format, parseISO } from 'date-fns'
import { amountInWords } from './finance'

/* -------------------------------------------------------------------------- *
 * Compliance details
 *
 * These live in settings (Admin → System → Compliance & signatory). Anything
 * still blank prints as a bracketed placeholder on the document, so nothing
 * can quietly look official while a statutory number is missing.
 * -------------------------------------------------------------------------- */

export const DEFAULT_COMPLIANCE = {
  pan: '',                 // organisation PAN
  g80No: '',               // 80G registration number
  g80ValidFrom: '',
  g80ValidUpto: '',
  regdNo: '',              // falls back to content.org.registration
  address: '',             // falls back to content.org.address
  place: '',               // falls back to content.org.city
  signatoryName: '',
  signatoryDesignation: '',
}

export const complianceOf = (settings) => ({ ...DEFAULT_COMPLIANCE, ...(settings?.compliance || {}) })

/** Statutory fields that are still blank, in the order they appear on the form. */
export const missingCompliance = (compliance, org = {}) => {
  const c = complianceOf({ compliance })
  return [
    ['pan', 'PAN of the organisation', c.pan],
    ['g80No', '80G registration number', c.g80No],
    ['g80ValidUpto', '80G validity (up to)', c.g80ValidUpto],
    ['signatoryName', 'Name of the signatory', c.signatoryName],
    ['signatoryDesignation', 'Designation of the signatory', c.signatoryDesignation],
    ['regdNo', 'Registration number', c.regdNo || org?.registration],
    ['address', 'Registered address', c.address || org?.address],
  ].filter(([, , value]) => !String(value || '').trim()).map(([key, label]) => ({ key, label }))
}

/* -------------------------------------------------------------------------- *
 * Shared helpers
 * -------------------------------------------------------------------------- */

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
/** 1584100 → "15,84,100" — no currency glyph, because PDF fonts cannot draw ₹. */
export const plainMoney = (n = 0) => inr.format(Number(n) || 0)

const fmtDate = (d) => {
  if (!d) return '—'
  try { return format(typeof d === 'string' ? parseISO(d) : d, 'dd MMM yyyy') } catch { return String(d) }
}

/** Blank statutory values print as [add 80G registration number] and similar. */
const orPh = (value, label) => (String(value || '').trim() || `[add ${label}]`)

/* -------------------------------------------------------------------------- *
 * 1. 80G receipt
 * -------------------------------------------------------------------------- */

/**
 * Turn a receipt row into everything the printed document needs.
 *
 * The deduction note is not decoration: a donation above Rs. 2,000 received in
 * cash carries NO deduction under section 80G, and the receipt has to say so.
 */
export function build80gReceipt({ receipt = {}, settings, org = {} }) {
  const c = complianceOf(settings)
  const amount = Number(receipt.amount) || 0
  const method = String(receipt.method || '')
  const cash = /cash/i.test(method)
  const isCorpus = /corpus/i.test(`${receipt.narration || ''} ${receipt.fund || ''}`)
  const eligible = !(cash && amount > 2000)

  const validity = [c.g80ValidFrom, c.g80ValidUpto].filter(Boolean).join(' to ')
  const deductionNote = !eligible
    ? 'No deduction is admissible under section 80G in respect of this donation, being a cash donation exceeding Rs. 2,000.'
    : [
      'This donation is eligible for deduction under section 80G of the Income-tax Act, 1961',
      c.g80No ? `vide registration no. ${c.g80No}${validity ? ` (valid ${validity})` : ''}` : '',
      isCorpus ? 'and has been credited to the corpus fund of the organisation.' : '.',
    ].filter(Boolean).join(' ').replace(/\s+\./g, '.')

  return {
    no: receipt.no || '',
    date: fmtDate(receipt.date),
    place: c.place || org.city || '',
    donor: receipt.donor || 'Anonymous donor',
    donorAddress: receipt.address || '',
    donorPan: receipt.pan || '',
    amount,
    amountWords: amountInWords(amount),
    method,
    narration: receipt.narration || '',
    isCorpus,
    eligible,
    deductionNote,

    orgName: org.fullName || org.shortName || '',
    orgRegd: c.regdNo || org.registration || '',
    orgAddress: c.address || org.address || '',
    orgPan: c.pan || '',
    g80No: c.g80No || '',
    g80Validity: validity,
    signatoryName: c.signatoryName || '',
    signatoryDesignation: c.signatoryDesignation || '',

    missing: missingCompliance(c, org),
    filename: `${String(receipt.no || 'receipt').replace(/\//g, '-')}.pdf`,
  }
}

/** "Received with thanks from …" — donor, PAN, address, purpose. */
export const receiptBody = (m) =>
  `Received with thanks from ${m.donor}${m.donorPan ? ` (PAN: ${m.donorPan})` : ''}` +
  `${m.donorAddress ? ` of ${m.donorAddress}` : ''}${m.narration ? ` towards ${m.narration}` : ''}.`

/** "the sum of …" — kept apart so the spelled-out amount never wraps mid-phrase. */
/** UPI / NEFT read as acronyms; the rest as a phrase ("by cash", "by bank transfer"). */
export const methodPhrase = (method = '') => {
  const v = String(method || '').trim()
  if (!v) return ''
  return /^(upi|neft|rtgs|imps|ecs|nach)$/i.test(v) ? v.toUpperCase() : v.toLowerCase()
}

export const receiptSum = (m) =>
  `the sum of ${m.amountWords}${m.method ? `, received by ${methodPhrase(m.method)}` : ''}.`

/* -------------------------------------------------------------------------- *
 * 2. Utilisation certificate (GFR 19-A)
 * -------------------------------------------------------------------------- */

/**
 * `grant` is one row of `grantUtilisation()` — i.e. the sanctioned amount plus
 * what the books say was actually received and spent. The certificate states
 * figures the books can prove, never an aspirational number.
 */
export function buildUtilisationCertificate({ grant = {}, settings, org = {}, asOn = new Date() }) {
  const c = complianceOf(settings)
  const sanctioned = Number(grant.sanctioned) || 0
  const received = Number(grant.received) || 0
  const utilised = Number(grant.utilised) || 0
  const balance = Number.isFinite(Number(grant.balance)) ? Number(grant.balance) : received - utilised

  return {
    formLabel: 'FORM GFR 19-A',
    title: 'Utilisation Certificate',
    donor: grant.donor || '',
    purpose: grant.purpose || '',
    sanctionNo: grant.sanctionNo || '',
    period: grant.startDate && grant.endDate ? `${fmtDate(grant.startDate)} to ${fmtDate(grant.endDate)}` : '—',
    asOn: fmtDate(asOn),
    place: c.place || org.city || '',

    sanctioned,
    received,
    utilised,
    balance,
    shortfall: Number(grant.shortfall) || 0,
    sanctionedWords: amountInWords(sanctioned),
    utilisedWords: amountInWords(utilised),

    rows: [
      ['1.', 'Name of the scheme / project', [grant.donor, grant.purpose].filter(Boolean).join(' — ') || '—'],
      ['2.', 'Sanction letter no.', grant.sanctionNo || '—'],
      ['3.', 'Amount sanctioned (Rs.)', plainMoney(sanctioned)],
      ['4.', 'Amount received (Rs.)', plainMoney(received)],
      ['5.', 'Amount utilised (Rs.)', plainMoney(utilised)],
      ['6.', 'Balance unutilised (Rs.)', plainMoney(balance)],
      ['7.', 'Period', grant.startDate && grant.endDate ? `${fmtDate(grant.startDate)} to ${fmtDate(grant.endDate)}` : '—'],
    ],

    certified:
      `Certified that out of Rs. ${plainMoney(received)} received from ${grant.donor || 'the grantor'}` +
      `${grant.sanctionNo ? ` under sanction no. ${grant.sanctionNo}` : ''}, ` +
      `a sum of Rs. ${plainMoney(utilised)} (${amountInWords(utilised)}) has been utilised ` +
      `for ${grant.purpose || 'the purpose for which it was sanctioned'} during the period ` +
      `${grant.startDate && grant.endDate ? `${fmtDate(grant.startDate)} to ${fmtDate(grant.endDate)}` : '—'}, ` +
      `and that a balance of Rs. ${plainMoney(balance)} remains unutilised as on ${fmtDate(asOn)}.`,

    undertaking:
      'It is further certified that the grant has been utilised for the purpose for which it was ' +
      'sanctioned, in accordance with the terms and conditions of the sanction, and that the ' +
      'accounts have been maintained as required.',

    orgName: org.fullName || org.shortName || '',
    orgRegd: c.regdNo || org.registration || '',
    signatoryName: c.signatoryName || '',
    signatoryDesignation: c.signatoryDesignation || '',

    missing: missingCompliance(c, org),
    filename: `UC-${String(grant.sanctionNo || grant.donor || 'grant').replace(/[/\s]+/g, '-')}.pdf`,
  }
}

/* -------------------------------------------------------------------------- *
 * PDF layout
 * -------------------------------------------------------------------------- */

const M = 20               // margin, mm
const RIGHT = 210 - M      // right edge
const WIDTH = RIGHT - M    // text column width

const header = (doc, { orgName, orgRegd, orgAddress, orgPan, g80No, g80Validity }) => {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(orgName || 'Organisation', M, 24)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  let y = 30
  for (const line of doc.splitTextToSize(orgAddress || '', WIDTH).slice(0, 2)) {
    doc.text(line, M, y); y += 4.5
  }
  const meta = [
    orgRegd ? (/^regd/i.test(orgRegd.trim()) ? orgRegd.trim() : `Regd. No. ${orgRegd}`) : '',
    `PAN: ${orPh(orgPan, 'PAN')}`,
    `80G Regn. No.: ${orPh(g80No, '80G registration number')}${g80Validity ? ` (valid ${g80Validity})` : ''}`,
  ].filter(Boolean).join('   |   ')
  doc.text(meta, M, y + 0.5)
  doc.setLineWidth(0.3)
  doc.line(M, y + 3.5, RIGHT, y + 3.5)
  return y + 10
}

const signatureBlock = (doc, { signatoryName, signatoryDesignation, place }, y = 232) => {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Place: ${place || '—'}`, M, y)
  doc.text('Date: ______________________', M, y + 5)

  doc.line(RIGHT - 62, y + 6, RIGHT, y + 6)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(orPh(signatoryName, 'name of signatory'), RIGHT, y + 12, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(orPh(signatoryDesignation, 'designation'), RIGHT, y + 17, { align: 'right' })
  doc.text('Authorised Signatory', RIGHT, y + 22, { align: 'right' })
}

const footer = (doc, text) => {
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.text(text, M, 288)
  doc.text('Page 1 of 1', RIGHT, 288, { align: 'right' })
}

/** Draw the 80G receipt onto a jsPDF document (A4 portrait, mm). */
export function renderReceipt(doc, m) {
  let y = header(doc, m)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text('DONATION RECEIPT', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(`No. ${m.no || '—'}`, RIGHT, y - 4, { align: 'right' })
  doc.text(`Date: ${m.date || '—'}`, RIGHT, y, { align: 'right' })

  y += 8
  const boxTop = y
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  for (const line of doc.splitTextToSize(receiptBody(m), WIDTH - 8)) {
    doc.text(line, M + 4, y + 5); y += 5
  }
  y += 2
  for (const line of doc.splitTextToSize(receiptSum(m), WIDTH - 8)) {
    doc.text(line, M + 4, y + 5); y += 5
  }
  y += 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(`Rs. ${plainMoney(m.amount)}`, M + 4, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(m.isCorpus ? 'Credited to corpus fund' : '', M + 4, y + 12)
  y += 16
  doc.setLineWidth(0.2)
  doc.rect(M, boxTop, WIDTH, y - boxTop)

  y += 12
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  for (const line of doc.splitTextToSize(m.deductionNote, WIDTH)) {
    doc.text(line, M, y); y += 4.6
  }

  y += 4
  doc.setFontSize(8.5)
  for (const line of doc.splitTextToSize(
    'This receipt is issued subject to the donor furnishing correct particulars. It is valid only ' +
    'when signed, and is generated from the books of account of the organisation.',
    WIDTH,
  )) {
    doc.text(line, M, y); y += 4.2
  }

  signatureBlock(doc, m)
  footer(doc, 'Computer-generated receipt — issued from the books of account of the organisation.')
  return doc
}

/** Draw the utilisation certificate onto a jsPDF document (A4 portrait, mm). */
export function renderUtilisationCertificate(doc, m) {
  let y = header(doc, m)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(m.formLabel, RIGHT, y - 12, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(m.title.toUpperCase(), 105, y - 4, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`As on ${m.asOn}`, 105, y + 1, { align: 'center' })

  y += 12
  doc.setLineWidth(0.2)
  for (const [no, label, value] of m.rows) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text(no, M, y)
    doc.setFont('helvetica', 'normal')
    doc.text(label, M + 8, y)
    const lines = doc.splitTextToSize(String(value), 78)
    lines.forEach((line, i) => doc.text(line, RIGHT, y + i * 4.4, { align: 'right' }))
    y += Math.max(6.5, lines.length * 4.4 + 2)
    doc.line(M, y - 2.5, RIGHT, y - 2.5)
  }

  y += 8
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  for (const line of doc.splitTextToSize(m.certified, WIDTH)) {
    doc.text(line, M, y); y += 4.8
  }

  y += 5
  for (const line of doc.splitTextToSize(m.undertaking, WIDTH)) {
    doc.text(line, M, y); y += 4.8
  }

  signatureBlock(doc, m, Math.max(y + 26, 232))
  footer(doc, 'Computer-generated utilisation certificate — figures drawn from the books of account.')
  return doc
}

/* -------------------------------------------------------------------------- *
 * Downloads — jsPDF is imported here, on demand.
 * -------------------------------------------------------------------------- */

const newDoc = async () => {
  const { jsPDF } = await import('jspdf')
  return new jsPDF({ unit: 'mm', format: 'a4', compress: true })
}

export const downloadReceipt = async (model) => {
  const doc = renderReceipt(await newDoc(), model)
  doc.save(model.filename)
}

export const downloadUtilisationCertificate = async (model) => {
  const doc = renderUtilisationCertificate(await newDoc(), model)
  doc.save(model.filename)
}
