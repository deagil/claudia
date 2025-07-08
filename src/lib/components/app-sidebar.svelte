<script lang="ts">
	import * as Sidebar from "$lib/components/ui/sidebar/index.js";
	import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
	import Chat from "./chat.svelte";
	import { convertToUIMessages } from "$lib/utils/chat.js";
	import { ChatHistory } from '$lib/hooks/chat-history.svelte';

	let { data, children } = $props();

	import { onMount } from 'svelte';

	// Use ChatHistory from context for reactivity
	let chatHistory: ChatHistory | null = $state(null);
	if (typeof ChatHistory?.fromContext === 'function') {
		try {
			chatHistory = ChatHistory.fromContext();
		} catch (e) {
			chatHistory = null;
		}
	}

	// Get the current chat from chatHistory if available, fallback to data.chat
	const currentChat = $derived.by(() => chatHistory?.getChatDetails(data?.chat?.id) ?? data?.chat);
	const chatTitle = $derived.by(() => currentChat?.title ?? 'Chat');

	function handleSelectChat(chatId: string) {
		// Use the callback if provided, otherwise do nothing
		if (chatId !== data?.chat?.id && typeof data?.onSelectChat === 'function') {
			data.onSelectChat(chatId);
		}
	}
</script>
<!-- debug -->
<!-- <div class="bg-purple-200"> -->
<div class="">
		<Sidebar.Root variant="floating" side="right">
			<Chat
			chat={data?.chat}
			initialMessages={convertToUIMessages(data?.messages ?? [])}
			readonly={data?.user?.id !== data?.chat?.userId}
			user={data?.user}
			onSelectChat={handleSelectChat}
		/>
	</Sidebar.Root>
</div>
