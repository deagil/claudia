<script lang="ts">
	import { useSidebar } from './ui/sidebar';
	import SidebarToggle from './sidebar-toggle.svelte';
	import { innerWidth } from 'svelte/reactivity/window';
	import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
	import { Button } from './ui/button';
	import PlusIcon from './icons/plus.svelte';
	import { goto } from '$app/navigation';
	import ModelSelector from './model-selector.svelte';
	import type { Chat, User } from '$lib/server/db/schema';
	import VisibilitySelector from './visibility-selector.svelte';
	import VercelIcon from './icons/vercel.svelte';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import MessageCircleOff from '@lucide/svelte/icons/message-circle-off';
	import MessageCircle from '@lucide/svelte/icons/message-circle';
	import * as Menubar from '$lib/components/ui/menubar/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import SidebarTrigger from './ui/sidebar/sidebar-trigger.svelte';
	import { ChatHistory } from '$lib/hooks/chat-history.svelte';

	let {
		user,
		chat,
		readonly,
		onSelectChat
	}: {
		user: User | undefined;
		chat: Chat | undefined;
		readonly: boolean;
		onSelectChat?: (chatId: string) => void;
	} = $props();

	let bookmarks = $state(false);
	let fullUrls = $state(true);
	let personalise = $state(false);
	let profileRadioValue = $state('benoit');

	const sidebar = useSidebar();

	function closeChat() {
		// Your logic here
		sidebar.toggle();
	}

	// Use safe context access
	let chatHistory: ChatHistory | null = $state(null);
	if (typeof ChatHistory?.fromContext === 'function') {
		try {
			chatHistory = ChatHistory.fromContext();
		} catch (e) {
			chatHistory = null;
		}
	}

	console.log('[ChatHeader] chatHistory:', chatHistory);

	const currentChat = $derived.by(
		() => (chat?.id ? chatHistory?.getChatDetails(chat.id) : undefined) ?? chat,
	);
		
	const chatTitle = $derived.by(() => currentChat?.title ?? 'Chat');

	function handleSelectChat(chatId: string) {
		console.log('[ChatHeader] handleSelectChat called with chatId:', chatId);
		if (chatId !== chat?.id && typeof onSelectChat === 'function') {
			onSelectChat(chatId);
		}
	}

	$effect(() => {
		console.log('[ChatHeader] chatHistory:', chatHistory);
		console.log('[ChatHeader] chat:', chat);
		console.log('[ChatHeader] currentChat:', currentChat);
		console.log('[ChatHeader] chatTitle:', chatTitle);
		if (chatHistory) {
			console.log('[ChatHeader] chatHistory.chats:', chatHistory.chats);
		}
	});


</script>
<!-- DEBUG -->
<!-- <header class="bg-green-200 sticky top-0 flex items-right gap-2 p-2"> -->

<header class=" sticky top-0 flex items-right gap-2 p-2">
	{#if !sidebar.open || (innerWidth.current ?? 768) < 768}
		<Tooltip>
			<TooltipTrigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="outline"
						class="order-2 ml-auto px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
						onclick={() => {
							goto('/', {
								invalidateAll: true
							});
						}}
					>
						<PlusIcon />
						<span class="md:sr-only">New Chat</span>
					</Button>
				{/snippet}
			</TooltipTrigger>
			<TooltipContent>New Chat</TooltipContent>
		</Tooltip>
	{/if}

	<!-- {#if !readonly}
		<ModelSelector class="order-1 md:order-2" />
	{/if} -->

	{#if !readonly && chat}
		<VisibilitySelector {chat} class="order-1 md:order-3" />
	{/if}

	<!-- {#if !user}
		<Button href="/signin" class="order-5 px-2 py-1.5 md:h-[34px]">Sign In</Button>
	{/if} -->

	<Menubar.Root>
		<Menubar.Menu>
			<!-- Chat -->
			<Menubar.Trigger><MessageCircle class="size-4 mr-1"/>Chat</Menubar.Trigger>
			<Menubar.Content>
				<Menubar.Item>
					New Chat <Menubar.Shortcut>⌘T</Menubar.Shortcut>
				</Menubar.Item>
				<Menubar.Separator />
				<Menubar.Sub>
					<Menubar.SubTrigger>History</Menubar.SubTrigger>
					<Menubar.SubContent>				<!-- previous chats here -->
					 {#if chatHistory && chatHistory.chats.length > 0}
						{#each chatHistory.chats as chat}
							<Menubar.Item onclick={() => handleSelectChat(chat.id)}>
								{chat.title}
							</Menubar.Item>
						{/each}
					 {/if}
						{#if chatHistory && chatHistory.chats.length === 0}
							<Menubar.Item disabled>No chats found</Menubar.Item>
						{/if}
					</Menubar.SubContent>
				</Menubar.Sub>
				<Menubar.Separator />
				<!-- <Menubar.Item>
					Print... <Menubar.Shortcut>⌘P</Menubar.Shortcut>
				</Menubar.Item> -->
				<Menubar.Item>
					<button onclick={() => closeChat()}>
						Hide Chat 
					</button>
					<Menubar.Shortcut>⌘B</Menubar.Shortcut>
				</Menubar.Item>
			</Menubar.Content>
		</Menubar.Menu>
		 <Separator orientation="vertical" class="data-[orientation=vertical]:h-4" />
		<Menubar.Menu>
			<Menubar.Trigger>Tools</Menubar.Trigger>
			<Menubar.Content>
				<Menubar.Item>
					Summarise Page <Menubar.Shortcut>⇪S</Menubar.Shortcut>
				</Menubar.Item>
				<Menubar.Item>
					Summarise Chat <Menubar.Shortcut>⌘⇪S</Menubar.Shortcut>
				</Menubar.Item>
			</Menubar.Content>
		</Menubar.Menu>
		<Menubar.Menu>
			<Menubar.Trigger>Personalise</Menubar.Trigger>
			<Menubar.Content>
				<Menubar.CheckboxItem bind:checked={personalise}>Use Personalisation</Menubar.CheckboxItem>
				<Menubar.Separator />
				<Menubar.Item inset>Edit Styles...</Menubar.Item>
			</Menubar.Content>
		</Menubar.Menu>
	</Menubar.Root>
	{#if chatTitle}
		<h1 class="text-lg font-bold">{chatTitle}</h1>
	{/if}
	<SidebarTrigger/>
</header>
