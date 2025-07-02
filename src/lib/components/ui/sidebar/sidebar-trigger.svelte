<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import MessageCircleIcon from '@lucide/svelte/icons/message-circle';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { ComponentProps } from 'svelte';
	import { useSidebar } from './context.svelte.js';

	let {
		ref = $bindable(null),
		class: className,
		onclick,
		...restProps
	}: ComponentProps<typeof Button> & {
		onclick?: (e: MouseEvent) => void;
	} = $props();

	const sidebar = useSidebar();
</script>

{#if !sidebar.open}
<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger
			><Button
				data-sidebar="trigger"
				data-slot="sidebar-trigger"
				variant="outline"
				class="md:h-fit md:px-2"
				type="button"
				onclick={(e) => {
					onclick?.(e);
					sidebar.toggle();
				}}
				{...restProps}
			>
				<MessageCircleIcon />
				Chat
				<span class="sr-only">Open Chat</span>
			</Button></Tooltip.Trigger
		>
		<Tooltip.Content>
			<p class="tracking-widest">⌘+B</p>
			<!-- <span class={cn('text-muted-foreground ml-auto text-xs tracking-widest', className)}
					>⇪C</span
				> -->
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
{/if}

