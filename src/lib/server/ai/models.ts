import { createOpenAI } from '@ai-sdk/openai';
import { customProvider, extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { PRIVATE_OPENAI_KEY } from '$env/static/private';

const openai = createOpenAI({ apiKey: PRIVATE_OPENAI_KEY, compatibility: 'strict' });

export const myProvider = customProvider({
	languageModels: {
		'title-model': openai('gpt-4.1-nano'),
		'chat-model': openai('gpt-4.1-nano'),
		'chat-model-reasoning': wrapLanguageModel({
			model: openai('o4-mini'),
			middleware: extractReasoningMiddleware({ tagName: 'think' })
		}),
	},
	// imageModels: {
	// 	'vercel-image': openai.image('dalle-2')
	// }
});

// export const myProvider = customProvider({
// 	languageModels: {
// 		'chat-model': xai('grok-2-1212'),
// 		'chat-model-reasoning': wrapLanguageModel({
// 			model: groq('deepseek-r1-distill-llama-70b'),
// 			middleware: extractReasoningMiddleware({ tagName: 'think' })
// 		}),
// 		'title-model': xai('grok-2-1212'),
// 		'artifact-model': xai('grok-2-1212')
// 	},
// 	imageModels: {
// 		'small-model': xai.image('grok-2-image')
// 	}
// });
