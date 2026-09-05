import { useFilterOptions } from '../state/selectors'
import { useAppStore } from '../state/store'
import { BUCKET_LABEL, BUCKET_ORDER, Bucket } from '@core/types'

export default function FiltersBar(): JSX.Element {
  const options = useFilterOptions()
  const filters = useAppStore((s) => s.filters)
  const setFilters = useAppStore((s) => s.setFilters)
  const clearFilters = useAppStore((s) => s.clearFilters)

  const hasActive = Object.values(filters).some((v) => !!v)

  function set<K extends keyof typeof filters>(key: K, value: string): void {
    setFilters({ ...filters, [key]: value || undefined })
  }

  return (
    <div className="card filters-bar">
      <select value={filters.company ?? ''} onChange={(e) => set('company', e.target.value)}>
        <option value="">Company: All</option>
        {options.companies.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select value={filters.category ?? ''} onChange={(e) => set('category', e.target.value)}>
        <option value="">Category: All</option>
        {options.categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select value={filters.account ?? ''} onChange={(e) => set('account', e.target.value)}>
        <option value="">Account: All</option>
        {options.accounts.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select value={filters.supplier ?? ''} onChange={(e) => set('supplier', e.target.value)}>
        <option value="">Supplier: All</option>
        {options.suppliers.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select value={filters.currency ?? ''} onChange={(e) => set('currency', e.target.value)}>
        <option value="">Currency: All</option>
        {options.currencies.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        value={filters.bucket ?? ''}
        onChange={(e) => setFilters({ ...filters, bucket: (e.target.value || undefined) as Bucket | undefined })}
      >
        <option value="">Bucket: All</option>
        {BUCKET_ORDER.map((b) => (
          <option key={b} value={b}>
            {BUCKET_LABEL[b]}
          </option>
        ))}
      </select>
      {hasActive && (
        <button className="btn" onClick={clearFilters}>
          Clear Filters
        </button>
      )}
    </div>
  )
}
