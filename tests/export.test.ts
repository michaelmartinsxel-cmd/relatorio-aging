import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { buildDataset, runPipeline } from '@core/pipeline'
import { buildReportWorkbook } from '@core/export/workbook'
import { injectOverviewCharts } from '@core/export/charts'
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

function sampleDataset() {
  const records: RawRecord[] = [
    record(2, { Account: '1000', 'Account Description': 'Trade AP', Category: 'Freight', Amount: '1.500,00', 'Due Date': '01/01/2026', Currency: 'USD' }),
    record(3, { Account: '1000', 'Account Description': 'Trade AP', Category: 'Freight', Amount: '-200,00', 'Due Date': '01/06/2026', Currency: 'USD' }),
    record(4, { Account: '2000', 'Account Description': 'Services AP', Category: 'Logistics', Amount: '3.000,00', 'Due Date': '01/09/2025', Currency: 'USD' }),
    record(5, { Account: '2000', 'Account Description': 'Services AP', Category: 'Logistics', Amount: '450,75', 'Due Date': '01/01/2025', Currency: 'USD' })
  ]
  return buildDataset({
    fileName: 'sample.xlsx',
    sheetName: 'Sheet1',
    records,
    mapping,
    agingDateIso: '2026-01-15',
    policy: { treatBlankCategoryAsUnclassified: true }
  })
}

describe('export workbook (sections 26/27)', () => {
  it('produces a 4-sheet workbook with reconciled totals', async () => {
    const dataset = sampleDataset()
    const result = runPipeline(dataset)
    expect(result.reconciliation.ok).toBe(true)

    const { workbook, chartAnchors } = buildReportWorkbook(dataset, result)
    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer

    // Re-open to verify integrity — never trust just the in-memory object.
    const reopened = new ExcelJS.Workbook()
    await reopened.xlsx.load(buffer)

    const sheetNames = reopened.worksheets.map((w) => w.name)
    expect(sheetNames).toEqual(['Overview', 'Aging by Category', 'Aging by Account', 'Detail'])

    const categorySheet = reopened.getWorksheet('Aging by Category')!
    const grandTotalRow = categorySheet.getRow(categorySheet.rowCount)
    const totalLabel = grandTotalRow.getCell(1).value
    expect(totalLabel).toBe('Grand Total')

    const detailSheet = reopened.getWorksheet('Detail')!
    expect(detailSheet.rowCount - 1).toBe(dataset.rows.length) // header + one row per record

    expect(chartAnchors.agingDistribution.dataRange).toContain('Overview!')

    const withCharts = await injectOverviewCharts(buffer, chartAnchors)
    const zip = await JSZip.loadAsync(withCharts)
    expect(zip.file('xl/charts/chart1.xml')).not.toBeNull()
    expect(zip.file('xl/charts/chart2.xml')).not.toBeNull()
    expect(zip.file('xl/charts/chart3.xml')).not.toBeNull()
    expect(zip.file('xl/drawings/drawing1.xml')).not.toBeNull()

    const contentTypes = await zip.file('[Content_Types].xml')!.async('string')
    expect(contentTypes).toContain('chart1.xml')
    expect(contentTypes).toContain('drawing1.xml')

    // Re-open the charted file with ExcelJS to prove it did not corrupt the workbook.
    const finalCheck = new ExcelJS.Workbook()
    await finalCheck.xlsx.load(withCharts)
    expect(finalCheck.worksheets.map((w) => w.name)).toEqual(['Overview', 'Aging by Category', 'Aging by Account', 'Detail'])
  })

  it('never touches the amounts already validated by reconciliation', async () => {
    const dataset = sampleDataset()
    const result = runPipeline(dataset)
    const { workbook } = buildReportWorkbook(dataset, result)
    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer
    const reopened = new ExcelJS.Workbook()
    await reopened.xlsx.load(buffer)

    const categorySheet = reopened.getWorksheet('Aging by Category')!
    let sumFromExport = 0
    categorySheet.eachRow((row, rowNumber) => {
      if (rowNumber <= 4) return
      const totalCell = row.getCell(9) // Category(1) + 7 buckets(2-8) + Total(9)
      if (typeof totalCell.value === 'number') sumFromExport += Math.round(totalCell.value * 100)
    })
    // sumFromExport includes the Grand Total row itself once too, so compare against 2x the real total.
    const realTotal = result.byCategory.reduce((s, r) => s + r.buckets.total, 0)
    expect(sumFromExport).toBe(realTotal * 2)
  })
})
