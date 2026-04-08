'use client'

interface SetResult {
  home: number
  away: number
  winner: 'home' | 'away' | null
}

interface SetScoreSummaryProps {
  teamName: string
  opponentName: string
  matchDate: string
  location: string | null
  setsResult: SetResult[]
}

export function SetScoreSummary({
  teamName,
  opponentName,
  matchDate,
  location,
  setsResult,
}: SetScoreSummaryProps) {
  const homeSets = setsResult.filter((s) => s.winner === 'home').length
  const awaySets = setsResult.filter((s) => s.winner === 'away').length
  const homeWin = homeSets > awaySets

  return (
    <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
      {/* 試合情報 */}
      <div className="bg-muted/30 px-4 py-2 text-center text-xs text-muted-foreground">
        {matchDate}{location ? ` | ${location}` : ''}
      </div>

      {/* スコア */}
      <div className="flex items-center justify-between px-6 py-6 gap-4">
        <div className={`flex-1 text-center ${homeWin ? '' : 'opacity-60'}`}>
          <div className="text-sm font-medium mb-1">{teamName}</div>
          <div className="text-6xl font-bold tabular-nums">{homeSets}</div>
          {homeWin && (
            <div className="text-xs font-semibold text-primary mt-1">WIN</div>
          )}
        </div>
        <div className="text-muted-foreground text-2xl font-light">-</div>
        <div className={`flex-1 text-center ${!homeWin ? '' : 'opacity-60'}`}>
          <div className="text-sm font-medium mb-1">{opponentName}</div>
          <div className="text-6xl font-bold tabular-nums">{awaySets}</div>
          {!homeWin && (
            <div className="text-xs font-semibold text-destructive mt-1">WIN</div>
          )}
        </div>
      </div>

      {/* セット詳細 */}
      <div className="border-t px-4 py-3">
        <div className="flex justify-center gap-4">
          {setsResult.map((s, i) => (
            <div key={i} className="text-center text-xs">
              <div className="text-muted-foreground mb-0.5">第{i + 1}セット</div>
              <div className={`font-semibold ${
                s.winner === 'home' ? 'text-primary' : 'text-destructive'
              }`}>
                {s.home}-{s.away}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
