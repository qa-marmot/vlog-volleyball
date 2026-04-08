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

  // セット区切りの位置
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
          {setChanges.map((x) => (
            <ReferenceLine
              key={x}
              x={x}
              stroke="gray"
              strokeDasharray="4 2"
              label={{ value: 'S', fontSize: 9, fill: 'gray' }}
            />
          ))}
          <Line
            type="monotone"
            dataKey="homeScore"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="awayScore"
            stroke="hsl(var(--destructive))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
