'use client'

interface SyncStatusProps {
  isSynced: boolean
  lastSyncedAt: string | null
  onSync: () => void
  syncing: boolean
}

export function SyncStatus({ isSynced, lastSyncedAt, onSync, syncing }: SyncStatusProps) {
  if (isSynced && lastSyncedAt) {
    const time = new Date(lastSyncedAt).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
    return (
      <span className="text-xs text-muted-foreground">
        ✓ {time} 保存済み
      </span>
    )
  }

  return (
    <button
      onClick={onSync}
      disabled={syncing}
      className="text-xs text-amber-600 font-medium flex items-center gap-1 hover:text-amber-700"
    >
      <span className={syncing ? 'animate-spin' : ''}>
        {syncing ? '↻' : '⚠'}
      </span>
      {syncing ? '保存中...' : '未保存（タップで保存）'}
    </button>
  )
}
