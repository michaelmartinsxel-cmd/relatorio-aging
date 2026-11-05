import { useMemo, useState } from 'react'
import { Dataset } from '@core/types'
import { applyFilters } from '@core/aggregation/filters'
import { minorToMajor } from '@core/format'
import { useAppStore } from '../state/store'
import FiltersBar from '../components/FiltersBar'

export default function SourceData({ dataset }: { dataset: Dataset }): JSX.Element {
  const filters = useAppStore((s) => s.filters)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const filtered = applyFilters(dataset.rows, filters)
    if (!search.trim()) return filtered
    const q = search.toLowerCase()
    return filtered.filter(
      (r) =>
        r.account.toLowerCase().includes(q) ||
        r.accountDescription.toLowerCase().includes(q) ||
        (r.category ?? '').toLowerCase().includes(q) ||
        (r.supplier ?? '').toLowerCase().includes(q) ||
        (r.documentNumber ?? '').toLowerCase().includes(q)
    )
  }, [dataset, filters, search])

  return (
    <div>
      <h1 className="section-title">Source Data</h1>
      <p className="section-meta">
        {dataset.fileName} · Sheet: {dataset.sheetName} · {rows.length} of {dataset.rows.length} record(s) shown
        {dataset.exceptions.length > 0 && ` · ${dataset.exceptions.length} exception(s) flagged`}
      </p>
      <FiltersBar />
      <div className="card" style={{ padding: '10px 14px', marginBottom: 12 }}>
        <input
          placeholder="Search account, category, supplier, document…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', width: 320 }}
        />
      </div>
      <div className="card" style={{ padding: 0, maxHeight: '65vh', overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th className="text-left">Source Row</th>
              <th className="text-left">Account</th>
              <th className="text-left">Description</th>
              <th className="text-left">Category</th>
              <th className="text-left">Supplier</th>
              <th>Due Date</th>
              <th>Days Past Due</th>
              <th>Bucket</th>
              <th>Amount</th>
              <th>Currency</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 2000).map((r) => (
              <tr key={r.sourceRowId}>
                <td className="text-left">{r.sourceRowId}</td>
                <td className="text-left">{r.account}</td>
                <td className="text-left">{r.accountDescription}</td>
                <td className="text-left">{r.category ?? '—'}</td>
                <td className="text-left">{r.supplierName ?? r.supplier ?? ''}</td>
                <td>{r.dueDate ?? '—'}</td>
                <td>{r.daysPastDue ?? '—'}</td>
                <td>{r.bucket ?? 'EXCEPTION'}</td>
                <td>{minorToMajor(r.amountMinor).toFixed(2)}</td>
                <td>{r.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 2000 && (
          <p className="section-meta" style={{ padding: 12 }}>
            Showing first 2000 of {rows.length} rows. Refine filters or export for the full dataset.
          </p>
        )}
      </div>
    </div>
  )
}
