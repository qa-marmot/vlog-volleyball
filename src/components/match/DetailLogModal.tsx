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
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {scorer === 'home' ? '自チームの得点' : '相手チームの得点'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* アクション選択 */}
          <div>
            <div className="text-sm font-medium text-slate-600 mb-3">得点の種類を選択</div>
            <div className="grid grid-cols-2 gap-3">
              {ACTIONS.map((action) => (
                <button
                  key={action.value}
                  onClick={() => {
                    setSelectedAction(action.value)
                    if (action.value === 'opponent_error') setSelectedPlayer(null)
                  }}
                  className={`rounded-xl border-2 py-4 px-3 text-center transition-colors active:scale-95
                    ${selectedAction === action.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:bg-muted/50'
                    }`}
                >
                  <div className="text-3xl">{action.icon}</div>
                  <div className="text-sm font-semibold mt-2">{action.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 選手選択（自チームかつ相手ミス以外） */}
          {showPlayerSelect && (
            <div>
              <div className="text-sm font-medium text-slate-600 mb-3">得点した選手</div>
              <div className="grid grid-cols-2 gap-2">
                {homePlayers.filter((p) => !p.is_libero).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayer(p.id)}
                    className={`rounded-xl border-2 py-3 px-3 text-sm font-semibold transition-colors active:scale-95 min-h-[52px]
                      ${selectedPlayer === p.id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:bg-muted/50'
                      }`}
                  >
                    <span className="block text-xs opacity-70">#{p.number}</span>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1 h-12 text-base"
            >
              スキップ
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedAction}
              className="flex-1 h-12 text-base"
            >
              記録する
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
