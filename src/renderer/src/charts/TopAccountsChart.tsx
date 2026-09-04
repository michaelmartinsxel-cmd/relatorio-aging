import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { minorToMajor } from '@core/format'
import { TopAccountRow } from '@core/types'

export default function TopAccountsChart({ rows }: { rows: TopAccountRow[] }): JSX.Element {
  const data = rows.map((r) => ({ label: `${r.account} — ${r.accountDescription}`.slice(0, 30), amount: minorToMajor(r.totalMinor) }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis type="number" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={160} />
        <Tooltip formatter={(v: number) => v.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
        <Bar dataKey="amount" fill="#2f6feb" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
