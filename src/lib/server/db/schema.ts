import type { InferSelectModel } from 'drizzle-orm';
import {
	pgTable,
	varchar,
	timestamp,
	json,
	uuid,
	text,
	primaryKey,
	foreignKey,
	boolean
} from 'drizzle-orm/pg-core';

export const user = pgTable('User', {
	id: uuid('id').primaryKey().notNull().defaultRandom().primaryKey(),
	email: varchar('email', { length: 64 }).notNull().unique(),
	password: varchar('password', { length: 64 }).notNull()
});

export type AuthUser = InferSelectModel<typeof user>;
export type User = Omit<AuthUser, 'password'>;

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey().notNull(),
	user_id: uuid('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', {
		withTimezone: true,
		mode: 'date'
	}).notNull()
});

export type Session = InferSelectModel<typeof sessions>;

export const chats = pgTable('chats', {
	id: uuid('id').primaryKey().notNull().defaultRandom().primaryKey(),
	created_at: timestamp('created_at').notNull(),
	title: text('title').notNull(),
	user_id: uuid('user_id')
		.notNull()
		.references(() => user.id),
	visibility: varchar('visibility', { enum: ['public', 'private'] })
		.notNull()
		.default('private')
});

export type Chat = InferSelectModel<typeof chats>;

export const messages = pgTable('messages', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	chat_id: uuid('chat_id')
		.notNull()
		.references(() => chats.id),
	role: varchar('role').notNull(),
	parts: json('parts').notNull(),
	attachments: json('attachments').notNull(),
	created_at: timestamp('created_at').notNull()
});

export type Message = InferSelectModel<typeof messages>;

export const votes = pgTable(
	'Vote',
	{
		chat_id: uuid('chat_id')
			.notNull()
			.references(() => chats.id),
		messageId: uuid('messageId')
			.notNull()
			.references(() => messages.id),
		isUpvoted: boolean('isUpvoted').notNull()
	},
	(table) => [
		{
			pk: primaryKey({ columns: [table.chat_id, table.messageId] })
		}
	]
);

export type Vote = InferSelectModel<typeof votes>;

export const document = pgTable(
	'Document',
	{
		id: uuid('id').notNull().defaultRandom(),
		created_at: timestamp('created_at').notNull(),
		title: text('title').notNull(),
		content: text('content'),
		kind: varchar('text', { enum: ['text', 'code', 'image', 'sheet'] })
			.notNull()
			.default('text'),
		user_id: uuid('user_id')
			.notNull()
			.references(() => user.id)
	},
	(table) => [
		{
			pk: primaryKey({ columns: [table.id, table.created_at] })
		}
	]
);

export type Document = InferSelectModel<typeof document>;

export const suggestions = pgTable(
	'suggestions',
	{
		id: uuid('id').notNull().defaultRandom(),
		documentId: uuid('documentId').notNull(),
		documentCreatedAt: timestamp('documentCreatedAt').notNull(),
		originalText: text('originalText').notNull(),
		suggestedText: text('suggestedText').notNull(),
		description: text('description'),
		isResolved: boolean('isResolved').notNull().default(false),
		user_id: uuid('user_id')
			.notNull()
			.references(() => user.id),
		created_at: timestamp('created_at').notNull()
	},
	(table) => [
		{
			pk: primaryKey({ columns: [table.id] }),
			documentRef: foreignKey({
				columns: [table.documentId, table.documentCreatedAt],
				foreignColumns: [document.id, document.created_at]
			})
		}
	]
);

export type Suggestion = InferSelectModel<typeof suggestions>;
