'use client'

import { useEffect, useState, useCallback } from 'react'
import { useMatchStore } from '@/lib/store/matchStore'
import { useUserPrefsStore } from '@/lib/store/userPrefsStore'
import { ScoreBoard } from './ScoreBoard'
import { ActionButtons } from './ActionButtons'
import { RotationDisplay } from './RotationDisplay'
import { UndoButton } from './UndoButton'
import { SyncStatus } from './SyncStatus'
import { DetailLogModal } from './DetailLogModal'
import type { Player, PointDetail } from '@/types'

interface MatchRecorderProps {
  matchId: string
  teamId: string
  teamName: string
  opponentName: string
  matchDate: string
  shareUuid: string
  players: Player[]
}

export function MatchRecorder({
  matchId,
  teamId,
  teamName,
  opponentName,
  matchDate,
  shareUuid,
  players,
}: MatchRecorderProps) {
  const store = useMatchStore()
  const prefs = useUserPrefsStore()
  const [syncing, setSyncing] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [pendingScorer, setPendingScorer] = useState<'home' | 'away' | null>(null)

  // Setup state
  const [setupDone, setSetupDone] = useState(false)
  // courtAssignment[i]: rotation配列インデックスiに割り当てられた選手ID (0=BR/サーバー, 1=BC, 2=BL, 3=FL, 4=FC, 5=FR)
  const [courtAssignment, setCourtAssignment] = useState<(string | null)[]>(Array(6).fill(null))
  const [activeSlot, setActiveSlot] = useState<number>(0)
  const [selectedServingTeam, setSelectedServingTeam] = useState<'home' | 'away' | null>(null)

  useEffect(() => {
    if (store.matchId === matchId) {
      setSetupDone(true)
    }
  }, [matchId, store.matchId])

  function handleStartMatch() {
    if (courtAssignment.some((id) => id === null) || !selectedServingTeam) return
    const liberoPlayer = players.find((p) => p.is_libero)
    store.initMatch({
      matchId,
      teamId,
      teamName,
      opponentName,
      matchDate,
      shareUuid,
      roster: players,
      startingRotation: courtAssignment as string[],
      liberoId: liberoPlayer?.id ?? null,
      servingTeam: selectedServingTeam,
    })
    setSetupDone(true)
  }

  function handlePlayerAssign(playerId: string) {
    const newAssignment = [...courtAssignment]
    // 既に別スロットに割り当てられていたら外す
    const prevSlot = newAssignment.indexOf(playerId)
    if (prevSlot >= 0) newAssignment[prevSlot] = null
    // アクティブスロットに割り当て
    newAssignment[activeSlot] = playerId
    setCourtAssignment(newAssignment)
    // 次の空きスロットに移動
    const nextEmpty = newAssignment.findIndex((id) => id === null)
    if (nextEmpty >= 0) setActiveSlot(nextEmpty)
  }

  function handleSlotClick(slotIdx: number) {
    if (courtAssignment[slotIdx] !== null) {
      // 既に埋まっているスロットをクリック → クリアして選択
      const newAssignment = [...courtAssignment]
      newAssignment[slotIdx] = null
      setCourtAssignment(newAssignment)
    }
    setActiveSlot(slotIdx)
  }

  const sync = useCallback(async () => {
    if (syncing || store.isSynced) return
    setSyncing(true)
    try {
      const currentSets = store.setsResult.map((s, i) => ({
        setNumber: i + 1,
        homeScore: s.home,
        awayScore: s.away,
        winner: s.winner,
        completed: true,
      }))
      currentSets.push({
        setNumber: store.currentSetNumber,
        homeScore: store.homeScore,
        awayScore: store.awayScore,
        winner: null,
        completed: false,
      })

      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sets: currentSets,
          points: store.pendingPoints,
          detailLogEnabled: store.detailLogEnabled,
          detailLogStartPoint: store.detailLogStartPoint ?? undefined,
        }),
      })
      if (res.ok) {
        store.markSynced()
      }
    } catch {
      // silent, user can retry
    } finally {
      setSyncing(false)
    }
  }, [syncing, store, matchId])

  // Auto-sync every 30s
  useEffect(() => {
    const id = setInterval(() => {
      if (!store.isSynced) sync()
    }, 30_000)
    return () => clearInterval(id)
  }, [sync, store.isSynced])

  function handleScore(scorer: 'home' | 'away') {
    if (store.detailLogEnabled) {
      setPendingScorer(scorer)
      setShowDetailModal(true)
    } else {
      store.addPoint(scorer)
    }
  }

  function handleDetailConfirm(detail: PointDetail) {
    if (pendingScorer) store.addPoint(pendingScorer, detail)
    setShowDetailModal(false)
    setPendingScorer(null)
  }

  function handleDetailSkip() {
    if (pendingScorer) store.addPoint(pendingScorer)
    setShowDetailModal(false)
    setPendingScorer(null)
  }

  async function handleEndMatch() {
    await sync()
    await fetch(`/api/matches/${matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    })
    location.href = `/matches/${matchId}/result`
  }

  // --- Setup screen ---
  if (!setupDone) {
    const nonLibero = players.filter((p) => !p.is_libero)

    if (nonLibero.length === 0) {
      return (
        <div className="rounded-lg border bg-white p-6 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700">選手が登録されていません</p>
          <p className="text-xs text-slate-500">
            試合を記録するには先にチームページから選手を登録してください。
          </p>
          <a href="javascript:history.back()" className="inline-block text-sm text-blue-700 underline">
            ← 戻る
          </a>
        </div>
      )
    }

    const canStart = courtAssignment.every((id) => id !== null) && selectedServingTeam !== null
    const assignedCount = courtAssignment.filter((id) => id !== null).length

    // コートレイアウト定義
    // 上段=前衛(ネット側)、下段=後衛、右下=サーバー
    const courtRows: { idx: number; label: string; isServer?: boolean }[][] = [
      [
        { idx: 3, label: '前衛左' },
        { idx: 4, label: '前衛中' },
        { idx: 5, label: '前衛右' },
      ],
      [
        { idx: 2, label: '後衛左' },
        { idx: 1, label: '後衛中' },
        { idx: 0, label: 'サーバー', isServer: true },
      ],
    ]

    const playerMap = new Map(nonLibero.map((p) => [p.id, p]))

    return (
      <div className="space-y-4">
        {/* スタメン・コート配置 */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-1">スタメン配置</h2>
          <p className="text-xs text-slate-500 mb-3">
            コートのポジションを選択し、下の選手リストから選手を割り当ててください
          </p>

          {/* コート図 */}
          <div className="rounded-lg overflow-hidden border border-slate-200 mb-3">
            {/* ネット */}
            <div className="flex items-center gap-2 bg-slate-100 px-2 py-1">
              <div className="flex-1 border-t-2 border-dashed border-slate-400" />
              <span className="text-[10px] text-slate-500 font-semibold tracking-wide">ネット</span>
              <div className="flex-1 border-t-2 border-dashed border-slate-400" />
            </div>
            {courtRows.map((row, rowIdx) => (
              <div key={rowIdx} className="grid grid-cols-3">
                {row.map(({ idx, label, isServer }) => {
                  const assignedId = courtAssignment[idx]
                  const player = assignedId ? playerMap.get(assignedId) : null
                  const isActive = activeSlot === idx
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSlotClick(idx)}
                      className={`relative p-2 text-center border text-xs min-h-[60px] transition-colors
                        ${isActive
                          ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400 ring-inset'
                          : assignedId
                          ? 'bg-white border-slate-200 hover:bg-slate-50'
                          : 'bg-slate-50 border-dashed border-slate-300 hover:bg-blue-50/30'}
                      `}
                    >
                      {player ? (
                        <>
                          <div className="font-bold text-sm">#{player.number}</div>
                          <div className="truncate text-slate-700">{player.name}</div>
                          {isServer && <div className="text-[10px] text-blue-600 font-semibold">サーバー</div>}
                        </>
                      ) : (
                        <>
                          <div className="text-slate-400 text-[10px] mt-1">{label}</div>
                          {isServer && <div className="text-[10px] text-blue-400">サーバー</div>}
                          {isActive && <div className="text-[10px] text-blue-500 font-semibold mt-0.5">← 選択中</div>}
                        </>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* 選手リスト */}
          <p className="text-xs text-slate-500 mb-2">
            {activeSlot !== null
              ? `「${courtRows.flat().find(p => p.idx === activeSlot)?.label ?? ''}」に配置する選手を選択`
              : '割り当てるポジションをコート図で選択してください'}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {nonLibero.map((p) => {
              const assignedSlot = courtAssignment.indexOf(p.id)
              const isAssigned = assignedSlot >= 0
              const slotLabel = isAssigned
                ? (courtRows.flat().find((c) => c.idx === assignedSlot)?.label ?? '')
                : null
              return (
                <button
                  key={p.id}
                  onClick={() => handlePlayerAssign(p.id)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                    isAssigned
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <span>
                    <span className="font-mono mr-1 text-slate-400 text-xs">#{p.number}</span>
                    {p.name}
                  </span>
                  {isAssigned && (
                    <span className="text-[10px] font-semibold text-blue-500 shrink-0 ml-1">{slotLabel}</span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {assignedCount} / 6 人配置済み
            {nonLibero.length < 6 && (
              <span className="ml-2 text-amber-600">（選手が6人未満です）</span>
            )}
          </p>
        </div>

        {/* サーブ権選択 */}
        <div className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-1">最初のサーブ権</h2>
          <p className="text-xs text-slate-500 mb-3">
            第1セットで最初にサーブするチームを選択してください
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedServingTeam('home')}
              className={`rounded-xl border-2 py-4 text-sm font-semibold transition-colors ${
                selectedServingTeam === 'home'
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              🏐 {teamName}
              <span className="block text-xs font-normal mt-0.5 opacity-70">自チーム</span>
            </button>
            <button
              onClick={() => setSelectedServingTeam('away')}
              className={`rounded-xl border-2 py-4 text-sm font-semibold transition-colors ${
                selectedServingTeam === 'away'
                  ? 'bg-red-50 border-red-400 text-red-700'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              🏐 {opponentName}
              <span className="block text-xs font-normal mt-0.5 opacity-70">相手チーム</span>
            </button>
          </div>
        </div>

        <button
          onClick={handleStartMatch}
          disabled={!canStart}
          className="w-full bg-blue-700 text-white rounded-lg py-3 font-semibold disabled:opacity-40 transition-opacity"
        >
          試合を開始する
        </button>
      </div>
    )
  }

  // --- Recording screen ---
  // セット終了リマインダー判定
  const setEndTarget = store.currentSetNumber >= 5 ? 15 : 25
  const maxScore = Math.max(store.homeScore, store.awayScore)
  const scoreDiff = Math.abs(store.homeScore - store.awayScore)
  const shouldEndSet = maxScore >= setEndTarget && scoreDiff >= 2

  const setsResult = store.setsResult.map((s) => ({
    home: s.home,
    away: s.away,
    winner: s.winner,
  }))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <a href={`/matches/${matchId}/result`} className="text-sm text-gray-500 underline">
          結果を見る
        </a>
        <SyncStatus
          isSynced={store.isSynced}
          lastSyncedAt={store.lastSyncedAt}
          onSync={sync}
          syncing={syncing}
        />
      </div>

      {/* Scoreboard */}
      <ScoreBoard
        teamName={teamName}
        opponentName={opponentName}
        homeScore={store.homeScore}
        awayScore={store.awayScore}
        currentSetNumber={store.currentSetNumber}
        setsResult={setsResult}
        servingTeam={store.servingTeam}
      />

      {/* Rotation */}
      {store.currentRotation.length === 6 && (
        <RotationDisplay
          rotation={store.currentRotation}
          players={players}
          liberoId={store.liberoId}
          liberoSubstitutedFor={store.liberoSubstitutedFor}
          servingTeam={store.servingTeam}
          onLiberoSub={store.substituteLibero}
          onRestoreLibero={store.restoreLibero}
          onSubstitutePlayer={store.substitutePlayer}
        />
      )}

      {/* セット終了リマインダー */}
      {prefs.setEndReminderEnabled && shouldEndSet && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-amber-800">セット終了のタイミングです</div>
            <div className="text-xs text-amber-700 mt-0.5">
              {store.homeScore} - {store.awayScore}　下の「セット終了」ボタンを押してください
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <ActionButtons
        teamName={teamName}
        opponentName={opponentName}
        onScore={handleScore}
        onEndSet={store.endSet}
        onTimeout={store.addTimeout}
      />

      {/* Undo + detail log status */}
      <div className="flex items-center justify-between">
        <UndoButton
          onUndo={store.undoLastPoint}
          disabled={
            store.eventHistory.length === 0 ||
            store.eventHistory[store.eventHistory.length - 1].type !== 'point'
          }
        />
        {store.detailLogEnabled && (
          <span className="text-xs font-medium text-green-600 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
            詳細ログ記録中
          </span>
        )}
      </div>

      {/* Detail log start button */}
      {!store.detailLogEnabled && (
        <button
          onClick={store.enableDetailLog}
          className="w-full rounded-xl border-2 border-dashed border-blue-200 bg-blue-50 px-4 py-4 text-left hover:bg-blue-100 transition-colors"
        >
          <span className="block text-sm font-semibold text-blue-700">詳細ログを開始する</span>
          <span className="block text-xs text-blue-500 mt-0.5">得点の種類（アタック・サーブ・ブロック等）と選手を記録してスタッツを集計</span>
        </button>
      )}

      {/* 設定 */}
      <div className="flex items-center justify-between px-1 py-1 text-xs text-slate-400">
        <span>セット終了リマインダー</span>
        <button
          onClick={() => prefs.setSetEndReminderEnabled(!prefs.setEndReminderEnabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            prefs.setEndReminderEnabled ? 'bg-blue-600' : 'bg-slate-300'
          }`}
          aria-label="セット終了リマインダーをオン/オフ"
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              prefs.setEndReminderEnabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* End match */}
      <div className="pt-2 border-t">
        <button
          onClick={handleEndMatch}
          className="w-full text-sm text-red-600 border border-red-200 rounded-lg py-2 hover:bg-red-50 transition-colors"
        >
          試合を終了して結果を見る
        </button>
      </div>

      {/* Detail log modal */}
      <DetailLogModal
        open={showDetailModal}
        scorer={pendingScorer ?? 'home'}
        homePlayers={players}
        courtPlayerIds={store.currentRotation}
        onConfirm={handleDetailConfirm}
        onSkip={handleDetailSkip}
        onCancel={() => {
          setShowDetailModal(false)
          setPendingScorer(null)
        }}
      />
    </div>
  )
}
