'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toJapaneseError } from '@/lib/utils/errors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

export default function JoinTeamPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: team, error } = await supabase
      .from('teams')
      .select('id, name')
      .eq('invite_code', code.toUpperCase().trim())
      .single()

    if (error || !team) {
      toast.error('招待コードが見つかりません')
      setLoading(false)
      return
    }

    // 既に参加しているか確認
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', team.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      toast.info('すでにこのチームに参加しています')
      router.push(`/teams/${team.id}`)
      return
    }

    const { error: joinError } = await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: user.id,
      role: 'member',
    })

    if (joinError) { toast.error(toJapaneseError(joinError.message)); setLoading(false); return }

    toast.success(`「${team.name}」に参加しました`)
    router.push(`/teams/${team.id}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>チームに参加</CardTitle>
          <CardDescription>招待コードを入力してチームに参加します</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="code">招待コード（6文字）</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD12"
                maxLength={6}
                className="uppercase tracking-widest text-center text-xl font-mono"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading || code.length < 6}>
              {loading ? '参加中...' : 'チームに参加'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/dashboard" className="text-sm text-muted-foreground underline">
              キャンセル
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
