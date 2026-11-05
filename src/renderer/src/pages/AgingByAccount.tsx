import { PipelineResult } from '@core/types'
import { minorToMajor } from '@core/format'
import { accountGrandTotal } from '@core/aggregation/byAccount'
import FiltersBar from '../components/FiltersBar'
import ReconciliationBanner from '../components/ReconciliationBanner'
import AgingTable, { AgingTableRow } from '../components/AgingTable'

function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function AgingByAccount({ result }: { result: PipelineResult }): JSX.Element {
  const rows: AgingTableRow[] = result.byAccount.map((a) => ({
    key: a.account,
    label: a.account,
    secondaryLabel: a.accountDescription,
    buckets: a.buckets,
    pctOfTotal: a.pctOfTotal,
    pctOverdue: a.pctOverdue,
    drilldown: { account: a.account }
  }))
  const grandTotal = accountGrandTotal(result.byAccount)

  return (
    <div>
      <h1 className="section-title">Aging by Account</h1>
      <p className="section-meta">
        Reporting Date: {formatDateDisplay(result.overview.agingDateIso)} · Total AP:{' '}
        {minorToMajor(result.overview.totalApMinor).toFixed(2)} · Total Overdue:{' '}
        {minorToMajor(result.overview.totalOverdueMinor).toFixed(2)}
      </p>
      <FiltersBar />
      <ReconciliationBanner report={result.reconciliation} />
      <AgingTable rows={rows} grandTotal={grandTotal} primaryHeader="Account" secondaryHeader="Description" />
    </div>
  )
}
