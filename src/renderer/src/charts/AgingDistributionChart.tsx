import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { BUCKET_LABEL } from '@core/types'
import { minorToMajor } from '@core/format'
import { calculateAgingDistribution } from '@core/pipeline'
import { useAppStore } from '../state/store'
import { applyFilters } from '@core/aggregation/filters'

const COLOR = '#2f6feb'

export default function AgingDistributionChart(): JSX.Element {
  const dataset = useAppStore((s) => s.dataset)
  const filters = useAppStore((s) => s.filters)
  if (!dataset) return <></>

  const rows = applyFilters(dataset.rows, filters)
  const data = calculateAgingDistribution(rows).map((d) => ({
    bucket: BUCKET_LABEL[d.bucket as keyof typeof BUCKET_LABEL],
    amount: minorToMajor(d.totalMinor)
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
        <Bar dataKey="amount" fill={COLOR} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
