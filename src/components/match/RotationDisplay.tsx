'use client'

import { useState } from 'react'
import type { Player } from '@/types'

interface RotationDisplayProps {
  rotation: string[]
  players: Player[]
  liberoId: string | null
  liberoSubstitutedFor: string | null
  servingTeam: 'home' | 'away'
  onLiberoSub?: (outId: string) => void
  onRestoreLibero?: () => void
  onSubstitutePlayer?: (outId: string, inId: string) => void
}

export function RotationDisplay({
  rotation,
  players,
  liberoId,
  liberoSubstitutedFor,
  servingTeam,
  onLiberoSub,
  onRestoreLibero,
  onSubstitutePlayer,
}: RotationDisplayProps) {
  const [showSubPanel, setShowSubPanel] = useState(false)
  const [subOutId, setSubOutId] = useState<string | null>(null)

  const playerMap = new Map(players.map((p) => [p.id, p]))

  // コート表示レイアウト（上がネット側）
  // rotation[0]=後衛右(サーバー), [1]=後衛中, [2]=後衛左
  // rotation[3]=前衛左, [4]=前衛中, [5]=前衛右
  const layout = [
    [rotation[3], rotation[4], rotation[5]], // 前衛（上段）: 左・中・右
    [rotation[2], rotation[1], rotation[0]], // 後衛（下段）: 左・中・右
  ]

  function getPlayerLabel(id: string) {
    const p = playerMap.get(id)
    return p ? `#${p.number}` : '?'
  }

  function getPlayerName(id: string) {
    return playerMap.get(id)?.name ?? '-'
  }

  // ベンチ選手：ロスター内でコートにいない非リベロ選手
  const benchPlayers = players.filter(
    (p) => !p.is_libero && !rotation.includes(p.id)
  )

  function handleSubConfirm(inId: string) {
    if (subOutId && onSubstitutePlayer) {
      onSubstitutePlayer(subOutId, inId)
    }
    setShowSubPanel(false)
    setSubOutId(null)
  }

  function cancelSub() {
    setShowSubPanel(false)
    setSubOutId(null)
  }

  return (
    <div className="bg-muted/30 rounded-xl p-3 border">
      {/* サーブ権インジケーター */}
      <div className="text-xs text-center mb-2">
        {servingTeam === 'home' ? (
          <span className="text-blue-700 font-semibold">🏐 自チームサーブ</span>
        ) : (
          <span className="text-slate-500">相手チームサーブ</span>
        )}
      </div>

      {/* コートレイアウト */}
      <div className="space-y-1">
        {/* ネット */}
        <div className="flex items-center gap-2 px-1 mb-1">
          <div className="flex-1 border-t-[3px] border-double border-slate-400" />
          <span className="text-[10px] text-slate-500 font-semibold tracking-wide">ネット</span>
          <div className="flex-1 border-t-[3px] border-double border-slate-400" />
        </div>
        {layout.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1 justify-center">
            {row.map((playerId, colIdx) => {
              const isLib = playerId === liberoId
              // サーバー位置: 後衛行(rowIdx=1)の右端(colIdx=2)
              const isServer = rowIdx === 1 && colIdx === 2
              return (
                <div
                  key={colIdx}
                  className={`flex-1 max-w-[90px] rounded-lg p-2 text-center border text-xs
                    ${isServer && servingTeam === 'home'
                      ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50'
                      : isServer
                      ? 'ring-2 ring-slate-300 ring-offset-1'
                      : ''}
                    ${isLib ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-white'}
                  `}
                >
                  <div className="font-bold">{getPlayerLabel(playerId)}</div>
                  <div className="text-muted-foreground truncate">{getPlayerName(playerId)}</div>
                  {isLib && <div className="text-[10px] text-amber-600">リベロ</div>}
                  {isServer && servingTeam === 'home' && (
                    <div className="text-[10px] text-blue-600 font-semibold">サーブ</div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* リベロ交代 */}
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
              <div className="text-xs text-muted-foreground mb-1 text-center">リベロと交代（後衛のみ）</div>
              <div className="flex flex-wrap gap-1 justify-center">
                {rotation
                  .filter((id, idx) => idx <= 2 && id !== liberoId)
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

      {/* 途中交代 */}
      {onSubstitutePlayer && (
        <div className="mt-2 pt-2 border-t">
          {!showSubPanel ? (
            <button
              onClick={() => setShowSubPanel(true)}
              className="w-full text-xs text-slate-500 hover:text-slate-700 py-1 underline"
            >
              途中交代
            </button>
          ) : (
            <div className="space-y-3">
              {/* Step 1: 退く選手 */}
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1.5 text-center">
                  退く選手を選択
                </div>
                <div className="flex flex-wrap gap-1 justify-center">
                  {rotation
                    .filter((id) => id !== liberoId) // リベロは専用UIで交代
                    .map((id) => {
                    const p = playerMap.get(id)
                    if (!p) return null
                    return (
                      <button
                        key={id}
                        onClick={() => setSubOutId(id)}
                        className={`text-xs border rounded-lg px-2.5 py-1.5 transition-colors ${
                          subOutId === id
                            ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        #{p.number} {p.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Step 2: 入る選手 */}
              {subOutId && (
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-1.5 text-center">
                    入る選手を選択
                  </div>
                  {benchPlayers.length > 0 ? (
                    <div className="flex flex-wrap gap-1 justify-center">
                      {benchPlayers.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleSubConfirm(p.id)}
                          className="text-xs border rounded-lg px-2.5 py-1.5 hover:bg-green-50 hover:border-green-400 hover:text-green-700 transition-colors"
                        >
                          #{p.number} {p.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-center text-slate-400">ベンチ選手がいません</p>
                  )}
                </div>
              )}

              <button
                onClick={cancelSub}
                className="w-full text-xs text-slate-400 hover:text-slate-600 py-0.5"
              >
                キャンセル
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
