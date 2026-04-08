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
