/**
 * Core domain types. This module has zero dependency on Electron or React —
 * it must remain testable in plain Node/Vitest.
 *
 * Money is always represented as an integer in the currency's minor unit
 * (cents) so that aggregation and reconciliation are exact — never derived
 * from floating point sums. Formatting to a decimal string happens only at
 * the presentation/export boundary (see core/format.ts).
 */

export type Bucket = 'NOT_DUE' | 'B1_30' | 'B31_60' | 'B61_90' | 'B91_180' | 'B181_360' | 'OVER_360'

export const BUCKET_ORDER: Bucket[] = [
  'NOT_DUE',
  'B1_30',
  'B31_60',
  'B61_90',
  'B91_180',
  'B181_360',
  'OVER_360'
]

export const BUCKET_LABEL: Record<Bucket, string> = {
  NOT_DUE: 'Not Due',
  B1_30: '1–30',
  B31_60: '31–60',
  B61_90: '61–90',
  B91_180: '91–180',
  B181_360: '181–360',
  OVER_360: '>360'
}

export type Currency = string

/** Conceptual fields the app looks for. Physical column names vary per file. */
export type ConceptualField =
  | 'account'
  | 'accountDescription'
  | 'category'
  | 'amount'
  | 'dueDate'
  | 'company'
  | 'companyCode'
  | 'supplier'
  | 'supplierName'
  | 'documentNumber'
  | 'invoiceNumber'
  | 'currency'
  | 'paymentStatus'
  | 'documentDate'
  | 'postingDate'
  | 'reference'

export const REQUIRED_FIELDS: ConceptualField[] = [
  'account',
  'accountDescription',
  'category',
  'amount',
  'dueDate'
]

export const OPTIONAL_FIELDS: ConceptualField[] = [
  'company',
  'companyCode',
  'supplier',
  'supplierName',
  'documentNumber',
  'invoiceNumber',
  'currency',
  'paymentStatus',
  'documentDate',
  'postingDate',
  'reference'
]

/** Maps a conceptual field to the physical column header found in the file. */
export type ColumnMapping = Partial<Record<ConceptualField, string>>

export interface ColumnCandidate {
  field: ConceptualField
  physicalColumn: string
  score: number
}

export interface MappingSuggestion {
  mapping: ColumnMapping
  ambiguousFields: ConceptualField[]
  candidatesByField: Partial<Record<ConceptualField, ColumnCandidate[]>>
  unmappedRequiredFields: ConceptualField[]
}

export interface SheetSummary {
  name: string
  rowCount: number
  columnHeaders: string[]
  headerRow: number
  looksLikeDataSheet: boolean
}

export type AgingDateChoice =
  | { kind: 'today' }
  | { kind: 'manual'; isoDate: string }
  | { kind: 'fromFile'; column: string }

export type IncompleteDataPolicy = {
  /** When true, blank Category becomes "Unclassified". When false, those rows are flagged and excluded from Aging by Category (but kept in source/reconciliation accounting). */
  treatBlankCategoryAsUnclassified: boolean
}

/** A single raw record straight out of the sheet, before any interpretation. */
export interface RawRecord {
  sourceRowId: string // `${sheetName}!${originalRowNumber}`
  values: Record<string, unknown>
}

/** A validation or parse exception tied to one raw record. */
export interface RowException {
  sourceRowId: string
  field: ConceptualField | 'row'
  code:
    | 'MISSING_ACCOUNT'
    | 'MISSING_CATEGORY'
    | 'MISSING_AMOUNT'
    | 'INVALID_AMOUNT'
    | 'MISSING_DUE_DATE'
    | 'INVALID_DUE_DATE'
    | 'CURRENCY_MISMATCH'
  message: string
}

/** Fully normalized record used by every downstream calculation. */
export interface AgingRow {
  sourceRowId: string
  account: string
  accountDescription: string
  category: string | null // null => did not receive a category (see IncompleteDataPolicy)
  rawCategory: string | null // exact original value, never normalized/merged
  amountMinor: number // integer, minor currency unit
  currency: Currency
  dueDate: string | null // ISO yyyy-mm-dd, null if unparseable
  documentDate?: string
  postingDate?: string
  company?: string
  companyCode?: string
  supplier?: string
  supplierName?: string
  documentNumber?: string
  invoiceNumber?: string
  paymentStatus?: string
  reference?: string
  daysPastDue: number | null // null when dueDate is null
  bucket: Bucket | null // null when daysPastDue could not be computed
}

export interface Dataset {
  fileName: string
  sheetName: string
  importedAt: string
  agingDateIso: string
  currency: Currency | 'MULTI'
  rows: AgingRow[]
  exceptions: RowException[]
  totalSourceMinor: number // sum of ALL parsed amounts, including exception rows, per section 17
}

export interface BucketAmounts {
  NOT_DUE: number
  B1_30: number
  B31_60: number
  B61_90: number
  B91_180: number
  B181_360: number
  OVER_360: number
  total: number
}

export interface CategoryAgingRow {
  category: string // "Unclassified" only if policy enabled; otherwise real values only
  buckets: BucketAmounts
  pctOfTotal: number
  pctOverdue: number
}

export interface AccountAgingRow {
  account: string
  accountDescription: string
  buckets: BucketAmounts
  pctOfTotal: number
  pctOverdue: number
}

export interface OverviewKpis {
  totalApMinor: number
  totalOverdueMinor: number
  totalNotDueMinor: number
  overduePct: number
  over90Minor: number
  over180Minor: number
  over360Minor: number
  categoryCount: number
  accountCount: number
  recordCount: number
  agingDateIso: string
  currency: Currency | 'MULTI'
}

export interface ExposureByCategoryRow {
  category: string
  totalMinor: number
  overdueMinor: number
  notDueMinor: number
  overduePct: number
}

export interface TopAccountRow {
  account: string
  accountDescription: string
  totalMinor: number
}

export interface ReconciliationCheck {
  name: string
  expectedMinor: number
  calculatedMinor: number
  differenceMinor: number
  ok: boolean
}

export interface ReconciliationReport {
  ok: boolean
  checks: ReconciliationCheck[]
}

export interface Filters {
  company?: string
  category?: string
  account?: string
  supplier?: string
  currency?: string
  bucket?: Bucket
}

export interface PipelineResult {
  byCategory: CategoryAgingRow[]
  byAccount: AccountAgingRow[]
  overview: OverviewKpis
  exposureByCategory: ExposureByCategoryRow[]
  topAccounts: TopAccountRow[]
  reconciliation: ReconciliationReport
  exceptions: RowException[]
}
