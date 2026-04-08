'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useMatchStore } from '@/lib/store/matchStore'
import { ScoreBoard } from '@/components/match/ScoreBoard'
import { ActionButtons } from '@/components/match/ActionButtons'
import { RotationDisplay } from '@/components/match/RotationDisplay'
import { DetailLogModal } from '@/components/match/DetailLogModal'
import { SyncStatus } from '@/components/match/SyncStatus'
import { UndoButton } from '@/components/match/UndoButton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { toJapaneseError } from '@/lib/utils/errors'
import type { Player, PointDetail } from '@/types'

export default function RecordPage() {
  const params = useParams<{ matchId: string }>()
  const router = useRouter()
  const matchId = params.matchId

  const store = useMatchStore()
  const [homePlayers, setHomePlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // 詳細ログモーダル状態
  const [pendingScorer, setPendingScorer] = useState<'home' | 'away' | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  // 試合終了確認
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)

  useEffect(() => {
    async function loadMatch() {
      const supabase = createClient()
      const { data: match } = await supabase
        .from('matches')
        .select('*, teams(name)')
        .eq('id', matchId)
        .single()

      if (!match) { router.push('/dashboard'); return }

      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', match.team_id)
        .order('number')

      setHomePlayers(players ?? [])

      // ストアが空またはmatchIdが違う場合は初期化
      if (store.matchId !== matchId) {
        store.initMatch({
          matchId: match.id,
          teamId: match.team_id,
          teamName: (match.teams as { name: string }).name,
          opponentName: match.opponent_name,
          matchDate: match.match_date,
          shareUuid: match.share_uuid,
          roster: players ?? [],
          startingRotation: Array(6).fill(''),
          liberoId: players?.find((p: Player) => p.is_libero)?.id ?? null,
        })
      }

      setLoading(false)
    }
    loadMatch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  const handleScore = useCallback((scorer: 'home' | 'away') => {
    if (store.detailLogEnabled) {
      setPendingScorer(scorer)
      setShowDetailModal(true)
    } else {
      store.addPoint(scorer)
    }
  }, [store])

  const handleDetailConfirm = useCallback((detail: PointDetail) => {
    if (!pendingScorer) return
    store.addPoint(pendingScorer, detail)
    setShowDetailModal(false)
    setPendingScorer(null)
  }, [pendingScorer, store])

  const handleDetailSkip = useCallback(() => {
    if (!pendingScorer) return
    store.addPoint(pendingScorer)
    setShowDetailModal(false)
    setPendingScorer(null)
  }, [pendingScorer, store])

  const handleSync = useCallback(async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const supabase = createClient()
      const { data: sets } = await supabase
        .from('match_sets')
        .select('id, set_number')
        .eq('match_id', matchId)
        .order('set_number')

      if (!sets) return

      // 現在のセットがなければ作成
      let currentSetId = sets.find((s) => s.set_number === store.currentSetNumber)?.id
      if (!currentSetId) {
        const { data: newSet } = await supabase
          .from('match_sets')
          .insert({
            match_id: matchId,
            set_number: store.currentSetNumber,
            home_score: 0,
            away_score: 0,
            completed: false,
          })
          .select()
          .single()
        if (newSet) {
          currentSetId = newSet.id
          sets.push(newSet)
        }
      }

      if (!currentSetId) return

      // 現在のセットのスコアを更新
      await supabase
        .from('match_sets')
        .update({ home_score: store.homeScore, away_score: store.awayScore })
        .eq('id', currentSetId)

      // pendingPoints をupsert
      if (store.pendingPoints.length > 0) {
        const pointsToInsert = store.pendingPoints.map((p) => {
          const setId = sets.find((s) => s.set_number === p.setNumber)?.id ?? currentSetId!
          return {
            match_id: matchId,
            set_id: setId,
            point_number: p.pointNumber,
            scorer: p.scorer,
            home_score: p.homeScore,
            away_score: p.awayScore,
            rotation_index: p.rotationIndex,
            action_type: p.actionType,
            player_id: p.playerId,
            is_detail_logged: p.isDetailLogged,
            created_at: p.createdAt,
          }
        })

        await supabase
          .from('points')
          .upsert(pointsToInsert, { onConflict: 'match_id,point_number' })
      }

      // detail_log_start_point の更新
      if (store.detailLogEnabled) {
        await supabase
          .from('matches')
          .update({
            detail_log_enabled: true,
            detail_log_start_point: store.detailLogStartPoint,
          })
          .eq('id', matchId)
      }

      store.markSynced()
      toast.success('保存しました')
    } catch (err) {
      const msg = err instanceof Error ? toJapaneseError(err.message) : '保存に失敗しました'
      toast.error(msg)
    } finally {
      setSyncing(false)
    }
  }, [matchId, store, syncing])

  const handleFinishMatch = useCallback(async () => {
    await handleSync()
    const supabase = createClient()

    // すべてのセットを完了済みに
    await supabase
      .from('match_sets')
      .update({ completed: true })
      .eq('match_id', matchId)
      .lt('set_number', store.currentSetNumber)

    // 試合を完了に
    await supabase
      .from('matches')
      .update({ status: 'completed' })
      .eq('id', matchId)

    toast.success('試合を終了しました')
    router.push(`/matches/${matchId}/result`)
  }, [handleSync, matchId, router, store.currentSetNumber])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">読み込み中...</div>
      </div>
    )
  }

  const totalPoints = store.setsResult.reduce((sum, s) => sum + s.home + s.away, 0) +
    store.homeScore + store.awayScore

  return (
    <>
      <div className="min-h-screen bg-muted/20 flex flex-col">
        {/* ヘッダー */}
        <header className="bg-background border-b px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-muted-foreground text-sm">← 戻る</Link>
            <SyncStatus
              isSynced={store.isSynced}
              lastSyncedAt={store.lastSyncedAt}
              onSync={handleSync}
              syncing={syncing}
            />
          </div>
          <div className="flex items-center gap-2">
            {!store.detailLogEnabled && (
              <button
                onClick={() => { store.enableDetailLog(); toast.info('詳細ログを有効にしました') }}
                className="text-xs text-primary underline"
              >
                詳細ログON
              </button>
            )}
            {store.detailLogEnabled && (
              <Badge variant="secondary" className="text-xs">詳細ログ中</Badge>
            )}
            <UndoButton
              onUndo={store.undoLastPoint}
              disabled={store.eventHistory.length === 0}
            />
          </div>
        </header>

        {/* メインコンテンツ */}
        <main className="flex-1 max-w-lg mx-auto w-full p-4 space-y-4">
          <ScoreBoard
            teamName={store.teamName}
            opponentName={store.opponentName}
            homeScore={store.homeScore}
            awayScore={store.awayScore}
            currentSetNumber={store.currentSetNumber}
            setsResult={store.setsResult}
          />

          <RotationDisplay
            rotation={store.currentRotation}
            players={store.roster}
            liberoId={store.liberoId}
            liberoSubstitutedFor={store.liberoSubstitutedFor}
            onLiberoSub={store.substituteLibero}
            onRestoreLibero={store.restoreLibero}
          />

          <ActionButtons
            onScore={handleScore}
            onEndSet={store.endSet}
            onRotate={store.rotateTeam}
            onTimeout={store.addTimeout}
            teamName={store.teamName}
            opponentName={store.opponentName}
          />

          {/* 試合終了ボタン */}
          <div className="pt-2">
            {!showFinishConfirm ? (
              <Button
                variant="outline"
                className="w-full text-muted-foreground"
                onClick={() => setShowFinishConfirm(true)}
              >
                試合を終了する
              </Button>
            ) : (
              <div className="rounded-xl border bg-background p-4 space-y-3">
                <p className="text-sm font-medium text-center">試合を終了してよいですか？</p>
                <p className="text-xs text-muted-foreground text-center">
                  総得点数: {totalPoints}点
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowFinishConfirm(false)} className="flex-1">
                    キャンセル
                  </Button>
                  <Button onClick={handleFinishMatch} className="flex-1">
                    終了して結果を見る
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <DetailLogModal
        open={showDetailModal}
        scorer={pendingScorer ?? 'home'}
        homePlayers={homePlayers}
        onConfirm={handleDetailConfirm}
        onSkip={handleDetailSkip}
        onCancel={() => { setShowDetailModal(false); setPendingScorer(null) }}
      />
    </>
  )
}
