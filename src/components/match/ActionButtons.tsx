'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

interface ActionButtonsProps {
  onScore: (scorer: 'home' | 'away') => void
  onEndSet: () => void
  onRotate: () => void
  onTimeout: (caller: 'home' | 'away') => void
  teamName: string
  opponentName: string
  disabled?: boolean
}

export function ActionButtons({
  onScore,
  onEndSet,
  onRotate,
  onTimeout,
  teamName,
  opponentName,
  disabled,
}: ActionButtonsProps) {
  const [showEndSetConfirm, setShowEndSetConfirm] = useState(false)
  const [showTimeoutMenu, setShowTimeoutMenu] = useState(false)

  return (
    <>
      {/* メイン得点ボタン */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onScore('home')}
          disabled={disabled}
          className="bg-primary text-primary-foreground rounded-2xl py-8 text-xl font-bold active:scale-95 transition-transform disabled:opacity-50 shadow-md"
        >
          +1<br />
          <span className="text-sm font-normal opacity-80">{teamName}</span>
        </button>
        <button
          onClick={() => onScore('away')}
          disabled={disabled}
          className="bg-secondary text-secondary-foreground border-2 rounded-2xl py-8 text-xl font-bold active:scale-95 transition-transform disabled:opacity-50 shadow-sm"
        >
          +1<br />
          <span className="text-sm font-normal opacity-70">{opponentName}</span>
        </button>
      </div>

      {/* サブアクション */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          onClick={() => setShowTimeoutMenu(true)}
          disabled={disabled}
          className="h-12"
        >
          タイムアウト
        </Button>
        <Button
          variant="outline"
          onClick={onRotate}
          disabled={disabled}
          className="h-12"
        >
          ローテーション
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowEndSetConfirm(true)}
          disabled={disabled}
          className="h-12"
        >
          セット終了
        </Button>
      </div>

      {/* セット終了確認ダイアログ */}
      <Dialog open={showEndSetConfirm} onOpenChange={setShowEndSetConfirm}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>セットを終了しますか？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            現在のスコアでセットを確定します。取り消しはできません。
          </p>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowEndSetConfirm(false)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={() => { setShowEndSetConfirm(false); onEndSet() }}
            >
              終了する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* タイムアウト選択ダイアログ */}
      <Dialog open={showTimeoutMenu} onOpenChange={setShowTimeoutMenu}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">タイムアウト</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-2">どちらのチームのタイムアウトですか？</p>
          <div className="flex flex-col gap-3 py-2">
            <Button
              onClick={() => { setShowTimeoutMenu(false); onTimeout('home') }}
              className="h-14 text-base"
            >
              {teamName}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowTimeoutMenu(false); onTimeout('away') }}
              className="h-14 text-base"
            >
              {opponentName}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
