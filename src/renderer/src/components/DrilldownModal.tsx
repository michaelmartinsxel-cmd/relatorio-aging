import { useDrilldownRows } from '../state/selectors'
import { useAppStore } from '../state/store'
import { BUCKET_LABEL } from '@core/types'
import { minorToMajor } from '@core/format'

export default function DrilldownModal(): JSX.Element | null {
  const drilldown = useAppStore((s) => s.drilldown)
  const setDrilldown = useAppStore((s) => s.setDrilldown)
  const rows = useDrilldownRows()

  if (!drilldown) return null

  const title = [
    drilldown.category !== undefined ? `Category = ${drilldown.category}` : null,
    drilldown.account !== undefined ? `Account = ${drilldown.account}` : null,
    drilldown.bucket !== undefined ? `Bucket = ${BUCKET_LABEL[drilldown.bucket as keyof typeof BUCKET_LABEL]}` : null
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="modal-overlay" onClick={() => setDrilldown(null)}>
      <div className="card modal-card" style={{ width: 900 }} onClick={(e) => e.stopPropagation()}>
        <h2>Drill-down — {title}</h2>
        <p className="section-meta">{rows.length} record(s). Consulta apenas — a classificação original não é alterada aqui.</p>
        <div style={{ maxHeight: 420, overflow: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th className="text-left">Supplier</th>
                <th className="text-left">Account</th>
                <th className="text-left">Description</th>
                <th className="text-left">Category</th>
                <th className="text-left">Document</th>
                <th className="text-left">Invoice</th>
                <th>Due Date</th>
                <th>Days Past Due</th>
                <th>Amount</th>
                <th>Currency</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sourceRowId}>
                  <td className="text-left">{r.supplierName ?? r.supplier ?? ''}</td>
                  <td className="text-left">{r.account}</td>
                  <td className="text-left">{r.accountDescription}</td>
                  <td className="text-left">{r.category ?? ''}</td>
                  <td className="text-left">{r.documentNumber ?? ''}</td>
                  <td className="text-left">{r.invoiceNumber ?? ''}</td>
                  <td>{r.dueDate ?? '—'}</td>
                  <td>{r.daysPastDue ?? '—'}</td>
                  <td>{minorToMajor(r.amountMinor).toFixed(2)}</td>
                  <td>{r.currency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={() => setDrilldown(null)}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
