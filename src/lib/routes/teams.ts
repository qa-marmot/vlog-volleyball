import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { teams, teamMembers, players } from '@/schema'
import { getDb } from '../db'
import { generateInviteCode } from '../utils/rotation'
import type { HonoEnv } from '../hono'

const teamsRoute = new Hono<HonoEnv>()

// チーム作成
teamsRoute.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { name } = await c.req.json<{ name: string }>()
  if (!name?.trim()) return c.json({ error: 'チーム名を入力してください' }, 400)

  const db = getDb(c.env.DB)
  const id = crypto.randomUUID()
  const inviteCode = generateInviteCode()
  const now = new Date().toISOString()

  await db.insert(teams).values({ id, name: name.trim(), inviteCode, ownerId: user.id, createdAt: now })
  await db.insert(teamMembers).values({ id: crypto.randomUUID(), teamId: id, userId: user.id, role: 'owner', createdAt: now })

  return c.json({ id, inviteCode })
})

// 招待コードで参加
teamsRoute.post('/join', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { code } = await c.req.json<{ code: string }>()
  const db = getDb(c.env.DB)

  const team = await db.select().from(teams).where(eq(teams.inviteCode, code.toUpperCase().trim())).get()
  if (!team) return c.json({ error: '招待コードが見つかりません' }, 404)

  const existing = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, user.id))).get()
  if (existing) return c.json({ teamId: team.id, alreadyMember: true })

  await db.insert(teamMembers).values({
    id: crypto.randomUUID(), teamId: team.id, userId: user.id, role: 'member', createdAt: new Date().toISOString()
  })
  return c.json({ teamId: team.id })
})

// チーム詳細取得
teamsRoute.get('/:teamId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId } = c.req.param()
  const db = getDb(c.env.DB)

  const membership = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))).get()
  if (!membership) return c.json({ error: '権限がありません' }, 403)

  const team = await db.select().from(teams).where(eq(teams.id, teamId)).get()
  const teamPlayers = await db.select().from(players).where(eq(players.teamId, teamId))

  return c.json({ team, players: teamPlayers, role: membership.role })
})

// チーム削除（オーナーのみ）
teamsRoute.delete('/:teamId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId } = c.req.param()
  const db = getDb(c.env.DB)

  const membership = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))).get()
  if (!membership || membership.role !== 'owner') return c.json({ error: '権限がありません' }, 403)

  await db.delete(teams).where(eq(teams.id, teamId))
  return c.json({ ok: true })
})

// 選手追加
teamsRoute.post('/:teamId/players', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId } = c.req.param()
  const db = getDb(c.env.DB)

  const membership = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))).get()
  if (!membership) return c.json({ error: '権限がありません' }, 403)

  const body = await c.req.json<{ name: string; number: number; position?: string; isLibero?: boolean }>()
  const id = crypto.randomUUID()

  await db.insert(players).values({
    id, teamId, name: body.name.trim(), number: body.number,
    position: (body.position as any) ?? null,
    isLibero: body.isLibero ?? false,
    createdAt: new Date().toISOString(),
  })

  return c.json({ id })
})

// 選手編集
teamsRoute.patch('/:teamId/players/:playerId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, playerId } = c.req.param()
  const db = getDb(c.env.DB)

  const membership = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))).get()
  if (!membership) return c.json({ error: '権限がありません' }, 403)

  const body = await c.req.json<{ name?: string; number?: number; position?: string | null; isLibero?: boolean }>()
  await db.update(players).set({
    ...(body.name !== undefined ? { name: body.name.trim() } : {}),
    ...(body.number !== undefined ? { number: body.number } : {}),
    ...(body.position !== undefined ? { position: body.position as any } : {}),
    ...(body.isLibero !== undefined ? { isLibero: body.isLibero } : {}),
  }).where(and(eq(players.id, playerId), eq(players.teamId, teamId)))

  return c.json({ ok: true })
})

// 選手削除
teamsRoute.delete('/:teamId/players/:playerId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, playerId } = c.req.param()
  const db = getDb(c.env.DB)

  const membership = await db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, user.id))).get()
  if (!membership) return c.json({ error: '権限がありません' }, 403)

  await db.delete(players).where(and(eq(players.id, playerId), eq(players.teamId, teamId)))
  return c.json({ ok: true })
})

export default teamsRoute
