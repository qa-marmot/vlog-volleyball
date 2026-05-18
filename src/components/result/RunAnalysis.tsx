'use client'

import type { RunStats } from '@/types'

interface RunAnalysisProps {
  runStats: RunStats
  teamName: string
}

export function RunAnalysis({ runStats, teamName }: RunAnalysisProps) {
  const { maxHomeRun, maxAwayRun } = runStats
  const max = Math.max(maxHomeRun, maxAwayRun, 1)

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0">自チーム</span>
          <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(maxHomeRun / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums w-10 text-right">{maxHomeRun}連続</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-16 shrink-0">相手</span>
          <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-destructive rounded-full transition-all"
              style={{ width: `${(maxAwayRun / max) * 100}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums w-10 text-right text-destructive">{maxAwayRun}連続</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">セット内の最長連続得点・失点</p>
    </div>
  )
}
