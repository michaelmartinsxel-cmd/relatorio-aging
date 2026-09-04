import { PipelineResult } from '@core/types'
import { formatPct, minorToMajor } from '@core/format'
import KpiCard from '../components/KpiCard'
import ReconciliationBanner from '../components/ReconciliationBanner'
import FiltersBar from '../components/FiltersBar'
import AgingDistributionChart from '../charts/AgingDistributionChart'
import ExposureByCategoryChart from '../charts/ExposureByCategoryChart'
import OverdueVsNotDueChart from '../charts/OverdueVsNotDueChart'
import TopAccountsChart from '../charts/TopAccountsChart'

function money(minor: number): string {
  return minorToMajor(minor).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function Overview({ result }: { result: PipelineResult }): JSX.Element {
  const { overview } = result

  return (
    <div>
      <h1 className="section-title">Overview</h1>
      <p className="section-meta">
        Aging calculated as of: {formatDateDisplay(overview.agingDateIso)} · Currency: {overview.currency} ·{' '}
        {overview.categoryCount} categories · {overview.accountCount} accounts · {overview.recordCount} records
      </p>

      <FiltersBar />
      <ReconciliationBanner report={result.reconciliation} />

      <div className="kpi-row">
        <KpiCard label="Total AP" value={money(overview.totalApMinor)} />
        <KpiCard label="Overdue" value={money(overview.totalOverdueMinor)} />
        <KpiCard label="Not Due" value={money(overview.totalNotDueMinor)} />
        <KpiCard label="Overdue %" value={formatPct(overview.overduePct)} />
      </div>
      <div className="kpi-row secondary">
        <KpiCard label="> 90 Days" value={money(overview.over90Minor)} />
        <KpiCard label="> 180 Days" value={money(overview.over180Minor)} />
        <KpiCard label="> 360 Days" value={money(overview.over360Minor)} />
        <KpiCard label="Categories" value={String(overview.categoryCount)} />
        <KpiCard label="Accounts" value={String(overview.accountCount)} />
        <KpiCard label="Records" value={String(overview.recordCount)} />
        <KpiCard label="Aging Date" value={formatDateDisplay(overview.agingDateIso)} />
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h3>Aging Distribution</h3>
          <AgingDistributionChart />
        </div>
        <div className="card chart-card">
          <h3>Overdue vs Not Due</h3>
          <OverdueVsNotDueChart overdueMinor={overview.totalOverdueMinor} notDueMinor={overview.totalNotDueMinor} />
        </div>
      </div>

      <div className="chart-grid">
        <div className="card chart-card">
          <h3>Exposure by Category</h3>
          <ExposureByCategoryChart rows={result.exposureByCategory} />
        </div>
        <div className="card chart-card">
          <h3>Top Accounts</h3>
          <TopAccountsChart rows={result.topAccounts} />
        </div>
      </div>
    </div>
  )
}

function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
