# V-Log — バレーボール分析スコアアプリ

> 最小限の入力で試合を記録し、詳細ログでチームを深く分析する。

---

## 目次

- [概要](#概要)
- [機能一覧](#機能一覧)
- [技術スタック](#技術スタック)
- [環境構築](#環境構築)
- [Cloudflare D1 セットアップ](#cloudflare-d1-セットアップ)
- [ローカル開発](#ローカル開発)
- [デプロイ（Cloudflare Pages）](#デプロイcloudflare-pages)
- [ディレクトリ構成](#ディレクトリ構成)

---

## 概要

V-Log はバレーボールの試合をスマートフォンで手軽に記録・分析するWebアプリです。

- **入力の負担を最小化**: 加点ボタン1タップで記録できる
- **グラデーションのある分析**: ログなしでも基本結果を表示。詳細ログを入力した試合はスタッツ・ローテーション分析・チャートまで提供
- **オフライン対応**: 体育館の通信環境が悪くても記録が止まらない（Zustand + localStorageで自動保存）
- **LINE共有**: 試合終了後、ワンタップでLINEに結果を送信
- **高速なレスポンス**: Cloudflare エッジで動作し、TTFB 30〜60ms を実現

---

## 機能一覧

### Phase 1 — MVP
- メール+パスワード認証（カスタムセッション）
- チーム作成・招待コード（6文字）によるメンバー招待
- 選手登録（背番号・名前・ポジション・リベロ指定）
- 試合作成（相手チーム名・日程・会場）
- スタメン選択（ローテーション順に6名指定）
- リアルタイム試合記録
  - 加点 / Undo 対応
  - ローテーション遷移
  - リベロ交代 / 復帰
  - タイムアウト記録
- Cloudflare D1 への自動同期（30秒ごと + 手動保存ボタン）
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

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Astro 5 (SSR) + `@astrojs/cloudflare` |
| API | Hono（Astro catch-all API route） |
| DB | Cloudflare D1（SQLite エッジDB） |
| ORM | Drizzle ORM |
| 認証 | カスタムセッション + bcryptjs |
| スタイリング | Tailwind CSS v4 + shadcn/ui |
| 状態管理 | Zustand + persist（オフライン対応） |
| チャート | Recharts |
| デプロイ | Cloudflare Pages |

---

## 環境構築

### 前提条件

| ツール | 推奨バージョン |
|---|---|
| Node.js | 20.x 以上 |
| npm | 10.x 以上 |
| Wrangler CLI | `npm install -g wrangler` |

### 1. リポジトリのクローン

```bash
git clone https://github.com/qa-marmot/vlog-volleyball.git
cd vlog-volleyball
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. Cloudflare へのログイン

```bash
wrangler login
```

---

## Cloudflare D1 セットアップ

### 1. D1 データベースの作成

```bash
wrangler d1 create vlog-volleyball
```

出力に含まれる `database_id` をコピーし、`wrangler.toml` の `database_id` に貼り付けます:

```toml
[[d1_databases]]
binding = "DB"
database_name = "vlog-volleyball"
database_id = "ここに貼り付け"
```

### 2. マイグレーションの生成と適用

```bash
# Drizzle からマイグレーション SQL を生成
npm run db:generate

# ローカルの D1 に適用（開発用）
npm run db:migrate:local

# 本番の D1 に適用
npm run db:migrate:remote
```

---

## ローカル開発

```bash
npm run dev
```

Wrangler が D1 をエミュレートしながら起動します。ブラウザで [http://localhost:8788](http://localhost:8788) を開きます。

### 主なコマンド

```bash
npm run dev               # 開発サーバー起動（Wrangler + Astro）
npm run build             # 本番ビルド
npm run preview           # ビルド成果物をローカルでプレビュー
npm run db:generate       # Drizzle マイグレーション SQL 生成
npm run db:migrate:local  # ローカル D1 にマイグレーション適用
npm run db:migrate:remote # 本番 D1 にマイグレーション適用
```

### 開発時の確認フロー

1. `/register` でテストアカウントを作成
2. `/teams/new` でチームを作成
3. `/teams/[teamId]/players/new` で選手を6名以上登録（うち1名をリベロに指定）
4. `/matches/new` で試合を作成
5. `/matches/[matchId]/record` でスタメンを選択して試合を記録
6. 試合終了後、`/matches/[matchId]/result` で分析を確認
7. 共有URLを別ブラウザ（未ログイン）で開いて動作確認

---

## デプロイ（Cloudflare Pages）

### 1. ビルド

```bash
npm run build
```

### 2. Pages へデプロイ

```bash
wrangler pages deploy dist/
```

または Cloudflare ダッシュボードで GitHub リポジトリを連携すると自動デプロイが設定できます。

**Cloudflare Pages ビルド設定:**

| 項目 | 値 |
|---|---|
| ビルドコマンド | `npm run build` |
| ビルド出力ディレクトリ | `dist/` |
| Node.js バージョン | 20.x |

### 3. D1 バインディングの設定

Cloudflare Pages の設定画面（Settings → Functions → D1 database bindings）で:
- 変数名: `DB`
- D1 データベース: `vlog-volleyball`（手順1で作成したもの）

### 4. 本番での動作確認

- [ ] ログイン・新規登録
- [ ] チーム作成・招待コード参加
- [ ] 試合記録・D1同期
- [ ] `/share/[uuid]` を未ログインブラウザで開いて結果が表示される

---

## ディレクトリ構成

```
vlog-volleyball/
├── src/
│   ├── pages/
│   │   ├── index.astro              # / → リダイレクト
│   │   ├── login.astro
│   │   ├── register.astro
│   │   ├── dashboard.astro
│   │   ├── teams/
│   │   │   ├── new.astro            # チーム作成
│   │   │   ├── join.astro           # 招待コードで参加
│   │   │   └── [teamId]/
│   │   │       ├── index.astro      # チーム詳細・選手管理
│   │   │       └── players/new.astro
│   │   ├── matches/
│   │   │   ├── new.astro            # 試合作成
│   │   │   └── [matchId]/
│   │   │       ├── record.astro     # リアルタイム記録（React island）
│   │   │       └── result.astro     # 結果・分析
│   │   ├── share/
│   │   │   └── [uuid].astro         # 公開共有（認証不要）
│   │   └── api/
│   │       └── [...path].ts         # Hono catch-all
│   ├── components/
│   │   ├── ui/                      # shadcn/ui 基本コンポーネント
│   │   ├── match/                   # 試合記録 React islands
│   │   ├── result/                  # 結果・分析 React islands
│   │   └── charts/                  # Recharts チャート
│   ├── layouts/
│   │   └── Base.astro               # HTML ベースレイアウト
│   ├── lib/
│   │   ├── auth.ts                  # セッション管理（bcryptjs）
│   │   ├── db.ts                    # Drizzle + D1 クライアント
│   │   ├── hono.ts                  # Hono アプリ定義
│   │   ├── routes/                  # Hono API ルート
│   │   ├── store/                   # Zustand ストア（オフライン対応）
│   │   └── utils/                   # スタッツ計算・ローテーション管理
│   ├── schema/
│   │   └── index.ts                 # Drizzle スキーマ定義
│   ├── types/
│   │   └── index.ts                 # TypeScript 型定義
│   ├── env.d.ts                     # Cloudflare 型定義
│   └── middleware.ts                # 認証ガード
├── drizzle/
│   └── migrations/                  # 自動生成されるマイグレーション SQL
├── astro.config.mjs
├── drizzle.config.ts
├── wrangler.toml                    # D1 バインディング設定
└── tsconfig.json
```
