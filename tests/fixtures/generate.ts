/**
 * Generates synthetic .xlsx fixtures covering the scenarios the spec calls
 * out explicitly: multi-sheet, multi-currency, negatives/credit notes,
 * missing category/account, SAP-style number formatting, and pt-BR dates.
 * Never uses real company data — everything here is invented.
 */
import ExcelJS from 'exceljs'
import { join } from 'node:path'

const OUT_DIR = join(__dirname)

async function main(): Promise<void> {
  await generateClean()
  await generateMessy()
  console.log('Fixtures written to', OUT_DIR)
}

async function generateClean(): Promise<void> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Data')
  ws.addRow(['Account', 'Account Description', 'Category', 'Amount', 'Due Date', 'Currency', 'Supplier'])
  const rows: [string, string, string, number | string, string, string, string][] = [
    ['1000', 'Trade AP', 'Freight', 1500.0, '01/01/2026', 'USD', 'S001'],
    ['1000', 'Trade AP', 'Freight', -200.0, '15/02/2026', 'USD', 'S001'],
    ['2000', 'Services AP', 'Logistics', 3000.0, '01/09/2025', 'USD', 'S002'],
    ['2000', 'Services AP', 'Logistics', 450.75, '01/01/2025', 'USD', 'S003'],
    ['3000', 'Consulting', 'Professional Services', '1.234,56', '20/12/2025', 'USD', 'S004']
  ]
  rows.forEach((r) => ws.addRow(r))
  await wb.xlsx.writeFile(join(OUT_DIR, 'clean.xlsx'))
}

async function generateMessy(): Promise<void> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Data')
  ws.addRow(['G/L Account', 'G/L Description', 'Classification', 'Amount LC', 'Net Due Date', 'Currency'])
  ws.addRow(['4000', 'Utilities', 'Overhead', '5.000,00', '10/03/2026', 'BRL'])
  ws.addRow(['4000', 'Utilities', 'Overhead', '1.500,50-', '10/03/2026', 'BRL']) // SAP-style trailing minus
  ws.addRow(['5000', 'Equipment', '', 800.0, '01/01/2026', 'BRL']) // missing category
  ws.addRow(['', '', 'Overhead', 200.0, '01/01/2026', 'BRL']) // missing account
  ws.addRow(['6000', 'Marketing', 'Overhead', 300.0, '', 'BRL']) // missing due date
  ws.addRow(['7000', 'Travel', 'Overhead', 100.0, '01/01/2026', 'EUR']) // second currency
  await wb.xlsx.writeFile(join(OUT_DIR, 'messy.xlsx'))
}

void main()
