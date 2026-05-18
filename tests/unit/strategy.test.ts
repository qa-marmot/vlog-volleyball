import { describe, expect, it } from 'vitest'
import {
  buildDefaultStrategyPlanData,
  generateRotationsFromBase,
  validateStrategyPlanData,
} from '@/lib/strategy/schema'
import {
  buildStrategySnapshot,
  generateShareSummaryText,
  projectStrategyForView,
} from '@/lib/strategy/share'

const players = [
  { id: 'p1', position: 'S', isLibero: false },
  { id: 'p2', position: 'OH', isLibero: false },
  { id: 'p3', position: 'MB', isLibero: false },
  { id: 'p4', position: 'OP', isLibero: false },
  { id: 'p5', position: 'OH', isLibero: false },
  { id: 'p6', position: 'MB', isLibero: false },
  { id: 'p7', position: 'L', isLibero: true },
]

const baseRotation = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']

function makePlan() {
  return buildDefaultStrategyPlanData({
    name: '第1セット用',
    baseRotation,
    players,
  })
}

describe('generateRotationsFromBase', () => {
  it('R1からR6まで時計回りのslot変換で生成する', () => {
    const rotations = generateRotationsFromBase(baseRotation, ['p1'])

    expect(rotations.R1.courtPlayerIds).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'])
    expect(rotations.R2.courtPlayerIds).toEqual(['p6', 'p1', 'p2', 'p3', 'p4', 'p5'])
    expect(rotations.R3.courtPlayerIds).toEqual(['p5', 'p6', 'p1', 'p2', 'p3', 'p4'])
    expect(rotations.R6.courtPlayerIds).toEqual(['p2', 'p3', 'p4', 'p5', 'p6', 'p1'])
  })

  it('R1からR2はRFがRBに入り、後衛と前衛が時計回りに進む', () => {
    const [rb, cb, lb, lf, cf, rf] = baseRotation
    const rotations = generateRotationsFromBase(baseRotation, ['p1'])

    expect(rotations.R2.courtPlayerIds).toEqual([rf, rb, cb, lb, lf, cf])
  })

  it('単一セッターなら全ローテにsetterIdを設定する', () => {
    const rotations = generateRotationsFromBase(baseRotation, ['p1'])

    expect(rotations.R1.setterId).toBe('p1')
    expect(rotations.R6.setterId).toBe('p1')
  })
})

describe('validateStrategyPlanData', () => {
  it('作戦作成時に選択したリベロを優先する', () => {
    const plan = buildDefaultStrategyPlanData({
      name: '第1セット用',
      baseRotation,
      players: [
        ...players,
        { id: 'p8', position: 'L', isLibero: true },
      ],
      liberoPlayerIds: ['p8'],
    })

    expect(plan.liberoPlayerIds).toEqual(['p8'])
  })

  it('draftでは開始ローテ未設定と開始サーブ未定をwarningにする', () => {
    const result = validateStrategyPlanData(makePlan(), 'draft')

    expect(result.errors).toHaveLength(0)
    expect(result.warnings.map((w) => w.type)).toContain('starting_rotation_missing')
    expect(result.warnings.map((w) => w.type)).toContain('initial_serving_team_unknown')
  })

  it('finalizedではsetterId未設定をerrorにする', () => {
    const plan = makePlan()
    plan.rotations.R1.setterId = undefined

    const result = validateStrategyPlanData({ ...plan, status: 'finalized' }, 'finalized')

    expect(result.errors.map((e) => e.type)).toContain('setter_missing')
  })

  it('R1.courtPlayerIdsがbaseRotationと異なる場合はerrorにする', () => {
    const plan = makePlan()
    plan.rotations.R1.courtPlayerIds = ['p2', 'p1', 'p3', 'p4', 'p5', 'p6']

    const result = validateStrategyPlanData(plan, 'draft')

    expect(result.errors.map((e) => e.type)).toContain('base_rotation_mismatch')
  })

  it('リベロがcourtPlayerIdsに含まれる場合はerrorにする', () => {
    const plan = makePlan()
    plan.rotations.R1.courtPlayerIds = ['p1', 'p2', 'p7', 'p4', 'p5', 'p6']

    const result = validateStrategyPlanData(plan, 'draft')

    expect(result.errors.map((e) => e.type)).toContain('base_rotation_mismatch')
    expect(result.errors.map((e) => e.type)).toContain('libero_on_court')
  })

  it('後衛選手のfront takeoffをerrorにする', () => {
    const plan = makePlan()
    plan.rotations.R1.receivePhase.attackPlansByPassQuality.good = [{
      priority: 1,
      attackType: 'parallel_left',
      attackerId: 'p1',
      attackTakeoffZone: 'front_left',
      notes: '',
    }]

    const result = validateStrategyPlanData(plan, 'draft')

    expect(result.errors.map((e) => e.type)).toContain('back_row_front_takeoff')
  })

  it('後衛セッターのsetter_dumpはback takeoffならwarningにする', () => {
    const plan = makePlan()
    plan.rotations.R1.receivePhase.attackPlansByPassQuality.good = [{
      priority: 1,
      attackType: 'setter_dump',
      attackerId: 'p1',
      attackTakeoffZone: 'back_right_behind_3m',
      notes: '',
    }]

    const result = validateStrategyPlanData(plan, 'draft')

    expect(result.errors.map((e) => e.type)).not.toContain('back_row_setter_dump_front_takeoff')
    expect(result.warnings.map((w) => w.type)).toContain('back_row_setter_dump_risk')
  })

  it('攻撃優先順位をpriority昇順へ正規化する', () => {
    const plan = makePlan()
    plan.rotations.R1.receivePhase.attackPlansByPassQuality.good = [
      { priority: 3, attackType: 'out_of_system', notes: '' },
      { priority: 1, attackType: 'quick_a', notes: '' },
    ]

    const result = validateStrategyPlanData(plan, 'draft')

    expect(result.data?.rotations.R1.receivePhase.attackPlansByPassQuality.good.map((o) => o.attackType))
      .toEqual(['quick_a', 'out_of_system'])
    expect(result.data?.rotations.R1.receivePhase.attackPlansByPassQuality.good.map((o) => o.priority))
      .toEqual([1, 2])
  })
})

describe('strategy share projection', () => {
  it('player viewにはprivateNotesとopponentScoutを含めない', () => {
    const plan = makePlan()
    plan.privateNotes = 'コーチ専用'
    plan.opponentScout.generalNote = '相手分析'

    const projected = projectStrategyForView({
      data: plan,
      scope: 'player',
      includeOpponentScout: true,
    })

    expect(projected.opponentScout).toBeNull()
    expect(JSON.stringify(projected)).not.toContain('コーチ専用')
    expect(JSON.stringify(projected)).not.toContain('相手分析')
  })

  it('snapshotにはrotationsとautoSummaryを含め、privateNotesは含めない', () => {
    const plan = makePlan()
    plan.privateNotes = '共有しない'

    const snapshot = buildStrategySnapshot(plan)

    expect(snapshot.rotations.R1.courtPlayerIds).toEqual(baseRotation)
    expect(snapshot.autoSummaries.R1).toContain('R1')
    expect(JSON.stringify(snapshot)).not.toContain('共有しない')
  })

  it('shareSummaryTextにはkeyPointとavoidNoteとURLを含める', () => {
    const plan = makePlan()
    plan.rotations.R1.keyPoint = 'Aパス時はMB優先'
    plan.rotations.R1.avoidNote = 'Cパスで無理にクイックを使わない'

    const summary = generateShareSummaryText(plan, 'https://example.com/share/strategy/token')

    expect(summary).toContain('Aパス時はMB優先')
    expect(summary).toContain('Cパスで無理にクイックを使わない')
    expect(summary).toContain('https://example.com/share/strategy/token')
  })
})
