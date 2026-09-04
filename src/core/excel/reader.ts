/**
 * Reads workbooks (.xlsx/.xlsm/.xls/.csv) into raw records, without
 * interpreting any business meaning yet. Macros and external links are
 * never executed — ExcelJS only parses the XML/zip structure, and xlsx
 * legacy files are read through SheetJS in read-only, no-script mode
 * (section 29).
 */
import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { readFile } from 'node:fs/promises'
import { RawRecord, SheetSummary } from '@core/types'

const MAX_FILE_SIZE_BYTES = 300 * 1024 * 1024 // 300MB guard against pathological/zip-bomb inputs

export type WorkbookKind = 'xlsx' | 'xlsm' | 'xls' | 'csv'

export function detectKind(filePath: string): WorkbookKind {
  const lower = filePath.toLowerCase()
  if (lower.endsWith('.xlsm')) return 'xlsm'
  if (lower.endsWith('.xls')) return 'xls'
  if (lower.endsWith('.csv')) return 'csv'
  return 'xlsx'
}

export interface LoadedWorkbook {
  kind: WorkbookKind
  sheets: SheetSummary[]
  getSheetRows: (sheetName: string, headerRow: number) => RawRecord[]
}

export async function loadWorkbook(filePath: string): Promise<LoadedWorkbook> {
  const stat = await import('node:fs/promises').then((m) => m.stat(filePath))
  if (stat.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds the maximum supported size (${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB).`)
  }

  const kind = detectKind(filePath)

  if (kind === 'csv') {
    return loadCsv(filePath)
  }

  if (kind === 'xls') {
    return loadLegacyXls(filePath)
  }

  return loadWithExcelJs(filePath)
}

async function loadWithExcelJs(filePath: string): Promise<LoadedWorkbook> {
  const workbook = new ExcelJS.Workbook()
  // ExcelJS never executes vbaProject.bin / macros; it only parses the sheetData XML.
  await workbook.xlsx.readFile(filePath)

  const sheetCache = new Map<string, ExcelJS.Worksheet>()
  const sheets: SheetSummary[] = workbook.worksheets
    .filter((ws) => ws.state === 'visible' || ws.state === undefined)
    .map((ws) => summarizeWorksheet(ws))
  workbook.worksheets.forEach((ws) => sheetCache.set(ws.name, ws))

  return {
    kind: detectKind(filePath),
    sheets,
    getSheetRows: (sheetName, headerRow) => {
      const ws = sheetCache.get(sheetName)
      if (!ws) throw new Error(`Sheet not found: ${sheetName}`)
      return extractRows(ws, headerRow, sheetName)
    }
  }
}

function summarizeWorksheet(ws: ExcelJS.Worksheet): SheetSummary {
  const headerRow = findLikelyHeaderRow(ws)
  const headers = readHeaderRow(ws, headerRow)
  const rowCount = Math.max(0, ws.actualRowCount - headerRow)
  return {
    name: ws.name,
    rowCount,
    columnHeaders: headers,
    headerRow,
    looksLikeDataSheet: headers.length >= 2 && rowCount > 0
  }
}

function findLikelyHeaderRow(ws: ExcelJS.Worksheet): number {
  const maxScan = Math.min(10, ws.rowCount || 1)
  let bestRow = 1
  let bestScore = -1
  for (let r = 1; r <= maxScan; r++) {
    const row = ws.getRow(r)
    let nonEmptyText = 0
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (typeof cell.value === 'string' && cell.value.trim() !== '') nonEmptyText++
    })
    if (nonEmptyText > bestScore) {
      bestScore = nonEmptyText
      bestRow = r
    }
  }
  return bestRow
}

function readHeaderRow(ws: ExcelJS.Worksheet, headerRow: number): string[] {
  const row = ws.getRow(headerRow)
  const headers: string[] = []
  row.eachCell({ includeEmpty: false }, (cell) => {
    const v = cell.value
    headers.push(v === null || v === undefined ? '' : String(cellText(v)).trim())
  })
  return headers.filter((h) => h !== '')
}

function extractRows(ws: ExcelJS.Worksheet, headerRow: number, sheetName: string): RawRecord[] {
  const row = ws.getRow(headerRow)
  const colIndexToHeader = new Map<number, string>()
  row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = cellText(cell.value)
    if (text) colIndexToHeader.set(colNumber, text)
  })

  const records: RawRecord[] = []
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber <= headerRow) return
    const values: Record<string, unknown> = {}
    let hasAnyValue = false
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = colIndexToHeader.get(colNumber)
      if (!header) return
      const value = cellValue(cell)
      if (value !== null && value !== undefined && value !== '') hasAnyValue = true
      values[header] = value
    })
    if (!hasAnyValue) return
    records.push({ sourceRowId: `${sheetName}!${rowNumber}`, values })
  })
  return records
}

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object' && 'richText' in (v as any)) {
    return (v as any).richText.map((t: any) => t.text).join('')
  }
  if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text)
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

function cellValue(cell: ExcelJS.Cell): unknown {
  const v = cell.value
  if (v === null || v === undefined) return null
  if (typeof v === 'object') {
    if ('result' in (v as any)) return (v as any).result // formula cell: use its cached value, never re-execute
    if ('richText' in (v as any)) return cellText(v)
    if ('text' in (v as any)) return (v as any).text
    if (v instanceof Date) return v
  }
  return v
}

async function loadCsv(filePath: string): Promise<LoadedWorkbook> {
  const content = await readFile(filePath, 'utf-8')
  const parsed = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: true })
  const headers = parsed.meta.fields ?? []
  const rows: RawRecord[] = parsed.data.map((row, i) => ({
    sourceRowId: `CSV!${i + 2}`,
    values: row
  }))
  const sheet: SheetSummary = {
    name: 'CSV',
    rowCount: rows.length,
    columnHeaders: headers,
    headerRow: 1,
    looksLikeDataSheet: headers.length >= 2 && rows.length > 0
  }
  return {
    kind: 'csv',
    sheets: [sheet],
    getSheetRows: () => rows
  }
}

async function loadLegacyXls(filePath: string): Promise<LoadedWorkbook> {
  const buf = await readFile(filePath)
  // cellFormula/cellHTML disabled; no script execution occurs in SheetJS regardless.
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, cellFormula: false })
  const sheets: SheetSummary[] = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name]
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true })
    const headers = json.length > 0 ? Object.keys(json[0]) : []
    return {
      name,
      rowCount: json.length,
      columnHeaders: headers,
      headerRow: 1,
      looksLikeDataSheet: headers.length >= 2 && json.length > 0
    }
  })

  return {
    kind: 'xls',
    sheets,
    getSheetRows: (sheetName) => {
      const ws = wb.Sheets[sheetName]
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true })
      return json.map((values, i) => ({ sourceRowId: `${sheetName}!${i + 2}`, values }))
    }
  }
}
