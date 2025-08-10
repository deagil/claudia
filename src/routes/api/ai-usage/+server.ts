import { error, json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
	const { user } = await locals.safeGetSession();
	if (!user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const { feature, cost_usd, tokens, model, metadata } = body;

		if (!feature || cost_usd === undefined || cost_usd === null) {
			return json({ error: 'Missing required fields: feature and cost_usd are required' }, { status: 400 });
		}

		const { data, error: insertError } = await locals.supabase
			.from('ai_usage')
			.insert({
				user_id: user.id,
				feature,
				cost_usd: cost_usd.toString(), // Convert to string for decimal type
				tokens,
				model,
				metadata
			})
			.select()
			.single();

		if (insertError) {
			console.error('[AI Usage] Database error:', insertError);
			return json({ error: 'Failed to log AI usage' }, { status: 500 });
		}

		console.log('[AI Usage] Logged usage:', {
			userId: user.id,
			feature,
			cost_usd,
			tokens,
			model,
			metadata
		});

		return json({ success: true, id: data.id });
	} catch (err) {
		console.error('[AI Usage] Error logging usage:', err);
		return json({ error: 'Failed to log AI usage' }, { status: 500 });
	}
}

// GET endpoint to retrieve usage data for a user
export async function GET({ url, locals }) {
	const { user } = await locals.safeGetSession();
	if (!user?.id) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const limit = parseInt(url.searchParams.get('limit') || '100');
		const offset = parseInt(url.searchParams.get('offset') || '0');

		const { data: usage, error: fetchError } = await locals.supabase
			.from('ai_usage')
			.select('*')
			.eq('user_id', user.id)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1);

		if (fetchError) {
			console.error('[AI Usage] Database error:', fetchError);
			return json({ error: 'Failed to fetch AI usage' }, { status: 500 });
		}

		return json({ usage });
	} catch (err) {
		console.error('[AI Usage] Error fetching usage:', err);
		return json({ error: 'Failed to fetch AI usage' }, { status: 500 });
	}
}
