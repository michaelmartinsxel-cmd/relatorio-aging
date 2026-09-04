/**
 * Overview (section 12): a summary view only — no separate analysis engine.
 * Every KPI here is derived from the same normalized rows the tables use,
 * so nothing is hardcoded (section 32).
 */
import {
  AgingRow,
  BUCKET_ORDER,
  Currency,
  ExposureByCategoryRow,
  OverviewKpis,
  TopAccountRow
} from '@core/types'

export function calculateOverview(
  rows: AgingRow[],
  agingDateIso: string,
  currency: Currency | 'MULTI'
): OverviewKpis {
  const bucketed = rows.filter((r) => r.bucket !== null)

  const totalApMinor = bucketed.reduce((s, r) => s + r.amountMinor, 0)
  const totalNotDueMinor = bucketed.filter((r) => r.bucket === 'NOT_DUE').reduce((s, r) => s + r.amountMinor, 0)
  const totalOverdueMinor = totalApMinor - totalNotDueMinor
  const over90Minor = bucketed
    .filter((r) => r.bucket === 'B91_180' || r.bucket === 'B181_360' || r.bucket === 'OVER_360')
    .reduce((s, r) => s + r.amountMinor, 0)
  const over180Minor = bucketed
    .filter((r) => r.bucket === 'B181_360' || r.bucket === 'OVER_360')
    .reduce((s, r) => s + r.amountMinor, 0)
  const over360Minor = bucketed.filter((r) => r.bucket === 'OVER_360').reduce((s, r) => s + r.amountMinor, 0)

  const categoryCount = new Set(bucketed.map((r) => r.category).filter((c): c is string => c !== null)).size
  const accountCount = new Set(bucketed.map((r) => r.account)).size

  return {
    totalApMinor,
    totalOverdueMinor,
    totalNotDueMinor,
    overduePct: totalApMinor !== 0 ? totalOverdueMinor / totalApMinor : 0,
    over90Minor,
    over180Minor,
    over360Minor,
    categoryCount,
    accountCount,
    recordCount: bucketed.length,
    agingDateIso,
    currency
  }
}

export function calculateExposureByCategory(rows: AgingRow[]): ExposureByCategoryRow[] {
  const bucketed = rows.filter((r) => r.bucket !== null && r.category !== null)
  const grouped = new Map<string, { total: number; overdue: number; notDue: number }>()

  for (const r of bucketed) {
    const key = r.category as string
    if (!grouped.has(key)) grouped.set(key, { total: 0, overdue: 0, notDue: 0 })
    const g = grouped.get(key)!
    g.total += r.amountMinor
    if (r.bucket === 'NOT_DUE') g.notDue += r.amountMinor
    else g.overdue += r.amountMinor
  }

  return [...grouped.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([category, g]) => ({
      category,
      totalMinor: g.total,
      overdueMinor: g.overdue,
      notDueMinor: g.notDue,
      overduePct: g.total !== 0 ? g.overdue / g.total : 0
    }))
}

export function calculateTopAccounts(rows: AgingRow[], limit = 10): TopAccountRow[] {
  const bucketed = rows.filter((r) => r.bucket !== null)
  const grouped = new Map<string, { accountDescription: string; total: number }>()

  for (const r of bucketed) {
    if (!grouped.has(r.account)) grouped.set(r.account, { accountDescription: r.accountDescription, total: 0 })
    grouped.get(r.account)!.total += r.amountMinor
  }

  return [...grouped.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, limit)
    .map(([account, g]) => ({ account, accountDescription: g.accountDescription, totalMinor: g.total }))
}

export function calculateAgingDistribution(rows: AgingRow[]): { bucket: string; totalMinor: number }[] {
  const bucketed = rows.filter((r) => r.bucket !== null)
  return BUCKET_ORDER.map((bucket) => ({
    bucket,
    totalMinor: bucketed.filter((r) => r.bucket === bucket).reduce((s, r) => s + r.amountMinor, 0)
  }))
}
