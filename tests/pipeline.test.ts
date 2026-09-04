import { describe, expect, it } from 'vitest'
import { buildDataset, runPipeline } from '@core/pipeline'
import { ColumnMapping, RawRecord } from '@core/types'

const mapping: ColumnMapping = {
  account: 'Account',
  accountDescription: 'Account Description',
  category: 'Category',
  amount: 'Amount',
  dueDate: 'Due Date',
  currency: 'Currency'
}

function record(id: number, values: Record<string, unknown>): RawRecord {
  return { sourceRowId: `Sheet1!${id}`, values }
}

describe('buildDataset + runPipeline — reconciliation identity (section 17)', () => {
  it('reconciles totals across source, category, account and buckets for a clean dataset', () => {
    const records: RawRecord[] = [
      record(2, { Account: '1000', 'Account Description': 'Trade AP', Category: 'Freight', Amount: '1.500,00', 'Due Date': '01/01/2026', Currency: 'USD' }),
      record(3, { Account: '1000', 'Account Description': 'Trade AP', Category: 'Freight', Amount: '-200,00', 'Due Date': '01/06/2026', Currency: 'USD' }),
      record(4, { Account: '2000', 'Account Description': 'Services AP', Category: 'Logistics', Amount: '3.000,00', 'Due Date': '01/09/2025', Currency: 'USD' })
    ]

    const dataset = buildDataset({
      fileName: 'test.xlsx',
      sheetName: 'Sheet1',
      records,
      mapping,
      agingDateIso: '2026-01-15',
      policy: { treatBlankCategoryAsUnclassified: true }
    })

    const result = runPipeline(dataset)

    expect(result.reconciliation.ok).toBe(true)
    for (const check of result.reconciliation.checks) {
      expect(check.differenceMinor).toBe(0)
    }

    const categoryTotal = result.byCategory.reduce((s, r) => s + r.buckets.total, 0)
    const accountTotal = result.byAccount.reduce((s, r) => s + r.buckets.total, 0)
    expect(categoryTotal).toBe(dataset.totalSourceMinor)
    expect(accountTotal).toBe(dataset.totalSourceMinor)
    expect(result.overview.totalApMinor).toBe(dataset.totalSourceMinor)

    // Categories are kept exactly as in the source, not merged.
    const categories = result.byCategory.map((c) => c.category).sort()
    expect(categories).toEqual(['Freight', 'Logistics'])
  })

  it('does not merge similarly-named categories (section 10)', () => {
    const records: RawRecord[] = [
      record(2, { Account: '1', 'Account Description': 'A', Category: 'Logistics', Amount: 100, 'Due Date': '2026-01-01' }),
      record(3, { Account: '1', 'Account Description': 'A', Category: 'LOGISTICS', Amount: 100, 'Due Date': '2026-01-01' }),
      record(4, { Account: '1', 'Account Description': 'A', Category: 'Logistic', Amount: 100, 'Due Date': '2026-01-01' })
    ]
    const dataset = buildDataset({
      fileName: 'x.xlsx',
      sheetName: 'Sheet1',
      records,
      mapping,
      agingDateIso: '2026-01-15',
      policy: { treatBlankCategoryAsUnclassified: true }
    })
    const result = runPipeline(dataset)
    expect(result.byCategory.map((c) => c.category).sort()).toEqual(['LOGISTICS', 'Logistic', 'Logistics'])
  })

  it('surfaces a RECONCILIATION ERROR instead of hiding it when due dates are missing (section 17/21)', () => {
    const records: RawRecord[] = [
      record(2, { Account: '1', 'Account Description': 'A', Category: 'Freight', Amount: 1000, 'Due Date': '2026-01-01' }),
      record(3, { Account: '2', 'Account Description': 'B', Category: 'Freight', Amount: 500, 'Due Date': '' }) // missing due date -> no bucket
    ]
    const dataset = buildDataset({
      fileName: 'x.xlsx',
      sheetName: 'Sheet1',
      records,
      mapping,
      agingDateIso: '2026-01-15',
      policy: { treatBlankCategoryAsUnclassified: true }
    })
    expect(dataset.exceptions.some((e) => e.code === 'MISSING_DUE_DATE')).toBe(true)
    expect(dataset.totalSourceMinor).toBe(150000) // both rows still count toward source total

    const result = runPipeline(dataset)
    // bucketed total (1000) != source total (1500) => reconciliation must fail visibly
    expect(result.reconciliation.ok).toBe(false)
    const failing = result.reconciliation.checks.find((c) => !c.ok)
    expect(failing?.differenceMinor).toBe(-50000) // calculated (bucketed) is short by 500.00
  })

  it('flags missing account and missing category without inventing values (section 21)', () => {
    const records: RawRecord[] = [
      record(2, { Account: '', 'Account Description': '', Category: '', Amount: 100, 'Due Date': '2026-01-01' })
    ]
    const dataset = buildDataset({
      fileName: 'x.xlsx',
      sheetName: 'Sheet1',
      records,
      mapping,
      agingDateIso: '2026-01-15',
      policy: { treatBlankCategoryAsUnclassified: false }
    })
    expect(dataset.exceptions.some((e) => e.code === 'MISSING_ACCOUNT')).toBe(true)
    expect(dataset.exceptions.some((e) => e.code === 'MISSING_CATEGORY')).toBe(true)
    expect(dataset.rows[0].category).toBeNull() // policy disabled => stays null, not "Unclassified"
  })

  it('applies the Unclassified policy only when explicitly enabled (section 21)', () => {
    const records: RawRecord[] = [
      record(2, { Account: '1', 'Account Description': 'A', Category: '', Amount: 100, 'Due Date': '2026-01-01' })
    ]
    const dataset = buildDataset({
      fileName: 'x.xlsx',
      sheetName: 'Sheet1',
      records,
      mapping,
      agingDateIso: '2026-01-15',
      policy: { treatBlankCategoryAsUnclassified: true }
    })
    expect(dataset.rows[0].category).toBe('Unclassified')
  })

  it('preserves negative values / credit notes in totals (section 19)', () => {
    const records: RawRecord[] = [
      record(2, { Account: '1', 'Account Description': 'A', Category: 'Freight', Amount: 1000, 'Due Date': '2026-01-01' }),
      record(3, { Account: '1', 'Account Description': 'A', Category: 'Freight', Amount: -400, 'Due Date': '2026-01-01' })
    ]
    const dataset = buildDataset({
      fileName: 'x.xlsx',
      sheetName: 'Sheet1',
      records,
      mapping,
      agingDateIso: '2026-01-15',
      policy: { treatBlankCategoryAsUnclassified: true }
    })
    expect(dataset.totalSourceMinor).toBe(60000)
    const result = runPipeline(dataset)
    expect(result.reconciliation.ok).toBe(true)
  })

  it('detects multiple currencies and does not silently sum (section 18)', () => {
    const records: RawRecord[] = [
      record(2, { Account: '1', 'Account Description': 'A', Category: 'Freight', Amount: 100, 'Due Date': '2026-01-01', Currency: 'USD' }),
      record(3, { Account: '1', 'Account Description': 'A', Category: 'Freight', Amount: 100, 'Due Date': '2026-01-01', Currency: 'EUR' })
    ]
    const dataset = buildDataset({
      fileName: 'x.xlsx',
      sheetName: 'Sheet1',
      records,
      mapping,
      agingDateIso: '2026-01-15',
      policy: { treatBlankCategoryAsUnclassified: true }
    })
    expect(dataset.currency).toBe('MULTI')

    const usdOnly = runPipeline(dataset, { currency: 'USD' })
    expect(usdOnly.overview.totalApMinor).toBe(10000)
  })
})
