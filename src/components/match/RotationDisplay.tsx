'use client'

import type { Player } from '@/types'

interface RotationDisplayProps {
  rotation: string[]
  players: Player[]
  liberoId: string | null
  onLiberoSub?: (outId: string) => void
  onRestoreLibero?: () => void
  liberoSubstitutedFor: string | null
}

export function RotationDisplay({
  rotation,
  players,
  liberoId,
  onLiberoSub,
  onRestoreLibero,
  liberoSubstitutedFor,
}: RotationDisplayProps) {
  const playerMap = new Map(players.map((p) => [p.id, p]))

  // コート表示レイアウト: バレーボールのローテーション配置
  // rotation[0]=後衛右(サーバー), [1]=後衛中, [2]=後衛左
  // rotation[3]=前衛左, [4]=前衛中, [5]=前衛右
  const layout = [
    [rotation[3], rotation[4], rotation[5]], // 前衛（上段）
    [rotation[0], rotation[1], rotation[2]], // 後衛（下段）
  ]

  function getPlayerLabel(id: string): string {
    if (!id) return '?'
    const p = playerMap.get(id)
    if (!p) return '?'
    return `#${p.number}`
  }

  function getPlayerName(id: string): string {
    if (!id) return '-'
    const p = playerMap.get(id)
    return p?.name ?? '-'
  }

  function isLibero(id: string): boolean {
    return id === liberoId
  }

  return (
    <div className="bg-muted/30 rounded-xl p-3 border">
      <div className="text-xs text-center text-muted-foreground mb-2">現在のローテーション</div>
      <div className="space-y-1">
        {layout.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1 justify-center">
            {row.map((playerId, colIdx) => {
              const lib = isLibero(playerId)
              return (
                <div
                  key={colIdx}
                  className={`flex-1 max-w-[90px] rounded-lg p-2 text-center border text-xs
                    ${rowIdx === 1 && colIdx === 0 ? 'ring-2 ring-primary ring-offset-1' : ''}
                    ${lib ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-background'}
                  `}
                >
                  <div className="font-bold">{getPlayerLabel(playerId)}</div>
                  <div className="text-muted-foreground truncate">{getPlayerName(playerId)}</div>
                  {lib && <div className="text-[10px] text-amber-600">リベロ</div>}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div className="text-[10px] text-center text-muted-foreground mt-1">
        ▲ネット側　　　　　サーブ権: 後衛右
      </div>

      {/* リベロ交代ボタン */}
      {liberoId && onLiberoSub && (
        <div className="mt-3 pt-2 border-t">
          {liberoSubstitutedFor ? (
            <button
              onClick={onRestoreLibero}
              className="w-full text-xs text-amber-700 underline py-1"
            >
              リベロを戻す（#{playerMap.get(liberoSubstitutedFor)?.number} {playerMap.get(liberoSubstitutedFor)?.name}）
            </button>
          ) : (
            <div>
              <div className="text-xs text-muted-foreground mb-1 text-center">リベロと交代</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {rotation
                  .filter((id) => id && !isLibero(id))
                  .filter((id, idx, arr) => {
                    // 後衛のみ交代可（インデックス0,1,2が後衛）
                    const rotIdx = rotation.indexOf(id)
                    return rotIdx >= 0 && rotIdx <= 2
                  })
                  .map((id) => {
                    const p = playerMap.get(id)
                    if (!p) return null
                    return (
                      <button
                        key={id}
                        onClick={() => onLiberoSub(id)}
                        className="text-xs border rounded px-2 py-1 hover:bg-amber-50 hover:border-amber-300"
                      >
                        #{p.number} {p.name}
                      </button>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
