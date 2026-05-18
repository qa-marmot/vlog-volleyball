import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
  createdAt: text('created_at').notNull(),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(), // Unix timestamp (ms)
})

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
})

export const teamMembers = sqliteTable('team_members', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'member'] }).notNull(),
  createdAt: text('created_at').notNull(),
})

export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  number: integer('number').notNull(),
  position: text('position', { enum: ['S', 'OH', 'MB', 'OP', 'L'] }),
  isLibero: integer('is_libero', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
})

export const matches = sqliteTable('matches', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  opponentName: text('opponent_name').notNull(),
  matchDate: text('match_date').notNull(),
  location: text('location'),
  shareUuid: text('share_uuid').notNull().unique(),
  detailLogEnabled: integer('detail_log_enabled', { mode: 'boolean' }).notNull().default(false),
  detailLogStartPoint: integer('detail_log_start_point'),
  status: text('status', { enum: ['in_progress', 'completed'] }).notNull().default('in_progress'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const matchSets = sqliteTable('match_sets', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  homeScore: integer('home_score').notNull().default(0),
  awayScore: integer('away_score').notNull().default(0),
  winner: text('winner', { enum: ['home', 'away'] }),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
})

export const points = sqliteTable('points', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  setId: text('set_id').notNull().references(() => matchSets.id, { onDelete: 'cascade' }),
  pointNumber: integer('point_number').notNull(),
  scorer: text('scorer', { enum: ['home', 'away'] }).notNull(),
  homeScore: integer('home_score').notNull(),
  awayScore: integer('away_score').notNull(),
  rotationIndex: integer('rotation_index').notNull(),
  actionType: text('action_type', { enum: ['attack', 'serve', 'block', 'opponent_error'] }),
  playerId: text('player_id').references(() => players.id, { onDelete: 'set null' }),
  isDetailLogged: integer('is_detail_logged', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
})

export const timeouts = sqliteTable('timeouts', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  setId: text('set_id').notNull().references(() => matchSets.id, { onDelete: 'cascade' }),
  pointNumber: integer('point_number').notNull(),
  caller: text('caller', { enum: ['home', 'away'] }).notNull(),
  createdAt: text('created_at').notNull(),
})

export const strategyPlans = sqliteTable('strategy_plans', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['draft', 'finalized'] }).notNull().default('draft'),
  name: text('name').notNull(),
  opponentName: text('opponent_name'),
  matchDate: text('match_date'),
  setNumber: integer('set_number'),
  systemType: text('system_type', { enum: ['5-1', '6-2', '4-2', 'other'] }).notNull().default('5-1'),
  data: text('data').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  updatedBy: text('updated_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  deletedBy: text('deleted_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
})

export const strategyRoles = sqliteTable('strategy_roles', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['owner', 'editor', 'viewer'] }).notNull(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  updatedBy: text('updated_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const strategyShareLinks = sqliteTable('strategy_share_links', {
  id: text('id').primaryKey(),
  strategyPlanId: text('strategy_plan_id').notNull().references(() => strategyPlans.id, { onDelete: 'cascade' }),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  viewScope: text('view_scope', { enum: ['full', 'player', 'print', 'summary'] }).notNull(),
  shareToken: text('share_token').notNull().unique(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  passwordProtected: integer('password_protected', { mode: 'boolean' }).notNull().default(false),
  passwordHash: text('password_hash'),
  expiresAt: text('expires_at'),
  allowDownload: integer('allow_download', { mode: 'boolean' }).notNull().default(false),
  includeOpponentScout: integer('include_opponent_scout', { mode: 'boolean' }).notNull().default(false),
  revokedAt: text('revoked_at'),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const strategyRevisions = sqliteTable('strategy_revisions', {
  id: text('id').primaryKey(),
  strategyPlanId: text('strategy_plan_id').notNull().references(() => strategyPlans.id, { onDelete: 'cascade' }),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  editedBy: text('edited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  editedAt: text('edited_at').notNull(),
  summary: text('summary').notNull(),
  changedFields: text('changed_fields').notNull(),
  beforeSnapshot: text('before_snapshot').notNull(),
  afterSnapshot: text('after_snapshot').notNull(),
  restoredFromRevisionId: text('restored_from_revision_id'),
})

export const strategySnapshots = sqliteTable('strategy_snapshots', {
  id: text('id').primaryKey(),
  strategyPlanId: text('strategy_plan_id').notNull().references(() => strategyPlans.id, { onDelete: 'cascade' }),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  matchId: text('match_id').references(() => matches.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number'),
  snapshot: text('snapshot').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').notNull(),
})

export const matchSetStrategyReviews = sqliteTable('match_set_strategy_reviews', {
  id: text('id').primaryKey(),
  matchId: text('match_id').notNull().references(() => matches.id, { onDelete: 'cascade' }),
  setNumber: integer('set_number').notNull(),
  strategyPlanId: text('strategy_plan_id').references(() => strategyPlans.id, { onDelete: 'set null' }),
  strategySnapshotId: text('strategy_snapshot_id').references(() => strategySnapshots.id, { onDelete: 'set null' }),
  postMatchReview: text('post_match_review').notNull(),
  rotationReviews: text('rotation_reviews').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
