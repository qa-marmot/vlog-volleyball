import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MatchResultView } from '@/components/result/MatchResultView'
import { Button } from '@/components/ui/button'
import { computeStats, computeTimelineWithSets } from '@/lib/utils/stats'
import type { Player, Point, MatchSet } from '@/types'

export default async function ResultPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: match } = await supabase
    .from('matches')
    .select('*, teams(name)')
    .eq('id', matchId)
    .single()

  if (!match) notFound()

  // 権限確認
  const { data: membership } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', match.team_id)
    .eq('user_id', user.id)
    .single()

  if (!membership) notFound()

  const { data: sets } = await supabase
    .from('match_sets')
    .select('*')
    .eq('match_id', matchId)
    .order('set_number')

  const { data: points } = await supabase
    .from('points')
    .select('*')
    .eq('match_id', matchId)
    .order('point_number')

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', match.team_id)

  const teamName = (match.teams as { name: string }).name
  const allSets = (sets ?? []) as MatchSet[]
  const allPoints = (points ?? []) as Point[]
  const allPlayers = (players ?? []) as Player[]

  const stats = computeStats(allPoints, allPlayers, match.detail_log_start_point)
  stats.scoreTimeline = computeTimelineWithSets(
    allPoints,
    allSets.map((s) => ({ id: s.id, set_number: s.set_number }))
  )

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-background border-b px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-muted-foreground text-sm">← ダッシュボード</Link>
        <h1 className="font-bold">試合結果</h1>
        {match.status === 'in_progress' && (
          <Link href={`/matches/${matchId}/record`} className="ml-auto">
            <Button size="sm" variant="outline">記録を続ける</Button>
          </Link>
        )}
      </header>

      <main className="max-w-lg mx-auto p-4">
        <MatchResultView
          teamName={teamName}
          opponentName={match.opponent_name}
          matchDate={match.match_date}
          location={match.location}
          sets={allSets}
          stats={stats}
          shareUuid={match.share_uuid}
          showSharePanel
        />
      </main>
    </div>
  )
}
