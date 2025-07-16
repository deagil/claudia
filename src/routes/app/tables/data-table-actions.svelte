<!-- DataTableActions.svelte -->
<script lang="ts">
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { MoreHorizontal } from '@lucide/svelte';

	export interface TableAction {
		label: string;
		icon: any;
		onClick: (row: any) => void;
		show: boolean;
		group?: string;
		variant?: 'default' | 'destructive';
	}

	interface Props {
		row: any;
		actions: TableAction[];
	}

	const { row, actions } = $props<Props>();

	// Group actions by their group property
	const groupedActions = $derived(actions.reduce((acc, action) => {
		if (!action.show) return acc;
		
		const group = action.group || 'default';
		if (!acc[group]) {
			acc[group] = [];
		}
		acc[group].push(action);
		return acc;
	}, {} as Record<string, TableAction[]>));

	const visibleActions = $derived(actions.filter(action => action.show));
</script>

{#if visibleActions.length > 0}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			<Button
				variant="ghost"
				size="sm"
				class="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
			>
				<MoreHorizontal class="h-4 w-4" />
				<span class="sr-only">Open menu</span>
			</Button>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="w-[200px]">
			<DropdownMenu.Label>Actions</DropdownMenu.Label>
			<DropdownMenu.Separator />
			
			{#each Object.entries(groupedActions) as [groupName, groupActions], groupIndex}
				{#if groupIndex > 0}
					<DropdownMenu.Separator />
				{/if}
				
				{#each groupActions as action}
					<DropdownMenu.Item
						class="flex items-center gap-2 {action.variant === 'destructive' ? 'text-destructive focus:text-destructive' : ''}"
						onclick={() => action.onClick(row)}
					>
						<svelte:component this={action.icon} class="h-4 w-4" />
						{action.label}
					</DropdownMenu.Item>
				{/each}
			{/each}
		</DropdownMenu.Content>
	</DropdownMenu.Root>
{/if}