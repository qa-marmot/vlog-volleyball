'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { ActionBreakdown } from '@/types'

interface ActionBreakdownChartProps {
  breakdown: ActionBreakdown
}

const ITEMS = [
  { key: 'attack' as const, label: 'アタック', color: '#1d4ed8' },
  { key: 'serve' as const, label: 'サーブ', color: '#16a34a' },
  { key: 'block' as const, label: 'ブロック', color: '#9333ea' },
  { key: 'opponentError' as const, label: '相手ミス', color: '#94a3b8' },
]

export function ActionBreakdownChart({ breakdown }: ActionBreakdownChartProps) {
  const data = ITEMS.map((item) => ({
    name: item.label,
    value: breakdown[item.key],
    color: item.color,
  })).filter((d) => d.value > 0)

  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) {
    return <div className="text-center text-sm text-muted-foreground py-4">データがありません</div>
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value}点 (${Math.round((value / total) * 100)}%)`,
              name,
            ]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value, entry: any) => (
              <span className="text-xs">{value} {entry.payload.value}点</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
