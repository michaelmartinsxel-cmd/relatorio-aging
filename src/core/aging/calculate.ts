/**
 * Turns validated raw records into normalized AgingRow[]. This is the only
 * place that computes Days Past Due and assigns buckets. Due Date is never
 * substituted by Posting Date, Document Date or any other date (section 8).
 */
import { parseAmountToMinorUnits } from '@core/parse/amount'
import { daysBetween, DayMonthOrder, inferDayMonthOrder, parseDateCell } from '@core/parse/date'
import { assignBucket } from '@core/aging/buckets'
import {
  AgingRow,
  ColumnMapping,
  IncompleteDataPolicy,
  RawRecord,
  RowException
} from '@core/types'

export interface CalculateResult {
  rows: AgingRow[]
  exceptions: RowException[]
  totalSourceMinor: number
}

function pick(values: Record<string, unknown>, mapping: ColumnMapping, field: keyof ColumnMapping): unknown {
  const col = mapping[field]
  if (!col) return undefined
  return values[col]
}

function toTrimmedString(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined
  const s = String(v).trim()
  return s === '' ? undefined : s
}

export function calculateAging(
  records: RawRecord[],
  mapping: ColumnMapping,
  agingDateIso: string,
  policy: IncompleteDataPolicy
): CalculateResult {
  const rows: AgingRow[] = []
  const exceptions: RowException[] = []
  let totalSourceMinor = 0

  const dueDateColumn = mapping.dueDate
  const dueDateOrder: DayMonthOrder =
    (dueDateColumn && inferDayMonthOrder(records.map((r) => r.values[dueDateColumn]))) || 'DMY'

  for (const record of records) {
    const account = toTrimmedString(pick(record.values, mapping, 'account'))
    const accountDescription = toTrimmedString(pick(record.values, mapping, 'accountDescription')) ?? ''
    const rawCategoryValue = pick(record.values, mapping, 'category')
    const rawCategory = toTrimmedString(rawCategoryValue) ?? null
    const amountRaw = pick(record.values, mapping, 'amount')
    const dueDateRaw = pick(record.values, mapping, 'dueDate')
    const currency = toTrimmedString(pick(record.values, mapping, 'currency')) ?? 'BASE'

    const parsedAmount = parseAmountToMinorUnits(amountRaw)
    if (!parsedAmount.ok) {
      exceptions.push({
        sourceRowId: record.sourceRowId,
        field: 'amount',
        code: amountRaw === undefined || amountRaw === null || amountRaw === '' ? 'MISSING_AMOUNT' : 'INVALID_AMOUNT',
        message: `Could not parse amount value: ${String(amountRaw)}`
      })
      continue // rows without a valid amount cannot participate in any total
    }
    totalSourceMinor += parsedAmount.minorUnits

    if (!account) {
      exceptions.push({
        sourceRowId: record.sourceRowId,
        field: 'account',
        code: 'MISSING_ACCOUNT',
        message: 'Account is missing.'
      })
    }

    let category: string | null = rawCategory
    if (rawCategory === null) {
      exceptions.push({
        sourceRowId: record.sourceRowId,
        field: 'category',
        code: 'MISSING_CATEGORY',
        message: 'Category is missing.'
      })
      category = policy.treatBlankCategoryAsUnclassified ? 'Unclassified' : null
    }

    let dueDateIso: string | null = null
    if (dueDateRaw === undefined || dueDateRaw === null || dueDateRaw === '') {
      exceptions.push({
        sourceRowId: record.sourceRowId,
        field: 'dueDate',
        code: 'MISSING_DUE_DATE',
        message: 'Due date is missing.'
      })
    } else {
      dueDateIso = parseDateCell(dueDateRaw, dueDateOrder)
      if (dueDateIso === null) {
        exceptions.push({
          sourceRowId: record.sourceRowId,
          field: 'dueDate',
          code: 'INVALID_DUE_DATE',
          message: `Could not parse due date value: ${String(dueDateRaw)}`
        })
      }
    }

    const daysPastDue = dueDateIso ? daysBetween(agingDateIso, dueDateIso) : null
    const bucket = daysPastDue !== null ? assignBucket(daysPastDue) : null

    rows.push({
      sourceRowId: record.sourceRowId,
      account: account ?? '',
      accountDescription,
      category,
      rawCategory,
      amountMinor: parsedAmount.minorUnits,
      currency,
      dueDate: dueDateIso,
      documentDate: toTrimmedString(pick(record.values, mapping, 'documentDate')),
      postingDate: toTrimmedString(pick(record.values, mapping, 'postingDate')),
      company: toTrimmedString(pick(record.values, mapping, 'company')),
      companyCode: toTrimmedString(pick(record.values, mapping, 'companyCode')),
      supplier: toTrimmedString(pick(record.values, mapping, 'supplier')),
      supplierName: toTrimmedString(pick(record.values, mapping, 'supplierName')),
      documentNumber: toTrimmedString(pick(record.values, mapping, 'documentNumber')),
      invoiceNumber: toTrimmedString(pick(record.values, mapping, 'invoiceNumber')),
      paymentStatus: toTrimmedString(pick(record.values, mapping, 'paymentStatus')),
      reference: toTrimmedString(pick(record.values, mapping, 'reference')),
      daysPastDue,
      bucket
    })
  }

  return { rows, exceptions, totalSourceMinor }
}
