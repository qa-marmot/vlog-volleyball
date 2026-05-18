'use client'

import type { RotationStat } from '@/types'
import { getRotationLabel } from '@/lib/utils/rotation'

interface RotationAnalysisProps {
  rotationStats: RotationStat[]
}

export function RotationAnalysis({ rotationStats }: RotationAnalysisProps) {
  if (rotationStats.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        ローテーションデータがありません
      </div>
    )
  }

  const maxPoints = Math.max(...rotationStats.map((r) => r.homePoints + r.awayPoints), 1)

  return (
    <div className="space-y-2">
      {rotationStats.map((stat) => {
        const total = stat.homePoints + stat.awayPoints
        const homeRatio = total > 0 ? stat.homePoints / total : 0
        const diff = stat.homePoints - stat.awayPoints
        return (
          <div key={stat.rotationIndex} className="flex items-center gap-3">
            <span className="w-6 text-xs text-muted-foreground text-right shrink-0">
              {getRotationLabel(stat.rotationIndex)}
            </span>
            {/* バー */}
            <div className="flex-1 h-6 rounded-full bg-muted overflow-hidden relative">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${total > 0 ? (stat.homePoints / maxPoints) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 text-xs">
              <span className="font-semibold tabular-nums w-5 text-right">
                {stat.homePoints}
              </span>
              <span className="text-muted-foreground">-</span>
              <span className="tabular-nums w-5">{stat.awayPoints}</span>
              <span className={`w-8 text-right font-medium ${
                diff > 0 ? 'text-primary' : diff < 0 ? 'text-destructive' : 'text-muted-foreground'
              }`}>
                {diff > 0 ? `+${diff}` : diff}
              </span>
              <span className={`w-9 text-right text-[10px] ${
                stat.winRate >= 0.5 ? 'text-primary' : 'text-destructive'
              }`}>
                {Math.round(stat.winRate * 100)}%
              </span>
            </div>
          </div>
        )
      })}
      <div className="text-xs text-muted-foreground pt-1">
        各ローテーション中の 自チーム得点 - 相手得点
      </div>
    </div>
  )
}
