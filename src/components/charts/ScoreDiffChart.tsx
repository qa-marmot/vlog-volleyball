'use client'

import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import type { ScoreTimelinePoint } from '@/types'

interface ScoreDiffChartProps {
  timeline: ScoreTimelinePoint[]
  teamName: string
}

export function ScoreDiffChart({ timeline, teamName }: ScoreDiffChartProps) {
  if (timeline.length === 0) return null

  const data = timeline.map((p) => ({
    ...p,
    diff: p.homeScore - p.awayScore,
  }))

  // セット区切り
  const setChanges: number[] = []
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i].setNumber !== timeline[i - 1].setNumber) {
      setChanges.push(timeline[i].pointNumber)
    }
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="diffGradientPos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="diffGradientNeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#dc2626" stopOpacity={0.05} />
              <stop offset="95%" stopColor="#dc2626" stopOpacity={0.3} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="pointNumber" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value: number) => [
              value > 0 ? `+${value}（${teamName}リード）` : value < 0 ? `${value}（相手リード）` : '同点',
              '点差',
            ]}
            labelFormatter={(label) => `${label}点目`}
          />
          <ReferenceLine y={0} stroke="#64748b" strokeWidth={1.5} />
          {setChanges.map((x) => (
            <ReferenceLine
              key={x}
              x={x}
              stroke="gray"
              strokeDasharray="4 2"
              label={{ value: 'S', fontSize: 9, fill: 'gray' }}
            />
          ))}
          {/* リード側（正） */}
          <Area
            type="monotone"
            dataKey="diff"
            stroke="#1d4ed8"
            strokeWidth={2}
            fill="url(#diffGradientPos)"
            dot={false}
            activeDot={{ r: 3 }}
            baseValue={0}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
