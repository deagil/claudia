<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte.js';
	import { ChatHistory } from '$lib/hooks/chat-history.svelte.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js';
	import { cn } from '$lib/utils/shadcn.js';
	import type { HTMLAttributes } from 'svelte/elements';
	import CircleIcon from '@lucide/svelte/icons/circle';
	import { navigationMenuTriggerStyle } from '$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import MoveLeft from '@lucide/svelte/icons/move-left';
	import { navigating } from '$app/stores';
	import { expoOut } from 'svelte/easing';
	import { slide } from 'svelte/transition';

	let { data, children } = $props();
	let commandOpen = $state(false);
	const sessions = data.sessionData;
	
	const chatHistory = new ChatHistory(data.chats);
	chatHistory.setContext();
	data.selectedChatModel.setContext();

	function toggleCommand() {
		commandOpen = !commandOpen;
	}

	//keyboard shortcuts
	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			commandOpen = !commandOpen;
		}
	}

	const dataMenuItems: { title: string; href: string; description: string }[] = [
		{
			title: 'Tables',
			href: '/app/tables',
			description: 'Document your tables, view record history.'
		}
	];

	type ListItemProps = HTMLAttributes<HTMLAnchorElement> & {
		title: string;
		href: string;
		content: string;
	};
</script>

<svelte:document onkeydown={handleKeydown} />

{#snippet ListItem({ title, content, href, class: className, ...restProps }: ListItemProps)}
	<li>
		<NavigationMenu.Link>
			{#snippet child()}
				<a
					{href}
					class={cn(
						'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground block space-y-1 rounded-md p-3 leading-none no-underline transition-colors outline-none select-none',
						className
					)}
					{...restProps}
				>
					<div class="text-sm leading-none font-medium">{title}</div>
					<p class="text-muted-foreground line-clamp-2 text-sm leading-snug">
						{content}
					</p>
				</a>
			{/snippet}
		</NavigationMenu.Link>
	</li>
{/snippet}

<Sidebar.Provider style="--sidebar-width: 25rem;" open={!data.sidebarCollapsed}>
	<Sidebar.Inset class="min-w-0 flex-1">
		<div class="flex w-full items-center px-2 py-2">
			<!--uncomment below div to make the navbar centered -->
			<!-- <div class="flex-1"></div> -->
			<!-- Centered navigation menu -->
			<div class="justify-left flex flex-1">
				<NavigationMenu.Root viewport={false}>
					<NavigationMenu.List>
						<NavigationMenu.Item>
							<NavigationMenu.Trigger>Claudia</NavigationMenu.Trigger>
							<NavigationMenu.Content>
								<ul class="grid gap-2 p-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
									<li class="row-span-3">
										<NavigationMenu.Link
											class="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-6 no-underline outline-hidden select-none focus:shadow-md"
										>
											{#snippet child({ props })}
												<a {...props} href="/">
													<div class="flex flex-row items-center gap-3">
														<!-- <MoveLeft class="mb-2 size-4" /> -->
														<div class="mt-4 mb-2 text-lg font-medium">Exit App</div>
													</div>
													<p class="text-muted-foreground text-sm leading-tight">
														Return to the marketing site; you won't be signed out of Claudia.
													</p>
												</a>
											{/snippet}
										</NavigationMenu.Link>
									</li>
									{@render ListItem({
										href: `/app/profile/${data.profileData?.firstname}`,
										title: 'My Preferences',
										content: `Signed in as ${data.profileData.firstname} ${data.profileData.lastname}`
									})}
									{@render ListItem({
										href: '/app/organisation',
										title: 'Organisation Settings',
										content: `Manage settings for ${data.selectedOrg.name}`
									})}
									{@render ListItem({
										href: '/signout',
										title: 'Sign Out',
										content: 'Log out of your account'
									})}
								</ul>
							</NavigationMenu.Content>
						</NavigationMenu.Item>
						<Separator orientation="vertical" class="data-[orientation=vertical]:h-4" />

						<NavigationMenu.Item>
							<NavigationMenu.Link>
								{#snippet child()}
									<a href="/activity" class={navigationMenuTriggerStyle()}>Activity</a>
								{/snippet}
							</NavigationMenu.Link>
						</NavigationMenu.Item>
						<NavigationMenu.Item>
							<NavigationMenu.Trigger>Data</NavigationMenu.Trigger>
							<NavigationMenu.Content>
								<ul class="grid w-[400px] gap-2 p-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
									{#each dataMenuItems as component, i (i)}
										{@render ListItem({
											href: component.href,
											title: component.title,
											content: component.description
										})}
									{/each}
								</ul>
							</NavigationMenu.Content>
						</NavigationMenu.Item>
						<NavigationMenu.Item>
							<NavigationMenu.Trigger>Connections</NavigationMenu.Trigger>
							<NavigationMenu.Content>
								<ul class="grid w-[300px] gap-4 p-2">
									<li>
										<NavigationMenu.Link
											href="/app/connect/supabase"
											class="flex flex-row items-center gap-3"
										>
											<img src="/logos/supabase.svg" alt="Supabase logo" class="h-6 w-6" />
											<div class="flex flex-col">
												<div class="font-medium">Supabase</div>
												<div class="text-muted-foreground">Data, auth and functions.</div>
											</div>
										</NavigationMenu.Link>
									</li>
									<li>
										<NavigationMenu.Link
											href="/app/connect/openai"
											class="flex flex-row items-center gap-3"
										>
											<img src="/logos/openai.svg" alt="OpenAI logo" class="h-6 w-6" />
											<div class="flex flex-col">
												<div class="font-medium">OpenAI</div>
												<div class="text-muted-foreground">Add your own key for Copilot.</div>
											</div>
										</NavigationMenu.Link>
									</li>
								</ul>
							</NavigationMenu.Content>
						</NavigationMenu.Item>
						<!-- command palette trigger -->
						<NavigationMenu.Item>
							<NavigationMenu.Link>
								<button
									type="button"
									onclick={toggleCommand}
									class={navigationMenuTriggerStyle()}
									style="cursor: pointer">Search</button
								>
								<!-- {#snippet child()}
								 <Tooltip.Provider>
						<Tooltip.Root>
							<Tooltip.Trigge</Tooltip.Trigger>
							<Tooltip.Content>
							<p>⌘ + K</p>
							</Tooltip.Content>
						</Tooltip.Root>
						</Tooltip.Provider>
									
								{/snippet} -->
							</NavigationMenu.Link>
						</NavigationMenu.Item>
					</NavigationMenu.List>
				</NavigationMenu.Root>
			</div>
			<!-- Right-aligned sidebar trigger -->
			<div class="flex flex-1 justify-end">
				<div class="pt-1 pr-1">
					<Sidebar.Trigger />
				</div>
			</div>
		</div>
		<div>
			<header class="flex h-2 shrink-0 items-center gap-2 px-4">
				<!-- <Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item class="hidden md:block">
							<Breadcrumb.Link href="#">Building Your Application</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator class="hidden md:block" />
						<Breadcrumb.Item>
							<Breadcrumb.Page>Data Fetching</Breadcrumb.Page>
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb.Root> -->
			</header>
		</div>
		{#if data.sidebarCollapsed}
		<div class="px-6 py-2">{@render children?.()}</div>
		{:else}
		<div class="px-2 py-2">{@render children?.()}</div>
		{/if}
		
		
	</Sidebar.Inset>
	<AppSidebar {data} />
</Sidebar.Provider>
<Command.Dialog open={commandOpen} onOpenChange={(e) => (commandOpen = e.detail)}>
	<Command.Input placeholder="Type a command or search..." />
	<Command.List>
		<Command.Empty>No results found.</Command.Empty>
		<Command.Group heading="Suggestions">
			<Command.Item>
				<CircleIcon class="mr-2 size-4" />
				<span>Calendar</span>
			</Command.Item>
			<Command.Item>
				<CircleIcon class="mr-2 size-4" />
				<span>Search Emoji</span>
			</Command.Item>
			<Command.Item>
				<CircleIcon class="mr-2 size-4" />
				<span>Calculator</span>
			</Command.Item>
		</Command.Group>
		<Command.Separator />
		<Command.Group heading="Settings">
			<Command.Item>
				<CircleIcon class="mr-2 size-4" />
				<span>Profile</span>
				<Command.Shortcut>⌘P</Command.Shortcut>
			</Command.Item>
			<Command.Item>
				<CircleIcon class="mr-2 size-4" />
				<span>Billing</span>
				<Command.Shortcut>⌘B</Command.Shortcut>
			</Command.Item>
			<Command.Item>
				<CircleIcon class="mr-2 size-4" />
				<span>Settings</span>
				<Command.Shortcut>⌘S</Command.Shortcut>
			</Command.Item>
		</Command.Group>
	</Command.List>
</Command.Dialog>

{#if $navigating}
	<!-- 
	Loading animation for next page since svelte doesn't show any indicator. 
	- delay 100ms because most page loads are instant, and we don't want to flash 
	- long 12s duration because we don't actually know how long it will take
	- exponential easing so fast loads (>100ms and <1s) still see enough progress,
	while slow networks see it moving for a full 12 seconds
-->
	<div
		class="bg-primary fixed top-0 right-0 left-0 z-50 h-1 w-full"
		in:slide={{ delay: 100, duration: 12000, axis: 'x', easing: expoOut }}
	></div>
{/if}
