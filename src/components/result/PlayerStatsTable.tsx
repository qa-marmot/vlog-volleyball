'use client'

import type { PlayerStat } from '@/types'

interface PlayerStatsTableProps {
  playerStats: PlayerStat[]
}

export function PlayerStatsTable({ playerStats }: PlayerStatsTableProps) {
  if (playerStats.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        得点データがありません
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground border-b">
            <th className="text-left py-2 font-medium">選手</th>
            <th className="text-right py-2 font-medium">計</th>
            <th className="text-right py-2 font-medium">貢献</th>
            <th className="text-right py-2 font-medium">AT</th>
            <th className="text-right py-2 font-medium">SV</th>
            <th className="text-right py-2 font-medium">BK</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {playerStats.map((stat, i) => (
            <tr key={stat.player.id} className={i === 0 ? 'font-semibold' : ''}>
              <td className="py-2">
                #{stat.player.number} {stat.player.name}
              </td>
              <td className="text-right py-2 tabular-nums">{stat.totalPoints}</td>
              <td className="text-right py-2 tabular-nums text-muted-foreground">
                {Math.round(stat.contributionRate * 100)}%
              </td>
              <td className="text-right py-2 tabular-nums text-muted-foreground">
                {stat.attackPoints}
              </td>
              <td className="text-right py-2 tabular-nums text-muted-foreground">
                {stat.servePoints}
              </td>
              <td className="text-right py-2 tabular-nums text-muted-foreground">
                {stat.blockPoints}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="text-xs text-muted-foreground border-t">
            <td colSpan={6} className="pt-1">AT=アタック SV=サーブ BK=ブロック</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
