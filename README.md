# V-Log — バレーボール分析スコアアプリ

> 最小限の入力で試合を記録し、詳細ログでチームを深く分析する。

---

## 目次

- [概要](#概要)
- [機能一覧](#機能一覧)
- [技術スタック](#技術スタック)
- [環境構築](#環境構築)
- [Supabase セットアップ](#supabase-セットアップ)
- [ローカル開発](#ローカル開発)
- [デプロイ（Vercel）](#デプロイvercel)
- [ディレクトリ構成](#ディレクトリ構成)

---

## 概要

V-Log はバレーボールの試合をスマートフォンで手軽に記録・分析するWebアプリです。

- **入力の負担を最小化**: 加点ボタン1タップで記録できる
- **グラデーションのある分析**: ログなしでも基本結果を表示。詳細ログを入力した試合はスタッツ・ローテーション分析・チャートまで提供
- **オフライン対応**: 体育館の通信環境が悪くても記録が止まらない（ローカル自動保存）
- **LINE共有**: 試合終了後、ワンタップでLINEに結果を送信

---

## 機能一覧

### Phase 1 — MVP
- メール+パスワード認証
- チーム作成・招待コード（6文字）によるメンバー招待
- 選手登録（背番号・名前・ポジション・リベロ指定）
- 試合作成（相手チーム名・日程・会場・スターティングメンバー設定）
- リアルタイム試合記録
  - 加点 / 減点（Undo対応）
  - ローテーション遷移
  - リベロ交代 / 復帰
  - タイムアウト記録
- Supabase への自動同期（未保存インジケーター表示）
- 試合結果ページ（セットスコア・勝敗）
- 公開共有URL（認証不要でアクセス可）
- LINE共有・URLコピー

### Phase 2 — 詳細ログ・スタッツ分析
- 詳細ログモード（ON/OFF 切り替え）
  - 得点種別選択（アタック / サーブ / ブロック / 相手ミス）
  - 得点選手の選択
- 詳細ログカバレッジが50%以上の試合で以下を表示:
  - 選手別得点ランキング（アタック・サーブ・ブロック内訳）
  - ローテーション別得失点グラフ

### Phase 3 — ビジュアライズ
- 点数推移チャート（Recharts）
  - セット区切りのリファレンスライン
  - 過去試合にも遡及適用

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 + shadcn/ui |
| 状態管理 | Zustand + persist（オフライン対応） |
| バックエンド | Supabase（Auth + PostgreSQL + RLS） |
| チャート | Recharts |
| デプロイ | Vercel |

---

## 環境構築

### 前提条件

| ツール | 推奨バージョン |
|---|---|
| Node.js | 20.x 以上 |
| npm | 10.x 以上 |
| Git | 最新版 |

### 1. リポジトリのクローン

```bash
git clone https://github.com/qa-marmot/vlog-volleyball.git
cd vlog-volleyball
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開き、Supabase の値を設定します（後述の [Supabase セットアップ](#supabase-セットアップ) を先に完了させてください）:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Supabase セットアップ

### 1. プロジェクト作成

1. [supabase.com](https://supabase.com) にアクセスしてアカウントを作成
2. 「New project」をクリック
3. プロジェクト名（例: `vlog-volleyball`）・データベースパスワード・リージョン（`Northeast Asia (Tokyo)` 推奨）を入力して作成

### 2. API キーの取得

1. プロジェクトのサイドバーから **Settings → API** を開く
2. 以下をコピーして `.env.local` に貼り付け:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** キー → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. データベースのセットアップ

1. サイドバーから **SQL Editor** を開く
2. `supabase/migrations/20240001_initial_schema.sql` の内容をコピー＆ペーストして **Run** を押す

これにより以下が作成されます:
- テーブル: `teams`, `team_members`, `players`, `matches`, `match_sets`, `points`, `rotation_snapshots`, `timeouts`
- RLS ポリシー（チームメンバー限定アクセス + share_uuid 経由の公開読み取り）
- インデックス

### 4. 認証プロバイダーの確認

1. サイドバーから **Authentication → Providers** を開く
2. **Email** が有効になっていることを確認（デフォルトで有効）

#### メール確認をスキップする場合（開発環境向け）

1. **Authentication → Email Templates** で確認メールの設定を確認
2. **Authentication → Settings** で「Confirm email」を OFF にすると、メール確認なしでログインできます（本番環境では推奨しません）

---

## ローカル開発

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。

### 主なコマンド

```bash
npm run dev      # 開発サーバー起動（Turbopack）
npm run build    # 本番ビルド
npm run start    # 本番サーバー起動
npx tsc --noEmit # 型チェック
```

### 開発時の確認フロー

1. `/register` でテストアカウントを作成
2. `/teams/new` でチームを作成
3. `/teams/[teamId]/players/new` で選手を6名以上登録（うち1名をリベロに指定）
4. `/matches/new` で試合を作成し、スターティングメンバーを設定
5. `/matches/[matchId]/record` で試合を記録
6. 試合終了後、`/matches/[matchId]/result` で分析を確認
7. 共有URLを別ブラウザ（未ログイン）で開いて動作確認

---

## デプロイ（Vercel）

### 1. Vercel アカウントの準備

[vercel.com](https://vercel.com) にアクセスしてアカウントを作成します（GitHub アカウントでのサインインが簡単です）。

### 2. プロジェクトのインポート

1. Vercel ダッシュボードで **Add New → Project** をクリック
2. `vlog-volleyball` リポジトリを選択して **Import**
3. フレームワークが **Next.js** と自動検出されることを確認

### 3. 環境変数の設定

**Configure Project** 画面の **Environment Variables** に以下を追加:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase の Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon public キー |

> **補足**: `NEXT_PUBLIC_` プレフィックスの変数はブラウザにも露出します。anon key はRLSで保護されているため公開しても問題ありません。

### 4. デプロイ

**Deploy** ボタンをクリック。ビルドが完了するとURLが発行されます。

### 5. Supabase の認証URLを更新

Vercel でデプロイ後、Supabase 側にドメインを登録する必要があります:

1. Supabase プロジェクトの **Authentication → URL Configuration** を開く
2. **Site URL** にデプロイされたURL（例: `https://vlog-volleyball.vercel.app`）を入力
3. **Redirect URLs** に同じURLを追加
4. **Save** をクリック

### 6. 本番での動作確認

- [ ] ログイン・新規登録
- [ ] チーム作成・招待コード参加
- [ ] 試合記録・Supabase同期
- [ ] `/share/[uuid]` を未ログインブラウザで開いて結果が表示される

---

## ディレクトリ構成

```
vlog-volleyball/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/          # ログインページ
│   │   │   └── register/       # 新規登録ページ
│   │   ├── dashboard/          # ダッシュボード（チーム一覧・試合履歴）
│   │   ├── teams/
│   │   │   ├── new/            # チーム作成
│   │   │   ├── join/           # 招待コードで参加
│   │   │   └── [teamId]/       # チーム詳細・選手管理
│   │   ├── matches/
│   │   │   ├── new/            # 試合作成
│   │   │   └── [matchId]/
│   │   │       ├── record/     # 試合記録画面（メイン）
│   │   │       └── result/     # 結果・分析（認証済み）
│   │   ├── share/
│   │   │   └── [uuid]/         # 公開共有ページ（認証不要）
│   │   └── api/auth/signout/   # サインアウト API
│   ├── components/
│   │   ├── ui/                 # shadcn/ui 基本コンポーネント
│   │   ├── match/              # 試合記録コンポーネント群
│   │   ├── result/             # 結果・分析コンポーネント群
│   │   └── charts/             # Recharts チャート
│   ├── lib/
│   │   ├── supabase/           # Supabase クライアント（client/server）
│   │   ├── store/              # Zustand ストア（オフライン対応）
│   │   └── utils/              # スタッツ計算・ローテーション管理
│   ├── types/                  # TypeScript 型定義
│   └── proxy.ts                # 認証プロキシ（Next.js 16）
├── supabase/
│   └── migrations/
│       └── 20240001_initial_schema.sql   # DB スキーマ・RLS・インデックス
└── .env.local.example          # 環境変数テンプレート
```
