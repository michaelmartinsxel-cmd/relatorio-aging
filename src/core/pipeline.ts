/**
 * Pure orchestration of: calculate aging -> aggregate -> reconcile.
 * Framework-free so it can run identically in the Electron main process and
 * under Vitest. File I/O (reading the workbook) happens before this is
 * called; this function only deals with already-extracted RawRecord[].
 */
import { calculateAging } from '@core/aging/calculate'
import { aggregateByCategory } from '@core/aggregation/byCategory'
import { aggregateByAccount } from '@core/aggregation/byAccount'
import {
  calculateAgingDistribution,
  calculateExposureByCategory,
  calculateOverview,
  calculateTopAccounts
} from '@core/aggregation/overview'
import { applyFilters } from '@core/aggregation/filters'
import { reconcile } from '@core/reconciliation/reconcile'
import { checkCurrencies } from '@core/validation/validate'
import {
  ColumnMapping,
  Dataset,
  Filters,
  IncompleteDataPolicy,
  PipelineResult,
  RawRecord
} from '@core/types'

export interface BuildDatasetArgs {
  fileName: string
  sheetName: string
  records: RawRecord[]
  mapping: ColumnMapping
  agingDateIso: string
  policy: IncompleteDataPolicy
  currencyOverride?: string
}

export function buildDataset(args: BuildDatasetArgs): Dataset {
  const { rows, exceptions, totalSourceMinor } = calculateAging(
    args.records,
    args.mapping,
    args.agingDateIso,
    args.policy
  )

  const currencyCheck = checkCurrencies(rows.map((r) => r.currency))
  const currency = args.currencyOverride ?? (currencyCheck.isMulti ? 'MULTI' : currencyCheck.currencies[0] ?? 'BASE')

  return {
    fileName: args.fileName,
    sheetName: args.sheetName,
    importedAt: new Date().toISOString(),
    agingDateIso: args.agingDateIso,
    currency,
    rows,
    exceptions,
    totalSourceMinor
  }
}

/**
 * When `dataset.currency === 'MULTI'` and no currency filter has been
 * applied, the caller must not treat the totals as meaningful — the UI is
 * expected to force a currency selection first (section 18: never sum
 * silently across currencies).
 */
export function runPipeline(dataset: Dataset, filters: Filters = {}): PipelineResult {
  const filtered = applyFilters(dataset.rows, filters)

  const byCategory = aggregateByCategory(filtered)
  const byAccount = aggregateByAccount(filtered)
  const overview = calculateOverview(filtered, dataset.agingDateIso, dataset.currency)
  const exposureByCategory = calculateExposureByCategory(filtered)
  const topAccounts = calculateTopAccounts(filtered)

  const totalAgingMinor = filtered.filter((r) => r.bucket !== null).reduce((s, r) => s + r.amountMinor, 0)
  const totalSourceScoped = filtered.reduce((s, r) => s + r.amountMinor, 0)

  const reconciliation = reconcile(totalSourceScoped, totalAgingMinor, byCategory, byAccount)

  return {
    byCategory,
    byAccount,
    overview,
    exposureByCategory,
    topAccounts,
    reconciliation,
    exceptions: dataset.exceptions
  }
}

export { calculateAgingDistribution }
