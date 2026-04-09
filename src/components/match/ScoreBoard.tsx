'use client'

interface ScoreBoardProps {
  teamName: string
  opponentName: string
  homeScore: number
  awayScore: number
  currentSetNumber: number
  setsResult: Array<{ home: number; away: number; winner: 'home' | 'away' | null }>
  servingTeam?: 'home' | 'away'
}

export function ScoreBoard({
  teamName,
  opponentName,
  homeScore,
  awayScore,
  currentSetNumber,
  setsResult,
  servingTeam,
}: ScoreBoardProps) {
  const homeSets = setsResult.filter((s) => s.winner === 'home').length
  const awaySets = setsResult.filter((s) => s.winner === 'away').length

  return (
    <div className="bg-background rounded-xl border shadow-sm p-4">
      <div className="text-center text-xs text-muted-foreground mb-2">
        第{currentSetNumber}セット
      </div>

      <div className="flex items-center justify-between gap-4">
        {/* 自チーム */}
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {servingTeam === 'home' && <span className="text-base leading-none">🏐</span>}
            <div className="text-xs text-muted-foreground truncate">{teamName}</div>
          </div>
          <div className="text-6xl font-bold tabular-nums leading-none">{homeScore}</div>
          <div className="text-sm text-muted-foreground mt-1">{homeSets}セット</div>
        </div>

        <div className="text-2xl font-light text-muted-foreground">:</div>

        {/* 相手チーム */}
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            {servingTeam === 'away' && <span className="text-base leading-none">🏐</span>}
            <div className="text-xs text-muted-foreground truncate">{opponentName}</div>
          </div>
          <div className="text-6xl font-bold tabular-nums leading-none">{awayScore}</div>
          <div className="text-sm text-muted-foreground mt-1">{awaySets}セット</div>
        </div>
      </div>

      {/* セット履歴 */}
      {setsResult.length > 0 && (
        <div className="mt-3 pt-3 border-t flex justify-center gap-3">
          {setsResult.map((s, i) => (
            <div key={i} className="text-center text-xs">
              <div className="text-muted-foreground">S{i + 1}</div>
              <div className={`font-semibold ${s.winner === 'home' ? 'text-primary' : 'text-destructive'}`}>
                {s.home}-{s.away}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
