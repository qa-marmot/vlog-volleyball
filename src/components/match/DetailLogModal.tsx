'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ActionType, Player, PointDetail } from '@/types'

const ACTIONS: { value: ActionType; label: string; icon: string }[] = [
  { value: 'attack', label: 'アタック', icon: '💥' },
  { value: 'serve', label: 'サーブ', icon: '🏐' },
  { value: 'block', label: 'ブロック', icon: '🛡️' },
  { value: 'opponent_error', label: '相手ミス', icon: '❌' },
]

interface DetailLogModalProps {
  open: boolean
  scorer: 'home' | 'away'
  homePlayers: Player[]
  onConfirm: (detail: PointDetail) => void
  onSkip: () => void
  onCancel: () => void
}

export function DetailLogModal({
  open,
  scorer,
  homePlayers,
  onConfirm,
  onSkip,
  onCancel,
}: DetailLogModalProps) {
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)

  function handleConfirm() {
    if (!selectedAction) return
    onConfirm({ actionType: selectedAction, playerId: selectedPlayer })
    setSelectedAction(null)
    setSelectedPlayer(null)
  }

  function handleSkip() {
    setSelectedAction(null)
    setSelectedPlayer(null)
    onSkip()
  }

  const showPlayerSelect =
    selectedAction && selectedAction !== 'opponent_error' && scorer === 'home'

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>
            {scorer === 'home' ? '自チームの得点' : '相手チームの得点'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* アクション選択 */}
          <div>
            <div className="text-sm text-muted-foreground mb-2">得点の種類</div>
            <div className="grid grid-cols-2 gap-2">
              {ACTIONS.map((action) => (
                <button
                  key={action.value}
                  onClick={() => {
                    setSelectedAction(action.value)
                    if (action.value === 'opponent_error') setSelectedPlayer(null)
                  }}
                  className={`rounded-xl border p-3 text-center transition-colors
                    ${selectedAction === action.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'hover:bg-muted/50'
                    }`}
                >
                  <div className="text-2xl">{action.icon}</div>
                  <div className="text-sm font-medium mt-1">{action.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 選手選択（自チームかつ相手ミス以外） */}
          {showPlayerSelect && (
            <div>
              <div className="text-sm text-muted-foreground mb-2">得点した選手</div>
              <div className="flex flex-wrap gap-2">
                {homePlayers.filter((p) => !p.is_libero).map((p) => (
                  <Badge
                    key={p.id}
                    variant={selectedPlayer === p.id ? 'default' : 'outline'}
                    className="cursor-pointer py-1 px-3"
                    onClick={() => setSelectedPlayer(p.id)}
                  >
                    #{p.number} {p.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
            >
              スキップ
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedAction}
              className="flex-1"
            >
              記録する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
