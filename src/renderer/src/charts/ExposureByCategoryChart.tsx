import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { minorToMajor } from '@core/format'
import { ExposureByCategoryRow } from '@core/types'
import { CATEGORICAL_PALETTE } from './palette'

export default function ExposureByCategoryChart({ rows }: { rows: ExposureByCategoryRow[] }): JSX.Element {
  const data = rows.map((r) => ({ name: r.category, value: minorToMajor(r.totalMinor) }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
          {data.map((_, i) => (
            <Cell key={i} fill={CATEGORICAL_PALETTE[i % CATEGORICAL_PALETTE.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
      </PieChart>
    </ResponsiveContainer>
  )
}
