import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MatchResultView } from '@/components/result/MatchResultView'
import { computeStats, computeTimelineWithSets } from '@/lib/utils/stats'
import type { Player, Point, MatchSet } from '@/types'

export default async function SharePage({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  const { uuid } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('*, teams(name)')
    .eq('share_uuid', uuid)
    .single()

  if (!match) notFound()

  const { data: sets } = await supabase
    .from('match_sets')
    .select('*')
    .eq('match_id', match.id)
    .order('set_number')

  const { data: points } = await supabase
    .from('points')
    .select('*')
    .eq('match_id', match.id)
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
      <header className="bg-background border-b px-4 py-3 text-center">
        <div className="text-xl font-bold text-primary">V-Log</div>
        <div className="text-xs text-muted-foreground">試合結果</div>
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
          showSharePanel={false}
        />
      </main>
    </div>
  )
}
