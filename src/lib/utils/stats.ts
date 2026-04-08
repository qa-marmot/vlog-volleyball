import type { Point, Player, MatchStats, PlayerStat, RotationStat, ScoreTimelinePoint } from '@/types'

const DETAIL_LOG_THRESHOLD = 0.5

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
      })
    }
    const stat = statMap.get(player.id)!
    stat.totalPoints++
    if (point.action_type === 'attack') stat.attackPoints++
    else if (point.action_type === 'serve') stat.servePoints++
    else if (point.action_type === 'block') stat.blockPoints++
    else if (point.action_type === 'opponent_error') stat.opponentErrors++
  }
  const playerStats = Array.from(statMap.values()).sort(
    (a, b) => b.totalPoints - a.totalPoints
  )

  // ローテーション別得失点
  const rotationMap = new Map<number, RotationStat>()
  for (const point of points) {
    const idx = point.rotation_index
    if (!rotationMap.has(idx)) {
      rotationMap.set(idx, {
        rotationIndex: idx,
        playerIds: [],
        homePoints: 0,
        awayPoints: 0,
        pointDiff: 0,
      })
    }
    const stat = rotationMap.get(idx)!
    if (point.scorer === 'home') stat.homePoints++
    else stat.awayPoints++
    stat.pointDiff = stat.homePoints - stat.awayPoints
  }
  const rotationStats = Array.from(rotationMap.values()).sort(
    (a, b) => a.rotationIndex - b.rotationIndex
  )

  // スコアタイムライン
  const scoreTimeline: ScoreTimelinePoint[] = points.map((p) => ({
    pointNumber: p.point_number,
    homeScore: p.home_score,
    awayScore: p.away_score,
    setNumber: 1, // set_id から判断するため呼び出し側でセット番号を付与
  }))

  return {
    hasDetailLog,
    detailLogCoverage,
    playerStats,
    rotationStats,
    scoreTimeline,
  }
}

export function computeTimelineWithSets(
  points: Point[],
  sets: { id: string; set_number: number }[]
): ScoreTimelinePoint[] {
  const setMap = new Map(sets.map((s) => [s.id, s.set_number]))
  return points.map((p) => ({
    pointNumber: p.point_number,
    homeScore: p.home_score,
    awayScore: p.away_score,
    setNumber: setMap.get(p.set_id) ?? 1,
  }))
}
