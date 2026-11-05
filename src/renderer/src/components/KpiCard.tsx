export default function KpiCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="card kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
    </div>
  )
}
