import type { Chat } from '$lib/server/db/schema.js';

export async function load({ data, fetch }) {
	const user = data.sessionData.user
	console.log('[App Layout] User session:', user);
	let chats = Promise.resolve<Chat[]>([]);
	if (user) {
		chats = fetch('/api/history').then((res) => res.json());
	}
	return {
		chats,
		...data
	};
}
