'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'

interface Snapshot {
  snapshot_date: string
  total_assets: number
  total_liabilities: number
  net_worth: number
}

interface Props {
  data: Snapshot[]
}

function formatK(value: number) {
  if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value.toFixed(0)}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-xs">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 py-0.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(p.value)}
          </span>
        </div>
      ))}
    </div>
  )
}

export function NetWorthChart({ data }: Props) {
  const chartData = data.map(s => ({
    date: format(parseISO(s.snapshot_date), 'MMM d, yy'),
    'Net Worth': s.net_worth,
    'Assets': s.total_assets,
    'Liabilities': s.total_liabilities,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 47% 18%)" />
        <XAxis
          dataKey="date"
          tick={{ fill: 'hsl(215 20% 55%)', fontSize: 11 }}
          axisLine={{ stroke: 'hsl(222 47% 18%)' }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatK}
          tick={{ fill: 'hsl(215 20% 55%)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: 'hsl(215 20% 55%)' }}
        />
        <Line
          type="monotone"
          dataKey="Assets"
          stroke="hsl(142 76% 55%)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="Liabilities"
          stroke="hsl(0 72% 51%)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="Net Worth"
          stroke="hsl(38 92% 50%)"
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
