import { describe, it, expect } from 'vitest'
import { toJapaneseError } from '@/lib/utils/errors'

describe('toJapaneseError', () => {
  // 認証エラー
  it('Invalid login credentials を変換する', () => {
    expect(toJapaneseError('Invalid login credentials')).toBe(
      'メールアドレスまたはパスワードが違います'
    )
  })

  it('User already registered を変換する', () => {
    expect(toJapaneseError('User already registered')).toBe(
      'このメールアドレスはすでに登録されています'
    )
  })

  it('Email not confirmed を変換する', () => {
    expect(toJapaneseError('Email not confirmed')).toBe(
      'メールアドレスの確認が完了していません。届いた確認メールをクリックしてください'
    )
  })

  it('Password should be at least N — 数字を抽出して変換する', () => {
    expect(toJapaneseError('Password should be at least 8 characters')).toBe(
      'パスワードは8文字以上で入力してください'
    )
    expect(toJapaneseError('Password should be at least 12 characters')).toBe(
      'パスワードは12文字以上で入力してください'
    )
  })

  it('JWT expired を変換する', () => {
    expect(toJapaneseError('JWT expired')).toBe(
      'セッションの有効期限が切れました。再ログインしてください'
    )
  })

  it('Token has expired を変換する', () => {
    expect(toJapaneseError('Token has expired')).toBe(
      'セッションの有効期限が切れました。再ログインしてください'
    )
  })

  it('Email rate limit exceeded を変換する', () => {
    expect(toJapaneseError('Email rate limit exceeded')).toBe(
      'メール送信の上限に達しました。しばらく時間をおいて再試行してください'
    )
  })

  it('Signup is disabled を変換する', () => {
    expect(toJapaneseError('Signup is disabled')).toBe(
      '現在、新規登録は受け付けていません'
    )
  })

  // DB エラー
  it('duplicate key value を変換する', () => {
    const msg = 'duplicate key value violates unique constraint "users_email_unique"'
    expect(toJapaneseError(msg)).toBe('すでに同じデータが登録されています')
  })

  it('violates foreign key constraint を変換する', () => {
    expect(toJapaneseError('violates foreign key constraint')).toBe(
      '関連するデータが見つかりません'
    )
  })

  it('violates row-level security policy を変換する', () => {
    expect(toJapaneseError('violates row-level security policy')).toBe(
      'この操作を行う権限がありません'
    )
  })

  it('permission denied を変換する', () => {
    expect(toJapaneseError('permission denied')).toBe(
      'この操作を行う権限がありません'
    )
  })

  it('null value in column を変換する', () => {
    expect(toJapaneseError('null value in column')).toBe(
      '必須項目が入力されていません'
    )
  })

  // ネットワークエラー
  it('Failed to fetch を変換する', () => {
    expect(toJapaneseError('Failed to fetch')).toBe(
      'サーバーに接続できませんでした。通信状況を確認してください'
    )
  })

  it('NetworkError を変換する', () => {
    expect(toJapaneseError('NetworkError when attempting to fetch resource')).toBe(
      'ネットワークエラーが発生しました。通信状況を確認してください'
    )
  })

  it('timeout を変換する', () => {
    expect(toJapaneseError('connection timeout')).toBe(
      '接続がタイムアウトしました。再試行してください'
    )
  })

  // 未知のエラー
  it('マッチしない場合はデフォルトメッセージを返す', () => {
    expect(toJapaneseError('some unknown error xyz')).toBe(
      'エラーが発生しました。時間をおいて再試行してください'
    )
  })

  it('空文字列はデフォルトメッセージを返す', () => {
    expect(toJapaneseError('')).toBe(
      'エラーが発生しました。時間をおいて再試行してください'
    )
  })

  // 部分一致
  it('文字列の一部に含まれていればマッチする', () => {
    expect(
      toJapaneseError('Error: Invalid login credentials at index 0')
    ).toBe('メールアドレスまたはパスワードが違います')
  })
})
