import { myProvider } from '$lib/server/ai/models';
import { systemPrompt } from '$lib/server/ai/prompts.js';
import { generateTitleFromUserMessage } from '$lib/server/ai/utils';
import { deleteChatById, getChatById, saveChat, saveMessages } from '$lib/server/db/queries.js';
import { logAIUsage } from '$lib/server/ai/usage.js';
import type { Chat } from '$lib/server/db/schema';
import { getMostRecentUserMessage, getTrailingMessageId } from '$lib/utils/chat.js';
import { allowAnonymousChats } from '$lib/utils/constants.js';
import { error } from '@sveltejs/kit';
import {
	appendResponseMessages,
	createDataStreamResponse,
	smoothStream,
	streamText,
	type UIMessage
} from 'ai';
import { ok, safeTry } from 'neverthrow';

const DEBUG = true;

function logDebug(...args: any[]) {
	if (DEBUG) {
		console.debug('[DEBUG]', ...args);
	}
}

export async function POST({ request, locals: { safeGetSession }, cookies }) {
	logDebug('POST request received');
	// TODO: zod?
	const { id, messages }: { id: string; messages: UIMessage[] } = await request.json();
	logDebug('Parsed request JSON:', { id, messages });
	const selectedChatModel = cookies.get('selected-model');
	logDebug('Selected chat model from cookies:', selectedChatModel);

	const { user } = await safeGetSession();
	logDebug('User session:', user);

	if (!user && !allowAnonymousChats) {
		error(401, 'Unauthorized');
	}

	if (!selectedChatModel) {
		error(400, 'No chat model selected');
	}

	const userMessage = getMostRecentUserMessage(messages);

	if (!userMessage) {
		error(400, 'No user message found');
	}

	if (user) {
		await safeTry(async function* () {
    let chat: Chat;
    logDebug('Attempting to fetch chat by ID:', id);
    const chatResult = await getChatById({ id });
    if (chatResult.isErr()) {
        if (chatResult.error._tag === 'DbEntityNotFoundError') {
            logDebug('Chat not found — this is expected for a new chat:', chatResult.error);
        } else {
            console.error('Unexpected DB error fetching chat:', chatResult.error);
            return chatResult;
        }
        logDebug('Generating title from user message');
        try {
            const title = yield* generateTitleFromUserMessage({ message: userMessage });
            logDebug('Title generated successfully:', title);
            
            logDebug('Saving new chat with ID and title:', { id, title });
            chat = yield* saveChat({ id, user_id: user.id, title });
            logDebug('New chat saved:', chat);
        } catch (e) {
            console.error('Error in title generation or chat saving:', e);
            throw e;
        }
    } else {
        logDebug('Chat fetched successfully:', chatResult.value);
        chat = chatResult.value;
    }

    if (chat.user_id !== user.id) {
        error(403, 'Forbidden');
    }

    logDebug('Saving user message:', userMessage);
    try {
        yield* saveMessages({
            messages: [
                {
                    chat_id: id,
                    id: userMessage.id,
                    role: 'user',
                    parts: userMessage.parts,
                    attachments: userMessage.experimental_attachments ?? [],
                    created_at: new Date()
                }
            ]
        });
        logDebug('User message saved successfully');
    } catch (e) {
        console.error('Error saving user message:', e);
        throw e;
    }

    return ok(undefined);
}).orElse((err) => {
	console.error('safeTry failed with error:', err);
	logDebug('safeTry error details:', err);
	throw error(500, 'An error occurred while processing your request: is this a new chat?');
});
	}

	return createDataStreamResponse({
		execute: (dataStream) => {
			const result = streamText({
				model: myProvider.languageModel(selectedChatModel),
				system: systemPrompt({ selectedChatModel }),
				messages,
				maxSteps: 5,
				experimental_activeTools: [],
				// TODO
				// selectedChatModel === 'chat-model-reasoning'
				// 	? []
				// 	: ['getWeather', 'createDocument', 'updateDocument', 'requestSuggestions'],
				experimental_transform: smoothStream({ chunking: 'word' }),
				experimental_generateMessageId: crypto.randomUUID.bind(crypto),
				// TODO
				// tools: {
				// 	getWeather,
				// 	createDocument: createDocument({ session, dataStream }),
				// 	updateDocument: updateDocument({ session, dataStream }),
				// 	requestSuggestions: requestSuggestions({
				// 		session,
				// 		dataStream
				// 	})
				// },
				onFinish: async ({ response, usage }) => {
					if (!user) return;
					const assistantId = getTrailingMessageId({
						messages: response.messages.filter((message) => message.role === 'assistant')
					});
					logDebug('Assistant message ID:', assistantId);

					if (!assistantId) {
						throw new Error('No assistant message found!');
					}

					const [, assistantMessage] = appendResponseMessages({
						messages: [userMessage],
						responseMessages: response.messages
					});
					logDebug('Assistant message to save:', assistantMessage);

					await saveMessages({
						messages: [
							{
								id: assistantId,
								chat_id: id,
								role: assistantMessage.role,
								parts: assistantMessage.parts,
								attachments: assistantMessage.experimental_attachments ?? [],
								created_at: new Date()
							}
						]
					});

					// Log AI usage for cost tracking
					if (usage) {
						const tokens = usage.totalTokens ?? 0;
						const promptTokens = usage.promptTokens ?? 0;
						const completionTokens = usage.completionTokens ?? 0;
						
						// Calculate cost based on model pricing (adjust these rates as needed)
						const inputCostPer1M = 0.10; // $0.10 per 1M input tokens (example rate)
						const outputCostPer1M = 0.40; // $0.40 per 1M output tokens (example rate)
						
						const inputCost = (promptTokens / 1_000_000) * inputCostPer1M;
						const outputCost = (completionTokens / 1_000_000) * outputCostPer1M;
						const totalCostUsd = inputCost + outputCost;

						try {
							await logAIUsage({
								userId: user.id,
								feature: 'chat',
								costUsd: totalCostUsd,
								tokens,
								model: response.modelId,
								metadata: {
									chat_id: id,
									prompt_tokens: promptTokens,
									completion_tokens: completionTokens,
									input_cost: inputCost,
									output_cost: outputCost
								}
							});
							logDebug('AI usage logged:', { tokens, cost: totalCostUsd, model: response.modelId });
						} catch (err) {
							console.error('Failed to log AI usage:', err);
							// Don't fail the request if usage logging fails
						}
					}
				},
				experimental_telemetry: {
					isEnabled: true,
					functionId: 'stream-text'
				}
			});

			result.consumeStream();

			result.mergeIntoDataStream(dataStream, {
				sendReasoning: true
			});
		},
		onError: (e) => {
			logDebug('Stream execution error:', e);
			console.error(e);
			return 'Oops!';
		}
	});
}

export async function DELETE({ locals: { safeGetSession }, request }) {
	// TODO: zod
	const { id }: { id: string } = await request.json();
	const { user } = await safeGetSession();
	if (!user) {
		error(401, 'Unauthorized');
	}

	return await getChatById({ id })
		.andTee((chat) => {
			if (chat.user_id !== user.id) {
				error(403, 'Forbidden');
			}
		})
		.andThen(deleteChatById)
		.match(
			() => new Response('Chat deleted', { status: 200 }),
			() => error(500, 'An error occurred while processing your request')
		);
}
