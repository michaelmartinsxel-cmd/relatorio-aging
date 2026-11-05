import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { loadWorkbook } from '@core/excel/reader'
import { suggestMapping } from '@core/mapping/detect'
import { buildDataset, runPipeline } from '@core/pipeline'
import { buildReportWorkbook } from '@core/export/workbook'
import { injectOverviewCharts } from '@core/export/charts'
import ExcelJS from 'exceljs'

const FIXTURES_DIR = join(__dirname, 'fixtures')
const CLEAN = join(FIXTURES_DIR, 'clean.xlsx')
const MESSY = join(FIXTURES_DIR, 'messy.xlsx')

beforeAll(() => {
  if (!existsSync(CLEAN) || !existsSync(MESSY)) {
    execFileSync('npx', ['tsx', join(FIXTURES_DIR, 'generate.ts')], { stdio: 'inherit' })
  }
})

afterAll(() => {
  // Fixtures are regenerated on demand and gitignored; nothing to clean up.
})

describe('end-to-end: real .xlsx -> dataset -> pipeline -> export (clean fixture)', () => {
  it('reads, auto-maps, calculates and reconciles a real file end-to-end', async () => {
    const workbook = await loadWorkbook(CLEAN)
    expect(workbook.sheets.length).toBeGreaterThan(0)
    const sheet = workbook.sheets[0]

    const suggestion = suggestMapping(sheet.columnHeaders)
    expect(suggestion.unmappedRequiredFields).toEqual([])

    const records = workbook.getSheetRows(sheet.name, sheet.headerRow)
    const dataset = buildDataset({
      fileName: 'clean.xlsx',
      sheetName: sheet.name,
      records,
      mapping: suggestion.mapping,
      agingDateIso: '2026-01-15',
      policy: { treatBlankCategoryAsUnclassified: true }
    })

    const result = runPipeline(dataset)
    expect(result.reconciliation.ok).toBe(true)

    const { workbook: outWb, chartAnchors } = buildReportWorkbook(dataset, result)
    const buffer = (await outWb.xlsx.writeBuffer()) as unknown as Buffer
    const withCharts = await injectOverviewCharts(buffer, chartAnchors)

    const reopened = new ExcelJS.Workbook()
    await reopened.xlsx.load(withCharts)
    expect(reopened.worksheets.map((w) => w.name)).toEqual([
      'Overview',
      'Aging by Category',
      'Aging by Account',
      'Detail'
    ])
  })

  it('does not mutate the original source file on disk', async () => {
    const { readFile, stat } = await import('node:fs/promises')
    const before = await stat(CLEAN)
    const contentBefore = await readFile(CLEAN)

    await loadWorkbook(CLEAN) // read-only pass, mirroring what the app does

    const after = await stat(CLEAN)
    const contentAfter = await readFile(CLEAN)
    expect(after.mtimeMs).toBe(before.mtimeMs)
    expect(Buffer.compare(contentBefore, contentAfter)).toBe(0)
  })
})

describe('end-to-end: messy fixture — SAP formatting, missing fields, multi-currency', () => {
  it('parses SAP-style headers and trailing-minus amounts via auto-mapping', async () => {
    const workbook = await loadWorkbook(MESSY)
    const sheet = workbook.sheets[0]
    const suggestion = suggestMapping(sheet.columnHeaders)
    expect(suggestion.mapping.account).toBe('G/L Account')
    expect(suggestion.mapping.category).toBe('Classification')
    expect(suggestion.mapping.amount).toBe('Amount LC')
    expect(suggestion.mapping.dueDate).toBe('Net Due Date')

    const records = workbook.getSheetRows(sheet.name, sheet.headerRow)
    const dataset = buildDataset({
      fileName: 'messy.xlsx',
      sheetName: sheet.name,
      records,
      mapping: suggestion.mapping,
      agingDateIso: '2026-04-01',
      policy: { treatBlankCategoryAsUnclassified: false }
    })

    // SAP trailing-minus row: "1.500,50-"
    const negativeRow = dataset.rows.find((r) => r.amountMinor === -150050)
    expect(negativeRow).toBeDefined()

    expect(dataset.exceptions.some((e) => e.code === 'MISSING_CATEGORY')).toBe(true)
    expect(dataset.exceptions.some((e) => e.code === 'MISSING_ACCOUNT')).toBe(true)
    expect(dataset.exceptions.some((e) => e.code === 'MISSING_DUE_DATE')).toBe(true)
    expect(dataset.currency).toBe('MULTI') // BRL + EUR present

    // Reconciliation must visibly fail because of the missing-due-date row —
    // never silently swallowed (section 17/21).
    const result = runPipeline(dataset, { currency: 'BRL' })
    expect(result.reconciliation.ok).toBe(false)
  })
})
