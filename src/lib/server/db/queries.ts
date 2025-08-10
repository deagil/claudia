import { genSaltSync, hashSync } from 'bcrypt-ts';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { PRIVATE_POSTGRES_URL } from '$env/static/private';
import { ResultAsync, fromPromise, ok, safeTry } from 'neverthrow';
import {
	user,
	chats,
	type User,
	documents,
	type Suggestion,
	suggestions,
	type Message,
	messages,
	votes,
	type Session,
	sessions,
	type AuthUser,
	type Chat,
	type Vote
} from './schema';
import type { DbError } from '$lib/errors/db';
import { DbInternalError } from '$lib/errors/db';
import ms from 'ms';
import { unwrapSingleQueryResult } from './utils';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(PRIVATE_POSTGRES_URL);
const db = drizzle(client);

export function getAuthUser(email: string): ResultAsync<AuthUser, DbError> {
	return safeTry(async function* () {
		const userResult = yield* fromPromise(
			db.select().from(user).where(eq(user.email, email)),
			(e) => new DbInternalError({ cause: e })
		);
		return unwrapSingleQueryResult(userResult, email, 'User');
	});
}

export function getUser(email: string): ResultAsync<User, DbError> {
	return safeTry(async function* () {
		const userResult = yield* fromPromise(
			db.select().from(user).where(eq(user.email, email)),
			(e) => new DbInternalError({ cause: e })
		);
		const { password: _, ...rest } = yield* unwrapSingleQueryResult(userResult, email, 'User');

		return ok(rest);
	});
}

export function createAuthUser(email: string, password: string): ResultAsync<AuthUser, DbError> {
	return safeTry(async function* () {
		const salt = genSaltSync(10);
		const hash = hashSync(password, salt);

		const userResult = yield* fromPromise(
			db.insert(user).values({ email, password: hash }).returning(),
			(e) => {
				console.error(e);
				return new DbInternalError({ cause: e });
			}
		);

		return unwrapSingleQueryResult(userResult, email, 'User');
	});
}

export function createSession(value: Session): ResultAsync<Session, DbError> {
	return safeTry(async function* () {
		const sessionResult = yield* fromPromise(
			db.insert(sessions).values(value).returning(),
			(e) => new DbInternalError({ cause: e })
		);
		return unwrapSingleQueryResult(sessionResult, value.id, 'Session');
	});
}

export function getFullSession(
	sessionId: string
): ResultAsync<{ session: Session; user: User }, DbError> {
	return safeTry(async function* () {
		const sessionResult = yield* fromPromise(
			db
				.select({ user: { id: user.id, email: user.email }, session: sessions })
				.from(sessions)
				.innerJoin(user, eq(sessions.user_id, user.id))
				.where(eq(sessions.id, sessionId)),
			(e) => new DbInternalError({ cause: e })
		);
		const result = unwrapSingleQueryResult(sessionResult, sessionId, 'Session');
		// Map to required shape: { session, user }
		return result.map(({ session, user }) => ({ session, user }));
	});
}

export function deleteSession(sessionId: string): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		yield* fromPromise(
			db.delete(sessions).where(eq(sessions.id, sessionId)),
			(e) => new DbInternalError({ cause: e })
		);

		return ok(undefined);
	});
}

export function extendSession(sessionId: string): ResultAsync<Session, DbError> {
	return safeTry(async function* () {
		const sessionResult = yield* fromPromise(
			db
				.update(sessions)
				.set({ expiresAt: new Date(Date.now() + ms('30d')) })
				.where(eq(sessions.id, sessionId))
				.returning(),
			(e) => new DbInternalError({ cause: e })
		);

		return unwrapSingleQueryResult(sessionResult, sessionId, 'Session');
	});
}

export function deleteSessionsForUser(userId: string): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		yield* fromPromise(
			db.delete(sessions).where(eq(sessions.user_id, userId)),
			(e) => new DbInternalError({ cause: e })
		);

		return ok(undefined);
	});
}

export function saveChat({
	id,
	user_id,
	title
}: {
	id: string;
	user_id: string;
	title: string;
}): ResultAsync<Chat, DbError> {
	return safeTry(async function* () {
		const insertResult = yield* fromPromise(
			db
				.insert(chats)
				.values({
					id,
					created_at: new Date(),
					user_id,
					title
				})
				.returning(),
			(e) => new DbInternalError({ cause: e })
		);

		return unwrapSingleQueryResult(insertResult, id, 'chats');
	});
}

export function deleteChatById({ id }: { id: string }): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		const actions = [
			() => db.delete(votes).where(eq(votes.chatId, id)),
			() => db.delete(messages).where(eq(messages.chat_id, id)),
			() => db.delete(chats).where(eq(chats.id, id))
		];

		for (const action of actions) {
			yield* fromPromise(action(), (e) => new DbInternalError({ cause: e }));
		}

		return ok(undefined);
	});
}

export function getChatsByUserId({ id }: { id: string }): ResultAsync<Chat[], DbError> {
	return fromPromise(
		db.select().from(chats).where(eq(chats.user_id, id)).orderBy(desc(chats.created_at)),
		(e) => new DbInternalError({ cause: e })
	);
}

export function getChatById({ id }: { id: string }): ResultAsync<Chat, DbError> {
	return safeTry(async function* () {
		const chatResult = yield* fromPromise(
			db.select().from(chats).where(eq(chats.id, id)),
			(e) => new DbInternalError({ cause: e })
		);

		return unwrapSingleQueryResult(chatResult, id, 'chats');
	});
}

export function saveMessages({
	messages: messageList
}: {
	messages: Array<Message>;
}): ResultAsync<Message[], DbError> {
	return safeTry(async function* () {
		const insertResult = yield* fromPromise(
			db.insert(messages).values(messageList).returning(),
			(e) => new DbInternalError({ cause: e })
		);

		return ok(insertResult);
	});
}

export function getMessagesByChatId({ id }: { id: string }): ResultAsync<Message[], DbError> {
	return safeTry(async function* () {
		const result = yield* fromPromise(
			db.select().from(messages).where(eq(messages.chat_id, id)).orderBy(asc(messages.created_at)),
			(e) => new DbInternalError({ cause: e })
		);

		return ok(result as Message[]);
	});
}

export function voteMessage({
	chatId,
	messageId,
	type
}: {
	chatId: string;
	messageId: string;
	type: 'up' | 'down';
}): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		yield* fromPromise(
			db
				.insert(votes)
				.values({
					chatId,
					messageId,
					isUpvoted: type === 'up'
				})
				.onConflictDoUpdate({
					target: [votes.messageId, votes.chatId],
					set: { isUpvoted: type === 'up' }
				}),
			(e) => new DbInternalError({ cause: e })
		);
		return ok(undefined);
	});
}

export function getVotesByChatId({ id }: { id: string }): ResultAsync<Vote[], DbError> {
	return fromPromise(
		db.select().from(votes).where(eq(votes.chatId, id)),
		(e) => new DbInternalError({ cause: e })
	);
}

export async function saveDocument({
	id,
	title,
	kind,
	content,
	user_id
}: {
	id: string;
	title: string;
	kind: never;
	content: string;
	user_id: string;
}) {
	try {
		return await db.insert(documents).values({
			id,
			title,
			text: kind,
			content,
			user_id,
			created_at: new Date()
		});
	} catch (error) {
		console.error('Failed to save document in database');
		throw error;
	}
}

export async function getDocumentsById({ id }: { id: string }) {
	try {
		const documentsResult = await db
			.select()
			.from(documents)
			.where(eq(documents.id, id))
			.orderBy(asc(documents.created_at));

		return documentsResult;
	} catch (error) {
		console.error('Failed to get document by id from database');
		throw error;
	}
}

export async function getDocumentById({ id }: { id: string }) {
	try {
		const [selectedDocument] = await db
			.select()
			.from(documents)
			.where(eq(documents.id, id))
			.orderBy(desc(documents.created_at));

		return selectedDocument;
	} catch (error) {
		console.error('Failed to get document by id from database');
		throw error;
	}
}

export async function deleteDocumentsByIdAfterTimestamp({
	id,
	timestamp
}: {
	id: string;
	timestamp: Date;
}) {
	try {
		await db
			.delete(suggestions)
			.where(and(eq(suggestions.document_id, id), gt(suggestions.document_created_at, timestamp)));

		return await db
			.delete(documents)
			.where(and(eq(documents.id, id), gt(documents.created_at, timestamp)));
	} catch (error) {
		console.error('Failed to delete documents by id after timestamp from database');
		throw error;
	}
}

export function saveSuggestions({
	suggestions: suggestionList
}: {
	suggestions: Array<Suggestion>;
}): ResultAsync<Suggestion[], DbError> {
	return fromPromise(
		db.insert(suggestions).values(suggestionList).returning(),
		(e) => new DbInternalError({ cause: e })
	);
}

export function getSuggestionsByDocumentId({
	documentId
}: {
	documentId: string;
}): ResultAsync<Suggestion[], DbError> {
	return fromPromise(
		db.select().from(suggestions).where(eq(suggestions.document_id, documentId)),
		(e) => new DbInternalError({ cause: e })
	);
}

export function getMessageById({ id }: { id: string }): ResultAsync<Message, DbError> {
	return safeTry(async function* () {
		const messageResult = yield* fromPromise(
			db.select().from(messages).where(eq(messages.id, id)),
			(e) => new DbInternalError({ cause: e })
		);

		return unwrapSingleQueryResult(messageResult, id, 'Message');
	});
}

export function deleteMessagesByChatIdAfterTimestamp({
	chatId,
	timestamp
}: {
	chatId: string;
	timestamp: Date;
}): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		const messagesToDelete = yield* fromPromise(
			db
				.select({ id: messages.id })
				.from(messages)
				.where(and(eq(messages.chat_id, chatId), gte(messages.created_at, timestamp))),
			(e) => new DbInternalError({ cause: e })
		);
		const messageIds = messagesToDelete.map((messages) => messages.id);
		if (messageIds.length > 0) {
			const votesDelete = fromPromise(
				db.delete(votes).where(and(eq(votes.chatId, chatId), inArray(votes.messageId, messageIds))),
				(e) => new DbInternalError({ cause: e })
			);
			const messagesDelete = fromPromise(
				db.delete(messages).where(and(eq(messages.chat_id, chatId), inArray(messages.id, messageIds))),
				(e) => new DbInternalError({ cause: e })
			);
			yield* votesDelete;
			yield* messagesDelete;
		}
		return ok(undefined);
	});
}

export function deleteTrailingMessages({ id }: { id: string }): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		const messages = yield* getMessageById({ id });
		yield* deleteMessagesByChatIdAfterTimestamp({
			chatId: messages.chat_id,
			timestamp: messages.created_at
		});
		return ok(undefined);
	});
}

export function updateChatVisiblityById({
	chatId,
	visibility
}: {
	chatId: string;
	visibility: 'private' | 'public';
}): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		yield* fromPromise(
			db.update(chats).set({ visibility }).where(eq(chats.id, chatId)),
			(e) => new DbInternalError({ cause: e })
		);
		return ok(undefined);
	});
}
