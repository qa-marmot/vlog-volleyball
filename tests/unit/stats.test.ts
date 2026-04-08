import { describe, it, expect } from 'vitest'
import { computeStats, computeTimelineWithSets } from '@/lib/utils/stats'
import type { Point, Player } from '@/types'

// ── helpers ──────────────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    team_id: 'team1',
    name: 'テスト選手',
    number: 1,
    position: 'OH',
    is_libero: false,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

function makePoint(overrides: Partial<Point> = {}): Point {
  return {
    id: 'pt1',
    match_id: 'm1',
    set_id: 's1',
    point_number: 1,
    scorer: 'home',
    home_score: 1,
    away_score: 0,
    rotation_index: 0,
    action_type: null,
    player_id: null,
    is_detail_logged: false,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  }
}

// ── computeStats ─────────────────────────────────────────────────────────────

describe('computeStats', () => {
  it('ポイントが空のとき hasDetailLog=false を返す', () => {
    const stats = computeStats([], [], null)
    expect(stats.hasDetailLog).toBe(false)
    expect(stats.detailLogCoverage).toBe(0)
    expect(stats.playerStats).toHaveLength(0)
    expect(stats.rotationStats).toHaveLength(0)
    expect(stats.scoreTimeline).toHaveLength(0)
  })

  it('全ポイントが詳細ログ済みなら hasDetailLog=true', () => {
    const points = [
      makePoint({ id: '1', is_detail_logged: true }),
      makePoint({ id: '2', is_detail_logged: true }),
    ]
    const stats = computeStats(points, [], null)
    expect(stats.hasDetailLog).toBe(true)
    expect(stats.detailLogCoverage).toBe(1)
  })

  it('詳細ログが半分未満なら hasDetailLog=false', () => {
    const points = [
      makePoint({ id: '1', is_detail_logged: true }),
      makePoint({ id: '2', is_detail_logged: false }),
      makePoint({ id: '3', is_detail_logged: false }),
    ]
    const stats = computeStats(points, [], null)
    expect(stats.hasDetailLog).toBe(false)
    expect(stats.detailLogCoverage).toBeCloseTo(1 / 3)
  })

  it('detailLogCoverage がちょうど 0.5 のとき hasDetailLog=true', () => {
    const points = [
      makePoint({ id: '1', is_detail_logged: true }),
      makePoint({ id: '2', is_detail_logged: false }),
    ]
    const stats = computeStats(points, [], null)
    expect(stats.hasDetailLog).toBe(true)
    expect(stats.detailLogCoverage).toBe(0.5)
  })

  it('選手別スタッツを正しく集計する', () => {
    const player = makePlayer({ id: 'p1' })
    const points: Point[] = [
      makePoint({ id: '1', scorer: 'home', player_id: 'p1', action_type: 'attack', is_detail_logged: true }),
      makePoint({ id: '2', scorer: 'home', player_id: 'p1', action_type: 'serve', is_detail_logged: true }),
      makePoint({ id: '3', scorer: 'home', player_id: 'p1', action_type: 'block', is_detail_logged: true }),
      makePoint({ id: '4', scorer: 'home', player_id: 'p1', action_type: 'opponent_error', is_detail_logged: true }),
    ]
    const stats = computeStats(points, [player], null)
    expect(stats.playerStats).toHaveLength(1)
    const ps = stats.playerStats[0]
    expect(ps.totalPoints).toBe(4)
    expect(ps.attackPoints).toBe(1)
    expect(ps.servePoints).toBe(1)
    expect(ps.blockPoints).toBe(1)
    expect(ps.opponentErrors).toBe(1)
  })

  it('away スコアラーのポイントは選手別スタッツに含まない', () => {
    const player = makePlayer({ id: 'p1' })
    const points: Point[] = [
      makePoint({ id: '1', scorer: 'away', player_id: 'p1', action_type: 'attack', is_detail_logged: true }),
    ]
    const stats = computeStats(points, [player], null)
    expect(stats.playerStats).toHaveLength(0)
  })

  it('詳細ログなしのポイントは選手別スタッツに含まない', () => {
    const player = makePlayer({ id: 'p1' })
    const points: Point[] = [
      makePoint({ id: '1', scorer: 'home', player_id: 'p1', action_type: 'attack', is_detail_logged: false }),
    ]
    const stats = computeStats(points, [player], null)
    expect(stats.playerStats).toHaveLength(0)
  })

  it('複数選手を totalPoints 降順で並べる', () => {
    const p1 = makePlayer({ id: 'p1', name: '選手A' })
    const p2 = makePlayer({ id: 'p2', name: '選手B' })
    const points: Point[] = [
      makePoint({ id: '1', scorer: 'home', player_id: 'p2', action_type: 'attack', is_detail_logged: true }),
      makePoint({ id: '2', scorer: 'home', player_id: 'p2', action_type: 'attack', is_detail_logged: true }),
      makePoint({ id: '3', scorer: 'home', player_id: 'p1', action_type: 'attack', is_detail_logged: true }),
    ]
    const stats = computeStats(points, [p1, p2], null)
    expect(stats.playerStats[0].player.id).toBe('p2')
    expect(stats.playerStats[1].player.id).toBe('p1')
  })

  it('ローテーション別得失点を集計する', () => {
    const points: Point[] = [
      makePoint({ id: '1', scorer: 'home', rotation_index: 0 }),
      makePoint({ id: '2', scorer: 'home', rotation_index: 0 }),
      makePoint({ id: '3', scorer: 'away', rotation_index: 0 }),
      makePoint({ id: '4', scorer: 'home', rotation_index: 1 }),
    ]
    const stats = computeStats(points, [], null)
    const r0 = stats.rotationStats.find(r => r.rotationIndex === 0)!
    expect(r0.homePoints).toBe(2)
    expect(r0.awayPoints).toBe(1)
    expect(r0.pointDiff).toBe(1)

    const r1 = stats.rotationStats.find(r => r.rotationIndex === 1)!
    expect(r1.homePoints).toBe(1)
    expect(r1.awayPoints).toBe(0)
    expect(r1.pointDiff).toBe(1)
  })

  it('ローテーション別スタッツを rotationIndex 昇順に並べる', () => {
    const points: Point[] = [
      makePoint({ id: '1', scorer: 'home', rotation_index: 3 }),
      makePoint({ id: '2', scorer: 'home', rotation_index: 1 }),
      makePoint({ id: '3', scorer: 'home', rotation_index: 2 }),
    ]
    const stats = computeStats(points, [], null)
    const indices = stats.rotationStats.map(r => r.rotationIndex)
    expect(indices).toEqual([1, 2, 3])
  })

  it('スコアタイムラインを生成する（setNumber は 1 固定）', () => {
    const points: Point[] = [
      makePoint({ id: '1', point_number: 1, home_score: 1, away_score: 0 }),
      makePoint({ id: '2', point_number: 2, home_score: 1, away_score: 1 }),
    ]
    const stats = computeStats(points, [], null)
    expect(stats.scoreTimeline).toHaveLength(2)
    expect(stats.scoreTimeline[0]).toEqual({ pointNumber: 1, homeScore: 1, awayScore: 0, setNumber: 1 })
    expect(stats.scoreTimeline[1]).toEqual({ pointNumber: 2, homeScore: 1, awayScore: 1, setNumber: 1 })
  })
})

// ── computeTimelineWithSets ───────────────────────────────────────────────────

describe('computeTimelineWithSets', () => {
  it('セット番号を正しく付与する', () => {
    const points: Point[] = [
      makePoint({ id: '1', set_id: 's1', point_number: 1, home_score: 1, away_score: 0 }),
      makePoint({ id: '2', set_id: 's1', point_number: 2, home_score: 2, away_score: 0 }),
      makePoint({ id: '3', set_id: 's2', point_number: 3, home_score: 0, away_score: 1 }),
    ]
    const sets = [
      { id: 's1', set_number: 1 },
      { id: 's2', set_number: 2 },
    ]
    const timeline = computeTimelineWithSets(points, sets)
    expect(timeline[0].setNumber).toBe(1)
    expect(timeline[1].setNumber).toBe(1)
    expect(timeline[2].setNumber).toBe(2)
  })

  it('マッチしないセットIDは setNumber=1 にフォールバック', () => {
    const points: Point[] = [
      makePoint({ id: '1', set_id: 'unknown', point_number: 1, home_score: 1, away_score: 0 }),
    ]
    const timeline = computeTimelineWithSets(points, [])
    expect(timeline[0].setNumber).toBe(1)
  })

  it('ポイントが空のとき空配列を返す', () => {
    const timeline = computeTimelineWithSets([], [])
    expect(timeline).toHaveLength(0)
  })

  it('スコア値を正しく引き継ぐ', () => {
    const points: Point[] = [
      makePoint({ id: '1', set_id: 's1', point_number: 5, home_score: 3, away_score: 2 }),
    ]
    const sets = [{ id: 's1', set_number: 2 }]
    const timeline = computeTimelineWithSets(points, sets)
    expect(timeline[0]).toEqual({ pointNumber: 5, homeScore: 3, awayScore: 2, setNumber: 2 })
  })
})
