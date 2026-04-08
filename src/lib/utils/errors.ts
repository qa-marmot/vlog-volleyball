/**
 * Supabase / ネットワーク系の英語エラーメッセージを日本語に変換する
 */
const ERROR_MAP: [RegExp | string, string][] = [
  // 認証
  ['Invalid login credentials',             'メールアドレスまたはパスワードが違います'],
  ['Email not confirmed',                   'メールアドレスの確認が完了していません。届いた確認メールをクリックしてください'],
  ['User already registered',               'このメールアドレスはすでに登録されています'],
  [/Password should be at least (\d+)/,     'パスワードは$1文字以上で入力してください'],
  ['Email rate limit exceeded',             'メール送信の上限に達しました。しばらく時間をおいて再試行してください'],
  [/you can only request this after (\d+) second/, '再送信は$1秒後にお試しください'],
  ['Unable to validate email address',      'メールアドレスの形式が正しくありません'],
  ['Signup is disabled',                    '現在、新規登録は受け付けていません'],
  ['Invalid email or password',             'メールアドレスまたはパスワードが違います'],
  ['Token has expired',                     'セッションの有効期限が切れました。再ログインしてください'],
  ['JWT expired',                           'セッションの有効期限が切れました。再ログインしてください'],

  // DB（Postgres）
  [/duplicate key value violates unique constraint "(.+)"/,
                                            'すでに同じデータが登録されています'],
  ['violates foreign key constraint',       '関連するデータが見つかりません'],
  ['violates row-level security policy',    'この操作を行う権限がありません'],
  ['new row violates check constraint',     '入力値が許可された範囲外です'],
  ['null value in column',                  '必須項目が入力されていません'],
  ['permission denied',                     'この操作を行う権限がありません'],

  // ネットワーク
  ['Failed to fetch',                       'サーバーに接続できませんでした。通信状況を確認してください'],
  ['NetworkError',                          'ネットワークエラーが発生しました。通信状況を確認してください'],
  ['timeout',                               '接続がタイムアウトしました。再試行してください'],
]

export function toJapaneseError(message: string): string {
  for (const [pattern, japanese] of ERROR_MAP) {
    if (typeof pattern === 'string') {
      if (message.includes(pattern)) return japanese
    } else {
      const match = message.match(pattern)
      if (match) {
        return japanese.replace(/\$(\d+)/g, (_, n) => match[Number(n)] ?? '')
      }
    }
  }
  // マッチしない場合はデフォルトメッセージ
  return 'エラーが発生しました。時間をおいて再試行してください'
}
