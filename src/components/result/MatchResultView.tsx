'use client'

import { SetScoreSummary } from './SetScoreSummary'
import { PlayerStatsTable } from './PlayerStatsTable'
import { RotationAnalysis } from './RotationAnalysis'
import { SharePanel } from './SharePanel'
import { ScoreProgressChart } from '@/components/charts/ScoreProgressChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { MatchStats, MatchSet } from '@/types'

interface MatchResultViewProps {
  teamName: string
  opponentName: string
  matchDate: string
  location: string | null
  sets: MatchSet[]
  stats: MatchStats
  shareUuid: string
  showSharePanel?: boolean
}

export function MatchResultView({
  teamName,
  opponentName,
  matchDate,
  location,
  sets,
  stats,
  shareUuid,
  showSharePanel = true,
}: MatchResultViewProps) {
  const completedSets = sets.filter((s) => s.completed || s.set_number < sets.length)
  const setsResult = completedSets.map((s) => ({
    home: s.home_score,
    away: s.away_score,
    winner: s.winner,
  }))
  const homeSets = setsResult.filter((s) => s.winner === 'home').length
  const awaySets = setsResult.filter((s) => s.winner === 'away').length

  return (
    <div className="space-y-4">
      {/* セットスコア */}
      <SetScoreSummary
        teamName={teamName}
        opponentName={opponentName}
        matchDate={matchDate}
        location={location}
        setsResult={setsResult}
      />

      {/* ログ密度表示 */}
      <div className="flex items-center gap-2 text-xs">
        <Badge variant={stats.hasDetailLog ? 'default' : 'secondary'}>
          {stats.hasDetailLog ? '詳細分析モード' : '基本表示モード'}
        </Badge>
        <span className="text-muted-foreground">
          詳細ログ: {Math.round(stats.detailLogCoverage * 100)}%
          {!stats.hasDetailLog && stats.detailLogCoverage > 0 && (
            <span> (50%以上で詳細分析が表示されます)</span>
          )}
        </span>
      </div>

      {/* 点数推移チャート（Phase 3） */}
      {stats.scoreTimeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">点数推移</CardTitle>
          </CardHeader>
          <CardContent>
            <ScoreProgressChart
              timeline={stats.scoreTimeline}
              teamName={teamName}
              opponentName={opponentName}
            />
          </CardContent>
        </Card>
      )}

      {/* 詳細分析（Phase 2）: ログあり50%以上のみ表示 */}
      {stats.hasDetailLog && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">得点ランキング</CardTitle>
            </CardHeader>
            <CardContent>
              <PlayerStatsTable playerStats={stats.playerStats} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">ローテーション別得失点</CardTitle>
            </CardHeader>
            <CardContent>
              <RotationAnalysis rotationStats={stats.rotationStats} />
            </CardContent>
          </Card>
        </>
      )}

      {/* 共有パネル */}
      {showSharePanel && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">結果を共有</CardTitle>
          </CardHeader>
          <CardContent>
            <SharePanel
              shareUuid={shareUuid}
              teamName={teamName}
              opponentName={opponentName}
              matchDate={matchDate}
              homeSets={homeSets}
              awaySets={awaySets}
              setScores={setsResult}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
