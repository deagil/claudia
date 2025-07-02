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


	let { data, children } = $props();

	let sidebarWidth = 0;
	let commandOpen = $state(false);

	const sidebar = useSidebar();

	const chatHistory = new ChatHistory(data.chats);
	chatHistory.setContext();
	data.selectedChatModel.setContext();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			commandOpen = !commandOpen;
		}

		if (e.key === 'h' && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			sidebar.setOpen(!sidebar.open);
		}
	}

	const components: { title: string; href: string; description: string }[] = [
		{
			title: 'Alert Dialog',
			href: '/docs/primitives/alert-dialog',
			description:
				'A modal dialog that interrupts the user with important content and expects a response.'
		},
		{
			title: 'Hover Card',
			href: '/docs/primitives/hover-card',
			description: 'For sighted users to preview content available behind a link.'
		},
		{
			title: 'Progress',
			href: '/docs/primitives/progress',
			description:
				'Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.'
		},
		{
			title: 'Scroll-area',
			href: '/docs/primitives/scroll-area',
			description: 'Visually or semantically separates content.'
		},
		{
			title: 'Tabs',
			href: '/docs/primitives/tabs',
			description:
				'A set of layered sections of content—known as tab panels—that are displayed one at a time.'
		},
		{
			title: 'Tooltip',
			href: '/docs/primitives/tooltip',
			description:
				'A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.'
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
	<Sidebar.Inset>
		<div class="flex w-full items-center px-2 py-2">
			<!--uncomment below div to make the navbar centered -->
			<!-- <div class="flex-1"></div> -->
			<!-- Centered navigation menu -->
			<div class="justify-left flex flex-1">
				<NavigationMenu.Root viewport={false}>
					<NavigationMenu.List>
						<NavigationMenu.Item>
							<NavigationMenu.Trigger>Home</NavigationMenu.Trigger>
							<NavigationMenu.Content>
								<ul class="grid gap-2 p-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]">
									<li class="row-span-3">
										<NavigationMenu.Link
											class="from-muted/50 to-muted flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b p-6 no-underline outline-hidden select-none focus:shadow-md"
										>
											{#snippet child({ props })}
												<a {...props} href="/">
													<div class="mt-4 mb-2 text-lg font-medium">shadcn-svelte</div>
													<p class="text-muted-foreground text-sm leading-tight">
														Beautifully designed components built with Tailwind CSS.
													</p>
												</a>
											{/snippet}
										</NavigationMenu.Link>
									</li>
									{@render ListItem({
										href: '/docs',
										title: 'Introduction',
										content: 'Re-usable components built using Bits UI and Tailwind CSS.'
									})}
									{@render ListItem({
										href: '/docs/installation',
										title: 'Installation',
										content: 'How to install dependencies and structure your app.'
									})}
									{@render ListItem({
										href: '/docs/primitives/typography',
										title: 'Typography',
										content: 'Styles for headings, paragraphs, lists...etc'
									})}
								</ul>
							</NavigationMenu.Content>
						</NavigationMenu.Item>
						<NavigationMenu.Item>
							<NavigationMenu.Trigger>Components</NavigationMenu.Trigger>
							<NavigationMenu.Content>
								<ul class="grid w-[400px] gap-2 p-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
									{#each components as component, i (i)}
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
							<NavigationMenu.Link>
								{#snippet child()}
									<a href="/docs" class={navigationMenuTriggerStyle()}>Docs</a>
								{/snippet}
							</NavigationMenu.Link>
						</NavigationMenu.Item>
						<NavigationMenu.Item>
							<NavigationMenu.Trigger>Connections</NavigationMenu.Trigger>
							<NavigationMenu.Content>
								<ul class="grid w-[300px] gap-4 p-2">
									<li>
										<NavigationMenu.Link href="/app/connect/supabase" class="flex flex-row items-center gap-3">
											<img src="/logos/supabase.svg" alt="Supabase logo" class="h-6 w-6" />
											<div class="flex flex-col">
												<div class="font-medium">Supabase</div>
												<div class="text-muted-foreground">Data, auth and functions.</div>
											</div>
										</NavigationMenu.Link>
									</li>
								</ul>
							</NavigationMenu.Content>
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
			<header class="flex h-10 shrink-0 items-center gap-2 px-4">
				<Breadcrumb.Root>
					<Breadcrumb.List>
						<Breadcrumb.Item class="hidden md:block">
							<Breadcrumb.Link href="#">Building Your Application</Breadcrumb.Link>
						</Breadcrumb.Item>
						<Breadcrumb.Separator class="hidden md:block" />
						<Breadcrumb.Item>
							<Breadcrumb.Page>Data Fetching</Breadcrumb.Page>
						</Breadcrumb.Item>
					</Breadcrumb.List>
				</Breadcrumb.Root>
			</header>
		</div>
		{@render children?.()}
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
