import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // チーム一覧取得
  const { data: memberships } = await supabase
    .from('team_members')
    .select('role, teams(id, name, invite_code)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // 試合履歴取得（参加チームの試合）
  const teamIds = memberships?.map((m) => (m.teams as { id: string }).id) ?? []
  const { data: matches } = teamIds.length > 0
    ? await supabase
        .from('matches')
        .select('id, opponent_name, match_date, status, share_uuid, teams(name)')
        .in('team_id', teamIds)
        .order('match_date', { ascending: false })
        .limit(10)
    : { data: [] }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-background border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold text-primary">V-Log</h1>
        <form action="/api/auth/signout" method="POST">
          <Button variant="ghost" size="sm" type="submit">ログアウト</Button>
        </form>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* チームセクション */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">チーム</h2>
            <div className="flex gap-2">
              <Link href="/teams/join">
                <Button variant="outline" size="sm">コードで参加</Button>
              </Link>
              <Link href="/teams/new">
                <Button size="sm">+ 新規作成</Button>
              </Link>
            </div>
          </div>
          {memberships && memberships.length > 0 ? (
            <div className="space-y-2">
              {memberships.map((m) => {
                const team = m.teams as { id: string; name: string; invite_code: string }
                return (
                  <Link key={team.id} href={`/teams/${team.id}`}>
                    <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                      <CardContent className="py-3 px-4 flex items-center justify-between">
                        <span className="font-medium">{team.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            {team.invite_code}
                          </span>
                          <Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>
                            {m.role === 'owner' ? 'オーナー' : 'メンバー'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                チームがありません。作成または招待コードで参加してください。
              </CardContent>
            </Card>
          )}
        </section>

        {/* 試合履歴 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">試合履歴</h2>
            {teamIds.length > 0 && (
              <Link href="/matches/new">
                <Button size="sm">+ 試合を記録</Button>
              </Link>
            )}
          </div>
          {matches && matches.length > 0 ? (
            <div className="space-y-2">
              {matches.map((match) => {
                const team = match.teams as { name: string }
                return (
                  <Card key={match.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="py-3 px-4 flex items-center justify-between">
                      <div>
                        <div className="font-medium">
                          {team.name} vs {match.opponent_name}
                        </div>
                        <div className="text-sm text-muted-foreground">{match.match_date}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={match.status === 'completed' ? 'secondary' : 'default'}>
                          {match.status === 'completed' ? '終了' : '進行中'}
                        </Badge>
                        <div className="flex gap-1">
                          {match.status === 'in_progress' && (
                            <Link href={`/matches/${match.id}/record`}>
                              <Button size="sm" variant="outline">記録</Button>
                            </Link>
                          )}
                          <Link href={`/matches/${match.id}/result`}>
                            <Button size="sm" variant="ghost">結果</Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                試合履歴がありません。
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  )
}
