CREATE TABLE `strategy_share_links` (
  `id` text PRIMARY KEY NOT NULL,
  `strategy_plan_id` text NOT NULL,
  `team_id` text NOT NULL,
  `view_scope` text NOT NULL,
  `share_token` text NOT NULL,
  `enabled` integer DEFAULT true NOT NULL,
  `password_protected` integer DEFAULT false NOT NULL,
  `password_hash` text,
  `expires_at` text,
  `allow_download` integer DEFAULT false NOT NULL,
  `include_opponent_scout` integer DEFAULT false NOT NULL,
  `revoked_at` text,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`strategy_plan_id`) REFERENCES `strategy_plans`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `strategy_share_links_share_token_unique` ON `strategy_share_links` (`share_token`);
--> statement-breakpoint
CREATE TABLE `strategy_revisions` (
  `id` text PRIMARY KEY NOT NULL,
  `strategy_plan_id` text NOT NULL,
  `team_id` text NOT NULL,
  `edited_by` text NOT NULL,
  `edited_at` text NOT NULL,
  `summary` text NOT NULL,
  `changed_fields` text NOT NULL,
  `before_snapshot` text NOT NULL,
  `after_snapshot` text NOT NULL,
  `restored_from_revision_id` text,
  FOREIGN KEY (`strategy_plan_id`) REFERENCES `strategy_plans`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`edited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `strategy_snapshots` (
  `id` text PRIMARY KEY NOT NULL,
  `strategy_plan_id` text NOT NULL,
  `team_id` text NOT NULL,
  `match_id` text,
  `set_number` integer,
  `snapshot` text NOT NULL,
  `created_by` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`strategy_plan_id`) REFERENCES `strategy_plans`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `match_set_strategy_reviews` (
  `id` text PRIMARY KEY NOT NULL,
  `match_id` text NOT NULL,
  `set_number` integer NOT NULL,
  `strategy_plan_id` text,
  `strategy_snapshot_id` text,
  `post_match_review` text NOT NULL,
  `rotation_reviews` text NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`strategy_plan_id`) REFERENCES `strategy_plans`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`strategy_snapshot_id`) REFERENCES `strategy_snapshots`(`id`) ON UPDATE no action ON DELETE set null
);
