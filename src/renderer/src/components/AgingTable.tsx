import { useMemo, useState } from 'react'
import { BUCKET_LABEL, BUCKET_ORDER, Bucket, BucketAmounts } from '@core/types'
import { minorToMajor, formatPct } from '@core/format'
import { useAppStore } from '../state/store'

export interface AgingTableRow {
  key: string
  label: string
  secondaryLabel?: string
  buckets: BucketAmounts
  pctOfTotal: number
  pctOverdue: number
  drilldown: { category?: string; account?: string }
}

type SortKey = 'label' | Bucket | 'total'

export default function AgingTable({
  rows,
  grandTotal,
  primaryHeader,
  secondaryHeader
}: {
  rows: AgingTableRow[]
  grandTotal: BucketAmounts
  primaryHeader: string
  secondaryHeader?: string
}): JSX.Element {
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [search, setSearch] = useState('')
  const setDrilldown = useAppStore((s) => s.setDrilldown)

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => r.label.toLowerCase().includes(q) || r.secondaryLabel?.toLowerCase().includes(q))
  }, [rows, search])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    copy.sort((a, b) => {
      let av: number | string
      let bv: number | string
      if (sortKey === 'label') {
        av = a.label
        bv = b.label
      } else if (sortKey === 'total') {
        av = a.buckets.total
        bv = b.buckets.total
      } else {
        av = a.buckets[sortKey]
        bv = b.buckets[sortKey]
      }
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : av - (bv as number)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return copy
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey): void {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
        <input
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', width: 240 }}
        />
      </div>
      <div style={{ maxHeight: '65vh', overflow: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th className="text-left" onClick={() => toggleSort('label')}>
                {primaryHeader}
              </th>
              {secondaryHeader && <th className="text-left">{secondaryHeader}</th>}
              {BUCKET_ORDER.map((b) => (
                <th key={b} onClick={() => toggleSort(b)}>
                  {BUCKET_LABEL[b]}
                </th>
              ))}
              <th onClick={() => toggleSort('total')}>Total</th>
              <th>% Total</th>
              <th>% Overdue</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr key={row.key}>
                <td className="text-left">{row.label}</td>
                {secondaryHeader && <td className="text-left">{row.secondaryLabel}</td>}
                {BUCKET_ORDER.map((b) => (
                  <td
                    key={b}
                    className={`clickable ${b === 'B181_360' || b === 'OVER_360' ? 'bucket-old' : ''}`}
                    onClick={() =>
                      setDrilldown({
                        kind: row.drilldown.category !== undefined ? 'bucketWithinCategory' : 'bucketWithinAccount',
                        category: row.drilldown.category,
                        account: row.drilldown.account,
                        bucket: b
                      })
                    }
                  >
                    {minorToMajor(row.buckets[b]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                ))}
                <td
                  className="clickable"
                  onClick={() =>
                    setDrilldown({
                      kind: row.drilldown.category !== undefined ? 'category' : 'account',
                      category: row.drilldown.category,
                      account: row.drilldown.account
                    })
                  }
                >
                  {minorToMajor(row.buckets.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td>{formatPct(row.pctOfTotal)}</td>
                <td>{formatPct(row.pctOverdue)}</td>
              </tr>
            ))}
            <tr className="total-row">
              <td className="text-left">Grand Total</td>
              {secondaryHeader && <td />}
              {BUCKET_ORDER.map((b) => (
                <td key={b}>{minorToMajor(grandTotal[b]).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              ))}
              <td>{minorToMajor(grandTotal.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>100.0%</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
