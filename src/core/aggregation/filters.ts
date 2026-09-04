import { AgingRow, Bucket, Filters } from '@core/types'

/** Single source of truth for filtering — every page and every aggregation uses this, so results stay consistent by construction (section 15). */
export function applyFilters(rows: AgingRow[], filters: Filters): AgingRow[] {
  return rows.filter((r) => {
    if (filters.company && r.company !== filters.company) return false
    if (filters.category && (r.category ?? '') !== filters.category) return false
    if (filters.account && r.account !== filters.account) return false
    if (filters.supplier && r.supplier !== filters.supplier) return false
    if (filters.currency && r.currency !== filters.currency) return false
    if (filters.bucket && r.bucket !== (filters.bucket as Bucket)) return false
    return true
  })
}
