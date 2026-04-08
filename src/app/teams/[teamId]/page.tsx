import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', user.id)
    .single()

  if (!membership) notFound()

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', teamId)
    .single()

  if (!team) notFound()

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .eq('team_id', teamId)
    .order('number', { ascending: true })

  const { data: members } = await supabase
    .from('team_members')
    .select('role, user_id')
    .eq('team_id', teamId)

  const positionLabel: Record<string, string> = {
    S: 'セッター', OH: 'アウトサイド', MB: 'ミドル', OP: 'オポジット', L: 'リベロ',
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="bg-background border-b px-4 py-3 flex items-center gap-3">
        <Link href="/dashboard" className="text-muted-foreground text-sm">← ダッシュボード</Link>
        <h1 className="font-bold text-lg">{team.name}</h1>
        <Badge variant="outline" className="font-mono">{team.invite_code}</Badge>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">選手一覧</h2>
            <Link href={`/teams/${teamId}/players/new`}>
              <Button size="sm">+ 選手追加</Button>
            </Link>
          </div>
          {players && players.length > 0 ? (
            <div className="space-y-2">
              {players.map((p) => (
                <Card key={p.id}>
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-right font-mono text-lg font-bold text-muted-foreground">
                        #{p.number}
                      </span>
                      <span className="font-medium">{p.name}</span>
                    </div>
                    <div className="flex gap-2">
                      {p.is_libero && <Badge variant="secondary">リベロ</Badge>}
                      {p.position && (
                        <Badge variant="outline">
                          {positionLabel[p.position] ?? p.position}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-6 text-center text-muted-foreground">
                選手がいません。追加してください。
              </CardContent>
            </Card>
          )}
        </section>

        <Separator />

        <section>
          <h2 className="text-base font-semibold mb-3">試合を開始</h2>
          <Link href={`/matches/new?teamId=${teamId}`}>
            <Button className="w-full" size="lg">試合を記録する</Button>
          </Link>
        </section>

        <Separator />

        <section>
          <h2 className="text-base font-semibold mb-2">チーム情報</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>メンバー数: {members?.length ?? 0}人</div>
            <div>
              招待コード:{' '}
              <span className="font-mono font-bold text-foreground">{team.invite_code}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
