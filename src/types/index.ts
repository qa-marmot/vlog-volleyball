export type PlayerPosition = 'S' | 'OH' | 'MB' | 'OP' | 'L'
export type TeamRole = 'owner' | 'member'
export type MatchStatus = 'in_progress' | 'completed'
export type Scorer = 'home' | 'away'
export type ActionType = 'attack' | 'serve' | 'block' | 'opponent_error'

export interface Team {
  id: string
  name: string
  invite_code: string
  owner_id: string
  created_at: string
}

export interface TeamMember {
  id: string
  team_id: string
  user_id: string
  role: TeamRole
  created_at: string
}

export interface Player {
  id: string
  team_id: string
  name: string
  number: number
  position: PlayerPosition | null
  is_libero: boolean
  created_at: string
}

export interface Match {
  id: string
  team_id: string
  opponent_name: string
  match_date: string
  location: string | null
  share_uuid: string
  detail_log_enabled: boolean
  detail_log_start_point: number | null
  status: MatchStatus
  created_at: string
  updated_at: string
}

export interface MatchSet {
  id: string
  match_id: string
  set_number: number
  home_score: number
  away_score: number
  winner: Scorer | null
  completed: boolean
  created_at: string
}

export interface Point {
  id: string
  match_id: string
  set_id: string
  point_number: number
  scorer: Scorer
  home_score: number
  away_score: number
  rotation_index: number
  action_type: ActionType | null
  player_id: string | null
  is_detail_logged: boolean
  created_at: string
}

export interface RotationSnapshot {
  id: string
  match_id: string
  set_id: string
  after_point_number: number
  player_ids: string[]
  created_at: string
}

export interface Timeout {
  id: string
  match_id: string
  set_id: string
  point_number: number
  caller: Scorer
  created_at: string
}

// Zustand store types
export type GameEventType =
  | 'point'
  | 'rotation'
  | 'libero_sub'
  | 'set_end'
  | 'timeout'
  | 'sub'

export interface GameEvent {
  type: GameEventType
  timestamp: string
  data: Record<string, unknown>
  // snapshot for undo
  snapshot: {
    homeScore: number
    awayScore: number
    currentRotation: string[]
    currentSetNumber: number
    totalSets: { home: number; away: number }
    pointNumber: number
    pendingPoints: unknown[]
    servingTeam: 'home' | 'away'
    rotationIndex: number
    liberoSubstitutedFor: string | null
  }
}

export interface PointDetail {
  actionType: ActionType
  playerId: string | null
}

// Stats types
export interface PlayerStat {
  player: Player
  totalPoints: number
  attackPoints: number
  servePoints: number
  blockPoints: number
  opponentErrors: number
}

export interface RotationStat {
  rotationIndex: number
  playerIds: string[]
  homePoints: number
  awayPoints: number
  pointDiff: number
}

export interface MatchStats {
  hasDetailLog: boolean
  detailLogCoverage: number
  playerStats: PlayerStat[]
  rotationStats: RotationStat[]
  scoreTimeline: ScoreTimelinePoint[]
}

export interface ScoreTimelinePoint {
  pointNumber: number
  homeScore: number
  awayScore: number
  setNumber: number
}
