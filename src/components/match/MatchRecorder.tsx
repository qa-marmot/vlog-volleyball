'use client'

import { useEffect, useState, useCallback } from 'react'
import { useMatchStore } from '@/lib/store/matchStore'
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
  const [syncing, setSyncing] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [pendingScorer, setPendingScorer] = useState<'home' | 'away' | null>(null)

  // Setup state: pick starting 6 rotation
  const [setupDone, setSetupDone] = useState(false)
  const [selectedRotation, setSelectedRotation] = useState<string[]>([])

  useEffect(() => {
    if (store.matchId === matchId) {
      setSetupDone(true)
    }
  }, [matchId, store.matchId])

  function handleStartMatch() {
    if (selectedRotation.length !== 6) return
    const liberoPlayer = players.find((p) => p.is_libero)
    store.initMatch({
      matchId,
      teamId,
      teamName,
      opponentName,
      matchDate,
      shareUuid,
      roster: players,
      startingRotation: selectedRotation,
      liberoId: liberoPlayer?.id ?? null,
    })
    setSetupDone(true)
  }

  function toggleRotationPlayer(id: string) {
    setSelectedRotation((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 6) return prev
      return [...prev, id]
    })
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
          <a
            href="javascript:history.back()"
            className="inline-block text-sm text-blue-700 underline"
          >
            ← 戻る
          </a>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="rounded-lg border bg-white p-4">
          <h2 className="font-semibold mb-1">スタメン選択</h2>
          <p className="text-xs text-slate-500 mb-3">
            コートに立つ6名を選択してください（選んだ順がローテーション順になります）
          </p>
          <div className="space-y-2">
            {nonLibero.map((p) => {
              const idx = selectedRotation.indexOf(p.id)
              const selected = idx >= 0
              return (
                <button
                  key={p.id}
                  onClick={() => toggleRotationPlayer(p.id)}
                  className={`w-full flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selected
                      ? 'bg-blue-50 border-blue-400 text-blue-700'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <span>
                    <span className="font-mono mr-2 text-slate-400">#{p.number}</span>
                    {p.name}
                    {p.position && (
                      <span className="ml-2 text-xs text-slate-400">{p.position}</span>
                    )}
                  </span>
                  {selected && (
                    <span className="text-xs font-bold text-blue-600">{idx + 1}番</span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {selectedRotation.length} / 6 人選択中
            {nonLibero.length < 6 && (
              <span className="ml-2 text-amber-600">（選手が6人未満です）</span>
            )}
          </p>
        </div>
        <button
          onClick={handleStartMatch}
          disabled={selectedRotation.length !== 6}
          className="w-full bg-blue-700 text-white rounded-lg py-3 font-semibold disabled:opacity-40 transition-opacity"
        >
          試合を開始する
        </button>
      </div>
    )
  }

  // --- Recording screen ---
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
      />

      {/* Rotation */}
      {store.currentRotation.length === 6 && (
        <RotationDisplay
          rotation={store.currentRotation}
          players={players}
          liberoId={store.liberoId}
          liberoSubstitutedFor={store.liberoSubstitutedFor}
          onLiberoSub={store.substituteLibero}
          onRestoreLibero={store.restoreLibero}
        />
      )}

      {/* Action buttons */}
      <ActionButtons
        teamName={teamName}
        opponentName={opponentName}
        onScore={handleScore}
        onEndSet={store.endSet}
        onRotate={store.rotateTeam}
        onTimeout={store.addTimeout}
      />

      {/* Undo + detail log status */}
      <div className="flex items-center justify-between">
        <UndoButton
          onUndo={store.undoLastPoint}
          disabled={store.eventHistory.length === 0}
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
