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
  ReferenceLine,
  ReferenceArea,
} from 'recharts'
import type { ScoreTimelinePoint } from '@/types'

interface ScoreProgressChartProps {
  timeline: ScoreTimelinePoint[]
  teamName: string
  opponentName: string
}

export function ScoreProgressChart({
  timeline,
  teamName,
  opponentName,
}: ScoreProgressChartProps) {
  if (timeline.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        データがありません
      </div>
    )
  }

  // セットごとのX範囲を計算
  const setRangeMap = new Map<number, { start: number; end: number }>()
  for (const p of timeline) {
    const r = setRangeMap.get(p.setNumber)
    if (!r) {
      setRangeMap.set(p.setNumber, { start: p.pointNumber, end: p.pointNumber })
    } else {
      if (p.pointNumber < r.start) r.start = p.pointNumber
      if (p.pointNumber > r.end) r.end = p.pointNumber
    }
  }
  const setRanges = Array.from(setRangeMap.entries())
    .map(([setNumber, { start, end }]) => ({ setNumber, start, end }))
    .sort((a, b) => a.setNumber - b.setNumber)

  // セット区切り線の位置
  const setChanges: number[] = []
  for (let i = 1; i < timeline.length; i++) {
    if (timeline[i].setNumber !== timeline[i - 1].setNumber) {
      setChanges.push(timeline[i].pointNumber)
    }
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={timeline}
          margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="pointNumber"
            tick={{ fontSize: 10 }}
            label={{ value: '得点', position: 'insideBottomRight', offset: 0, fontSize: 10 }}
          />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            formatter={(value, name) => [
              String(value) + '点',
              name === 'homeScore' ? teamName : opponentName,
            ]}
            labelFormatter={(label) => `${label}点目`}
          />
          <Legend
            formatter={(value) =>
              value === 'homeScore' ? teamName : opponentName
            }
          />
          {/* セット別背景帯 */}
          {setRanges.map(({ setNumber, start, end }) => (
            <ReferenceArea
              key={setNumber}
              x1={start}
              x2={end}
              fill={setNumber % 2 === 1 ? '#eff6ff' : '#f0fdf4'}
              fillOpacity={0.6}
              label={{ value: `第${setNumber}S`, position: 'insideTopLeft', fontSize: 9, fill: '#94a3b8' }}
            />
          ))}
          {/* セット区切り線 */}
          {setChanges.map((x) => (
            <ReferenceLine
              key={x}
              x={x}
              stroke="#94a3b8"
              strokeDasharray="4 2"
            />
          ))}
          <Line
            type="monotone"
            dataKey="homeScore"
            stroke="#1d4ed8"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="awayScore"
            stroke="#dc2626"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
