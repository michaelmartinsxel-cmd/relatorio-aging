import { useMemo } from 'react'
import { runPipeline } from '@core/pipeline'
import { applyFilters } from '@core/aggregation/filters'
import { useAppStore } from './store'

/**
 * Recomputes the filtered PipelineResult client-side, from the same pure
 * `runPipeline` the export and the initial calculation use — this is what
 * keeps Overview / Aging by Category / Aging by Account consistent under
 * filters (section 15) without a second, divergent implementation.
 */
export function useFilteredResult() {
  const dataset = useAppStore((s) => s.dataset)
  const filters = useAppStore((s) => s.filters)

  return useMemo(() => {
    if (!dataset) return null
    return runPipeline(dataset, filters)
  }, [dataset, filters])
}

export function useFilterOptions() {
  const dataset = useAppStore((s) => s.dataset)
  return useMemo(() => {
    if (!dataset) return { companies: [], categories: [], accounts: [], suppliers: [], currencies: [] }
    const rows = dataset.rows
    const uniq = (vals: (string | null | undefined)[]): string[] =>
      [...new Set(vals.filter((v): v is string => !!v))].sort()
    return {
      companies: uniq(rows.map((r) => r.company)),
      categories: uniq(rows.map((r) => r.category)),
      accounts: uniq(rows.map((r) => r.account)),
      suppliers: uniq(rows.map((r) => r.supplier)),
      currencies: uniq(rows.map((r) => r.currency))
    }
  }, [dataset])
}

export function useDrilldownRows() {
  const dataset = useAppStore((s) => s.dataset)
  const filters = useAppStore((s) => s.filters)
  const drilldown = useAppStore((s) => s.drilldown)

  return useMemo(() => {
    if (!dataset || !drilldown) return []
    const base = applyFilters(dataset.rows, filters)
    return base.filter((r) => {
      if (drilldown.category !== undefined && (r.category ?? '') !== drilldown.category) return false
      if (drilldown.account !== undefined && r.account !== drilldown.account) return false
      if (drilldown.bucket !== undefined && r.bucket !== drilldown.bucket) return false
      return true
    })
  }, [dataset, filters, drilldown])
}
