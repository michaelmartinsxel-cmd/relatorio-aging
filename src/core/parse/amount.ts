/**
 * Parses monetary values coming from heterogeneous Excel/SAP exports into an
 * integer number of minor currency units (cents). Integers keep every
 * downstream sum exact, which is what makes reconciliation meaningful
 * (section 17/19 of the spec).
 *
 * Supported shapes:
 *  - plain numbers (already numeric cells)
 *  - "1.234,56"  (pt-BR: '.' thousands, ',' decimal)
 *  - "1,234.56"  (en-US: ',' thousands, '.' decimal)
 *  - "1234.56" / "1234,56" (no thousands separator)
 *  - trailing minus, SAP style: "1.234,56-"
 *  - parenthesized negatives: "(1,234.56)"
 *  - currency symbols / stray whitespace are stripped
 */

export interface ParsedAmount {
  ok: boolean
  minorUnits: number
  raw: unknown
}

const CURRENCY_SYMBOLS = /[R$€£¥]|USD|EUR|BRL|GBP/gi

export function parseAmountToMinorUnits(raw: unknown): ParsedAmount {
  if (raw === null || raw === undefined || raw === '') {
    return { ok: false, minorUnits: 0, raw }
  }

  if (typeof raw === 'number') {
    if (!Number.isFinite(raw)) return { ok: false, minorUnits: 0, raw }
    return { ok: true, minorUnits: Math.round(raw * 100), raw }
  }

  let s = String(raw).trim()
  if (s === '') return { ok: false, minorUnits: 0, raw }

  let negative = false

  // Parenthesized negative: (1,234.56)
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }

  // Trailing minus (SAP export style): 1.234,56-
  if (/-\s*$/.test(s)) {
    negative = true
    s = s.replace(/-\s*$/, '')
  }
  // Leading minus
  if (/^-/.test(s)) {
    negative = true
    s = s.replace(/^-/, '')
  }

  s = s.replace(CURRENCY_SYMBOLS, '').trim()
  s = s.replace(/\s+/g, '')

  if (s === '') return { ok: false, minorUnits: 0, raw }

  const numeric = normalizeSeparators(s)
  if (numeric === null) return { ok: false, minorUnits: 0, raw }

  const value = negative ? -numeric : numeric
  return { ok: true, minorUnits: Math.round(value * 100), raw }
}

/**
 * Decides which of '.' / ',' is the decimal separator and which are
 * thousands separators, then returns a plain JS number, or null if the
 * string cannot be interpreted as a number at all.
 */
function normalizeSeparators(s: string): number | null {
  const hasDot = s.includes('.')
  const hasComma = s.includes(',')

  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf('.')
    const lastComma = s.lastIndexOf(',')
    const decimalSep = lastDot > lastComma ? '.' : ','
    const thousandsSep = decimalSep === '.' ? ',' : '.'
    const cleaned = s.split(thousandsSep).join('').replace(decimalSep, '.')
    const n = Number(cleaned)
    return Number.isFinite(n) ? n : null
  }

  if (hasComma && !hasDot) {
    // Could be "1234,56" (decimal comma) or "1,234" (thousands comma, no decimals).
    const parts = s.split(',')
    const lastPart = parts[parts.length - 1]
    const looksLikeDecimal = parts.length === 2 && lastPart.length <= 2
    if (looksLikeDecimal) {
      const n = Number(parts.join('.'))
      return Number.isFinite(n) ? n : null
    }
    const n = Number(parts.join(''))
    return Number.isFinite(n) ? n : null
  }

  if (hasDot && !hasComma) {
    const parts = s.split('.')
    if (parts.length > 2) {
      // multiple dots => thousands separators, e.g. "1.234.567"
      const n = Number(parts.join(''))
      return Number.isFinite(n) ? n : null
    }
    const n = Number(s)
    return Number.isFinite(n) ? n : null
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
