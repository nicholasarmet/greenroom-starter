ALTER TABLE `deal_term_confirmations` ADD COLUMN `link_token` text;
--> statement-breakpoint
CREATE INDEX `deal_term_confirmations_link_token_index` ON `deal_term_confirmations` (`show_id`, `link_token`);
