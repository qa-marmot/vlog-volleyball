'use client'

import type { PhaseStat, CloseGameStats } from '@/types'

interface PhaseAnalysisProps {
  phaseStats: PhaseStat[]
  closeGameStats: CloseGameStats
}

export function PhaseAnalysis({ phaseStats, closeGameStats }: PhaseAnalysisProps) {
  return (
    <div className="space-y-4">
      {/* フェーズ別 */}
      <div className="space-y-2">
        {phaseStats.map((stat) => {
          const total = stat.homePoints + stat.awayPoints
          if (total === 0) return null
          const pct = Math.round(stat.winRate * 100)
          const isWinning = stat.winRate >= 0.5
          return (
            <div key={stat.phase} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-8 shrink-0">{stat.phase}</span>
              <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all ${isWinning ? 'bg-primary' : 'bg-destructive'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-xs tabular-nums">
                <span className="font-semibold">{stat.homePoints}</span>
                <span className="text-muted-foreground">-</span>
                <span>{stat.awayPoints}</span>
                <span className={`font-medium w-8 text-right ${isWinning ? 'text-primary' : 'text-destructive'}`}>
                  {pct}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">最大スコア基準：序盤〜8点 / 中盤9〜16点 / 終盤17点〜</p>

      {/* 接戦局面 */}
      {closeGameStats.totalPoints > 0 && (
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">接戦局面（点差±2以内）での勝率</span>
            <div className="flex items-center gap-2 text-sm">
              <span className="tabular-nums text-muted-foreground">{closeGameStats.homeWins}/{closeGameStats.totalPoints}</span>
              <span className={`font-bold ${closeGameStats.winRate >= 0.5 ? 'text-primary' : 'text-destructive'}`}>
                {Math.round(closeGameStats.winRate * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
