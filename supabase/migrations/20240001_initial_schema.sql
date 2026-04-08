-- V-Log 初期スキーマ
-- Supabase SQL Editor または supabase db push で実行してください

-- ============================================================
-- テーブル定義
-- ============================================================

-- チーム
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- チームメンバー
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (team_id, user_id)
);

-- 選手
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  number INT NOT NULL CHECK (number BETWEEN 1 AND 99),
  position TEXT CHECK (position IN ('S', 'OH', 'MB', 'OP', 'L')),
  is_libero BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 試合
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  opponent_name TEXT NOT NULL,
  match_date DATE NOT NULL,
  location TEXT,
  share_uuid UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  detail_log_enabled BOOLEAN NOT NULL DEFAULT false,
  detail_log_start_point INT,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed')) DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- セット
CREATE TABLE IF NOT EXISTS match_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_number INT NOT NULL CHECK (set_number BETWEEN 1 AND 5),
  home_score INT NOT NULL DEFAULT 0,
  away_score INT NOT NULL DEFAULT 0,
  winner TEXT CHECK (winner IN ('home', 'away')),
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, set_number)
);

-- 得点イベント
CREATE TABLE IF NOT EXISTS points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES match_sets(id) ON DELETE CASCADE,
  point_number INT NOT NULL,
  scorer TEXT NOT NULL CHECK (scorer IN ('home', 'away')),
  home_score INT NOT NULL,
  away_score INT NOT NULL,
  rotation_index INT NOT NULL CHECK (rotation_index BETWEEN 0 AND 5),
  action_type TEXT CHECK (action_type IN ('attack', 'serve', 'block', 'opponent_error')),
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  is_detail_logged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, point_number)
);

-- ローテーションスナップショット
CREATE TABLE IF NOT EXISTS rotation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES match_sets(id) ON DELETE CASCADE,
  after_point_number INT NOT NULL,
  player_ids JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- タイムアウト
CREATE TABLE IF NOT EXISTS timeouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES match_sets(id) ON DELETE CASCADE,
  point_number INT NOT NULL,
  caller TEXT NOT NULL CHECK (caller IN ('home', 'away')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- updated_at 自動更新
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS（Row Level Security）
-- ============================================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeouts ENABLE ROW LEVEL SECURITY;

-- ---- teams ----
-- チームメンバーのみ読み取り
CREATE POLICY "team_members_can_read_teams" ON teams
  FOR SELECT USING (
    id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- 認証済みユーザーなら誰でも作成可
CREATE POLICY "authenticated_can_create_teams" ON teams
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- オーナーのみ更新・削除
CREATE POLICY "owner_can_update_teams" ON teams
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "owner_can_delete_teams" ON teams
  FOR DELETE USING (owner_id = auth.uid());

-- ---- team_members ----
CREATE POLICY "members_can_read_team_members" ON team_members
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated_can_join_team" ON team_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ---- players ----
CREATE POLICY "team_members_can_read_players" ON players
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "team_members_can_manage_players" ON players
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ---- matches ----
-- チームメンバーは読み書き可
CREATE POLICY "team_members_can_manage_matches" ON matches
  FOR ALL USING (
    team_id IN (
      SELECT team_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- share_uuid 経由は誰でも読み取り可（anon含む）
CREATE POLICY "public_can_read_match_by_share_uuid" ON matches
  FOR SELECT USING (share_uuid IS NOT NULL);

-- ---- match_sets ----
CREATE POLICY "team_members_can_manage_sets" ON match_sets
  FOR ALL USING (
    match_id IN (
      SELECT m.id FROM matches m
      JOIN team_members tm ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- 公開試合のセットは誰でも読める
CREATE POLICY "public_can_read_sets" ON match_sets
  FOR SELECT USING (
    match_id IN (SELECT id FROM matches WHERE share_uuid IS NOT NULL)
  );

-- ---- points ----
CREATE POLICY "team_members_can_manage_points" ON points
  FOR ALL USING (
    match_id IN (
      SELECT m.id FROM matches m
      JOIN team_members tm ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

CREATE POLICY "public_can_read_points" ON points
  FOR SELECT USING (
    match_id IN (SELECT id FROM matches WHERE share_uuid IS NOT NULL)
  );

-- ---- rotation_snapshots ----
CREATE POLICY "team_members_can_manage_snapshots" ON rotation_snapshots
  FOR ALL USING (
    match_id IN (
      SELECT m.id FROM matches m
      JOIN team_members tm ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- ---- timeouts ----
CREATE POLICY "team_members_can_manage_timeouts" ON timeouts
  FOR ALL USING (
    match_id IN (
      SELECT m.id FROM matches m
      JOIN team_members tm ON m.team_id = tm.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- ============================================================
-- インデックス
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_id ON matches(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_share_uuid ON matches(share_uuid);
CREATE INDEX IF NOT EXISTS idx_points_match_id ON points(match_id);
CREATE INDEX IF NOT EXISTS idx_points_set_id ON points(set_id);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
