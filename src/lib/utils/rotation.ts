/**
 * バレーボールのローテーション管理ユーティリティ
 * 配列インデックス: 0=サーバー(後衛右), 1=後衛中, 2=後衛左, 3=前衛左, 4=前衛中, 5=前衛右
 */

export function rotateForward(rotation: string[]): string[] {
  // 時計回りに1つローテーション（サイドアウト）
  // [0,1,2,3,4,5] → [5,0,1,2,3,4]
  const next = [...rotation]
  const last = next.pop()!
  next.unshift(last)
  return next
}

export function getCurrentServerIndex(rotation: string[]): number {
  // インデックス0がサーブ権保持者
  return 0
}

export function getRotationLabel(rotationIndex: number): string {
  const labels = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']
  return labels[rotationIndex] ?? `R${rotationIndex + 1}`
}

export function generateInviteCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join('')
}
