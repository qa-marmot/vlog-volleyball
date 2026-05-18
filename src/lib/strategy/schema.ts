import { z } from 'zod'

export const RotationKeySchema = z.enum(['R1', 'R2', 'R3', 'R4', 'R5', 'R6'])
export type RotationKey = z.infer<typeof RotationKeySchema>

export const StrategyStatusSchema = z.enum(['draft', 'finalized'])
export type StrategyStatus = z.infer<typeof StrategyStatusSchema>

export const SystemTypeSchema = z.enum(['5-1', '6-2', '4-2', 'other'])
export const InitialServingTeamSchema = z.enum(['own', 'opponent', 'unknown'])
export const PrimaryFocusPhaseSchema = z.enum(['receive', 'serve', 'both', 'unknown'])
export const PlayerRoleSchema = z.enum(['OH', 'MB', 'OP', 'S', 'L', 'DS', 'other'])

export const AttackTypeSchema = z.enum([
  'quick_a',
  'quick_b',
  'quick_c',
  'quick_d',
  'parallel_left',
  'parallel_right',
  'back_attack',
  'pipe',
  'broad',
  'combination',
  'setter_dump',
  'second_ball',
  'out_of_system',
])

export const AttackTempoSchema = z.enum(['first', 'second', 'third', 'high'])
export const ApproachDirectionSchema = z.enum([
  'left_to_right',
  'right_to_left',
  'straight',
  'inside_out',
  'outside_in',
  'back_row',
])

export const AttackTakeoffZoneSchema = z.enum([
  'front_left',
  'front_middle',
  'front_right',
  'back_left_behind_3m',
  'back_middle_behind_3m',
  'back_right_behind_3m',
])

export const AttackTargetZoneSchema = z.enum([
  'front_left',
  'front_middle',
  'front_right',
  'middle_left',
  'middle_center',
  'middle_right',
  'back_left',
  'back_middle',
  'back_right',
])

export const AttackIntentSchema = z.enum([
  'kill',
  'block_out',
  'tip',
  'touch_out',
  'course_shot',
  'recycle',
  'safe_return',
  'target_weak_blocker',
  'target_poor_defender',
  'target_setter_area',
  'deep_corner',
  'wipe_block',
])

export const ServeTargetTypeSchema = z.enum([
  'short',
  'deep',
  'seam',
  'player_zone',
  'avoid_libero',
  'front_back_gap',
  'setter_front',
  'approach_disrupt',
  'sideline',
  'endline',
  'safe_in',
])

export const BlockSystemSchema = z.enum(['read', 'commit', 'bunch', 'spread'])
export const BlockFocusSchema = z.enum(['cross', 'line', 'middle', 'pipe', 'setter_dump'])
export const ReceiveFormationSchema = z.enum(['three_person', 'four_person', 'two_person', 'free'])
export const OpponentSetterStateSchema = z.enum(['front', 'back', 'unknown'])
export const WarningVisibilitySchema = z.enum(['editor_only', 'print', 'player', 'all'])

const PlayerIdSchema = z.string().min(1)
const SixPlayerIdsSchema = z.array(PlayerIdSchema).length(6)

export const PlayerCourtPositionSchema = z.object({
  playerId: PlayerIdSchema,
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  zone: z.string().min(1),
  label: z.string().optional(),
})

export const ValidationIssueSchema = z.object({
  type: z.string(),
  message: z.string(),
  visibility: WarningVisibilitySchema.optional(),
})

export const CoverPatternSchema = z.object({
  nearCoverPlayerIds: z.array(PlayerIdSchema).default([]),
  tipCoverPlayerIds: z.array(PlayerIdSchema).default([]),
  blockFollowPlayerIds: z.array(PlayerIdSchema).default([]),
  longReboundPlayerIds: z.array(PlayerIdSchema).default([]),
  notes: z.string().default(''),
})

export const AttackOptionSchema = z.object({
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  attackType: AttackTypeSchema,
  displayName: z.string().optional(),
  attackerId: PlayerIdSchema.optional(),
  attackTakeoffZone: AttackTakeoffZoneSchema.optional(),
  attackTargetZone: AttackTargetZoneSchema.optional(),
  tempo: AttackTempoSchema.optional(),
  approachDirection: ApproachDirectionSchema.optional(),
  coverPattern: CoverPatternSchema.optional(),
  intent: AttackIntentSchema.optional(),
  notes: z.string().default(''),
})

export const AttackPlansByPassQualitySchema = z.object({
  good: z.array(AttackOptionSchema).max(3).default([]),
  medium: z.array(AttackOptionSchema).max(3).default([]),
  bad: z.array(AttackOptionSchema).max(3).default([]),
})

export const LiberoReplacementSchema = z.object({
  liberoId: PlayerIdSchema,
  replacedPlayerId: PlayerIdSchema,
  replacedSlot: z.union([z.literal(1), z.literal(2)]),
})

export const ReceivePhaseSchema = z.object({
  receiveStartPositions: z.array(PlayerCourtPositionSchema).default([]),
  receiveCoverageZones: z.array(PlayerCourtPositionSchema).default([]),
  attackTransitionAfterReceive: z.array(PlayerCourtPositionSchema).default([]),
  attackPlansByPassQuality: AttackPlansByPassQualitySchema.default({
    good: [],
    medium: [],
    bad: [],
  }),
  opponentServeNotes: z.string().default(''),
  formation: ReceiveFormationSchema.default('three_person'),
})

export const ServePhaseSchema = z.object({
  serverId: PlayerIdSchema.optional(),
  serveTarget: z.object({
    targetType: ServeTargetTypeSchema.default('safe_in'),
    zone: z.string().optional(),
    playerLabel: z.string().optional(),
    notes: z.string().default(''),
  }).default({ targetType: 'safe_in', notes: '' }),
  preServePositions: z.array(PlayerCourtPositionSchema).default([]),
  postServeDefensePositions: z.array(PlayerCourtPositionSchema).default([]),
  notes: z.string().default(''),
})

export const DefensePhaseSchema = z.object({
  blockPlan: z.object({
    blockSystem: BlockSystemSchema.default('read'),
    blockFocus: BlockFocusSchema.optional(),
    mainBlockerId: PlayerIdSchema.optional(),
    assistBlockerIds: z.array(PlayerIdSchema).default([]),
    blockCall: z.string().default(''),
    releaseRule: z.string().default(''),
    notes: z.string().default(''),
  }).default({ blockSystem: 'read', assistBlockerIds: [], blockCall: '', releaseRule: '', notes: '' }),
  floorDefensePlan: z.object({
    basePositions: z.array(PlayerCourtPositionSchema).default([]),
    strongAttackDefense: z.string().default(''),
    tipDefense: z.string().default(''),
    pipeDefense: z.string().default(''),
    blockOutCoverage: z.string().default(''),
    notes: z.string().default(''),
  }).default({ basePositions: [], strongAttackDefense: '', tipDefense: '', pipeDefense: '', blockOutCoverage: '', notes: '' }),
  coverPlan: CoverPatternSchema.default({
    nearCoverPlayerIds: [],
    tipCoverPlayerIds: [],
    blockFollowPlayerIds: [],
    longReboundPlayerIds: [],
    notes: '',
  }),
})

export const RotationStrategySchema = z.object({
  courtPlayerIds: SixPlayerIdsSchema,
  primaryFocusPhase: PrimaryFocusPhaseSchema.default('unknown'),
  setterId: PlayerIdSchema.optional(),
  liberoReplacement: LiberoReplacementSchema.nullable().default(null),
  liberoNote: z.string().default(''),
  receivePhase: ReceivePhaseSchema.default({}),
  servePhase: ServePhaseSchema.default({}),
  defensePhase: DefensePhaseSchema.default({}),
  rallyTransition: z.object({
    freeBallTransition: z.string().default(''),
    digTransition: z.string().default(''),
    blockTouchTransition: z.string().default(''),
    setterOutTransition: z.string().default(''),
    notes: z.string().default(''),
  }).default({ freeBallTransition: '', digTransition: '', blockTouchTransition: '', setterOutTransition: '', notes: '' }),
  chanceBallPlan: z.object({
    firstTouchPriority: z.string().default(''),
    targetSetPosition: z.string().default(''),
    firstAttackOption: z.string().default(''),
    fallbackAttackOption: z.string().default(''),
    secondBallSetter: z.string().default(''),
    safeReturnTarget: z.string().default(''),
    notes: z.string().default(''),
  }).default({ firstTouchPriority: '', targetSetPosition: '', firstAttackOption: '', fallbackAttackOption: '', secondBallSetter: '', safeReturnTarget: '', notes: '' }),
  outOfSystemPlan: z.object({
    defaultHighBallTarget: z.string().default(''),
    secondBallSetter: z.string().default(''),
    whenSetterFirstTouch: z.string().default(''),
    liberoSetNote: z.string().default(''),
    emergencyReturnTarget: z.string().default(''),
    notes: z.string().default(''),
  }).default({ defaultHighBallTarget: '', secondBallSetter: '', whenSetterFirstTouch: '', liberoSetNote: '', emergencyReturnTarget: '', notes: '' }),
  setterFirstTouchPlan: z.object({
    secondBallSetterId: PlayerIdSchema.optional(),
    defaultSetTarget: z.string().default(''),
    frontSetterRule: z.string().default(''),
    backSetterRule: z.string().default(''),
    notes: z.string().default(''),
  }).default({ defaultSetTarget: '', frontSetterRule: '', backSetterRule: '', notes: '' }),
  overlapWarnings: z.array(ValidationIssueSchema).default([]),
  keyPoint: z.string().default(''),
  avoidNote: z.string().default(''),
  substitutionNote: z.string().default(''),
  playerNotes: z.array(z.object({ playerId: PlayerIdSchema, note: z.string() })).default([]),
  opponentRotationNotes: z.array(z.object({ label: z.string(), note: z.string() })).default([]),
  summaryNote: z.string().default(''),
  notes: z.string().default(''),
})

export const RotationsSchema = z.object({
  R1: RotationStrategySchema,
  R2: RotationStrategySchema,
  R3: RotationStrategySchema,
  R4: RotationStrategySchema,
  R5: RotationStrategySchema,
  R6: RotationStrategySchema,
})

export const StrategyPlanDataSchema = z.object({
  status: StrategyStatusSchema.default('draft'),
  name: z.string().min(1),
  opponentName: z.string().default(''),
  matchDate: z.string().default(''),
  setNumber: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]).nullable().default(null),
  tournamentName: z.string().default(''),
  venue: z.string().default(''),
  matchLabel: z.string().default(''),
  systemType: SystemTypeSchema.default('5-1'),
  baseRotation: SixPlayerIdsSchema,
  startingRotationKey: RotationKeySchema.nullable().default(null),
  initialServingTeam: InitialServingTeamSchema.default('unknown'),
  passQualityDefinitions: z.object({
    good: z.string().default('クイックを含めた複数攻撃を選択できる返球'),
    medium: z.string().default('サイド攻撃中心だが攻撃選択肢が残る返球'),
    bad: z.string().default('二段トス・高いトス・つなぎ中心になる返球'),
  }).default({
    good: 'クイックを含めた複数攻撃を選択できる返球',
    medium: 'サイド攻撃中心だが攻撃選択肢が残る返球',
    bad: '二段トス・高いトス・つなぎ中心になる返球',
  }),
  customAttackLabels: z.record(z.string()).default({}),
  attackNamePresets: z.record(z.string()).default({}),
  planPlayerRoles: z.array(z.object({ playerId: PlayerIdSchema, role: PlayerRoleSchema })).default([]),
  planPlayerNotes: z.array(z.object({ playerId: PlayerIdSchema, note: z.string() })).default([]),
  setterPlayerIds: z.array(PlayerIdSchema).max(2).default([]),
  liberoPlayerIds: z.array(PlayerIdSchema).max(2).default([]),
  rotations: RotationsSchema,
  opponentScout: z.object({
    weakReceivers: z.string().default(''),
    avoidPlayer: z.string().default(''),
    targetPlayer: z.string().default(''),
    opponentSetterState: OpponentSetterStateSchema.default('unknown'),
    weakBlockZone: z.string().default(''),
    strongAttackerNote: z.string().default(''),
    weakRotationNote: z.string().default(''),
    serveTacticNote: z.string().default(''),
    generalNote: z.string().default(''),
  }).default({ opponentSetterState: 'unknown' }),
  substitutionNote: z.string().default(''),
  privateNotes: z.string().default(''),
  notes: z.string().default(''),
})

export type StrategyPlanData = z.infer<typeof StrategyPlanDataSchema>
export type RotationStrategy = z.infer<typeof RotationStrategySchema>
export type ValidationIssue = z.infer<typeof ValidationIssueSchema>

export type StrategyValidationResult = {
  data: StrategyPlanData | null
  errors: ValidationIssue[]
  warnings: ValidationIssue[]
}

export const ROTATION_KEYS: RotationKey[] = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']

export function rotateStrategyForward(rotation: string[]): string[] {
  const next = [...rotation]
  const last = next.pop()
  if (last === undefined) return next
  next.unshift(last)
  return next
}

export function generateRotationsFromBase(baseRotation: string[], setterIds: string[] = []) {
  const rotations: Record<RotationKey, RotationStrategy> = {} as Record<RotationKey, RotationStrategy>
  let current = [...baseRotation]
  const singleSetter = setterIds.length === 1 ? setterIds[0] : undefined
  for (const key of ROTATION_KEYS) {
    const serverId = current[0]
    rotations[key] = RotationStrategySchema.parse({
      courtPlayerIds: current,
      setterId: singleSetter,
      servePhase: { serverId },
    })
    current = rotateStrategyForward(current)
  }
  return rotations
}

function normalizeAttackOptions(options: z.infer<typeof AttackOptionSchema>[]) {
  return [...options]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)
    .map((option, index) => ({ ...option, priority: (index + 1) as 1 | 2 | 3 }))
}

export function normalizeStrategyPlanData(data: StrategyPlanData): StrategyPlanData {
  const rotations = { ...data.rotations }
  for (const key of ROTATION_KEYS) {
    const rotation = rotations[key]
    rotations[key] = {
      ...rotation,
      receivePhase: {
        ...rotation.receivePhase,
        attackPlansByPassQuality: {
          good: normalizeAttackOptions(rotation.receivePhase.attackPlansByPassQuality.good),
          medium: normalizeAttackOptions(rotation.receivePhase.attackPlansByPassQuality.medium),
          bad: normalizeAttackOptions(rotation.receivePhase.attackPlansByPassQuality.bad),
        },
      },
    }
  }
  return { ...data, rotations }
}

function isBackRowSlot(slot: number) {
  return slot >= 0 && slot <= 2
}

function isFrontTakeoff(zone: string | undefined) {
  return zone?.startsWith('front_') ?? false
}

function isBackTakeoff(zone: string | undefined) {
  return zone?.startsWith('back_') ?? false
}

export function validateStrategyPlanData(input: unknown, status: StrategyStatus = 'draft'): StrategyValidationResult {
  const parsed = StrategyPlanDataSchema.safeParse(input)
  if (!parsed.success) {
    return {
      data: null,
      errors: parsed.error.issues.map((issue) => ({
        type: issue.code,
        message: `${issue.path.join('.')}: ${issue.message}`,
      })),
      warnings: [],
    }
  }

  const data = normalizeStrategyPlanData({ ...parsed.data, status })
  const errors: ValidationIssue[] = []
  const warnings: ValidationIssue[] = []
  const playerIds = new Set(data.planPlayerRoles.map((role) => role.playerId))
  const liberoIds = new Set(data.liberoPlayerIds)

  if (JSON.stringify(data.baseRotation) !== JSON.stringify(data.rotations.R1.courtPlayerIds)) {
    errors.push({ type: 'base_rotation_mismatch', message: 'R1.courtPlayerIds must match baseRotation.' })
  }

  if (!data.startingRotationKey) {
    warnings.push({ type: 'starting_rotation_missing', message: '開始ローテが未設定です。', visibility: 'editor_only' })
  }
  if (data.initialServingTeam === 'unknown') {
    warnings.push({ type: 'initial_serving_team_unknown', message: '開始サーブが未定です。', visibility: 'editor_only' })
  }

  for (const role of data.planPlayerRoles) {
    if (role.role === 'S' && !data.setterPlayerIds.includes(role.playerId)) {
      warnings.push({ type: 'setter_role_not_registered', message: 'S登録の選手がsetterPlayerIdsに含まれていません。', visibility: 'editor_only' })
    }
    if (role.role === 'L' && !data.liberoPlayerIds.includes(role.playerId)) {
      warnings.push({ type: 'libero_role_not_registered', message: 'L登録の選手がliberoPlayerIdsに含まれていません。', visibility: 'editor_only' })
    }
    if (data.liberoPlayerIds.includes(role.playerId) && role.role !== 'L') {
      warnings.push({ type: 'libero_role_mismatch', message: 'liberoPlayerIdsの選手がL以外のroleです。', visibility: 'editor_only' })
    }
  }

  for (const key of ROTATION_KEYS) {
    const rotation = data.rotations[key]
    const courtIds = new Set(rotation.courtPlayerIds)
    const setterId = rotation.setterId

    if (!setterId) {
      const issue = { type: 'setter_missing', message: `${key}: setterId が未設定です。`, visibility: 'editor_only' as const }
      if (status === 'finalized') errors.push(issue)
      else warnings.push(issue)
    } else {
      if (playerIds.size > 0 && !playerIds.has(setterId)) {
        errors.push({ type: 'setter_unknown', message: `${key}: setterId が登録選手に存在しません。` })
      }
      if (!courtIds.has(setterId)) {
        errors.push({ type: 'setter_not_on_court', message: `${key}: setterId がcourtPlayerIdsに含まれていません。` })
      }
    }

    for (const liberoId of data.liberoPlayerIds) {
      if (courtIds.has(liberoId)) {
        errors.push({ type: 'libero_on_court', message: `${key}: リベロはcourtPlayerIdsに含められません。` })
      }
    }

    const serverId = rotation.servePhase.serverId
    if (serverId && serverId !== rotation.courtPlayerIds[0]) {
      errors.push({ type: 'server_mismatch', message: `${key}: servePhase.serverId must match courtPlayerIds[0].` })
    }
    if (serverId && liberoIds.has(serverId)) {
      errors.push({ type: 'libero_server', message: `${key}: リベロはサーバーに設定できません。` })
    }

    const blockers = [
      rotation.defensePhase.blockPlan.mainBlockerId,
      ...rotation.defensePhase.blockPlan.assistBlockerIds,
    ].filter(Boolean) as string[]
    for (const blockerId of blockers) {
      if (liberoIds.has(blockerId)) {
        errors.push({ type: 'libero_blocker', message: `${key}: リベロはブロッカーに設定できません。` })
      }
    }

    const setterSlot = setterId ? rotation.courtPlayerIds.indexOf(setterId) : -1
    const attackGroups = rotation.receivePhase.attackPlansByPassQuality
    for (const options of [attackGroups.good, attackGroups.medium, attackGroups.bad]) {
      for (const option of options) {
        if (option.attackerId && liberoIds.has(option.attackerId)) {
          errors.push({ type: 'libero_attacker', message: `${key}: リベロは攻撃者に設定できません。` })
        }

        const attackerSlot = option.attackerId ? rotation.courtPlayerIds.indexOf(option.attackerId) : -1
        if (isBackRowSlot(attackerSlot) && isFrontTakeoff(option.attackTakeoffZone)) {
          errors.push({ type: 'back_row_front_takeoff', message: `${key}: 後衛選手はfront_*の踏切位置から攻撃できません。` })
        }
        if ((option.attackType === 'back_attack' || option.attackType === 'pipe') && (!isBackRowSlot(attackerSlot) || !isBackTakeoff(option.attackTakeoffZone))) {
          errors.push({ type: 'invalid_back_attack', message: `${key}: back_attack/pipeは後衛選手かつ3mライン後方の踏切位置のみ許可します。` })
        }
        if (option.attackType === 'setter_dump' && setterSlot >= 0) {
          if (isBackRowSlot(setterSlot) && isFrontTakeoff(option.attackTakeoffZone)) {
            errors.push({ type: 'back_row_setter_dump_front_takeoff', message: `${key}: 後衛セッターのfront_* setter_dumpは保存できません。` })
          } else if (isBackRowSlot(setterSlot) && isBackTakeoff(option.attackTakeoffZone)) {
            warnings.push({ type: 'back_row_setter_dump_risk', message: `${key}: 後衛セッターのsetter_dumpは攻撃完了リスクがあります。`, visibility: 'all' })
          }
        }
      }
    }
  }

  return { data, errors, warnings }
}

export function buildDefaultStrategyPlanData(params: {
  name: string
  opponentName?: string
  matchDate?: string
  setNumber?: 1 | 2 | 3 | 4 | 5 | null
  baseRotation: string[]
  players: Array<{ id: string; position: string | null; isLibero: boolean }>
  liberoPlayerIds?: string[]
}): StrategyPlanData {
  const setterPlayerIds = params.players.filter((p) => p.position === 'S').map((p) => p.id).slice(0, 2)
  const eligibleLiberoIds = params.players.filter((p) => p.isLibero || p.position === 'L').map((p) => p.id)
  const requestedLiberoIds = params.liberoPlayerIds ?? []
  const liberoPlayerIds = (requestedLiberoIds.length > 0
    ? requestedLiberoIds.filter((id) => eligibleLiberoIds.includes(id))
    : eligibleLiberoIds).slice(0, 2)
  const planPlayerRoles = params.players.map((p) => ({
    playerId: p.id,
    role: (p.isLibero ? 'L' : p.position ?? 'other') as z.infer<typeof PlayerRoleSchema>,
  }))
  return StrategyPlanDataSchema.parse({
    status: 'draft',
    name: params.name,
    opponentName: params.opponentName ?? '',
    matchDate: params.matchDate ?? '',
    setNumber: params.setNumber ?? null,
    baseRotation: params.baseRotation,
    setterPlayerIds,
    liberoPlayerIds,
    planPlayerRoles,
    rotations: generateRotationsFromBase(params.baseRotation, setterPlayerIds),
  })
}
