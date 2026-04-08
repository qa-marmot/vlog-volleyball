'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface SharePanelProps {
  shareUuid: string
  teamName: string
  opponentName: string
  matchDate: string
  homeSets: number
  awaySets: number
  setScores: Array<{ home: number; away: number }>
}

export function SharePanel({
  shareUuid,
  teamName,
  opponentName,
  matchDate,
  homeSets,
  awaySets,
  setScores,
}: SharePanelProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/share/${shareUuid}`
      : `/share/${shareUuid}`

  const result = homeSets > awaySets ? '勝利' : '敗北'
  const setScoreText = setScores.map((s) => `${s.home}-${s.away}`).join(' / ')
  const summaryText = `【V-Log】${matchDate} ${teamName} vs ${opponentName}\n結果: ${homeSets}-${awaySets} (${result})\nセットスコア: ${setScoreText}\n詳細: ${shareUrl}`

  function handleCopyUrl() {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      toast.success('URLをコピーしました')
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleLineShare() {
    const encoded = encodeURIComponent(summaryText)
    window.open(`https://line.me/R/msg/text/?${encoded}`, '_blank', 'noopener')
  }

  return (
    <div className="space-y-3">
      {/* URLコピー */}
      <div className="flex gap-2">
        <div className="flex-1 bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground truncate font-mono">
          {shareUrl}
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyUrl}>
          {copied ? '✓' : 'コピー'}
        </Button>
      </div>

      {/* LINE共有 */}
      <Button
        onClick={handleLineShare}
        className="w-full bg-[#06C755] hover:bg-[#05b34e] text-white font-semibold"
      >
        LINE で共有する
      </Button>
    </div>
  )
}
