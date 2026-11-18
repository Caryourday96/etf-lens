CREATE TABLE `provider_budget` (
	`day` text PRIMARY KEY NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `provider_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`fetched_at` integer NOT NULL
);
