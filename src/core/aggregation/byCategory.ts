/**
 * Aging by Category (section 10). Categories are used exactly as they
 * appear in the source file — never merged by similarity ("Logistics" vs
 * "LOGISTICS" stay separate rows). Rows without a bucket (unparseable due
 * date) are excluded from the table body but still counted in the grand
 * total via the caller's reconciliation step.
 */
import { AgingRow, BucketAmounts, BUCKET_ORDER, CategoryAgingRow } from '@core/types'

function emptyBucketAmounts(): BucketAmounts {
  return { NOT_DUE: 0, B1_30: 0, B31_60: 0, B61_90: 0, B91_180: 0, B181_360: 0, OVER_360: 0, total: 0 }
}

export function aggregateByCategory(rows: AgingRow[]): CategoryAgingRow[] {
  const grouped = new Map<string, BucketAmounts>()

  for (const row of rows) {
    if (row.bucket === null || row.category === null) continue
    const key = row.category
    if (!grouped.has(key)) grouped.set(key, emptyBucketAmounts())
    const b = grouped.get(key)!
    b[row.bucket] += row.amountMinor
    b.total += row.amountMinor
  }

  const grandTotal = [...grouped.values()].reduce((s, b) => s + b.total, 0)
  const overdueOf = (b: BucketAmounts): number =>
    BUCKET_ORDER.filter((k) => k !== 'NOT_DUE').reduce((acc, k) => acc + b[k], 0)

  return [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, buckets]) => ({
      category,
      buckets,
      pctOfTotal: grandTotal !== 0 ? buckets.total / grandTotal : 0,
      pctOverdue: buckets.total !== 0 ? overdueOf(buckets) / buckets.total : 0
    }))
}

export function categoryGrandTotal(rows: CategoryAgingRow[]): BucketAmounts {
  const total = { NOT_DUE: 0, B1_30: 0, B31_60: 0, B61_90: 0, B91_180: 0, B181_360: 0, OVER_360: 0, total: 0 }
  for (const r of rows) {
    for (const key of BUCKET_ORDER) total[key] += r.buckets[key]
    total.total += r.buckets.total
  }
  return total
}
