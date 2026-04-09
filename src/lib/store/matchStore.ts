'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Player, GameEvent, PointDetail, ActionType } from '@/types'
import { rotateForward } from '@/lib/utils/rotation'

interface SetScore {
  home: number
  away: number
  winner: 'home' | 'away' | null
}

interface MatchState {
  // 試合メタ
  matchId: string | null
  teamId: string | null
  teamName: string
  opponentName: string
  matchDate: string
  shareUuid: string | null

  // 詳細ログ
  detailLogEnabled: boolean
  detailLogStartPoint: number | null

  // 進行状態
  currentSetNumber: number
  homeScore: number
  awayScore: number
  setsResult: SetScore[]
  pointNumber: number // 試合全体通し番号

  // サーブ・ローテーション
  servingTeam: 'home' | 'away'
  rotationIndex: number // 0–5: セット内の何度目の回転か（スタッツ集計用）

  // ローテーション
  roster: Player[]
  currentRotation: string[] // player_id[6]
  liberoId: string | null
  liberoSubstitutedFor: string | null // リベロが交代した選手ID

  // イベント履歴（undo用）
  eventHistory: GameEvent[]

  // セット内のpoints（sync用バッファ）
  pendingPoints: Array<{
    setNumber: number
    pointNumber: number
    scorer: 'home' | 'away'
    homeScore: number
    awayScore: number
    rotationIndex: number
    actionType: ActionType | null
    playerId: string | null
    isDetailLogged: boolean
    createdAt: string
  }>

  // 同期状態
  isSynced: boolean
  lastSyncedAt: string | null
}

interface MatchActions {
  initMatch: (params: {
    matchId: string
    teamId: string
    teamName: string
    opponentName: string
    matchDate: string
    shareUuid: string
    roster: Player[]
    startingRotation: string[]
    liberoId: string | null
    servingTeam: 'home' | 'away'
  }) => void

  addPoint: (scorer: 'home' | 'away', detail?: PointDetail) => void
  undoLastPoint: () => void
  endSet: () => void
  rotateTeam: () => void // 手動オーバーライド用（UIからは非公開）
  substituteLibero: (outId: string) => void
  restoreLibero: () => void
  substitutePlayer: (outId: string, inId: string) => void
  enableDetailLog: () => void
  addTimeout: (caller: 'home' | 'away') => void
  markSynced: () => void
  markUnsynced: () => void
  resetMatch: () => void
}

type MatchStore = MatchState & MatchActions

const initialState: MatchState = {
  matchId: null,
  teamId: null,
  teamName: '',
  opponentName: '',
  matchDate: '',
  shareUuid: null,
  detailLogEnabled: false,
  detailLogStartPoint: null,
  currentSetNumber: 1,
  homeScore: 0,
  awayScore: 0,
  setsResult: [],
  pointNumber: 0,
  servingTeam: 'home',
  rotationIndex: 0,
  roster: [],
  currentRotation: [],
  liberoId: null,
  liberoSubstitutedFor: null,
  eventHistory: [],
  pendingPoints: [],
  isSynced: true,
  lastSyncedAt: null,
}

function makeSnapshot(state: MatchState) {
  return {
    homeScore: state.homeScore,
    awayScore: state.awayScore,
    currentRotation: [...state.currentRotation],
    currentSetNumber: state.currentSetNumber,
    totalSets: {
      home: state.setsResult.filter((s) => s.winner === 'home').length,
      away: state.setsResult.filter((s) => s.winner === 'away').length,
    },
    pointNumber: state.pointNumber,
    pendingPoints: [...state.pendingPoints],
    servingTeam: state.servingTeam,
    rotationIndex: state.rotationIndex,
    liberoSubstitutedFor: state.liberoSubstitutedFor,
  }
}

export const useMatchStore = create<MatchStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      initMatch: (params) => {
        set({
          ...initialState,
          matchId: params.matchId,
          teamId: params.teamId,
          teamName: params.teamName,
          opponentName: params.opponentName,
          matchDate: params.matchDate,
          shareUuid: params.shareUuid,
          roster: params.roster,
          currentRotation: params.startingRotation,
          liberoId: params.liberoId,
          servingTeam: params.servingTeam,
        })
      },

      addPoint: (scorer, detail) => {
        const state = get()
        const snapshot = makeSnapshot(state)
        const newPointNumber = state.pointNumber + 1
        const newHomeScore = scorer === 'home' ? state.homeScore + 1 : state.homeScore
        const newAwayScore = scorer === 'away' ? state.awayScore + 1 : state.awayScore

        // サイドアウト判定：得点チームがサーブしていなかった場合
        const isSideOut = scorer !== state.servingTeam
        const newServingTeam: 'home' | 'away' = scorer

        // 自チームがサーブ権を取り返した → ローテーション実行
        let newRotation = state.currentRotation
        let newLiberoSubstitutedFor = state.liberoSubstitutedFor
        let newRotationIndex = state.rotationIndex

        if (isSideOut && scorer === 'home') {
          newRotation = rotateForward(state.currentRotation)
          newRotationIndex = (state.rotationIndex + 1) % 6

          // リベロがサーバー位置（index 0）に来た場合は自動退場
          if (
            state.liberoId &&
            newRotation[0] === state.liberoId &&
            state.liberoSubstitutedFor
          ) {
            const origPlayerId = state.liberoSubstitutedFor
            newRotation = newRotation.map((id) =>
              id === state.liberoId ? origPlayerId : id
            )
            newLiberoSubstitutedFor = null
          }
        }

        const isDetailLogged = state.detailLogEnabled && detail !== undefined

        const pending = {
          setNumber: state.currentSetNumber,
          pointNumber: newPointNumber,
          scorer,
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          rotationIndex: state.rotationIndex, // この得点が入った時点のローテーション番号
          actionType: detail?.actionType ?? null,
          playerId: detail?.playerId ?? null,
          isDetailLogged,
          createdAt: new Date().toISOString(),
        }

        const event: GameEvent = {
          type: 'point',
          timestamp: new Date().toISOString(),
          data: { scorer, detail },
          snapshot,
        }

        set((s) => ({
          homeScore: newHomeScore,
          awayScore: newAwayScore,
          pointNumber: newPointNumber,
          currentRotation: newRotation,
          servingTeam: newServingTeam,
          rotationIndex: newRotationIndex,
          liberoSubstitutedFor: newLiberoSubstitutedFor,
          eventHistory: [...s.eventHistory, event],
          pendingPoints: [...s.pendingPoints, pending],
          isSynced: false,
          detailLogStartPoint:
            s.detailLogEnabled && s.detailLogStartPoint === null
              ? newPointNumber
              : s.detailLogStartPoint,
        }))
      },

      undoLastPoint: () => {
        const state = get()
        if (state.eventHistory.length === 0) return
        const last = state.eventHistory[state.eventHistory.length - 1]
        if (last.type !== 'point') return

        const snap = last.snapshot as ReturnType<typeof makeSnapshot>
        set({
          homeScore: snap.homeScore,
          awayScore: snap.awayScore,
          pointNumber: snap.pointNumber,
          currentRotation: snap.currentRotation,
          currentSetNumber: snap.currentSetNumber,
          pendingPoints: snap.pendingPoints as MatchState['pendingPoints'],
          servingTeam: snap.servingTeam,
          rotationIndex: snap.rotationIndex,
          liberoSubstitutedFor: snap.liberoSubstitutedFor,
          eventHistory: state.eventHistory.slice(0, -1),
          isSynced: false,
        })
      },

      endSet: () => {
        const state = get()
        const winner: 'home' | 'away' =
          state.homeScore >= state.awayScore ? 'home' : 'away'
        // FIVBルール: 負けたチームが次セット最初にサーブ
        const nextServingTeam: 'home' | 'away' =
          winner === 'home' ? 'away' : 'home'
        const snapshot = makeSnapshot(state)
        const event: GameEvent = {
          type: 'set_end',
          timestamp: new Date().toISOString(),
          data: { winner, homeScore: state.homeScore, awayScore: state.awayScore },
          snapshot,
        }
        set((s) => ({
          setsResult: [
            ...s.setsResult,
            { home: s.homeScore, away: s.awayScore, winner },
          ],
          homeScore: 0,
          awayScore: 0,
          currentSetNumber: s.currentSetNumber + 1,
          servingTeam: nextServingTeam,
          rotationIndex: 0,
          liberoSubstitutedFor: null,
          eventHistory: [...s.eventHistory, event],
          isSynced: false,
        }))
      },

      rotateTeam: () => {
        const state = get()
        const snapshot = makeSnapshot(state)
        const newRotation = rotateForward(state.currentRotation)
        const event: GameEvent = {
          type: 'rotation',
          timestamp: new Date().toISOString(),
          data: { from: state.currentRotation, to: newRotation },
          snapshot,
        }
        set((s) => ({
          currentRotation: newRotation,
          rotationIndex: (state.rotationIndex + 1) % 6,
          eventHistory: [...s.eventHistory, event],
          isSynced: false,
        }))
      },

      substituteLibero: (outId) => {
        const state = get()
        if (!state.liberoId) return
        const snapshot = makeSnapshot(state)
        const newRotation = state.currentRotation.map((id) =>
          id === outId ? state.liberoId! : id
        )
        const event: GameEvent = {
          type: 'libero_sub',
          timestamp: new Date().toISOString(),
          data: { outId, inId: state.liberoId },
          snapshot,
        }
        set((s) => ({
          currentRotation: newRotation,
          liberoSubstitutedFor: outId,
          eventHistory: [...s.eventHistory, event],
          isSynced: false,
        }))
      },

      restoreLibero: () => {
        const state = get()
        if (!state.liberoId || !state.liberoSubstitutedFor) return
        const snapshot = makeSnapshot(state)
        const newRotation = state.currentRotation.map((id) =>
          id === state.liberoId ? state.liberoSubstitutedFor! : id
        )
        const event: GameEvent = {
          type: 'libero_sub',
          timestamp: new Date().toISOString(),
          data: { outId: state.liberoId, inId: state.liberoSubstitutedFor },
          snapshot,
        }
        set((s) => ({
          currentRotation: newRotation,
          liberoSubstitutedFor: null,
          eventHistory: [...s.eventHistory, event],
          isSynced: false,
        }))
      },

      substitutePlayer: (outId, inId) => {
        const state = get()
        const snapshot = makeSnapshot(state)
        const newRotation = state.currentRotation.map((id) =>
          id === outId ? inId : id
        )
        const event: GameEvent = {
          type: 'sub',
          timestamp: new Date().toISOString(),
          data: { outId, inId },
          snapshot,
        }
        set((s) => ({
          currentRotation: newRotation,
          eventHistory: [...s.eventHistory, event],
          isSynced: false,
        }))
      },

      enableDetailLog: () => {
        set((s) => ({
          detailLogEnabled: true,
          detailLogStartPoint: s.detailLogStartPoint ?? s.pointNumber + 1,
        }))
      },

      addTimeout: (caller) => {
        const state = get()
        const snapshot = makeSnapshot(state)
        const event: GameEvent = {
          type: 'timeout',
          timestamp: new Date().toISOString(),
          data: { caller, pointNumber: state.pointNumber },
          snapshot,
        }
        set((s) => ({
          eventHistory: [...s.eventHistory, event],
          isSynced: false,
        }))
      },

      markSynced: () => {
        set({ isSynced: true, lastSyncedAt: new Date().toISOString() })
      },

      markUnsynced: () => {
        set({ isSynced: false })
      },

      resetMatch: () => {
        set(initialState)
      },
    }),
    {
      name: 'vlog-match-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
