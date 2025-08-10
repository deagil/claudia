import { aiUsage } from '$lib/server/db/schema.js';
import { db } from '$lib/server/db/queries.js';

export interface LogAIUsageParams {
	userId: string;
	feature: string;
	costUsd: number;
	tokens?: number;
	model?: string;
	metadata?: Record<string, any>;
}

export async function logAIUsage(params: LogAIUsageParams) {
	try {
		const result = await db.insert(aiUsage).values({
			user_id: params.userId,
			feature: params.feature,
			cost_usd: params.costUsd.toString(), // Convert to string for decimal type
			tokens: params.tokens,
			model: params.model,
			metadata: params.metadata
		}).returning();

		console.log('[AI Usage] Logged usage:', {
			userId: params.userId,
			feature: params.feature,
			cost_usd: params.costUsd,
			tokens: params.tokens,
			model: params.model,
			metadata: params.metadata
		});

		return result[0];
	} catch (err) {
		console.error('[AI Usage] Error logging usage:', err);
		throw err;
	}
}
