# ローテーション作戦ボード仕様

このドキュメントを本機能の仕様の正とする。
実装時に迷った場合は、チャット履歴ではなく本ドキュメントを優先する。

対象リポジトリ: qa-marmot/vlog-volleyball
対象機能: チーム単位のローテーション作戦ボード

## Summary

- 本機能は「1プラン = 1セット分のスタメン6人固定」の作戦ボードとして扱います。セットごとにスタメンが変わる場合はプラン複製で対応します。
- R1は「基準ローテ」であり、サーブ権とは直接紐づけません。別途 `startingRotationKey` と `initialServingTeam` を持ち、開始ローテ・開始サーブ・各ローテのサーブ想定をUIで明示します。
- 作戦ボードはスコア記録とは独立しますが、試合に紐づける場合は `matchId + setNumber` 単位で strategy snapshot を保存します。
- UIは局面ベースに整理します: `レシーブ時`, `自サーブ時`, `ラリー中`, `メモ`。
- FIVB標準ルールを前提に、後衛攻撃、リベロ、サーブ順、オーバーラップ注意を Zod と UI の両方で扱います。

## Key Changes

- `zod` を追加し、作戦JSONの Zod スキーマを実装の起点にします。
- DBに作戦プラン用テーブル、作戦権限、共有リンク、変更履歴、試合セット紐づけ snapshot、試合セット振り返りを追加します。
- 画面は `/teams/[teamId]/strategy`, `/teams/[teamId]/strategy/[planId]`, 印刷用表示、選手向け簡易表示を追加します。
- APIは作成・取得・更新・draft/finalized保存・soft delete・完全削除・複製・共有リンク管理・変更履歴取得/復元を追加します。
- 既存の `owner/member` とは別に、作戦ボード用 `StrategyRole = owner | editor | viewer` を追加します。

## Strategy Schema

- 1プランは `id`, `teamId`, `status`, `name`, `opponentName`, `matchDate`, `setNumber`, `tournamentName`, `venue`, `matchLabel`, `systemType`, `baseRotation`, `startingRotationKey`, `initialServingTeam`, `passQualityDefinitions`, `customAttackLabels`, `attackNamePresets`, `planPlayerRoles`, `planPlayerNotes`, `setterPlayerIds`, `liberoPlayerIds`, `rotations`, `opponentScout`, `substitutionNote`, `privateNotes`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `deletedAt`, `deletedBy`, `notes` を持ちます。
- `status`: `draft | finalized`。draft は入力途中保存を許可し、finalized は印刷・共有・試合紐づけに使える状態です。
- finalized に必要な条件:
  - `name` がある
  - `baseRotation` が6人分ある
  - `rotations` がR1〜R6揃う
  - 各ローテの `courtPlayerIds` が6人分ある
  - 各ローテの `setterId` が有効
  - `passQualityDefinitions` がある
  - 保存不可errorがない
- `startingRotationKey` / `initialServingTeam` は finalized 必須ではありません。未設定の場合は warning を出します。
- `systemType`: `5-1 | 6-2 | 4-2 | other`。セッター構成の補助表示と warning 判定に使います。
- `passQualityDefinitions` は `good`, `medium`, `bad` を持ち、UIでは `Aパス`, `Bパス`, `Cパス` と表示します。
  - `good`: クイックを含めた複数攻撃を選択できる返球
  - `medium`: サイド攻撃中心だが攻撃選択肢が残る返球
  - `bad`: 二段トス・高いトス・つなぎ中心になる返球
- 攻撃名の表示優先順位は `AttackOption.displayName > attackNamePresets > customAttackLabels > AttackType のデフォルト日本語名` とします。
- `setNumber`: `1 | 2 | 3 | 4 | 5 | null`。
- `baseRotation` は R1基準配置の6人配列です。リベロ、控え、ピンチサーバー、DSは含めません。
- `startingRotationKey`: `R1`〜`R6 | null`。試合開始時の想定ローテです。
- `initialServingTeam`: `own | opponent | unknown`。
- `planPlayerRoles`: `playerId`, `role: OH | MB | OP | S | L | DS | other`。DSは本機能では配置には入れず、`substitutionNote` / `playerNotes` で扱います。
- 各ローテは `courtPlayerIds`, `primaryFocusPhase`, `setterId`, `liberoReplacement`, `liberoNote`, `receivePhase`, `servePhase`, `defensePhase`, `rallyTransition`, `chanceBallPlan`, `outOfSystemPlan`, `setterFirstTouchPlan`, `overlapWarnings`, `keyPoint`, `avoidNote`, `substitutionNote`, `playerNotes`, `opponentRotationNotes`, `summaryNote`, `notes` を持ちます。
- `keyPoint` はそのローテで最も意識する作戦ポイント、`avoidNote` はそのローテで避けるべき行動として扱います。
  - 例: `Aパス時はMB優先`
  - 例: `Cパスで無理にクイックを使わない`
- `autoSummary` は基本的に保存せず表示時に生成します。match snapshot には、その時点の生成結果を含めます。

## Match Linkage

- 作戦プランを試合に紐づける場合は `matchId + setNumber + strategyPlanId` で管理します。
- 紐づけ時点の `strategySnapshot` を保存します。過去試合の結果画面では元プランの現在値ではなく snapshot を参照します。
- snapshot に含めるもの:
  - `baseRotation`
  - `startingRotationKey`
  - `initialServingTeam`
  - `rotations`
  - `passQualityDefinitions`
  - `customAttackLabels`
  - `planPlayerRoles`
  - `setterPlayerIds`
  - `liberoPlayerIds`
  - `opponentScout`
  - `notes`
  - `summaryNote`
  - autoSummary生成結果
- snapshot に含めないもの:
  - `shareLinks`
  - `revisionHistory`
  - `deletedAt/deletedBy`
  - `privateNotes`
  - 権限情報
- 共有表示での opponentScout 表示は `shareLinks.includeOpponentScout` に従います。内部 snapshot には分析用途として opponentScout を含めます。
- `matchSetStrategyReview`: `id`, `matchId`, `setNumber`, `strategyPlanId`, `strategySnapshotId`, `postMatchReview`, `rotationReviews`, `createdAt`, `updatedAt`。
- 作戦プランの `baseRotation` と試合側スタメンが一致しない場合は warning を出します。

## Volleyball Model

- slot定義は `0=RB/right back/サーバー位置`, `1=CB/middle back`, `2=LB/left back`, `3=LF/left front`, `4=CF/middle front`, `5=RF/right front` とします。
- UIでは `サーブ順位置` と `サーブ後守備位置` を別ラベルにします。slot 0 はローテ上のサーバー位置であり、`postServeDefensePositions` とは別物です。
- R1→R2 のslot変換は `[0,1,2,3,4,5] -> [5,0,1,2,3,4]` を確定値として固定します。
  - これは時計回りの公式ローテーションとして、`RF -> RB`, `RB -> CB`, `CB -> LB`, `LB -> LF`, `LF -> CF`, `CF -> RF` に対応します。
  - 新しいslot基準では `next[RB]=prev[RF]`, `next[CB]=prev[RB]`, `next[LB]=prev[CB]`, `next[LF]=prev[LB]`, `next[CF]=prev[LF]`, `next[RF]=prev[CF]` です。
  - 図解:

    ```text
    R1
    LF:p4   CF:p5   RF:p6
    LB:p3   CB:p2   RB:p1

    R2
    LF:p3   CF:p4   RF:p5
    LB:p2   CB:p1   RB:p6

    R3
    LF:p2   CF:p3   RF:p4
    LB:p1   CB:p6   RB:p5
    ```
- リベロは `courtPlayerIds` に含めません。`liberoReplacement` は `liberoId`, `replacedPlayerId`, `replacedSlot` を持ちます。
- リベロは `servePhase.serverId`, `blockPlan` のブロッカー, `AttackOption.attackerId` に設定できません。
- 後衛攻撃制限は「後衛選手が `front_*` の `attackTakeoffZone` から攻撃するケースを拒否」と定義します。
- `setter_dump` は、セッターが前衛slot `3,4,5` の場合は許可します。セッターが後衛の場合、`attackTakeoffZone` が `back_*_behind_3m` なら warning、`front_*` なら error とします。

## Validation

- `validationResult` は `errors` と `warnings` に分けます。
- `setterId` は finalized 保存時には必須です。draft 保存では未設定を warning として扱います。
- Error:
  - finalized時の `setterId` 未設定
  - `setterId` 不存在
  - `setterId` が `courtPlayerIds` にいない
  - リベロが `courtPlayerIds` に入る
  - リベロがサーバー/ブロッカー/攻撃者になる
  - 後衛が `front_*` takeoff
  - `serverId` 不一致
  - R1不一致
  - 不正player参照
- Warning:
  - `startingRotationKey` 未設定
  - `initialServingTeam=unknown`
  - role=S が `setterPlayerIds` に含まれない
  - role=L が `liberoPlayerIds` に含まれない
  - `liberoPlayerIds` の選手が role=L 以外
  - systemTypeとsetterIdの整合が疑わしい
  - オーバーラップ注意
  - リベロオーバーハンド注意
  - 後衛セッターのツー/返球リスク
- Warningには `visibility: editor_only | print | player | all` を持たせます。autoSummaryにはwarningを混ぜず、必要なwarningは別枠で表示します。

## Phases And Data Types

- 座標は `PlayerCourtPosition`: `playerId`, `x`, `y`, `zone`, `label`。`x,y` は0〜100の相対座標です。
- `ServeTargetZone`, `AttackTargetZone`, `DefenseZone` はそれぞれ9点を基本にし、用途ごとに別型にします。
- `receivePhase`: `receiveStartPositions`, `receiveCoverageZones`, `attackTransitionAfterReceive`, `attackPlansByPassQuality`, `opponentServeNotes`。
- `AttackOption`: `priority: 1|2|3`, `attackType`, `displayName`, `attackerId`, `attackTakeoffZone`, `attackTargetZone`, `tempo`, `approachDirection`, `coverPattern`, `intent`, `notes`。
- `servePhase`: `serverId`, `serveTarget`, `preServePositions`, `postServeDefensePositions`, `notes`。
- `defensePhase`: `blockPlan`, `floorDefensePlan`, `coverPlan`。
- `rallyTransition`: `freeBallTransition`, `digTransition`, `blockTouchTransition`, `setterOutTransition`, `notes`。

## UX / Design

- UI大分類は `レシーブ時`, `自サーブ時`, `ラリー中`, `メモ`。
- プラン上部に `開始ローテ`, `開始サーブ`, `現在表示中ローテのサーブ想定`, `セッター位置` を表示します。
- ローテ表示は `R1｜基準ローテ`, `R3｜基準ローテから3回転` のように補足します。
- サーブ想定は `自サーブ想定` / `相手サーブ想定` と表示し、確定ではなく開始条件からの目安であることを通常画面と印刷画面に明記します。
- 印刷表示には、ローテ、セッター位置、リベロIN、サーブ想定、keyPoint、avoidNote、A/B/Cパス1st、サーブ狙い、ブロック/守備要点、簡易コート図、凡例、必要なwarningを含めます。
- player view には、ローテ、自分中心表示または全員向け簡易表示、keyPoint、avoidNote、A/B/Cパス1st、サーブ狙い、ブロック/守備要点、visibility=player/all のwarningを表示します。
- player view には `privateNotes`, `revisionHistory`, `opponentScout`, 権限情報を表示しません。
- `privateNotes` は owner/editor の通常編集画面でのみ表示・編集できます。共有リンク、player view、summary view、print view には表示しません。
- `autoSummary` はセッター位置、`liberoReplacement`, A/B/Cパス1st、`serveTarget`, `blockPlan`, `keyPoint`, `avoidNote` から表示時に生成します。
- LINE/Slack向け `shareSummaryText` には、プラン名、対戦相手、セット番号、各ローテの keyPoint、各ローテの avoidNote、共有URLを含めます。`privateNotes`, `revisionHistory`, `opponentScout`, 権限情報は含めません。

## Permissions / History / Sharing

- `StrategyRole`: `owner`, `editor`, `viewer`。
- owner:
  - 閲覧
  - 作成
  - 編集
  - 複製
  - soft delete
  - 復元
  - 完全削除
  - 権限管理
  - 共有管理
  - 変更履歴復元
- editor:
  - 閲覧
  - 作成
  - 編集
  - 複製
  - 共有管理
  - 変更履歴閲覧
- viewer:
  - 閲覧のみ
- `userPlayerLink`: `teamId`, `userId`, `playerId`。player view の自分中心表示に使います。
- プラン削除は soft delete とし、`deletedAt`, `deletedBy` を設定します。soft delete 中は通常詳細・共有リンクともにアクセス不可です。
- `revisionHistory` は StrategyPlan 本体とは別管理にします。保存ボタン単位で1履歴を作り、復元操作も履歴に残します。
- 共有は finalized の作戦プランのみ有効化できます。draft では共有リンクを発行できません。
- 共有リンクは常に最新の finalized 内容を表示します。編集保存後、既存共有リンクにも反映されます。過去試合は strategy snapshot を参照するため影響を受けません。
- 共有は `shareLinks` 配列で管理します。各リンクは `viewScope`, `shareToken`, `enabled`, `passwordProtected`, `passwordHash`, `expiresAt`, `allowDownload`, `includeOpponentScout`, `revokedAt` を持ちます。
- shareLink は `enabled=false`、`revokedAt` あり、`expiresAt` 超過の場合は無効です。
- `passwordProtected=true` なら `passwordHash` 必須、`passwordProtected=false` なら `passwordHash=null` とします。

## Test Plan

- Unit: スキーマ正常系、不正ローテ数、不正enum、不正参照、R1不一致、R1→R2→R3 slot図、開始ローテ/開始サーブからのサーブ想定算出を確認します。
- Unit: draft/finalized validation、setter_dumpのerror/warning境界、role整合、後衛攻撃、3mライン踏切、リベロ制約、errors/warnings分類とvisibilityを確認します。
- Unit: A/B/Cパス定義、攻撃優先順位、カスタム攻撃名、テンプレート差分、空欄判定、autoSummary/summaryNote優先順位を確認します。
- API: StrategyRole、既存チーム権限移行、matchId+setNumber snapshot、soft delete/復元/完全削除、複製初期化、shareLinks、期限切れ、token再生成、変更履歴を確認します。
- E2E: プラン作成、draft保存、finalized保存、基準ローテ入力、開始ローテ/開始サーブ設定、閲覧/編集切替、A/B/Cパス編集、共有前プレビュー、player view、印刷表示を確認します。
- E2E: privateNotes が player view、summary view、print view、共有full view に表示されず、owner/editor の通常編集画面では表示されることを確認します。
- E2E: strategySnapshot に rotations と autoSummary生成結果が含まれ、privateNotes、shareLinks、revisionHistory が含まれないことを確認します。
- E2E: shareSummaryText が生成され、privateNotes と opponentScout を含まず、共有URLを含むことを確認します。
- Verification: `npm.cmd run test` と `npm.cmd run build` を実行します。

## Assumptions / Non-Goals

- FIVB標準ルールを前提にします。リベロサーブを許可する特殊ルールは本機能では扱いません。
- 本機能はスコア記録とは独立した作戦ボードです。
- 1プランは1セット分のスタメンを対象にします。セットごとにスタメンが変わる場合は複製して別プランにします。
- R1は基準ローテであり、サーブ権ありのローテとは定義しません。
- 相手選手の個別登録は必須にせず、相手情報はメモと簡易フィールドで扱います。
- この機能では、すべてのオーバーラップの厳密判定、チーム独自ルールの完全判定、keyPoint/avoidNoteの実行可否判定、相手ローテの自動推定、リベロ運用のローカルルール対応、作戦が得点・失点に与えた因果関係の自動判定は行いません。
- テンプレートや自動警告は補助です。作戦の正確性はチームの呼称・約束事・運用に依存し、最終判断はチーム側が行います。
- JSON保存は Zod スキーマで厳格に守り、分析用途が出てから正規化を検討します。
