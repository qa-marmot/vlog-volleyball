'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { generateInviteCode } from '@/lib/utils/rotation'

export default function NewTeamPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const invite_code = generateInviteCode()
    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name: name.trim(), invite_code, owner_id: user.id })
      .select()
      .single()

    if (error) { toast.error(error.message); setLoading(false); return }

    await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: user.id,
      role: 'owner',
    })

    toast.success('チームを作成しました')
    router.push(`/teams/${team.id}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>チームを作成</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">チーム名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 青葉高校バレー部"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '作成中...' : 'チームを作成'}
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
