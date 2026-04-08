'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { toJapaneseError } from '@/lib/utils/errors'
import type { PlayerPosition } from '@/types'

const POSITIONS: { value: PlayerPosition; label: string }[] = [
  { value: 'S', label: 'セッター' },
  { value: 'OH', label: 'アウトサイド' },
  { value: 'MB', label: 'ミドル' },
  { value: 'OP', label: 'オポジット' },
  { value: 'L', label: 'リベロ' },
]

export default function NewPlayerPage() {
  const router = useRouter()
  const params = useParams<{ teamId: string }>()
  const teamId = params.teamId

  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState<PlayerPosition | ''>('')
  const [isLibero, setIsLibero] = useState(false)
  const [loading, setLoading] = useState(false)

  function handlePositionSelect(pos: PlayerPosition) {
    setPosition(pos)
    setIsLibero(pos === 'L')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !number) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('players').insert({
      team_id: teamId,
      name: name.trim(),
      number: parseInt(number),
      position: position || null,
      is_libero: isLibero,
    })
    setLoading(false)
    if (error) { toast.error(toJapaneseError(error.message)); return }
    toast.success('選手を追加しました')
    router.push(`/teams/${teamId}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>選手を追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="number">背番号</Label>
              <Input
                id="number"
                type="number"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="1"
                min={1}
                max={99}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">選手名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 田中 太郎"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>ポジション（任意）</Label>
              <div className="flex flex-wrap gap-2">
                {POSITIONS.map((pos) => (
                  <Badge
                    key={pos.value}
                    variant={position === pos.value ? 'default' : 'outline'}
                    className="cursor-pointer py-1 px-3 text-sm"
                    onClick={() => handlePositionSelect(pos.value)}
                  >
                    {pos.label}
                  </Badge>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '追加中...' : '選手を追加'}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Link href={`/teams/${teamId}`} className="text-sm text-muted-foreground underline">
              キャンセル
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
