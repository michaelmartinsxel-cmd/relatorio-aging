/**
 * Aging by Account (section 11). Account + description come directly from
 * the source; rows without a bucket are excluded from the table body (same
 * rule as byCategory.ts).
 */
import { AccountAgingRow, AgingRow, BucketAmounts, BUCKET_ORDER } from '@core/types'

interface Accumulator {
  accountDescription: string
  buckets: BucketAmounts
}

function emptyBucketAmounts(): BucketAmounts {
  return { NOT_DUE: 0, B1_30: 0, B31_60: 0, B61_90: 0, B91_180: 0, B181_360: 0, OVER_360: 0, total: 0 }
}

export function aggregateByAccount(rows: AgingRow[]): AccountAgingRow[] {
  const grouped = new Map<string, Accumulator>()

  for (const row of rows) {
    if (row.bucket === null) continue
    const key = row.account
    if (!grouped.has(key)) {
      grouped.set(key, { accountDescription: row.accountDescription, buckets: emptyBucketAmounts() })
    }
    const acc = grouped.get(key)!
    acc.buckets[row.bucket] += row.amountMinor
    acc.buckets.total += row.amountMinor
  }

  const grandTotal = [...grouped.values()].reduce((s, a) => s + a.buckets.total, 0)
  const overdueOf = (b: BucketAmounts): number =>
    BUCKET_ORDER.filter((k) => k !== 'NOT_DUE').reduce((acc, k) => acc + b[k], 0)

  return [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([account, acc]) => ({
      account,
      accountDescription: acc.accountDescription,
      buckets: acc.buckets,
      pctOfTotal: grandTotal !== 0 ? acc.buckets.total / grandTotal : 0,
      pctOverdue: acc.buckets.total !== 0 ? overdueOf(acc.buckets) / acc.buckets.total : 0
    }))
}

export function accountGrandTotal(rows: AccountAgingRow[]): BucketAmounts {
  const total = { NOT_DUE: 0, B1_30: 0, B31_60: 0, B61_90: 0, B91_180: 0, B181_360: 0, OVER_360: 0, total: 0 }
  for (const r of rows) {
    for (const key of BUCKET_ORDER) total[key] += r.buckets[key]
    total.total += r.buckets.total
  }
  return total
}
