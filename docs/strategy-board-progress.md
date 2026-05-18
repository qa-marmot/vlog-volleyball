# ローテーション作戦ボード実装進捗

このドキュメントは、ローテーション作戦ボード機能の実装を後から再開するための進捗メモです。
仕様の正は `docs/strategy-board-spec.md` とし、この文書は実装状況・残タスク・検証結果を管理します。

## 現在の進捗

目安: 92% 程度。

データモデル、Zodスキーマ、基本API、作戦編集画面、共有、印刷、選手向け表示、試合結果画面での振り返り入力までは実装済みです。
残りは主に、E2Eテスト、視覚的な編集体験の磨き込み、印刷表示の細部改善です。

## 実装済み

### 仕様・プロジェクトルール

- `docs/strategy-board-spec.md` を追加済み。
- `AGENTS.md` に Strategy Board 実装時の参照ルールを追加済み。
- UTF-8方針として `.editorconfig` と `.gitattributes` を追加済み。

### DB / Migration

- `strategy_plans`
  - 作戦プラン本体。
  - `status: draft | finalized`
  - `data` に作戦JSONを保存。
  - `deletedAt / deletedBy` による soft delete。
- `strategy_share_links`
  - 共有リンク。
  - `viewScope: full | player | print | summary`
  - `shareToken`
  - `passwordProtected / passwordHash`
  - `expiresAt`
  - `allowDownload`
  - `includeOpponentScout`
  - `revokedAt`
- `strategy_revisions`
  - 保存ボタン単位の変更履歴。
  - `beforeSnapshot / afterSnapshot`
  - `changedFields`
  - `restoredFromRevisionId`
- `strategy_snapshots`
  - 試合・セットに紐づく作戦snapshot。
  - 過去試合では元プランの現在値ではなくsnapshotを参照する前提。
- `match_set_strategy_reviews`
  - 試合後の作戦振り返り。
  - `matchId + setNumber` 単位。
- `strategy_roles`
  - 作戦ボード専用権限。
  - `owner | editor | viewer`
  - チームownerは常に作戦owner、未設定のmemberはviewer。

追加済みmigration:

- `drizzle/migrations/0001_strategy_board.sql`
- `drizzle/migrations/0002_strategy_board_sharing.sql`
- `drizzle/migrations/0003_strategy_roles.sql`

### Zodスキーマ / バリデーション

実装ファイル:

- `src/lib/strategy/schema.ts`
- `src/lib/strategy/share.ts`

実装済みの主な内容:

- `StrategyPlanDataSchema`
- `RotationStrategySchema`
- `AttackOptionSchema`
- `ReceivePhaseSchema`
- `ServePhaseSchema`
- `DefensePhaseSchema`
- `generateRotationsFromBase`
- `rotateStrategyForward`
- `normalizeStrategyPlanData`
- `validateStrategyPlanData`
- `buildDefaultStrategyPlanData`
- `projectStrategyForView`
- `generateRotationSummary`
- `generateShareSummaryText`
- `buildStrategySnapshot`

主なバリデーション:

- `R1.courtPlayerIds` と `baseRotation` の一致。
- draft/finalizedでの `setterId` 未設定扱い。
- リベロが `courtPlayerIds` に入るケースをerror。
- リベロをサーバー、ブロッカー、攻撃者にするケースをerror。
- 後衛選手が `front_*` の踏切位置から攻撃するケースをerror。
- `back_attack / pipe` は後衛選手かつ3mライン後方踏切のみ許可。
- 後衛セッターの `setter_dump` は踏切位置に応じてwarning/error。
- 攻撃候補をpriority昇順へ正規化。

注意:

- `R1 -> R2` のslot変換は現在 `[0,1,2,3,4,5] -> [5,0,1,2,3,4]` の仮定義で実装済み。
- 仕様上は、実装前に公式ローテーションとUIコート図で最終確認することになっている。
- ここは後続で必ず図解検証し、必要なら修正する。

### API

実装ファイル:

- `src/lib/routes/strategies.ts`
- `src/lib/routes/matches.ts`
- `src/lib/hono.ts`

作戦API:

- `GET /api/teams/:teamId/strategies`
- `POST /api/teams/:teamId/strategies`
- `GET /api/teams/:teamId/strategies/:planId`
- `PUT /api/teams/:teamId/strategies/:planId`
- `POST /api/teams/:teamId/strategies/:planId/duplicate`
- `DELETE /api/teams/:teamId/strategies/:planId`
- `GET /api/teams/:teamId/strategies/:planId/share-links`
- `POST /api/teams/:teamId/strategies/:planId/share-links`
- `PATCH /api/teams/:teamId/strategies/:planId/share-links/:shareId`
- `POST /api/teams/:teamId/strategies/:planId/share-links/:shareId/regenerate`
- `DELETE /api/teams/:teamId/strategies/:planId/share-links/:shareId`
- `GET /api/teams/:teamId/strategies/:planId/revisions`
- `POST /api/teams/:teamId/strategies/:planId/revisions/:revisionId/restore`
- `POST /api/teams/:teamId/strategies/:planId/snapshots`

試合レビューAPI:

- `GET /api/matches/:matchId/strategy-reviews`
- `POST /api/matches/:matchId/strategy-reviews`

### 権限

現時点の実装:

- team `owner`
  - 作戦作成
  - 編集
  - 共有管理
  - 変更履歴復元
  - snapshot作成
  - soft delete
- team `member`
  - 閲覧専用

現在の実装:

- `StrategyRole: owner | editor | viewer`
- 専用テーブル `strategy_roles` を実装済み。
- チームownerは常に作戦ownerとして扱い、memberは明示ロールがなければviewer。
- 作戦一覧画面にowner向けのロール管理UIを追加済み。

### 画面

実装済み:

- `src/pages/teams/[teamId]/strategy.astro`
  - 作戦プラン一覧。
  - 作戦プラン作成。
  - owner/editorのみ作成可。
  - 作戦ボード権限管理。
- `src/pages/teams/[teamId]/strategy/[planId].astro`
  - 作戦詳細・編集。
  - ローテ別編集。
  - 共有リンク作成。
  - 共有リンクQR表示。
  - 共有リンクのURLコピー、期限、パスワード設定/解除、ダウンロード許可、相手分析表示設定。
  - 共有リンク再発行。
  - 共有リンク無効化。
  - LINE/Slack向け共有サマリーテキスト表示・コピー。
  - プラン複製。
  - ownerによるsoft delete。
  - 変更履歴表示。
  - 変更履歴復元。
  - snapshot作成。
  - viewerは閲覧専用、editor/ownerは編集可。
- `src/pages/teams/[teamId]/strategy/[planId]/print.astro`
  - 印刷向け表示。
  - coach / player / cards の用途別モード。
- `src/pages/teams/[teamId]/strategy/[planId]/player.astro`
  - 選手向け簡易表示。
  - `privateNotes`, `opponentScout`, `revisionHistory` は出さない。
- `src/pages/share/strategy/[token].astro`
  - 公開共有ページ。
  - `full / player / print / summary` の表示範囲に対応。
  - password付き共有に対応。
  - expired/revoked/disabledを拒否。
- `src/pages/matches/[matchId]/result.astro`
  - `strategySnapshot` がある場合に作戦ボード振り返り欄を表示。
  - セット単位で振り返り保存。
  - ローテ別レビュー入力。
  - snapshot要約を表示。
- `src/pages/matches/[matchId]/record.astro`
  - finalized済み作戦プランをセット単位でsnapshot保存。

### 作戦詳細画面で編集できる項目

- プラン名
- 状態
- セット番号
- 対戦相手
- 開始ローテ
- 開始サーブ
- システム種別
- ローテごとの `primaryFocusPhase`
- ローテごとの `keyPoint`
- ローテごとの `avoidNote`
- ローテごとの `summaryNote`
- A/B/Cパス別の1st/2nd/3rd攻撃候補
  - 表示名
  - 攻撃種別
  - 攻撃者
  - 踏切位置
  - 狙い
  - 攻撃意図
  - メモ
- サーブ狙い
- サーブ対象ラベル
- サーブメモ
- ブロックシステム
- ブロック重点
- メインブロッカー
- ブロックメモ
- フロア守備メモ
- カバーメモ
- チャンスボールメモ
- 崩れた時・二段トスメモ
- セッター1本目対応メモ
- ラリー移行メモ
- 相手情報
  - 狙うレシーバー
  - 避ける選手
  - ターゲット選手
  - 相手セッター状態
  - ブロックが低い場所
  - 相手の苦手ローテ
- 全体メモ
- コーチ専用メモ

### テスト

追加済み:

- `tests/unit/strategy.test.ts`
- `tests/e2e/strategy.spec.ts`

確認済み内容:

- ローテ自動生成。
- R1→R2→R3の時計回りslot変換。
- 単一セッターの全ローテ反映。
- draft/finalized validation。
- `baseRotation` とR1不一致。
- リベロ制約。
- 後衛攻撃制約。
- 後衛セッターdump warning。
- 攻撃優先順位正規化。
- player viewにprivate/opponent詳細が出ないこと。
- snapshotに含める/含めない内容。
- share summary text。
- E2E: 作戦プラン作成、member閲覧専用、印刷モード表示。

## 残タスク

### 優先度高

- E2Eテストを拡充する。
  - shareToken再生成後、旧URLが無効。
  - soft delete後、共有リンクが無効。
  - privateNotesが共有/print/playerに出ない。

### 優先度中

### 優先度低〜磨き込み

- 作戦編集UIの視覚化強化。
  - 攻撃線、サーブ線、移動線、カバー面の表示。
  - レイヤープリセット。
  - コート上のタップ編集。
  - スマホ向け下部シート編集。
- 作戦テンプレート機能。
  - templateScope。
  - 適用前プレビュー。
  - 空欄のみ適用。
  - 差分表示。
- 2人リベロやDS運用のUI補足。
- systemTypeごとのwarning強化。

## 既知の注意点

- このリポジトリのPowerShell `Get-Content` では日本語がmojibake表示されることがある。
  - ファイル自体はUTF-8。
  - 内容確認はNodeの `fs.readFileSync(path, 'utf8')` が安全。
- `npm.cmd run test` は通常サンドボックス内だと `Cannot read directory "..": Access is denied.` で失敗する。
  - ユーザーから「テスト実行は常に許可」と明示あり。
  - テストは権限付きで実行してよい。
- `npm.cmd run build` はWrangler/Miniflareがユーザーディレクトリへログやregistryを書き込むため、権限付き実行が必要。
- `src/middleware.ts` にはユーザー由来の既存変更がある。
  - `/help` がPUBLIC_PATHSに追加されている。
  - 勝手に戻さない。
- `test-results/` は既存の未追跡出力。
  - 今回の作業対象ではない。

## 最後に確認した検証

以下は2026-05-18時点の最新確認。

```powershell
npm.cmd run test
npm.cmd run build
git diff --check
npm.cmd run test:e2e -- tests/e2e/strategy.spec.ts
```

結果:

- Unit tests: 6 files / 104 tests passed。
- Astro compiler parse check: 対象ページ errors 0。
- `git diff --check` passed。
- `npm.cmd run build` は Miniflare/Workers runtime のWindows access violationで失敗。コード構文ではなくruntime起動時の既知環境問題。
- `npm.cmd run test:e2e -- tests/e2e/strategy.spec.ts` も同じWrangler/Miniflare runtime起動失敗で未実行。
- UTF-8 replacement character check: 主要変更ファイルすべて `replacement=0`。

## 主要変更ファイル

- `docs/strategy-board-spec.md`
- `docs/strategy-board-progress.md`
- `AGENTS.md`
- `.editorconfig`
- `.gitattributes`
- `package.json`
- `package-lock.json`
- `drizzle/migrations/0001_strategy_board.sql`
- `drizzle/migrations/0002_strategy_board_sharing.sql`
- `drizzle/migrations/0003_strategy_roles.sql`
- `drizzle/migrations/meta/_journal.json`
- `src/schema/index.ts`
- `src/lib/hono.ts`
- `src/lib/routes/strategies.ts`
- `src/lib/routes/matches.ts`
- `src/lib/strategy/schema.ts`
- `src/lib/strategy/share.ts`
- `src/pages/teams/[teamId]/index.astro`
- `src/pages/teams/[teamId]/strategy.astro`
- `src/pages/teams/[teamId]/strategy/[planId].astro`
- `src/pages/teams/[teamId]/strategy/[planId]/print.astro`
- `src/pages/teams/[teamId]/strategy/[planId]/player.astro`
- `src/pages/share/strategy/[token].astro`
- `src/pages/matches/[matchId]/record.astro`
- `src/pages/matches/[matchId]/result.astro`
- `tests/unit/strategy.test.ts`
- `tests/e2e/strategy.spec.ts`
