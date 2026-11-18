import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const providerCache = sqliteTable('provider_cache', {
  key:text('key').primaryKey(), payload:text('payload').notNull(), fetchedAt:integer('fetched_at').notNull()
});
export const providerBudget = sqliteTable('provider_budget', {
  day:text('day').primaryKey(), requests:integer('requests').notNull().default(0), lastAt:integer('last_at').notNull().default(0)
});
