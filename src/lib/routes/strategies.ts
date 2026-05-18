import { Hono } from 'hono'
import bcrypt from 'bcryptjs'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { players, strategyPlans, strategyRevisions, strategyRoles, strategyShareLinks, strategySnapshots, teamMembers, users } from '@/schema'
import { getDb } from '../db'
import {
  buildDefaultStrategyPlanData,
  StrategyPlanDataSchema,
  validateStrategyPlanData,
  type StrategyPlanData,
  type StrategyStatus,
} from '../strategy/schema'
import {
  buildStrategySnapshot,
  StrategyShareLinkInputSchema,
} from '../strategy/share'
import type { HonoEnv } from '../hono'

const strategiesRoute = new Hono<HonoEnv>()
type StrategyRole = 'owner' | 'editor' | 'viewer'

async function assertMember(db: ReturnType<typeof getDb>, teamId: string, userId: string) {
  return db.select().from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))).get()
}

function parsePlanData(data: string): StrategyPlanData {
  return StrategyPlanDataSchema.parse(JSON.parse(data))
}

function toResponse(plan: typeof strategyPlans.$inferSelect) {
  const data = parsePlanData(plan.data)
  return {
    id: plan.id,
    teamId: plan.teamId,
    status: plan.status,
    name: plan.name,
    opponentName: plan.opponentName ?? '',
    matchDate: plan.matchDate ?? '',
    setNumber: plan.setNumber,
    systemType: plan.systemType,
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    createdBy: plan.createdBy,
    updatedBy: plan.updatedBy,
    deletedAt: plan.deletedAt,
    data,
  }
}

async function resolveStrategyRole(db: ReturnType<typeof getDb>, membership: { teamId: string; userId: string; role: string }): Promise<StrategyRole> {
  if (membership.role === 'owner') return 'owner'
  const explicitRole = await db.select().from(strategyRoles)
    .where(and(eq(strategyRoles.teamId, membership.teamId), eq(strategyRoles.userId, membership.userId))).get()
  return explicitRole?.role ?? 'viewer'
}

function canEditStrategy(role: StrategyRole) {
  return role === 'owner' || role === 'editor'
}

function canManageStrategy(role: StrategyRole) {
  return role === 'owner'
}

function changedTopLevelFields(before: StrategyPlanData, after: StrategyPlanData) {
  const fields = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...fields].filter((field) => {
    const key = field as keyof StrategyPlanData
    return JSON.stringify(before[key]) !== JSON.stringify(after[key])
  })
}

async function createRevision(
  db: ReturnType<typeof getDb>,
  params: {
    plan: typeof strategyPlans.$inferSelect
    before: StrategyPlanData
    after: StrategyPlanData
    userId: string
    summary: string
    restoredFromRevisionId?: string | null
  },
) {
  const changedFields = changedTopLevelFields(params.before, params.after)
  await db.insert(strategyRevisions).values({
    id: crypto.randomUUID(),
    strategyPlanId: params.plan.id,
    teamId: params.plan.teamId,
    editedBy: params.userId,
    editedAt: new Date().toISOString(),
    summary: params.summary,
    changedFields: JSON.stringify(changedFields),
    beforeSnapshot: JSON.stringify(params.before),
    afterSnapshot: JSON.stringify(params.after),
    restoredFromRevisionId: params.restoredFromRevisionId ?? null,
  })
}

function publicShareUrl(c: { req: { url: string } }, token: string) {
  return new URL(`/share/strategy/${token}`, c.req.url).toString()
}

function isShareActive(link: typeof strategyShareLinks.$inferSelect, now = new Date()) {
  if (!link.enabled || link.revokedAt) return false
  if (link.expiresAt && new Date(link.expiresAt).getTime() <= now.getTime()) return false
  return true
}

strategiesRoute.get('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)

  const plans = await db.select().from(strategyPlans)
    .where(and(eq(strategyPlans.teamId, teamId), isNull(strategyPlans.deletedAt)))

  return c.json({
    plans: plans.map(toResponse),
    strategyRole: role,
  })
})

strategiesRoute.post('/', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canEditStrategy(role)) return c.json({ error: '作戦を作成できる権限がありません' }, 403)

  const body = await c.req.json<{
    name: string
    opponentName?: string
    matchDate?: string
    setNumber?: 1 | 2 | 3 | 4 | 5 | null
    baseRotation: string[]
    liberoPlayerIds?: string[]
    status?: StrategyStatus
  }>()

  const teamPlayers = await db.select().from(players).where(eq(players.teamId, teamId))
  const data = buildDefaultStrategyPlanData({
    name: body.name?.trim() || '新しい作戦プラン',
    opponentName: body.opponentName,
    matchDate: body.matchDate,
    setNumber: body.setNumber ?? null,
    baseRotation: body.baseRotation,
    liberoPlayerIds: body.liberoPlayerIds,
    players: teamPlayers,
  })

  const status = body.status ?? 'draft'
  const validation = validateStrategyPlanData({ ...data, status }, status)
  if (!validation.data || validation.errors.length > 0) {
    return c.json({ errors: validation.errors, warnings: validation.warnings }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.insert(strategyPlans).values({
    id,
    teamId,
    status,
    name: validation.data.name,
    opponentName: validation.data.opponentName || null,
    matchDate: validation.data.matchDate || null,
    setNumber: validation.data.setNumber,
    systemType: validation.data.systemType,
    data: JSON.stringify(validation.data),
    createdBy: user.id,
    updatedBy: user.id,
    createdAt: now,
    updatedAt: now,
  })

  return c.json({ id, warnings: validation.warnings })
})

strategiesRoute.get('/roles', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canManageStrategy(role)) return c.json({ error: '作戦権限を管理できる権限がありません' }, 403)

  const members = await db.select({
    userId: teamMembers.userId,
    teamRole: teamMembers.role,
    email: users.email,
    strategyRole: strategyRoles.role,
  })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .leftJoin(strategyRoles, and(eq(strategyRoles.teamId, teamMembers.teamId), eq(strategyRoles.userId, teamMembers.userId)))
    .where(eq(teamMembers.teamId, teamId))

  return c.json({
    roles: members.map((member) => ({
      userId: member.userId,
      email: member.email,
      teamRole: member.teamRole,
      strategyRole: member.teamRole === 'owner' ? 'owner' : member.strategyRole ?? 'viewer',
      editable: member.teamRole !== 'owner',
    })),
  })
})

strategiesRoute.patch('/roles/:userId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, userId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canManageStrategy(role)) return c.json({ error: '作戦権限を管理できる権限がありません' }, 403)

  const targetMembership = await assertMember(db, teamId, userId)
  if (!targetMembership) return c.json({ error: '対象ユーザーがチームに参加していません' }, 404)
  if (targetMembership.role === 'owner') return c.json({ error: 'チームownerは常に作戦ownerです' }, 400)

  const body = await c.req.json<{ role?: StrategyRole }>()
  if (!body.role || !['owner', 'editor', 'viewer'].includes(body.role)) {
    return c.json({ error: '不正な作戦ロールです' }, 400)
  }

  const now = new Date().toISOString()
  const existing = await db.select().from(strategyRoles)
    .where(and(eq(strategyRoles.teamId, teamId), eq(strategyRoles.userId, userId))).get()
  if (existing) {
    await db.update(strategyRoles).set({
      role: body.role,
      updatedBy: user.id,
      updatedAt: now,
    }).where(eq(strategyRoles.id, existing.id))
  } else {
    await db.insert(strategyRoles).values({
      id: crypto.randomUUID(),
      teamId,
      userId,
      role: body.role,
      createdBy: user.id,
      updatedBy: user.id,
      createdAt: now,
      updatedAt: now,
    })
  }

  return c.json({ ok: true, strategyRole: body.role })
})

strategiesRoute.get('/:planId/share-links', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canEditStrategy(role)) return c.json({ error: '共有を管理できる権限がありません' }, 403)

  const links = await db.select().from(strategyShareLinks)
    .where(and(eq(strategyShareLinks.teamId, teamId), eq(strategyShareLinks.strategyPlanId, planId)))

  return c.json({
    shareLinks: links.map((link) => ({
      ...link,
      passwordHash: null,
      active: isShareActive(link),
      url: publicShareUrl(c, link.shareToken),
    })),
  })
})

strategiesRoute.post('/:planId/share-links', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canEditStrategy(role)) return c.json({ error: '共有を管理できる権限がありません' }, 403)

  const plan = await db.select().from(strategyPlans)
    .where(and(eq(strategyPlans.id, planId), eq(strategyPlans.teamId, teamId), isNull(strategyPlans.deletedAt))).get()
  if (!plan) return c.json({ error: '作戦プランが見つかりません' }, 404)
  if (plan.status !== 'finalized') return c.json({ error: '共有リンクはfinalizedの作戦プランのみ発行できます。' }, 400)

  const parsed = StrategyShareLinkInputSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ errors: parsed.error.issues }, 400)

  const id = crypto.randomUUID()
  const token = crypto.randomUUID()
  const now = new Date().toISOString()
  const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 10) : null
  await db.insert(strategyShareLinks).values({
    id,
    strategyPlanId: plan.id,
    teamId,
    viewScope: parsed.data.viewScope,
    shareToken: token,
    enabled: true,
    passwordProtected: Boolean(passwordHash),
    passwordHash,
    expiresAt: parsed.data.expiresAt || null,
    allowDownload: parsed.data.allowDownload,
    includeOpponentScout: parsed.data.includeOpponentScout && parsed.data.viewScope === 'full',
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  })

  return c.json({ id, shareToken: token, url: publicShareUrl(c, token) })
})

strategiesRoute.patch('/:planId/share-links/:shareId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId, shareId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canEditStrategy(role)) return c.json({ error: '共有を管理できる権限がありません' }, 403)

  const body = await c.req.json<{
    enabled?: boolean
    expiresAt?: string | null
    allowDownload?: boolean
    includeOpponentScout?: boolean
    password?: string | null
  }>()
  const link = await db.select().from(strategyShareLinks)
    .where(and(
      eq(strategyShareLinks.id, shareId),
      eq(strategyShareLinks.strategyPlanId, planId),
      eq(strategyShareLinks.teamId, teamId),
    )).get()
  if (!link) return c.json({ error: '共有リンクが見つかりません' }, 404)

  const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : body.password === null ? null : undefined
  await db.update(strategyShareLinks).set({
    ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
    ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt || null } : {}),
    ...(body.allowDownload !== undefined ? { allowDownload: body.allowDownload } : {}),
    ...(body.includeOpponentScout !== undefined ? { includeOpponentScout: body.includeOpponentScout && link.viewScope === 'full' } : {}),
    ...(passwordHash !== undefined ? { passwordHash, passwordProtected: Boolean(passwordHash) } : {}),
    updatedAt: new Date().toISOString(),
  }).where(and(
    eq(strategyShareLinks.id, shareId),
    eq(strategyShareLinks.strategyPlanId, planId),
    eq(strategyShareLinks.teamId, teamId),
  ))

  return c.json({ ok: true })
})

strategiesRoute.post('/:planId/share-links/:shareId/regenerate', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId, shareId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canEditStrategy(role)) return c.json({ error: '共有を管理できる権限がありません' }, 403)

  const token = crypto.randomUUID()
  await db.update(strategyShareLinks).set({
    shareToken: token,
    revokedAt: null,
    enabled: true,
    updatedAt: new Date().toISOString(),
  }).where(and(
    eq(strategyShareLinks.id, shareId),
    eq(strategyShareLinks.strategyPlanId, planId),
    eq(strategyShareLinks.teamId, teamId),
  ))

  return c.json({ shareToken: token, url: publicShareUrl(c, token) })
})

strategiesRoute.delete('/:planId/share-links/:shareId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId, shareId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canEditStrategy(role)) return c.json({ error: '共有を管理できる権限がありません' }, 403)

  await db.update(strategyShareLinks).set({
    enabled: false,
    revokedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }).where(and(
    eq(strategyShareLinks.id, shareId),
    eq(strategyShareLinks.strategyPlanId, planId),
    eq(strategyShareLinks.teamId, teamId),
  ))

  return c.json({ ok: true })
})

strategiesRoute.get('/:planId/revisions', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canEditStrategy(role)) return c.json({ error: '変更履歴を閲覧できる権限がありません' }, 403)

  const revisions = await db.select().from(strategyRevisions)
    .where(and(eq(strategyRevisions.teamId, teamId), eq(strategyRevisions.strategyPlanId, planId)))
    .orderBy(desc(strategyRevisions.editedAt))

  return c.json({
    revisions: revisions.map((revision) => ({
      id: revision.id,
      editedBy: revision.editedBy,
      editedAt: revision.editedAt,
      summary: revision.summary,
      changedFields: JSON.parse(revision.changedFields),
      restoredFromRevisionId: revision.restoredFromRevisionId,
    })),
  })
})

strategiesRoute.post('/:planId/revisions/:revisionId/restore', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId, revisionId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canManageStrategy(role)) return c.json({ error: '変更履歴を復元できる権限がありません' }, 403)

  const plan = await db.select().from(strategyPlans)
    .where(and(eq(strategyPlans.id, planId), eq(strategyPlans.teamId, teamId), isNull(strategyPlans.deletedAt))).get()
  if (!plan) return c.json({ error: '作戦プランが見つかりません' }, 404)

  const revision = await db.select().from(strategyRevisions)
    .where(and(eq(strategyRevisions.id, revisionId), eq(strategyRevisions.teamId, teamId), eq(strategyRevisions.strategyPlanId, planId))).get()
  if (!revision) return c.json({ error: '変更履歴が見つかりません' }, 404)

  const before = parsePlanData(plan.data)
  const restored = StrategyPlanDataSchema.parse(JSON.parse(revision.afterSnapshot))
  const validation = validateStrategyPlanData(restored, plan.status as StrategyStatus)
  if (!validation.data || validation.errors.length > 0) return c.json({ errors: validation.errors, warnings: validation.warnings }, 400)

  const now = new Date().toISOString()
  await db.update(strategyPlans).set({
    name: validation.data.name,
    opponentName: validation.data.opponentName || null,
    matchDate: validation.data.matchDate || null,
    setNumber: validation.data.setNumber,
    systemType: validation.data.systemType,
    data: JSON.stringify(validation.data),
    updatedBy: user.id,
    updatedAt: now,
  }).where(eq(strategyPlans.id, planId))
  await createRevision(db, {
    plan,
    before,
    after: validation.data,
    userId: user.id,
    summary: `変更履歴 ${revisionId} から復元`,
    restoredFromRevisionId: revisionId,
  })

  return c.json({ ok: true, warnings: validation.warnings })
})

strategiesRoute.post('/:planId/snapshots', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)

  const plan = await db.select().from(strategyPlans)
    .where(and(eq(strategyPlans.id, planId), eq(strategyPlans.teamId, teamId), isNull(strategyPlans.deletedAt))).get()
  if (!plan) return c.json({ error: '作戦プランが見つかりません' }, 404)

  const body = await c.req.json<{ matchId?: string | null; setNumber?: number | null }>().catch(() => ({}))
  const data = parsePlanData(plan.data)
  const id = crypto.randomUUID()
  await db.insert(strategySnapshots).values({
    id,
    strategyPlanId: planId,
    teamId,
    matchId: body.matchId || null,
    setNumber: body.setNumber ?? data.setNumber,
    snapshot: JSON.stringify(buildStrategySnapshot(data)),
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  })

  return c.json({ id })
})

strategiesRoute.get('/:planId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)

  const plan = await db.select().from(strategyPlans)
    .where(and(eq(strategyPlans.id, planId), eq(strategyPlans.teamId, teamId), isNull(strategyPlans.deletedAt))).get()
  if (!plan) return c.json({ error: '作戦プランが見つかりません' }, 404)

  const data = parsePlanData(plan.data)
  const validation = validateStrategyPlanData(data, plan.status as StrategyStatus)
  return c.json({
    plan: toResponse(plan),
    validation: { errors: validation.errors, warnings: validation.warnings },
    strategyRole: role,
  })
})

strategiesRoute.put('/:planId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canEditStrategy(role)) return c.json({ error: '作戦を編集できる権限がありません' }, 403)

  const existing = await db.select().from(strategyPlans)
    .where(and(eq(strategyPlans.id, planId), eq(strategyPlans.teamId, teamId), isNull(strategyPlans.deletedAt))).get()
  if (!existing) return c.json({ error: '作戦プランが見つかりません' }, 404)

  const body = await c.req.json<{ data: unknown; status?: StrategyStatus }>()
  const status = body.status ?? existing.status as StrategyStatus
  const before = parsePlanData(existing.data)
  const validation = validateStrategyPlanData({ ...(body.data as object), status }, status)
  if (!validation.data || validation.errors.length > 0) {
    return c.json({ errors: validation.errors, warnings: validation.warnings }, 400)
  }

  const now = new Date().toISOString()
  await db.update(strategyPlans).set({
    status,
    name: validation.data.name,
    opponentName: validation.data.opponentName || null,
    matchDate: validation.data.matchDate || null,
    setNumber: validation.data.setNumber,
    systemType: validation.data.systemType,
    data: JSON.stringify(validation.data),
    updatedBy: user.id,
    updatedAt: now,
  }).where(eq(strategyPlans.id, planId))
  await createRevision(db, {
    plan: existing,
    before,
    after: validation.data,
    userId: user.id,
    summary: '作戦プランを保存',
  })

  return c.json({ ok: true, warnings: validation.warnings })
})

strategiesRoute.post('/:planId/duplicate', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canEditStrategy(role)) return c.json({ error: '作戦を複製できる権限がありません' }, 403)

  const existing = await db.select().from(strategyPlans)
    .where(and(eq(strategyPlans.id, planId), eq(strategyPlans.teamId, teamId), isNull(strategyPlans.deletedAt))).get()
  if (!existing) return c.json({ error: '作戦プランが見つかりません' }, 404)

  const data = parsePlanData(existing.data)
  const duplicated = { ...data, status: 'draft' as const, name: `${data.name} コピー` }
  const validation = validateStrategyPlanData(duplicated, 'draft')
  if (!validation.data || validation.errors.length > 0) {
    return c.json({ errors: validation.errors, warnings: validation.warnings }, 400)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  await db.insert(strategyPlans).values({
    id,
    teamId,
    status: 'draft',
    name: validation.data.name,
    opponentName: validation.data.opponentName || null,
    matchDate: validation.data.matchDate || null,
    setNumber: null,
    systemType: validation.data.systemType,
    data: JSON.stringify({ ...validation.data, setNumber: null }),
    createdBy: user.id,
    updatedBy: user.id,
    createdAt: now,
    updatedAt: now,
  })

  return c.json({ id, warnings: validation.warnings })
})

strategiesRoute.delete('/:planId', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: '認証が必要です' }, 401)

  const { teamId, planId } = c.req.param()
  const db = getDb(c.env.DB)
  const membership = await assertMember(db, teamId, user.id)
  if (!membership) return c.json({ error: '権限がありません' }, 403)
  const role = await resolveStrategyRole(db, membership)
  if (!canManageStrategy(role)) return c.json({ error: '権限がありません' }, 403)

  const now = new Date().toISOString()
  await db.update(strategyPlans).set({
    deletedAt: now,
    deletedBy: user.id,
    updatedAt: now,
    updatedBy: user.id,
  }).where(and(eq(strategyPlans.id, planId), eq(strategyPlans.teamId, teamId)))
  await db.update(strategyShareLinks).set({
    enabled: false,
    revokedAt: now,
    updatedAt: now,
  }).where(and(eq(strategyShareLinks.strategyPlanId, planId), eq(strategyShareLinks.teamId, teamId)))

  return c.json({ ok: true })
})

export default strategiesRoute
