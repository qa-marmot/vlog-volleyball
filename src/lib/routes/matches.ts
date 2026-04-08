import { Hono } from 'hono'
import { eq, and, inArray } from 'drizzle-orm'
import { matches, matchSets, points, players, teamMembers, timeouts } from '@/schema'
import { getDb } from '../db'
import { computeStats, computeTimelineWithSets } from '../utils/stats'
import type { HonoEnv } from '../hono'

const matchesRoute = new Hono<HonoEnv>()

async function assertMember(db: ReturnType<typeof getDb>, teamId: string, userId: string) {
  return db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))).get()
}

// 試合作成
matchesRoute.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const body = await c.req.json<{
    teamId: string; opponentName: string; matchDate: string; location?: string
  }>()

  const db = getDb(c.env.DB)
  if (!(await assertMember(db, body.teamId, user.id))) return c.json({ error: '権限がありません' }, 403)

  const id = crypto.randomUUID()
  const shareUuid = crypto.randomUUID()
  const now = new Date().toISOString()

  await db.insert(matches).values({
    id, teamId: body.teamId, opponentName: body.opponentName,
    matchDate: body.matchDate, location: body.location ?? null,
    shareUuid, status: 'in_progress', detailLogEnabled: false,
    createdAt: now, updatedAt: now,
  })

  // 第1セット作成
  await db.insert(matchSets).values({
    id: crypto.randomUUID(), matchId: id, setNumber: 1,
    homeScore: 0, awayScore: 0, completed: false, createdAt: now,
  })

  return c.json({ id, shareUuid })
})

// 試合取得
matchesRoute.get('/:matchId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { matchId } = c.req.param()
  const db = getDb(c.env.DB)
  const match = await db.select().from(matches).where(eq(matches.id, matchId)).get()
  if (!match) return c.json({ error: '試合が見つかりません' }, 404)
  if (!(await assertMember(db, match.teamId, user.id))) return c.json({ error: '権限がありません' }, 403)

  const sets = await db.select().from(matchSets).where(eq(matchSets.matchId, matchId))
  const teamPlayers = await db.select().from(players).where(eq(players.teamId, match.teamId))

  return c.json({ match, sets, players: teamPlayers })
})

// 試合更新（同期）
matchesRoute.put('/:matchId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { matchId } = c.req.param()
  const db = getDb(c.env.DB)
  const match = await db.select().from(matches).where(eq(matches.id, matchId)).get()
  if (!match) return c.json({ error: '試合が見つかりません' }, 404)
  if (!(await assertMember(db, match.teamId, user.id))) return c.json({ error: '権限がありません' }, 403)

  const body = await c.req.json<{
    status?: string
    detailLogEnabled?: boolean
    detailLogStartPoint?: number
    sets?: Array<{ setNumber: number; homeScore: number; awayScore: number; winner?: string; completed?: boolean }>
    points?: Array<{
      setNumber: number; pointNumber: number; scorer: string
      homeScore: number; awayScore: number; rotationIndex: number
      actionType?: string; playerId?: string; isDetailLogged: boolean; createdAt: string
    }>
    timeouts?: Array<{ setNumber: number; pointNumber: number; caller: string; createdAt: string }>
  }>()

  const now = new Date().toISOString()

  // 試合メタ更新
  await db.update(matches).set({
    ...(body.status ? { status: body.status as any } : {}),
    ...(body.detailLogEnabled !== undefined ? { detailLogEnabled: body.detailLogEnabled } : {}),
    ...(body.detailLogStartPoint !== undefined ? { detailLogStartPoint: body.detailLogStartPoint } : {}),
    updatedAt: now,
  }).where(eq(matches.id, matchId))

  // セット upsert
  if (body.sets) {
    const existingSets = await db.select().from(matchSets).where(eq(matchSets.matchId, matchId))
    for (const s of body.sets) {
      const existing = existingSets.find((e) => e.setNumber === s.setNumber)
      if (existing) {
        await db.update(matchSets).set({
          homeScore: s.homeScore, awayScore: s.awayScore,
          winner: s.winner as any ?? null, completed: s.completed ?? false,
        }).where(eq(matchSets.id, existing.id))
      } else {
        await db.insert(matchSets).values({
          id: crypto.randomUUID(), matchId, setNumber: s.setNumber,
          homeScore: s.homeScore, awayScore: s.awayScore,
          winner: s.winner as any ?? null, completed: s.completed ?? false,
          createdAt: now,
        })
      }
    }
  }

  // 得点 upsert
  if (body.points && body.points.length > 0) {
    const allSets = await db.select().from(matchSets).where(eq(matchSets.matchId, matchId))
    const setMap = new Map(allSets.map((s) => [s.setNumber, s.id]))

    for (const p of body.points) {
      const setId = setMap.get(p.setNumber)
      if (!setId) continue
      await db.insert(points).values({
        id: crypto.randomUUID(), matchId, setId,
        pointNumber: p.pointNumber, scorer: p.scorer as any,
        homeScore: p.homeScore, awayScore: p.awayScore,
        rotationIndex: p.rotationIndex,
        actionType: p.actionType as any ?? null,
        playerId: p.playerId ?? null,
        isDetailLogged: p.isDetailLogged,
        createdAt: p.createdAt,
      }).onConflictDoNothing()
    }
  }

  // タイムアウト upsert
  if (body.timeouts && body.timeouts.length > 0) {
    const allSets = await db.select().from(matchSets).where(eq(matchSets.matchId, matchId))
    const setMap = new Map(allSets.map((s) => [s.setNumber, s.id]))
    for (const t of body.timeouts) {
      const setId = setMap.get(t.setNumber)
      if (!setId) continue
      await db.insert(timeouts).values({
        id: crypto.randomUUID(), matchId, setId,
        pointNumber: t.pointNumber, caller: t.caller as any, createdAt: t.createdAt,
      }).onConflictDoNothing()
    }
  }

  return c.json({ ok: true })
})

// 試合結果取得（分析データ含む）
matchesRoute.get('/:matchId/result', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { matchId } = c.req.param()
  const db = getDb(c.env.DB)
  const match = await db.select().from(matches).where(eq(matches.id, matchId)).get()
  if (!match) return c.json({ error: '試合が見つかりません' }, 404)
  if (!(await assertMember(db, match.teamId, user.id))) return c.json({ error: '権限がありません' }, 403)

  const sets = await db.select().from(matchSets).where(eq(matchSets.matchId, matchId))
  const matchPoints = await db.select().from(points).where(eq(points.matchId, matchId))
  const teamPlayers = await db.select().from(players).where(eq(players.teamId, match.teamId))

  const stats = computeStats(matchPoints as any, teamPlayers as any, match.detailLogStartPoint)
  stats.scoreTimeline = computeTimelineWithSets(
    matchPoints as any,
    sets.map((s) => ({ id: s.id, set_number: s.setNumber }))
  )

  return c.json({ match, sets, players: teamPlayers, stats })
})

// 公開共有用 (認証不要)
matchesRoute.get('/share/:uuid', async (c) => {
  const { uuid } = c.req.param()
  const db = getDb(c.env.DB)
  const match = await db.select().from(matches).where(eq(matches.shareUuid, uuid)).get()
  if (!match) return c.json({ error: '試合が見つかりません' }, 404)

  const sets = await db.select().from(matchSets).where(eq(matchSets.matchId, match.id))
  const matchPoints = await db.select().from(points).where(eq(points.matchId, match.id))
  const teamPlayers = await db.select().from(players).where(eq(players.teamId, match.teamId))

  const stats = computeStats(matchPoints as any, teamPlayers as any, match.detailLogStartPoint)
  stats.scoreTimeline = computeTimelineWithSets(
    matchPoints as any,
    sets.map((s) => ({ id: s.id, set_number: s.setNumber }))
  )

  return c.json({ match, sets, players: teamPlayers, stats })
})

export default matchesRoute
