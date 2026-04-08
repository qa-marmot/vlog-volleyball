import { describe, it, expect } from 'vitest'
import {
  rotateForward,
  getCurrentServerIndex,
  getRotationLabel,
  generateInviteCode,
} from '@/lib/utils/rotation'

describe('rotateForward', () => {
  it('6人ローテーションで末尾が先頭に移動する', () => {
    const rotation = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
    const result = rotateForward(rotation)
    expect(result).toEqual(['p6', 'p1', 'p2', 'p3', 'p4', 'p5'])
  })

  it('元の配列を変更しない（immutable）', () => {
    const rotation = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
    rotateForward(rotation)
    expect(rotation[0]).toBe('p1')
  })

  it('6回ローテーションすると元に戻る', () => {
    const original = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
    let r = original
    for (let i = 0; i < 6; i++) r = rotateForward(r)
    expect(r).toEqual(original)
  })

  it('1人の場合はそのまま返す', () => {
    expect(rotateForward(['p1'])).toEqual(['p1'])
  })

  it('2人の場合は入れ替わる', () => {
    expect(rotateForward(['a', 'b'])).toEqual(['b', 'a'])
  })
})

describe('getCurrentServerIndex', () => {
  it('常に 0 を返す', () => {
    expect(getCurrentServerIndex(['p1', 'p2', 'p3', 'p4', 'p5', 'p6'])).toBe(0)
    expect(getCurrentServerIndex(['p6', 'p1', 'p2'])).toBe(0)
    expect(getCurrentServerIndex([])).toBe(0)
  })
})

describe('getRotationLabel', () => {
  it('0〜5 を R1〜R6 に変換する', () => {
    expect(getRotationLabel(0)).toBe('R1')
    expect(getRotationLabel(1)).toBe('R2')
    expect(getRotationLabel(5)).toBe('R6')
  })

  it('範囲外は R(n+1) 形式にフォールバック', () => {
    expect(getRotationLabel(6)).toBe('R7')
    expect(getRotationLabel(10)).toBe('R11')
  })
})

describe('generateInviteCode', () => {
  it('デフォルト長 6 のコードを生成する', () => {
    const code = generateInviteCode()
    expect(code).toHaveLength(6)
  })

  it('任意の長さで生成できる', () => {
    expect(generateInviteCode(4)).toHaveLength(4)
    expect(generateInviteCode(8)).toHaveLength(8)
  })

  it('大文字英数字のみで構成される', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateInviteCode()
      expect(code).toMatch(/^[A-Z2-9]+$/)
    }
  })

  it('紛らわしい文字（O, I, 0, 1）を含まない', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode()
      expect(code).not.toMatch(/[O I 0 1]/)
    }
  })

  it('呼び出すたびに異なるコードを生成する（確率的テスト）', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})
