/**
 * Reconciliation (section 17) — the mandatory gate before any report is
 * presented as trustworthy. Never hides a difference: every check reports
 * Expected / Calculated / Difference explicitly, and the pipeline result
 * carries `reconciliation.ok` so the UI can render RECONCILIATION ERROR
 * instead of silently showing numbers that don't add up.
 */
import { AccountAgingRow, CategoryAgingRow, ReconciliationCheck, ReconciliationReport } from '@core/types'

export function reconcile(
  totalSourceMinor: number,
  totalAgingMinor: number,
  byCategory: CategoryAgingRow[],
  byAccount: AccountAgingRow[]
): ReconciliationReport {
  const categoryTotal = byCategory.reduce((s, r) => s + r.buckets.total, 0)
  const accountTotal = byAccount.reduce((s, r) => s + r.buckets.total, 0)

  const checks: ReconciliationCheck[] = [
    makeCheck('Total Source = Total Aging', totalSourceMinor, totalAgingMinor),
    makeCheck('Total Aging by Category = Total Source', totalSourceMinor, categoryTotal),
    makeCheck('Total Aging by Account = Total Source', totalSourceMinor, accountTotal)
  ]

  return { ok: checks.every((c) => c.ok), checks }
}

function makeCheck(name: string, expectedMinor: number, calculatedMinor: number): ReconciliationCheck {
  const differenceMinor = calculatedMinor - expectedMinor
  return { name, expectedMinor, calculatedMinor, differenceMinor, ok: differenceMinor === 0 }
}
