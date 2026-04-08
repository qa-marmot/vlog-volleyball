/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useMatchStore } from '@/lib/store/matchStore'
import type { Player } from '@/types'

function makePlayer(id: string, name: string, isLibero = false): Player {
  return {
    id,
    team_id: 'team1',
    name,
    number: Number(id.replace('p', '')),
    position: isLibero ? 'L' : 'OH',
    is_libero: isLibero,
    created_at: '2024-01-01T00:00:00Z',
  }
}

const ROSTER = [
  makePlayer('p1', '選手1'),
  makePlayer('p2', '選手2'),
  makePlayer('p3', '選手3'),
  makePlayer('p4', '選手4'),
  makePlayer('p5', '選手5'),
  makePlayer('p6', '選手6'),
  makePlayer('p7', 'リベロ', true),
]

const STARTING_ROTATION = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']

const MATCH_PARAMS = {
  matchId: 'match-1',
  teamId: 'team-1',
  teamName: '自チーム',
  opponentName: '相手チーム',
  matchDate: '2024-01-01',
  shareUuid: 'uuid-1',
  roster: ROSTER,
  startingRotation: STARTING_ROTATION,
  liberoId: 'p7',
}

function getStore() {
  return useMatchStore.getState()
}

beforeEach(() => {
  localStorage.clear()
  useMatchStore.getState().resetMatch()
  useMatchStore.getState().initMatch(MATCH_PARAMS)
})

// ── initMatch ─────────────────────────────────────────────────────────────

describe('initMatch', () => {
  it('初期スコアが 0-0', () => {
    const s = getStore()
    expect(s.homeScore).toBe(0)
    expect(s.awayScore).toBe(0)
  })

  it('matchId と teamId が設定される', () => {
    const s = getStore()
    expect(s.matchId).toBe('match-1')
    expect(s.teamId).toBe('team-1')
  })

  it('currentRotation に startingRotation が設定される', () => {
    const s = getStore()
    expect(s.currentRotation).toEqual(STARTING_ROTATION)
  })

  it('liberoId が設定される', () => {
    expect(getStore().liberoId).toBe('p7')
  })

  it('eventHistory は空', () => {
    expect(getStore().eventHistory).toHaveLength(0)
  })
})

// ── addPoint ──────────────────────────────────────────────────────────────

describe('addPoint', () => {
  it('自チームポイントで homeScore が増える', () => {
    getStore().addPoint('home')
    expect(getStore().homeScore).toBe(1)
    expect(getStore().awayScore).toBe(0)
  })

  it('相手チームポイントで awayScore が増える', () => {
    getStore().addPoint('away')
    expect(getStore().homeScore).toBe(0)
    expect(getStore().awayScore).toBe(1)
  })

  it('pointNumber が増分される', () => {
    getStore().addPoint('home')
    getStore().addPoint('home')
    expect(getStore().pointNumber).toBe(2)
  })

  it('pendingPoints に追加される', () => {
    getStore().addPoint('home')
    expect(getStore().pendingPoints).toHaveLength(1)
    const p = getStore().pendingPoints[0]
    expect(p.scorer).toBe('home')
    expect(p.homeScore).toBe(1)
    expect(p.awayScore).toBe(0)
  })

  it('isSynced が false になる', () => {
    getStore().addPoint('home')
    expect(getStore().isSynced).toBe(false)
  })

  it('eventHistory にイベントが追加される', () => {
    getStore().addPoint('home')
    expect(getStore().eventHistory).toHaveLength(1)
    expect(getStore().eventHistory[0].type).toBe('point')
  })

  it('詳細ログが有効のとき isDetailLogged が true', () => {
    getStore().enableDetailLog()
    getStore().addPoint('home', { actionType: 'attack', playerId: 'p1' })
    const p = getStore().pendingPoints[0]
    expect(p.isDetailLogged).toBe(true)
    expect(p.actionType).toBe('attack')
    expect(p.playerId).toBe('p1')
  })

  it('詳細ログなしのとき isDetailLogged が false', () => {
    getStore().addPoint('home')
    expect(getStore().pendingPoints[0].isDetailLogged).toBe(false)
  })
})

// ── undoLastPoint ─────────────────────────────────────────────────────────

describe('undoLastPoint', () => {
  it('直前のポイントを取り消してスコアが戻る', () => {
    getStore().addPoint('home')
    getStore().addPoint('home')
    getStore().undoLastPoint()
    expect(getStore().homeScore).toBe(1)
    expect(getStore().pointNumber).toBe(1)
  })

  it('pendingPoints から最後のポイントが削除される', () => {
    getStore().addPoint('home')
    getStore().addPoint('away')
    getStore().undoLastPoint()
    expect(getStore().pendingPoints).toHaveLength(1)
    expect(getStore().pendingPoints[0].scorer).toBe('home')
  })

  it('eventHistory から最後のイベントが削除される', () => {
    getStore().addPoint('home')
    getStore().undoLastPoint()
    expect(getStore().eventHistory).toHaveLength(0)
  })

  it('履歴が空のときは何もしない', () => {
    getStore().undoLastPoint()
    expect(getStore().homeScore).toBe(0)
  })

  it('連続してアンドゥできる', () => {
    getStore().addPoint('home')
    getStore().addPoint('away')
    getStore().addPoint('home')
    getStore().undoLastPoint()
    getStore().undoLastPoint()
    expect(getStore().homeScore).toBe(1)
    expect(getStore().awayScore).toBe(0)
    expect(getStore().pointNumber).toBe(1)
  })
})

// ── endSet ────────────────────────────────────────────────────────────────

describe('endSet', () => {
  it('セット終了後スコアが 0-0 にリセット', () => {
    getStore().addPoint('home')
    getStore().addPoint('home')
    getStore().addPoint('away')
    getStore().endSet()
    expect(getStore().homeScore).toBe(0)
    expect(getStore().awayScore).toBe(0)
  })

  it('currentSetNumber が増分される', () => {
    getStore().endSet()
    expect(getStore().currentSetNumber).toBe(2)
  })

  it('setsResult に結果が追加される', () => {
    getStore().addPoint('home')
    getStore().addPoint('home')
    getStore().endSet()
    expect(getStore().setsResult).toHaveLength(1)
    expect(getStore().setsResult[0].winner).toBe('home')
    expect(getStore().setsResult[0].home).toBe(2)
    expect(getStore().setsResult[0].away).toBe(0)
  })

  it('away が多いとき away が winner', () => {
    getStore().addPoint('away')
    getStore().addPoint('away')
    getStore().addPoint('home')
    getStore().endSet()
    expect(getStore().setsResult[0].winner).toBe('away')
  })
})

// ── rotateTeam ────────────────────────────────────────────────────────────

describe('rotateTeam', () => {
  it('ローテーションが1つ進む', () => {
    getStore().rotateTeam()
    expect(getStore().currentRotation[0]).toBe('p6')
    expect(getStore().currentRotation[1]).toBe('p1')
  })

  it('6回回転すると元に戻る', () => {
    const original = [...getStore().currentRotation]
    for (let i = 0; i < 6; i++) getStore().rotateTeam()
    expect(getStore().currentRotation).toEqual(original)
  })
})

// ── substituteLibero / restoreLibero ─────────────────────────────────────

describe('substituteLibero', () => {
  it('指定選手をリベロと交代する', () => {
    getStore().substituteLibero('p3')
    expect(getStore().currentRotation).toContain('p7')
    expect(getStore().currentRotation).not.toContain('p3')
  })

  it('liberoSubstitutedFor に交代した選手IDが設定される', () => {
    getStore().substituteLibero('p3')
    expect(getStore().liberoSubstitutedFor).toBe('p3')
  })

  it('liberoId が null の場合は何もしない', () => {
    useMatchStore.setState({ liberoId: null })
    const before = [...getStore().currentRotation]
    getStore().substituteLibero('p3')
    expect(getStore().currentRotation).toEqual(before)
  })
})

describe('restoreLibero', () => {
  it('リベロを元の選手と戻す', () => {
    getStore().substituteLibero('p3')
    getStore().restoreLibero()
    expect(getStore().currentRotation).toContain('p3')
    expect(getStore().currentRotation).not.toContain('p7')
  })

  it('戻した後 liberoSubstitutedFor が null になる', () => {
    getStore().substituteLibero('p3')
    getStore().restoreLibero()
    expect(getStore().liberoSubstitutedFor).toBeNull()
  })
})

// ── enableDetailLog ───────────────────────────────────────────────────────

describe('enableDetailLog', () => {
  it('詳細ログを有効にする', () => {
    getStore().enableDetailLog()
    expect(getStore().detailLogEnabled).toBe(true)
  })

  it('detailLogStartPoint に現在の次のポイント番号が設定される', () => {
    getStore().addPoint('home')
    getStore().enableDetailLog()
    expect(getStore().detailLogStartPoint).toBe(2)
  })

  it('すでに設定済みの場合は上書きしない', () => {
    useMatchStore.setState({ detailLogStartPoint: 5, detailLogEnabled: true })
    getStore().enableDetailLog()
    expect(getStore().detailLogStartPoint).toBe(5)
  })
})

// ── markSynced / markUnsynced ─────────────────────────────────────────────

describe('markSynced / markUnsynced', () => {
  it('markSynced で isSynced=true かつ lastSyncedAt が設定される', () => {
    getStore().addPoint('home')
    getStore().markSynced()
    expect(getStore().isSynced).toBe(true)
    expect(getStore().lastSyncedAt).not.toBeNull()
  })

  it('markUnsynced で isSynced=false になる', () => {
    getStore().markSynced()
    getStore().markUnsynced()
    expect(getStore().isSynced).toBe(false)
  })
})

// ── resetMatch ────────────────────────────────────────────────────────────

describe('resetMatch', () => {
  it('全状態が初期値に戻る', () => {
    getStore().addPoint('home')
    getStore().addPoint('away')
    getStore().resetMatch()
    const s = getStore()
    expect(s.matchId).toBeNull()
    expect(s.homeScore).toBe(0)
    expect(s.awayScore).toBe(0)
    expect(s.pointNumber).toBe(0)
    expect(s.pendingPoints).toHaveLength(0)
    expect(s.eventHistory).toHaveLength(0)
  })
})
