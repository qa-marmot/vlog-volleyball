'use client'

import { Button } from '@/components/ui/button'

interface UndoButtonProps {
  onUndo: () => void
  disabled: boolean
}

export function UndoButton({ onUndo, disabled }: UndoButtonProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onUndo}
      disabled={disabled}
      className="text-muted-foreground"
    >
      ↩ 取り消し
    </Button>
  )
}
