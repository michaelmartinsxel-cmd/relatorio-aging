import { describe, expect, it } from 'vitest'
import { parseAmountToMinorUnits } from '@core/parse/amount'

describe('parseAmountToMinorUnits', () => {
  it('parses plain numbers', () => {
    expect(parseAmountToMinorUnits(1234.5).minorUnits).toBe(123450)
  })

  it('parses pt-BR formatted strings', () => {
    expect(parseAmountToMinorUnits('1.234,56').minorUnits).toBe(123456)
  })

  it('parses en-US formatted strings', () => {
    expect(parseAmountToMinorUnits('1,234.56').minorUnits).toBe(123456)
  })

  it('parses decimal comma without thousands separator', () => {
    expect(parseAmountToMinorUnits('1234,56').minorUnits).toBe(123456)
  })

  it('parses decimal dot without thousands separator', () => {
    expect(parseAmountToMinorUnits('1234.56').minorUnits).toBe(123456)
  })

  it('parses SAP-style trailing minus', () => {
    const r = parseAmountToMinorUnits('1.234,56-')
    expect(r.ok).toBe(true)
    expect(r.minorUnits).toBe(-123456)
  })

  it('parses parenthesized negatives', () => {
    const r = parseAmountToMinorUnits('(1,234.56)')
    expect(r.minorUnits).toBe(-123456)
  })

  it('strips currency symbols', () => {
    expect(parseAmountToMinorUnits('R$ 1.234,56').minorUnits).toBe(123456)
    expect(parseAmountToMinorUnits('$1,234.56').minorUnits).toBe(123456)
  })

  it('preserves negative values and credit notes (section 19)', () => {
    expect(parseAmountToMinorUnits(-500).minorUnits).toBe(-50000)
    expect(parseAmountToMinorUnits('-500,00').minorUnits).toBe(-50000)
  })

  it('handles multiple thousands separators', () => {
    expect(parseAmountToMinorUnits('1.234.567').minorUnits).toBe(123456700)
  })

  it('fails gracefully on empty/invalid input', () => {
    expect(parseAmountToMinorUnits('').ok).toBe(false)
    expect(parseAmountToMinorUnits(null).ok).toBe(false)
    expect(parseAmountToMinorUnits(undefined).ok).toBe(false)
    expect(parseAmountToMinorUnits('abc').ok).toBe(false)
  })

  it('handles zero correctly', () => {
    const r = parseAmountToMinorUnits(0)
    expect(r.ok).toBe(true)
    expect(r.minorUnits).toBe(0)
  })
})
