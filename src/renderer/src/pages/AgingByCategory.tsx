import { PipelineResult } from '@core/types'
import { minorToMajor } from '@core/format'
import { categoryGrandTotal } from '@core/aggregation/byCategory'
import FiltersBar from '../components/FiltersBar'
import ReconciliationBanner from '../components/ReconciliationBanner'
import AgingTable, { AgingTableRow } from '../components/AgingTable'

function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function AgingByCategory({ result }: { result: PipelineResult }): JSX.Element {
  const rows: AgingTableRow[] = result.byCategory.map((c) => ({
    key: c.category,
    label: c.category,
    buckets: c.buckets,
    pctOfTotal: c.pctOfTotal,
    pctOverdue: c.pctOverdue,
    drilldown: { category: c.category }
  }))
  const grandTotal = categoryGrandTotal(result.byCategory)

  return (
    <div>
      <h1 className="section-title">Aging by Category</h1>
      <p className="section-meta">
        Reporting Date: {formatDateDisplay(result.overview.agingDateIso)} · Total AP:{' '}
        {minorToMajor(result.overview.totalApMinor).toFixed(2)} · Total Overdue:{' '}
        {minorToMajor(result.overview.totalOverdueMinor).toFixed(2)}
      </p>
      <FiltersBar />
      <ReconciliationBanner report={result.reconciliation} />
      <AgingTable rows={rows} grandTotal={grandTotal} primaryHeader="Category" />
    </div>
  )
}
