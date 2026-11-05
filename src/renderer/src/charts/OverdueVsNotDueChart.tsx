import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { minorToMajor } from '@core/format'

export default function OverdueVsNotDueChart({
  overdueMinor,
  notDueMinor
}: {
  overdueMinor: number
  notDueMinor: number
}): JSX.Element {
  const data = [
    { name: 'Overdue', value: minorToMajor(overdueMinor), color: '#db4437' },
    { name: 'Not Due', value: minorToMajor(notDueMinor), color: '#0f9d58' }
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
      </PieChart>
    </ResponsiveContainer>
  )
}
