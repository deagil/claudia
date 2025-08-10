<script lang="ts">
	import type { Chat } from '@ai-sdk/svelte';
	import { Button } from './ui/button';
	import { fly } from 'svelte/transition';
	import { replaceState } from '$app/navigation';
	import type { User } from '$lib/server/db/schema';

	let { user, chatClient }: { user: User | undefined; chatClient: Chat } = $props();

	const suggestedActions = [
		{
			title: 'Write code to',
			label: `demonstrate djikstra's algorithm`,
			action: `Write code to demonstrate djikstra's algorithm`
		},
		{
			title: 'Help me write an essay',
			label: `about silicon valley`,
			action: `Help me write an essay about silicon valley`
		},
		{
			title: 'What is the weather like',
			label: 'in San Francisco?',
			action: 'What is the weather like in San Francisco?'
		}
	];
</script>

<div class="grid w-full gap-2 sm:grid-cols-1">
	{#each suggestedActions as suggestedAction, i (suggestedAction.title)}
		<div
			in:fly|global={{ opacity: 0, y: 20, delay: 50 * i, duration: 400 }}
			class={i > 1 ? 'hidden sm:block' : 'block'}
		>
			<Button
				variant="ghost"
				style="cursor: pointer"
				onclick={async () => {
					if (user) {
						replaceState(`/chat/${chatClient.id}`, {});
					}
					try {
						await chatClient.sendMessage({
							text: suggestedAction.action
						});
					} catch (error) {
						console.error('Error sending suggested action:', error);
					}
				}}
				class="bg-secondary hover:bg-background h-auto w-full flex-1 items-start justify-start gap-1 rounded-xl border px-4 py-3.5 text-left text-sm sm:flex-col whitespace-normal break-words"
			>
			<span>
				<span class="font-medium">{suggestedAction.title}</span>
				<span class="text-muted-foreground">
					{suggestedAction.label}
				</span>
				</span>
			</Button>
		</div>
	{/each}
</div>
