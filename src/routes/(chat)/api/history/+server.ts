import { getChatsByUserId } from '$lib/server/db/queries.js';
import { error } from '@sveltejs/kit';

export async function GET({ locals: { safeGetSession } }) {
	const { user } = await safeGetSession();
	if (!user) {
		error(401, 'Unauthorized');
	}
	
	console.log('[Chat History] Fetching chats for user:', user.id);
	return await getChatsByUserId({ id: user.id }).match(
		(chats) => Response.json(chats),
		() => error(500, 'An error occurred while processing your request')
	);
}
