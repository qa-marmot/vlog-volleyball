import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sessionCookieOptions, SESSION_COOKIE } from '@/lib/auth'

// ── sessionCookieOptions ───────────────────────────────────────────────────

describe('SESSION_COOKIE', () => {
  it('正しい Cookie 名を定義している', () => {
    expect(SESSION_COOKIE).toBe('vlog_session')
  })
})

describe('sessionCookieOptions', () => {
  it('expires 未指定のとき maxAge を含む', () => {
    const opts = sessionCookieOptions()
    expect(opts.httpOnly).toBe(true)
    expect(opts.secure).toBe(true)
    expect(opts.sameSite).toBe('lax')
    expect(opts.path).toBe('/')
    expect(opts).toHaveProperty('maxAge')
    expect(opts).not.toHaveProperty('expires')
  })

  it('expires 指定のとき expires を含み maxAge を含まない', () => {
    const date = new Date('2030-01-01T00:00:00Z')
    const opts = sessionCookieOptions(date)
    expect(opts).toHaveProperty('expires', date)
    expect(opts).not.toHaveProperty('maxAge')
  })

  it('maxAge は 30日相当の秒数', () => {
    const opts = sessionCookieOptions() as { maxAge: number }
    const thirtyDays = 30 * 24 * 60 * 60
    expect(opts.maxAge).toBe(thirtyDays)
  })
})

// ── createSession / validateSession / deleteSession (DB mock) ───────────────

describe('createSession', () => {
  it('UUID 形式のセッション ID を返し DB に挿入する', async () => {
    // D1 に依存するため DB をモック
    const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) })
    const mockDb = { insert: mockInsert } as any

    const { createSession } = await import('@/lib/auth')
    const id = await createSession(mockDb, 'user-123')

    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    expect(mockInsert).toHaveBeenCalledOnce()
  })
})

describe('validateSession', () => {
  it('セッションが見つからない場合 null を返す', async () => {
    const mockGet = vi.fn().mockResolvedValue(null)
    const mockWhere = vi.fn().mockReturnValue({ get: mockGet })
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
    const mockDb = { select: mockSelect, delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) } as any

    const { validateSession } = await import('@/lib/auth')
    const result = await validateSession(mockDb, 'nonexistent-session')
    expect(result).toBeNull()
  })

  it('有効期限切れのセッションを削除して null を返す', async () => {
    const expiredSession = {
      user: { id: 'u1', email: 'test@example.com' },
      session: { id: 'sess1', userId: 'u1', expiresAt: Date.now() - 1000 },
    }
    const mockDelete = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
    const mockGet = vi.fn().mockResolvedValue(expiredSession)
    const mockWhere = vi.fn().mockReturnValue({ get: mockGet })
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
    const mockDb = { select: mockSelect, delete: mockDelete } as any

    const { validateSession } = await import('@/lib/auth')
    const result = await validateSession(mockDb, 'sess1')
    expect(result).toBeNull()
    expect(mockDelete).toHaveBeenCalledOnce()
  })

  it('有効なセッションのとき user を返す', async () => {
    const validSession = {
      user: { id: 'u1', email: 'test@example.com' },
      session: { id: 'sess1', userId: 'u1', expiresAt: Date.now() + 1_000_000 },
    }
    const mockGet = vi.fn().mockResolvedValue(validSession)
    const mockWhere = vi.fn().mockReturnValue({ get: mockGet })
    const mockInnerJoin = vi.fn().mockReturnValue({ where: mockWhere })
    const mockFrom = vi.fn().mockReturnValue({ innerJoin: mockInnerJoin })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
    const mockDb = { select: mockSelect } as any

    const { validateSession } = await import('@/lib/auth')
    const result = await validateSession(mockDb, 'sess1')
    expect(result).toEqual({ id: 'u1', email: 'test@example.com' })
  })
})

describe('deleteSession', () => {
  it('指定セッションを DB から削除する', async () => {
    const mockDeleteWhere = vi.fn().mockResolvedValue(undefined)
    const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere })
    const mockDb = { delete: mockDelete } as any

    const { deleteSession } = await import('@/lib/auth')
    await deleteSession(mockDb, 'sess-to-delete')
    expect(mockDelete).toHaveBeenCalledOnce()
    expect(mockDeleteWhere).toHaveBeenCalledOnce()
  })
})
