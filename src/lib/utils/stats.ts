import type { Point, Player, MatchStats, PlayerStat, RotationStat, ScoreTimelinePoint, RunStats, PhaseStat, CloseGameStats, ActionBreakdown } from '@/types'

const DETAIL_LOG_THRESHOLD = 0.5

function computeRunStats(points: Point[]): RunStats {
  let maxHomeRun = 0
  let maxAwayRun = 0
  let currentRun = 0
  let currentScorer: 'home' | 'away' | null = null
  let currentSetId: string | null = null

  for (const point of points) {
    if (point.set_id !== currentSetId) {
      if (currentScorer === 'home') maxHomeRun = Math.max(maxHomeRun, currentRun)
      else if (currentScorer === 'away') maxAwayRun = Math.max(maxAwayRun, currentRun)
      currentSetId = point.set_id
      currentRun = 1
      currentScorer = point.scorer
      continue
    }
    if (point.scorer === currentScorer) {
      currentRun++
    } else {
      if (currentScorer === 'home') maxHomeRun = Math.max(maxHomeRun, currentRun)
      else if (currentScorer === 'away') maxAwayRun = Math.max(maxAwayRun, currentRun)
      currentRun = 1
      currentScorer = point.scorer
    }
  }
  if (currentScorer === 'home') maxHomeRun = Math.max(maxHomeRun, currentRun)
  else if (currentScorer === 'away') maxAwayRun = Math.max(maxAwayRun, currentRun)

  return { maxHomeRun, maxAwayRun }
}

function computePhaseStats(points: Point[]): PhaseStat[] {
  const phases: Record<string, { homePoints: number; awayPoints: number }> = {
    '序盤': { homePoints: 0, awayPoints: 0 },
    '中盤': { homePoints: 0, awayPoints: 0 },
    '終盤': { homePoints: 0, awayPoints: 0 },
  }
  for (const point of points) {
    const maxScore = Math.max(point.home_score, point.away_score)
    const phase = maxScore <= 8 ? '序盤' : maxScore <= 16 ? '中盤' : '終盤'
    if (point.scorer === 'home') phases[phase].homePoints++
    else phases[phase].awayPoints++
  }
  return (['序盤', '中盤', '終盤'] as const).map((phase) => {
    const { homePoints, awayPoints } = phases[phase]
    const total = homePoints + awayPoints
    return { phase, homePoints, awayPoints, winRate: total > 0 ? homePoints / total : 0 }
  })
}

function computeCloseGameStats(points: Point[]): CloseGameStats {
  const closePoints = points.filter((p) => Math.abs(p.home_score - p.away_score) <= 2)
  const homeWins = closePoints.filter((p) => p.scorer === 'home').length
  return {
    totalPoints: closePoints.length,
    homeWins,
    winRate: closePoints.length > 0 ? homeWins / closePoints.length : 0,
  }
}

export function computeStats(
  points: Point[],
  players: Player[],
  detailLogStartPoint: number | null
): MatchStats {
  const totalPoints = points.length
  const loggedPoints = points.filter((p) => p.is_detail_logged).length
  const detailLogCoverage = totalPoints > 0 ? loggedPoints / totalPoints : 0
  const hasDetailLog = detailLogCoverage >= DETAIL_LOG_THRESHOLD

  const playerMap = new Map(players.map((p) => [p.id, p]))

  // 選手別スタッツ
  const totalHomePoints = points.filter((p) => p.scorer === 'home').length
  const statMap = new Map<string, PlayerStat>()
  for (const point of points) {
    if (!point.is_detail_logged || !point.player_id || point.scorer !== 'home') continue
    const player = playerMap.get(point.player_id)
    if (!player) continue

    if (!statMap.has(player.id)) {
      statMap.set(player.id, {
        player,
        totalPoints: 0,
        attackPoints: 0,
        servePoints: 0,
        blockPoints: 0,
        opponentErrors: 0,
        contributionRate: 0,
      })
    }
    const stat = statMap.get(player.id)!
    stat.totalPoints++
    if (point.action_type === 'attack') stat.attackPoints++
    else if (point.action_type === 'serve') stat.servePoints++
    else if (point.action_type === 'block') stat.blockPoints++
    else if (point.action_type === 'opponent_error') stat.opponentErrors++
  }
  const playerStats = Array.from(statMap.values())
    .map((s) => ({ ...s, contributionRate: totalHomePoints > 0 ? s.totalPoints / totalHomePoints : 0 }))
    .sort((a, b) => b.totalPoints - a.totalPoints)

  // ローテーション別得失点
  const rotationMap = new Map<number, RotationStat>()
  for (const point of points) {
    const idx = point.rotation_index
    if (!rotationMap.has(idx)) {
      rotationMap.set(idx, { rotationIndex: idx, playerIds: [], homePoints: 0, awayPoints: 0, pointDiff: 0, winRate: 0 })
    }
    const stat = rotationMap.get(idx)!
    if (point.scorer === 'home') stat.homePoints++
    else stat.awayPoints++
    stat.pointDiff = stat.homePoints - stat.awayPoints
    const total = stat.homePoints + stat.awayPoints
    stat.winRate = total > 0 ? stat.homePoints / total : 0
  }
  const rotationStats = Array.from(rotationMap.values()).sort((a, b) => a.rotationIndex - b.rotationIndex)

  // スコアタイムライン
  const scoreTimeline: ScoreTimelinePoint[] = points.map((p) => ({
    pointNumber: p.point_number,
    homeScore: p.home_score,
    awayScore: p.away_score,
    setNumber: 1,
  }))

  // 得点内訳（詳細ログ）
  const actionBreakdown: ActionBreakdown = { attack: 0, serve: 0, block: 0, opponentError: 0 }
  for (const point of points) {
    if (!point.is_detail_logged || point.scorer !== 'home') continue
    if (point.action_type === 'attack') actionBreakdown.attack++
    else if (point.action_type === 'serve') actionBreakdown.serve++
    else if (point.action_type === 'block') actionBreakdown.block++
    else if (point.action_type === 'opponent_error') actionBreakdown.opponentError++
  }

  return {
    hasDetailLog,
    detailLogCoverage,
    playerStats,
    rotationStats,
    scoreTimeline,
    runStats: computeRunStats(points),
    phaseStats: computePhaseStats(points),
    closeGameStats: computeCloseGameStats(points),
    actionBreakdown,
  }
}

export function computeTimelineWithSets(
  points: Point[],
  sets: { id: string; set_number: number; home_score: number; away_score: number; completed: boolean }[]
): ScoreTimelinePoint[] {
  const setMap = new Map(sets.map((s) => [s.id, s.set_number]))

  // セットごとの累積オフセットを計算（前セットの最終スコアを加算）
  const sortedSets = [...sets].sort((a, b) => a.set_number - b.set_number)
  const setOffsets = new Map<number, { home: number; away: number }>()
  let cumulativeHome = 0
  let cumulativeAway = 0
  for (const s of sortedSets) {
    setOffsets.set(s.set_number, { home: cumulativeHome, away: cumulativeAway })
    if (s.completed) {
      cumulativeHome += s.home_score
      cumulativeAway += s.away_score
    }
  }

  return points.map((p) => {
    const setNumber = setMap.get(p.set_id) ?? 1
    const offset = setOffsets.get(setNumber) ?? { home: 0, away: 0 }
    return {
      pointNumber: p.point_number,
      homeScore: p.home_score + offset.home,
      awayScore: p.away_score + offset.away,
      setNumber,
    }
  })
}
