ALTER TABLE `deal_term_confirmations` ADD COLUMN `conflicts_json` text;
--> statement-breakpoint
CREATE INDEX `deal_term_confirmations_conflicts_index` ON `deal_term_confirmations` (`show_id`);
