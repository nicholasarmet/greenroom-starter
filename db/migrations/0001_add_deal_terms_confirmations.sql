ALTER TABLE `deals` ADD COLUMN `deal_terms` text;
--> statement-breakpoint
CREATE TABLE `deal_term_confirmations` (
  `id` text PRIMARY KEY NOT NULL,
  `show_id` text NOT NULL,
  `user_id` text,
  `role` text NOT NULL,
  `confirmed_at` integer NOT NULL,
  `terms_hash` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`show_id`) REFERENCES `shows`(`id`) ON UPDATE no action ON DELETE no action,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `deal_term_confirmations_show_id_index` ON `deal_term_confirmations` (`show_id`);
