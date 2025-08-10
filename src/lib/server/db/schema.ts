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
	boolean,
	decimal,
	integer,
	index,
	bigint
} from 'drizzle-orm/pg-core';

export const user = pgTable('users', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	email: varchar('email', { length: 64 }).notNull().unique(),
	password: varchar('password', { length: 64 }).notNull(),
	firstname: text('firstname'),
	lastname: text('lastname'),
	avatar_url: text('avatar_url')
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
	id: uuid('id').primaryKey().notNull().defaultRandom(),
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
	'votes',
	{
		chatId: uuid('chatId')
			.notNull()
			.references(() => chats.id),
		messageId: uuid('messageId')
			.notNull()
			.references(() => messages.id),
		isUpvoted: boolean('isUpvoted').notNull()
	},
	(table) => [
		{
			pk: primaryKey({ columns: [table.chatId, table.messageId] })
		}
	]
);

export type Vote = InferSelectModel<typeof votes>;

export const aiUsage = pgTable('ai_usage', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	user_id: uuid('user_id')
		.notNull()
		.references(() => user.id),
	feature: text('feature').notNull(),
	cost_usd: decimal('cost_usd', { precision: 10, scale: 4 }).notNull(),
	tokens: integer('tokens'),
	model: text('model'),
	metadata: json('metadata'),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
	index('ai_usage_user_id_idx').on(table.user_id),
	index('ai_usage_created_at_idx').on(table.created_at)
]);

export type AiUsage = InferSelectModel<typeof aiUsage>;

export const documents = pgTable(
	'documents',
	{
		id: uuid('id').primaryKey().notNull().defaultRandom(),
		created_at: timestamp('created_at').notNull(),
		title: text('title').notNull(),
		content: text('content'),
		text: varchar('text').notNull().default('text'),
		user_id: uuid('user_id')
			.notNull()
			.references(() => user.id)
	}
);

export type Document = InferSelectModel<typeof documents>;

export const suggestions = pgTable('suggestions', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	created_at: timestamp('created_at').notNull(),
	user_id: uuid('user_id')
		.notNull()
		.references(() => user.id),
	document_id: uuid('document_id')
		.notNull()
		.references(() => documents.id),
	document_created_at: timestamp('document_created_at').notNull(),
	original_text: text('original_text').notNull(),
	suggested_text: text('suggested_text').notNull(),
	description: text('description'),
	is_resolved: boolean('is_resolved').notNull().default(false)
});

export type Suggestion = InferSelectModel<typeof suggestions>;

// Workspace tables
export const workspaces = pgTable('workspaces', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	name: text('name'),
	description: text('description'),
	owner_user_id: uuid('owner_user_id')
		.notNull()
		.references(() => user.id),
	metadata: json('metadata').notNull().default('{}')
});

export type Workspace = InferSelectModel<typeof workspaces>;

export const workspaceUsers = pgTable('workspace_users', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
	workspace_id: uuid('workspace_id')
		.notNull()
		.references(() => workspaces.id),
	user_id: uuid('user_id')
		.notNull()
		.references(() => user.id),
	role: text('role').notNull().default(''),
	metadata: json('metadata').notNull().default('{}')
});

export type WorkspaceUser = InferSelectModel<typeof workspaceUsers>;

export const workspaceInvites = pgTable('workspace_invites', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	workspace_id: uuid('workspace_id')
		.notNull()
		.references(() => workspaces.id),
	roles: text('roles').array().notNull().default([]),
	invited_by: uuid('invited_by')
		.notNull()
		.references(() => user.id),
	user_id: uuid('user_id').references(() => user.id),
	accepted_at: timestamp('accepted_at', { withTimezone: true })
});

export type WorkspaceInvite = InferSelectModel<typeof workspaceInvites>;



// User Services table
export const userServices = pgTable('user_services', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
	user_id: uuid('user_id').references(() => user.id),
	app: text('app'),
	config: json('config'),
	status: text('status'),
	last_checked: timestamp('last_checked', { withTimezone: true }),
	enabled: boolean('enabled')
});

export type UserService = InferSelectModel<typeof userServices>;

// VH Tables for your app
export const vhTables = pgTable('vh_tables', {
	id: uuid('id').primaryKey().notNull().defaultRandom(),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	updated_at: timestamp('updated_at', { withTimezone: true }),
	name: text('name').notNull(),
	description: text('description'),
	model: json('model'),
	settings: json('settings'),
	label: text('label')
});

export type VhTable = InferSelectModel<typeof vhTables>;

// VH Audit Log
export const vhAuditLog = pgTable('vh_audit_log', {
	id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
	created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	record_table: text('record_table'),
	record_id: text('record_id'),
	record_before: json('record_before'),
	record_after: json('record_after'),
	operation: text('operation'),
	change_user_id: uuid('change_user_id')
});

export type VhAuditLog = InferSelectModel<typeof vhAuditLog>;
