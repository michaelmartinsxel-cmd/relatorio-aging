/**
 * Date parsing for Excel/SAP exports.
 *
 * - Numeric cells are Excel serial dates (1900 date system, including the
 *   well-known 1900 leap-year bug that Excel itself perpetuates).
 * - `Date` objects (as returned by ExcelJS for real date cells) are used
 *   directly.
 * - Free-text columns are ambiguous between dd/mm/yyyy and mm/dd/yyyy.
 *   Instead of guessing per-cell, `inferDayMonthOrder` scans the whole
 *   column once: if any value has a first component > 12, the column must
 *   be day-first. If there is no such evidence, the caller must ask the
 *   user (see mapping/detect.ts + the UI mapping dialog) rather than
 *   silently assuming an order.
 */

export type DayMonthOrder = 'DMY' | 'MDY'

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30) // day 0 in the 1900 system, already offset for the leap-year bug

export function excelSerialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial)) return null
  const ms = EXCEL_EPOCH_UTC + Math.round(serial) * 86400000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  return toIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

export function jsDateToIsoDate(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null
  return toIso(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

const DATE_TEXT_RE = /^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{1,4})$/

/** Scans raw values from one column and decides day/month order from evidence, or null if inconclusive. */
export function inferDayMonthOrder(values: unknown[]): DayMonthOrder | null {
  let sawDayFirstEvidence = false
  let sawMonthFirstEvidence = false

  for (const v of values) {
    if (typeof v !== 'string') continue
    const m = DATE_TEXT_RE.exec(v.trim())
    if (!m) continue
    const a = Number(m[1])
    const b = Number(m[2])
    // yyyy-mm-dd / yyyy-dd-mm style (4-digit first component) is unambiguous, skip.
    if (m[1].length === 4) continue
    if (a > 12) sawDayFirstEvidence = true
    if (b > 12) sawMonthFirstEvidence = true
  }

  if (sawDayFirstEvidence && !sawMonthFirstEvidence) return 'DMY'
  if (sawMonthFirstEvidence && !sawDayFirstEvidence) return 'MDY'
  return null
}

/**
 * Parses one cell value into an ISO date, given a raw cell (number, Date or
 * string) and, for ambiguous text columns, the day/month order decided by
 * `inferDayMonthOrder` (or explicitly chosen by the user).
 */
export function parseDateCell(raw: unknown, dayMonthOrder: DayMonthOrder = 'DMY'): string | null {
  if (raw === null || raw === undefined || raw === '') return null

  if (raw instanceof Date) return jsDateToIsoDate(raw)

  if (typeof raw === 'number') return excelSerialToIsoDate(raw)

  const s = String(raw).trim()
  if (s === '') return null

  // ISO already: yyyy-mm-dd
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s)
  if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const m = DATE_TEXT_RE.exec(s)
  if (m) {
    // 4-digit first component => yyyy/mm/dd (unambiguous)
    if (m[1].length === 4) {
      return toIso(Number(m[1]), Number(m[2]), Number(m[3]))
    }
    const a = Number(m[1])
    const b = Number(m[2])
    let year = Number(m[3])
    if (m[3].length === 2) year += year < 70 ? 2000 : 1900

    const [day, month] = dayMonthOrder === 'DMY' ? [a, b] : [b, a]
    return toIso(year, month, day)
  }

  // Fall back to native parsing (e.g. "12 Jan 2026")
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return jsDateToIsoDate(d)

  return null
}

export function daysBetween(agingDateIso: string, dueDateIso: string): number | null {
  const a = Date.parse(agingDateIso + 'T00:00:00Z')
  const d = Date.parse(dueDateIso + 'T00:00:00Z')
  if (Number.isNaN(a) || Number.isNaN(d)) return null
  return Math.round((a - d) / 86400000)
}

function toIso(year: number, month: number, day: number): string | null {
  if (!year || !month || !day) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  // Validate by round-tripping through Date (catches Feb 30 etc).
  const check = new Date(Date.UTC(year, month - 1, day))
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null
  }
  return `${year}-${mm}-${dd}`
}
