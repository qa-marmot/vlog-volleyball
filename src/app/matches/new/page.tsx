'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import type { Player } from '@/types'

function NewMatchForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTeamId = searchParams.get('teamId') ?? ''

  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState(defaultTeamId)
  const [opponentName, setOpponentName] = useState('')
  const [matchDate, setMatchDate] = useState(new Date().toISOString().slice(0, 10))
  const [location, setLocation] = useState('')
  const [startingRotation, setStartingRotation] = useState<string[]>(Array(6).fill(''))
  const [liberoId, setLiberoId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase
        .from('team_members')
        .select('teams(id, name)')
        .eq('user_id', user.id)
        .then(({ data }) => {
          const t = data?.map((m) => m.teams as unknown as { id: string; name: string }) ?? []
          setTeams(t)
          if (!selectedTeamId && t.length > 0) setSelectedTeamId(t[0].id)
        })
    })
  }, [selectedTeamId])

  useEffect(() => {
    if (!selectedTeamId) return
    const supabase = createClient()
    supabase
      .from('players')
      .select('*')
      .eq('team_id', selectedTeamId)
      .order('number')
      .then(({ data }) => {
        setPlayers(data ?? [])
        setStartingRotation(Array(6).fill(''))
        setLiberoId('')
      })
  }, [selectedTeamId])

  function handleRotationSlot(pos: number, playerId: string) {
    setStartingRotation((prev) => {
      const next = [...prev]
      // 同じ選手が別のスロットにいたら解除
      const existingIdx = next.indexOf(playerId)
      if (existingIdx !== -1 && existingIdx !== pos) next[existingIdx] = ''
      next[pos] = playerId
      return next
    })
  }

  const liberoPlayer = players.find((p) => p.is_libero)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const filledSlots = startingRotation.filter(Boolean).length
    if (filledSlots < 6) {
      toast.error('スターティングメンバーを6人全員選択してください')
      return
    }
    setLoading(true)
    const supabase = createClient()

    const { data: match, error } = await supabase
      .from('matches')
      .insert({
        team_id: selectedTeamId,
        opponent_name: opponentName.trim(),
        match_date: matchDate,
        location: location.trim() || null,
        status: 'in_progress',
      })
      .select()
      .single()

    if (error) { toast.error(error.message); setLoading(false); return }

    // 最初のセットを作成
    await supabase.from('match_sets').insert({
      match_id: match.id,
      set_number: 1,
      home_score: 0,
      away_score: 0,
      completed: false,
    })

    toast.success('試合を作成しました')
    router.push(`/matches/${match.id}/record`)
  }

  const positionLabels = ['サーバー', '後衛中', '後衛左', '前衛左', '前衛中', '前衛右']
  const nonLiberoPlayers = players.filter((p) => !p.is_libero)

  return (
    <div className="min-h-screen bg-muted/20 pb-8">
      <header className="bg-background border-b px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-muted-foreground text-sm">← 戻る</Link>
        <h1 className="font-bold text-lg">試合を記録</h1>
      </header>

      <main className="max-w-lg mx-auto p-4">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">試合情報</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {teams.length > 1 && (
                <div className="space-y-1">
                  <Label>チーム</Label>
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="opponent">相手チーム名</Label>
                <Input
                  id="opponent"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  placeholder="例: 桜高校"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="date">試合日</Label>
                  <Input
                    id="date"
                    type="date"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="location">会場（任意）</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="例: 第一体育館"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {players.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">スターティングメンバー</CardTitle>
                <p className="text-xs text-muted-foreground">各ポジションに選手を割り当ててください</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {positionLabels.map((label, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-muted-foreground shrink-0">{label}</span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {nonLiberoPlayers.map((p) => {
                        const isSelected = startingRotation[idx] === p.id
                        const isUsed = startingRotation.includes(p.id) && !isSelected
                        return (
                          <Badge
                            key={p.id}
                            variant={isSelected ? 'default' : 'outline'}
                            className={`cursor-pointer py-1 px-2 text-xs ${isUsed ? 'opacity-40' : ''}`}
                            onClick={() => !isUsed && handleRotationSlot(idx, p.id)}
                          >
                            #{p.number} {p.name}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {liberoPlayer && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">リベロ</span>
                      <Badge
                        variant={liberoId === liberoPlayer.id ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setLiberoId(
                          liberoId === liberoPlayer.id ? '' : liberoPlayer.id
                        )}
                      >
                        #{liberoPlayer.number} {liberoPlayer.name}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading || !selectedTeamId || !opponentName}
          >
            {loading ? '作成中...' : '試合を開始'}
          </Button>
        </form>
      </main>
    </div>
  )
}

export default function NewMatchPage() {
  return (
    <Suspense fallback={<div className="p-4">読み込み中...</div>}>
      <NewMatchForm />
    </Suspense>
  )
}
