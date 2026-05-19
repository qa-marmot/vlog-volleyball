import { z } from 'zod'
import {
  ROTATION_KEYS,
  type RotationKey,
  type RotationStrategy,
  type StrategyPlanData,
  type ValidationIssue,
} from './schema'

export const StrategyViewScopeSchema = z.enum(['full', 'player', 'print', 'summary'])
export type StrategyViewScope = z.infer<typeof StrategyViewScopeSchema>

export const StrategyShareLinkInputSchema = z.object({
  viewScope: StrategyViewScopeSchema,
  password: z.string().min(4).optional(),
  expiresAt: z.string().optional().nullable(),
  allowDownload: z.boolean().default(false),
  includeOpponentScout: z.boolean().default(false),
})

export type StrategyShareLinkInput = z.infer<typeof StrategyShareLinkInputSchema>

const attackLabelFallback: Record<string, string> = {
  quick_a: 'Aクイック',
  quick_b: 'Bクイック',
  quick_c: 'Cクイック',
  quick_d: 'Dクイック',
  parallel_left: 'レフト平行',
  parallel_right: 'ライト平行',
  back_attack: 'バックアタック',
  pipe: 'パイプ',
  broad: 'ブロード',
  combination: 'コンビ',
  setter_dump: 'セッターダンプ',
  second_ball: '二段',
  out_of_system: '崩れた時',
}

function optionLabel(data: StrategyPlanData, option?: { displayName?: string; attackType: string }) {
  if (!option) return '未設定'
  return option.displayName
    || data.attackNamePresets[option.attackType]
    || data.customAttackLabels[option.attackType]
    || attackLabelFallback[option.attackType]
    || option.attackType
}

function setterState(rotation: RotationStrategy) {
  if (!rotation.setterId) return 'S未設定'
  const slot = rotation.courtPlayerIds.indexOf(rotation.setterId)
  if (slot >= 3) return 'S前衛'
  if (slot >= 0) return 'S後衛'
  return 'S不在'
}

function serveTargetLabel(rotation: RotationStrategy) {
  const target = rotation.servePhase.serveTarget
  if (target.playerLabel) return target.playerLabel
  if (target.zone) return target.zone
  return target.targetType
}

function attackOptionView(data: StrategyPlanData, option: RotationStrategy['receivePhase']['attackPlansByPassQuality']['good'][number]) {
  return {
    priority: option.priority,
    label: optionLabel(data, option),
    attackerId: option.attackerId ?? '',
    attackType: option.attackType,
    attackTakeoffZone: option.attackTakeoffZone ?? '',
    attackTargetZone: option.attackTargetZone ?? '',
    tempo: option.tempo ?? '',
    intent: option.intent ?? '',
    notes: option.notes,
  }
}

export function generateRotationSummary(data: StrategyPlanData, key: RotationKey) {
  const rotation = data.rotations[key]
  const attacks = rotation.receivePhase.attackPlansByPassQuality
  const aFirst = optionLabel(data, attacks.good[0])
  const bFirst = optionLabel(data, attacks.medium[0])
  const cFirst = optionLabel(data, attacks.bad[0])
  const block = rotation.defensePhase.blockPlan
  const blockText = [block.blockSystem, block.blockFocus].filter(Boolean).join(' / ') || '未設定'
  const serve = serveTargetLabel(rotation)
  const keyPoint = rotation.keyPoint ? `最重要: ${rotation.keyPoint}` : ''
  const avoid = rotation.avoidNote ? `NG: ${rotation.avoidNote}` : ''
  return `${key}: ${setterState(rotation)}。Aパス1stは${aFirst}、Bパス1stは${bFirst}、Cパス1stは${cFirst}。サーブ狙いは${serve}。ブロックは${blockText}。${[keyPoint, avoid].filter(Boolean).join(' ')}`
}

export function generateShareSummaryText(data: StrategyPlanData, shareUrl: string) {
  const lines = [
    data.name,
    data.opponentName ? `対戦相手: ${data.opponentName}` : '',
    data.setNumber ? `第${data.setNumber}セット` : '',
    ...ROTATION_KEYS.map((key) => {
      const rotation = data.rotations[key]
      return `${key}: ${[rotation.keyPoint, rotation.avoidNote ? `NG ${rotation.avoidNote}` : ''].filter(Boolean).join(' / ') || '未設定'}`
    }),
    shareUrl,
  ]
  return lines.filter(Boolean).join('\n')
}

function warningsForScope(warnings: ValidationIssue[], scope: StrategyViewScope) {
  return warnings.filter((warning) => {
    if (!warning.visibility) return scope === 'full'
    if (warning.visibility === 'all') return true
    if (scope === 'print' && warning.visibility === 'print') return true
    if (scope === 'player' && warning.visibility === 'player') return true
    return scope === 'full' && warning.visibility === 'editor_only'
  })
}

export function projectStrategyForView(params: {
  data: StrategyPlanData
  scope: StrategyViewScope
  warnings?: ValidationIssue[]
  includeOpponentScout?: boolean
}) {
  const { data, scope, includeOpponentScout = false } = params
  const warnings = warningsForScope(params.warnings ?? [], scope)
  const rotations = ROTATION_KEYS.map((key) => {
    const rotation = data.rotations[key]
    return {
      key,
      courtPlayerIds: rotation.courtPlayerIds,
      setterId: rotation.setterId,
      liberoReplacement: rotation.liberoReplacement,
      primaryFocusPhase: rotation.primaryFocusPhase,
      keyPoint: rotation.keyPoint,
      avoidNote: rotation.avoidNote,
      summaryNote: rotation.summaryNote,
      autoSummary: generateRotationSummary(data, key),
      receiveFirstOptions: {
        good: optionLabel(data, rotation.receivePhase.attackPlansByPassQuality.good[0]),
        medium: optionLabel(data, rotation.receivePhase.attackPlansByPassQuality.medium[0]),
        bad: optionLabel(data, rotation.receivePhase.attackPlansByPassQuality.bad[0]),
      },
      receiveAttackOptions: {
        good: scope === 'summary' ? [] : rotation.receivePhase.attackPlansByPassQuality.good.map((option) => attackOptionView(data, option)),
        medium: scope === 'summary' ? [] : rotation.receivePhase.attackPlansByPassQuality.medium.map((option) => attackOptionView(data, option)),
        bad: scope === 'summary' ? [] : rotation.receivePhase.attackPlansByPassQuality.bad.map((option) => attackOptionView(data, option)),
      },
      serveTarget: rotation.servePhase.serveTarget,
      blockPlan: rotation.defensePhase.blockPlan,
      floorDefensePlan: scope === 'summary' ? undefined : rotation.defensePhase.floorDefensePlan,
      coverPlan: scope === 'summary' ? undefined : rotation.defensePhase.coverPlan,
      notes: scope === 'full' || scope === 'print' ? rotation.notes : '',
    }
  })

  return {
    name: data.name,
    opponentName: data.opponentName,
    matchDate: data.matchDate,
    setNumber: data.setNumber,
    systemType: data.systemType,
    startingRotationKey: data.startingRotationKey,
    initialServingTeam: data.initialServingTeam,
    passQualityDefinitions: data.passQualityDefinitions,
    rotations,
    opponentScout: includeOpponentScout && scope === 'full' ? data.opponentScout : null,
    notes: scope === 'full' || scope === 'print' ? data.notes : '',
    warnings,
  }
}

export function buildStrategySnapshot(data: StrategyPlanData) {
  return {
    baseRotation: data.baseRotation,
    startingRotationKey: data.startingRotationKey,
    initialServingTeam: data.initialServingTeam,
    rotations: data.rotations,
    passQualityDefinitions: data.passQualityDefinitions,
    customAttackLabels: data.customAttackLabels,
    planPlayerRoles: data.planPlayerRoles,
    setterPlayerIds: data.setterPlayerIds,
    liberoPlayerIds: data.liberoPlayerIds,
    opponentScout: data.opponentScout,
    notes: data.notes,
    autoSummaries: Object.fromEntries(ROTATION_KEYS.map((key) => [key, generateRotationSummary(data, key)])),
  }
}
