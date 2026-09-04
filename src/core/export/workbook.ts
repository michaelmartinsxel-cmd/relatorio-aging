/**
 * Builds the exported .xlsx (section 26/27): Overview, Aging by Category,
 * Aging by Account, Detail. Professional formatting (headers, autofilter,
 * freeze panes, money/date formats, bold totals) — never touches the
 * original source file.
 */
import ExcelJS from 'exceljs'
import { BUCKET_LABEL, BUCKET_ORDER, Dataset, PipelineResult } from '@core/types'
import { minorToMajor } from '@core/format'
import { accountGrandTotal } from '@core/aggregation/byAccount'
import { categoryGrandTotal } from '@core/aggregation/byCategory'
import { calculateAgingDistribution } from '@core/pipeline'

const HEADER_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2A44' } }
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true }
const TOTAL_FONT: Partial<ExcelJS.Font> = { bold: true }
const OLD_BUCKET_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } }
const MONEY_FMT = '#,##0.00;[Red]-#,##0.00'
const DATE_FMT = 'dd/mm/yyyy'

export interface ChartAnchorInfo {
  agingDistribution: { sheet: string; dataRange: string; catRange: string; anchorCell: string }
  exposureByCategory: { sheet: string; dataRange: string; catRange: string; anchorCell: string }
  overdueVsNotDue: { sheet: string; dataRange: string; catRange: string; anchorCell: string }
}

export interface BuiltWorkbook {
  workbook: ExcelJS.Workbook
  chartAnchors: ChartAnchorInfo
}

export function buildReportWorkbook(dataset: Dataset, result: PipelineResult): BuiltWorkbook {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'AP Aging Report Generator'
  workbook.created = new Date()

  const chartAnchors = buildOverviewSheet(workbook, dataset, result)
  buildCategorySheet(workbook, dataset, result)
  buildAccountSheet(workbook, dataset, result)
  buildDetailSheet(workbook, dataset)

  return { workbook, chartAnchors }
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
}

function bucketColumns(): { header: string; key: string }[] {
  const cols: { header: string; key: string }[] = BUCKET_ORDER.map((b) => ({ header: BUCKET_LABEL[b], key: b }))
  cols.push({ header: 'Total', key: 'total' })
  return cols
}

function buildOverviewSheet(workbook: ExcelJS.Workbook, dataset: Dataset, result: PipelineResult): ChartAnchorInfo {
  const ws = workbook.addWorksheet('Overview', { views: [{ state: 'frozen', ySplit: 6 }] })
  ws.columns = [{ width: 28 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 20 }]

  ws.mergeCells('A1:E1')
  ws.getCell('A1').value = 'AP Aging Report — Overview'
  ws.getCell('A1').font = { bold: true, size: 16 }

  ws.getCell('A2').value = `Aging calculated as of: ${displayDate(dataset.agingDateIso)}`
  ws.getCell('A3').value = `Currency: ${dataset.currency}`
  ws.getCell('A4').value = `Source file: ${dataset.fileName}`
  ws.getCell('A5').value = `Reconciliation status: ${result.reconciliation.ok ? 'RECONCILED' : 'RECONCILIATION ERROR'}`
  ws.getCell('A5').font = { bold: true, color: { argb: result.reconciliation.ok ? 'FF1B7A3D' : 'FFB00020' } }

  const kpiHeaderRow = ws.getRow(7)
  kpiHeaderRow.values = ['KPI', 'Value']
  styleHeaderRow(kpiHeaderRow)

  const kpis: [string, number | string][] = [
    ['Total AP', minorToMajor(result.overview.totalApMinor)],
    ['Total Overdue', minorToMajor(result.overview.totalOverdueMinor)],
    ['Total Not Due', minorToMajor(result.overview.totalNotDueMinor)],
    ['Overdue %', result.overview.overduePct],
    ['> 90 Days', minorToMajor(result.overview.over90Minor)],
    ['> 180 Days', minorToMajor(result.overview.over180Minor)],
    ['> 360 Days', minorToMajor(result.overview.over360Minor)],
    ['Categories', result.overview.categoryCount],
    ['Accounts', result.overview.accountCount],
    ['Records', result.overview.recordCount]
  ]

  let r = 8
  for (const [label, value] of kpis) {
    const row = ws.getRow(r)
    row.getCell(1).value = label
    row.getCell(2).value = value
    if (label === 'Overdue %') row.getCell(2).numFmt = '0.0%'
    else if (typeof value === 'number' && label !== 'Categories' && label !== 'Accounts' && label !== 'Records') {
      row.getCell(2).numFmt = MONEY_FMT
    }
    r++
  }

  // --- Aging Distribution data block (feeds the native chart) ---
  const distStartRow = r + 2
  ws.getCell(`A${distStartRow - 1}`).value = 'Aging Distribution'
  ws.getCell(`A${distStartRow - 1}`).font = { bold: true, size: 12 }
  const distHeader = ws.getRow(distStartRow)
  distHeader.getCell(1).value = 'Bucket'
  distHeader.getCell(2).value = 'Amount'
  styleHeaderRow(distHeader)

  const distribution = calculateAgingDistribution(dataset.rows)
  distribution.forEach((d, i) => {
    const row = ws.getRow(distStartRow + 1 + i)
    row.getCell(1).value = BUCKET_LABEL[d.bucket as keyof typeof BUCKET_LABEL]
    row.getCell(2).value = minorToMajor(d.totalMinor)
    row.getCell(2).numFmt = MONEY_FMT
  })
  const distEndRow = distStartRow + distribution.length

  // --- Exposure by Category data block ---
  const expStartRow = distEndRow + 3
  ws.getCell(`A${expStartRow - 1}`).value = 'Exposure by Category'
  ws.getCell(`A${expStartRow - 1}`).font = { bold: true, size: 12 }
  const expHeader = ws.getRow(expStartRow)
  expHeader.getCell(1).value = 'Category'
  expHeader.getCell(2).value = 'Total'
  styleHeaderRow(expHeader)
  result.exposureByCategory.forEach((c, i) => {
    const row = ws.getRow(expStartRow + 1 + i)
    row.getCell(1).value = c.category
    row.getCell(2).value = minorToMajor(c.totalMinor)
    row.getCell(2).numFmt = MONEY_FMT
  })
  const expEndRow = expStartRow + result.exposureByCategory.length

  // --- Overdue vs Not Due data block ---
  const ovStartRow = expEndRow + 3
  ws.getCell(`A${ovStartRow - 1}`).value = 'Overdue vs Not Due'
  ws.getCell(`A${ovStartRow - 1}`).font = { bold: true, size: 12 }
  const ovHeader = ws.getRow(ovStartRow)
  ovHeader.getCell(1).value = 'Status'
  ovHeader.getCell(2).value = 'Amount'
  styleHeaderRow(ovHeader)
  ws.getRow(ovStartRow + 1).getCell(1).value = 'Overdue'
  ws.getRow(ovStartRow + 1).getCell(2).value = minorToMajor(result.overview.totalOverdueMinor)
  ws.getRow(ovStartRow + 1).getCell(2).numFmt = MONEY_FMT
  ws.getRow(ovStartRow + 2).getCell(1).value = 'Not Due'
  ws.getRow(ovStartRow + 2).getCell(2).value = minorToMajor(result.overview.totalNotDueMinor)
  ws.getRow(ovStartRow + 2).getCell(2).numFmt = MONEY_FMT

  return {
    agingDistribution: {
      sheet: 'Overview',
      dataRange: `Overview!$B$${distStartRow + 1}:$B$${distEndRow}`,
      catRange: `Overview!$A$${distStartRow + 1}:$A$${distEndRow}`,
      anchorCell: 'D7'
    },
    exposureByCategory: {
      sheet: 'Overview',
      dataRange: `Overview!$B$${expStartRow + 1}:$B$${expEndRow}`,
      catRange: `Overview!$A$${expStartRow + 1}:$A$${expEndRow}`,
      anchorCell: 'D22'
    },
    overdueVsNotDue: {
      sheet: 'Overview',
      dataRange: `Overview!$B$${ovStartRow + 1}:$B$${ovStartRow + 2}`,
      catRange: `Overview!$A$${ovStartRow + 1}:$A$${ovStartRow + 2}`,
      anchorCell: 'D37'
    }
  }
}

function buildCategorySheet(workbook: ExcelJS.Workbook, dataset: Dataset, result: PipelineResult): void {
  const ws = workbook.addWorksheet('Aging by Category', { views: [{ state: 'frozen', ySplit: 4 }] })

  ws.getCell('A1').value = 'Aging by Category'
  ws.getCell('A1').font = { bold: true, size: 16 }
  ws.getCell('A2').value = `Reporting Date: ${displayDate(dataset.agingDateIso)}`
  ws.getCell('A3').value = `Total AP: ${minorToMajor(result.overview.totalApMinor).toFixed(2)}   |   Total Overdue: ${minorToMajor(result.overview.totalOverdueMinor).toFixed(2)}`

  const headerRowIdx = 4
  const columns = [{ header: 'Category', key: 'category', width: 28 }, ...bucketColumns().map((c) => ({ ...c, width: 14 })), { header: '% Total', key: 'pctTotal', width: 12 }, { header: '% Overdue', key: 'pctOverdue', width: 12 }]
  ws.columns = columns
  const headerRow = ws.getRow(headerRowIdx)
  headerRow.values = columns.map((c) => c.header)
  styleHeaderRow(headerRow)

  let rIdx = headerRowIdx + 1
  for (const row of result.byCategory) {
    const excelRow = ws.getRow(rIdx)
    excelRow.getCell(1).value = row.category
    BUCKET_ORDER.forEach((b, i) => {
      const cell = excelRow.getCell(2 + i)
      cell.value = minorToMajor(row.buckets[b])
      cell.numFmt = MONEY_FMT
    })
    const totalCell = excelRow.getCell(2 + BUCKET_ORDER.length)
    totalCell.value = minorToMajor(row.buckets.total)
    totalCell.numFmt = MONEY_FMT
    excelRow.getCell(2 + BUCKET_ORDER.length + 1).value = row.pctOfTotal
    excelRow.getCell(2 + BUCKET_ORDER.length + 1).numFmt = '0.0%'
    excelRow.getCell(2 + BUCKET_ORDER.length + 2).value = row.pctOverdue
    excelRow.getCell(2 + BUCKET_ORDER.length + 2).numFmt = '0.0%'
    highlightOldBuckets(excelRow)
    rIdx++
  }

  const grand = categoryGrandTotal(result.byCategory)
  const totalRow = ws.getRow(rIdx)
  totalRow.getCell(1).value = 'Grand Total'
  BUCKET_ORDER.forEach((b, i) => {
    const cell = totalRow.getCell(2 + i)
    cell.value = minorToMajor(grand[b])
    cell.numFmt = MONEY_FMT
  })
  const grandTotalCell = totalRow.getCell(2 + BUCKET_ORDER.length)
  grandTotalCell.value = minorToMajor(grand.total)
  grandTotalCell.numFmt = MONEY_FMT
  totalRow.font = TOTAL_FONT

  ws.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: headerRowIdx, column: columns.length } }
}

function buildAccountSheet(workbook: ExcelJS.Workbook, dataset: Dataset, result: PipelineResult): void {
  const ws = workbook.addWorksheet('Aging by Account', { views: [{ state: 'frozen', ySplit: 4 }] })

  ws.getCell('A1').value = 'Aging by Account'
  ws.getCell('A1').font = { bold: true, size: 16 }
  ws.getCell('A2').value = `Reporting Date: ${displayDate(dataset.agingDateIso)}`
  ws.getCell('A3').value = `Total AP: ${minorToMajor(result.overview.totalApMinor).toFixed(2)}   |   Total Overdue: ${minorToMajor(result.overview.totalOverdueMinor).toFixed(2)}`

  const headerRowIdx = 4
  const columns = [
    { header: 'Account', key: 'account', width: 16 },
    { header: 'Account Description', key: 'accountDescription', width: 28 },
    ...bucketColumns().map((c) => ({ ...c, width: 14 })),
    { header: '% Total', key: 'pctTotal', width: 12 },
    { header: '% Overdue', key: 'pctOverdue', width: 12 }
  ]
  ws.columns = columns
  const headerRow = ws.getRow(headerRowIdx)
  headerRow.values = columns.map((c) => c.header)
  styleHeaderRow(headerRow)

  let rIdx = headerRowIdx + 1
  for (const row of result.byAccount) {
    const excelRow = ws.getRow(rIdx)
    excelRow.getCell(1).value = row.account
    excelRow.getCell(2).value = row.accountDescription
    BUCKET_ORDER.forEach((b, i) => {
      const cell = excelRow.getCell(3 + i)
      cell.value = minorToMajor(row.buckets[b])
      cell.numFmt = MONEY_FMT
    })
    const totalCell = excelRow.getCell(3 + BUCKET_ORDER.length)
    totalCell.value = minorToMajor(row.buckets.total)
    totalCell.numFmt = MONEY_FMT
    excelRow.getCell(3 + BUCKET_ORDER.length + 1).value = row.pctOfTotal
    excelRow.getCell(3 + BUCKET_ORDER.length + 1).numFmt = '0.0%'
    excelRow.getCell(3 + BUCKET_ORDER.length + 2).value = row.pctOverdue
    excelRow.getCell(3 + BUCKET_ORDER.length + 2).numFmt = '0.0%'
    highlightOldBuckets(excelRow, 1)
    rIdx++
  }

  const grand = accountGrandTotal(result.byAccount)
  const totalRow = ws.getRow(rIdx)
  totalRow.getCell(1).value = 'Grand Total'
  BUCKET_ORDER.forEach((b, i) => {
    const cell = totalRow.getCell(3 + i)
    cell.value = minorToMajor(grand[b])
    cell.numFmt = MONEY_FMT
  })
  const grandTotalCell = totalRow.getCell(3 + BUCKET_ORDER.length)
  grandTotalCell.value = minorToMajor(grand.total)
  grandTotalCell.numFmt = MONEY_FMT
  totalRow.font = TOTAL_FONT

  ws.autoFilter = { from: { row: headerRowIdx, column: 1 }, to: { row: headerRowIdx, column: columns.length } }
}

function buildDetailSheet(workbook: ExcelJS.Workbook, dataset: Dataset): void {
  const ws = workbook.addWorksheet('Detail', { views: [{ state: 'frozen', ySplit: 1 }] })
  const columns = [
    { header: 'Source Row', key: 'sourceRowId', width: 16 },
    { header: 'Account', key: 'account', width: 14 },
    { header: 'Account Description', key: 'accountDescription', width: 26 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Supplier', key: 'supplier', width: 14 },
    { header: 'Supplier Name', key: 'supplierName', width: 24 },
    { header: 'Document', key: 'documentNumber', width: 16 },
    { header: 'Invoice', key: 'invoiceNumber', width: 16 },
    { header: 'Due Date', key: 'dueDate', width: 14 },
    { header: 'Days Past Due', key: 'daysPastDue', width: 14 },
    { header: 'Bucket', key: 'bucket', width: 12 },
    { header: 'Amount', key: 'amount', width: 16 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Payment Status', key: 'paymentStatus', width: 16 }
  ]
  ws.columns = columns
  styleHeaderRow(ws.getRow(1))

  dataset.rows.forEach((row, i) => {
    const excelRow = ws.getRow(i + 2)
    excelRow.getCell(1).value = row.sourceRowId
    excelRow.getCell(2).value = row.account
    excelRow.getCell(3).value = row.accountDescription
    excelRow.getCell(4).value = row.category ?? ''
    excelRow.getCell(5).value = row.supplier ?? ''
    excelRow.getCell(6).value = row.supplierName ?? ''
    excelRow.getCell(7).value = row.documentNumber ?? ''
    excelRow.getCell(8).value = row.invoiceNumber ?? ''
    if (row.dueDate) {
      excelRow.getCell(9).value = new Date(row.dueDate)
      excelRow.getCell(9).numFmt = DATE_FMT
    }
    excelRow.getCell(10).value = row.daysPastDue ?? ''
    excelRow.getCell(11).value = row.bucket ? BUCKET_LABEL[row.bucket] : 'EXCEPTION'
    excelRow.getCell(12).value = minorToMajor(row.amountMinor)
    excelRow.getCell(12).numFmt = MONEY_FMT
    excelRow.getCell(13).value = row.currency
    excelRow.getCell(14).value = row.paymentStatus ?? ''
  })

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } }
}

function highlightOldBuckets(row: ExcelJS.Row, accountOffset = 0): void {
  const idx181_360 = 2 + accountOffset + BUCKET_ORDER.indexOf('B181_360')
  const idxOver360 = 2 + accountOffset + BUCKET_ORDER.indexOf('OVER_360')
  row.getCell(idx181_360).fill = OLD_BUCKET_FILL
  row.getCell(idxOver360).fill = OLD_BUCKET_FILL
}

function displayDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
