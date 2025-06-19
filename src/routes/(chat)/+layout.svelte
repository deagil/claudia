<script lang="ts">
	import { SidebarInset, SidebarProvider } from '$lib/components/ui/sidebar';
	import { ChatHistory } from '$lib/hooks/chat-history.svelte.js';

	let { data, children } = $props();

	const chatHistory = new ChatHistory(data.chats);
	chatHistory.setContext();
	data.selectedChatModel.setContext();
</script>

<SidebarProvider open={!data.sidebarCollapsed}>
	<!-- <AppSidebar data={data} /> -->
	<SidebarInset>{@render children?.()}</SidebarInset>
</SidebarProvider>
