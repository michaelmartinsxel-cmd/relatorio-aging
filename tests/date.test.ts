import { describe, expect, it } from 'vitest'
import { daysBetween, excelSerialToIsoDate, inferDayMonthOrder, parseDateCell } from '@core/parse/date'

describe('excelSerialToIsoDate', () => {
  it('converts known serials correctly (1900 system)', () => {
    // Excel's serial 61 is displayed as 1900-03-01 because of the well-known
    // fake 1900 leap day (serial 60 = the nonexistent 1900-02-29). This is
    // the standard Excel-compatible epoch used by every mainstream library.
    expect(excelSerialToIsoDate(61)).toBe('1900-03-01')
    expect(excelSerialToIsoDate(45658)).toBe('2025-01-01')
  })
})

describe('inferDayMonthOrder', () => {
  it('detects day-first from evidence > 12 in first component', () => {
    expect(inferDayMonthOrder(['25/03/2026', '01/02/2026'])).toBe('DMY')
  })

  it('detects month-first from evidence > 12 in second component', () => {
    expect(inferDayMonthOrder(['03/25/2026', '02/01/2026'])).toBe('MDY')
  })

  it('returns null when inconclusive', () => {
    expect(inferDayMonthOrder(['01/02/2026', '03/04/2026'])).toBeNull()
  })

  it('ignores unambiguous yyyy-first values', () => {
    expect(inferDayMonthOrder(['2026-01-02'])).toBeNull()
  })
})

describe('parseDateCell', () => {
  it('parses a JS Date object', () => {
    expect(parseDateCell(new Date(Date.UTC(2026, 2, 15)))).toBe('2026-03-15')
  })

  it('parses an Excel serial number', () => {
    expect(parseDateCell(45658)).toBe('2025-01-01')
  })

  it('parses dd/mm/yyyy given DMY order', () => {
    expect(parseDateCell('05/03/2026', 'DMY')).toBe('2026-03-05')
  })

  it('parses mm/dd/yyyy given MDY order', () => {
    expect(parseDateCell('05/03/2026', 'MDY')).toBe('2026-05-03')
  })

  it('parses unambiguous yyyy-mm-dd regardless of order param', () => {
    expect(parseDateCell('2026-03-05', 'MDY')).toBe('2026-03-05')
  })

  it('returns null for garbage input', () => {
    expect(parseDateCell('not a date')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(parseDateCell('')).toBeNull()
    expect(parseDateCell(null)).toBeNull()
    expect(parseDateCell(undefined)).toBeNull()
  })

  it('rejects invalid calendar dates (e.g. Feb 30)', () => {
    expect(parseDateCell('30/02/2026', 'DMY')).toBeNull()
  })
})

describe('daysBetween', () => {
  it('computes calendar day difference', () => {
    expect(daysBetween('2026-04-01', '2026-03-01')).toBe(31)
    expect(daysBetween('2026-03-01', '2026-03-01')).toBe(0)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(-1)
  })
})
