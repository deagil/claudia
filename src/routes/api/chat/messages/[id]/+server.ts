import { getMessagesByChatId } from '$lib/server/db/queries.js';
import { error } from '@sveltejs/kit';

export async function GET({ params, locals }) {
	console.log('[GET] /api/chat/messages', { params });
	const { user } = await locals.safeGetSession();
	if (!user) return new Response('Unauthorized', { status: 401 });
	if (!params.id) return new Response('Chat ID is required', { status: 400 });
	
	const chatId = params.id;
	console.log('[API] Fetching messages for chatId:', chatId);
	
	try {
		const result = await getMessagesByChatId({ id: chatId });
		if (result.isErr()) {
			console.error('Error fetching messages:', result.error);
			return new Response('Failed to fetch messages', { status: 500 });
		}
		
		console.log('[API] Messages fetched successfully. Count:', result.value.length);
		result.value.forEach((msg, i) => {
			console.log(`[API] Message ${i}:`, { role: msg.role, chat_id: msg.chat_id, id: msg.id });
		});
		
		return new Response(JSON.stringify(result.value), { 
			status: 200,
			headers: {
				'Content-Type': 'application/json'
			}
		});
	} catch (err) {
		console.error('Unexpected error fetching messages:', err);
		return new Response('Internal server error', { status: 500 });
	}
}
