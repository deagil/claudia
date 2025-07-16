<!-- Enhanced DataTable.svelte -->
<script lang="ts" generics="TData, TValue">
	import {
		type ColumnDef,
		type PaginationState,
		type SortingState,
		type ColumnFiltersState,
		type VisibilityState,
		getCoreRowModel,
		getSortedRowModel,
		getPaginationRowModel,
		getFilteredRowModel
	} from '@tanstack/table-core';
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Search, ChevronDown, Eye, EyeOff } from '@lucide/svelte';
	import {
		generateRowKey,
		generateCellKey,
		prepareTableData,
		getRowIdentifier
	} from '$lib/utils/table-utils.js';

	interface DataTableProps<TData, TValue> {
		columns: ColumnDef<TData, TValue>[];
		data: TData[];
		filterColumns?: string[];
		onRowClick?: ((row: TData) => void) | null;
		rowActions?: ((row: TData) => any) | null;
		loading?: boolean;
		emptyMessage?: string;
		showPagination?: boolean;
		pageSize?: number;
		searchPlaceholder?: string;
		tableName?: string;
	}

	const {
		columns,
		data,
		filterColumns = [],
		onRowClick = null,
		rowActions = null,
		loading = false,
		emptyMessage = 'No results found.',
		showPagination = true,
		pageSize = 10,
		searchPlaceholder = 'Search...',
		tableName = 'table'
	} = $props<DataTableProps<TData, TValue>>();

	// Prepare data with unique identifiers
	const preparedData = $derived(prepareTableData(data, tableName));

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let columnVisibility = $state<VisibilityState>({});
	let globalFilter = $state<string>('');

	const table = createSvelteTable({
		get data() {
			return preparedData;
		},
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onPaginationChange: (updater) => {
			pagination = typeof updater === 'function' ? updater(pagination) : updater;
		},
		onSortingChange: (updater) => {
			sorting = typeof updater === 'function' ? updater(sorting) : updater;
		},
		onColumnFiltersChange: (updater) => {
			columnFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
		},
		onColumnVisibilityChange: (updater) => {
			columnVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
		},
		onGlobalFilterChange: (updater) => {
			globalFilter = typeof updater === 'function' ? updater(globalFilter) : updater;
		},
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnFilters() {
				return columnFilters;
			},
			get columnVisibility() {
				return columnVisibility;
			},
			get globalFilter() {
				return globalFilter;
			}
		}
	});

	// Get visible columns count for empty state
	const visibleColumnsCount = $derived(
		table.getAllColumns().filter((col) => col.getIsVisible()).length
	);
</script>

<div class="w-full space-y-4">
	<!-- Search and Controls -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div class="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
			<!-- Global search -->
			<div class="relative max-w-sm flex-1">
				<Search class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
				<Input placeholder={searchPlaceholder} bind:value={globalFilter} class="pl-10" />
			</div>

			<!-- Column filters -->
			{#if filterColumns.length > 0}
				<div class="flex gap-2">
					{#each filterColumns as col}
						<Input
							placeholder={`Filter ${col}...`}
							value={table.getColumn(col)?.getFilterValue() as string}
							oninput={(e) => table.getColumn(col)?.setFilterValue(e.currentTarget.value)}
							class="max-w-40"
						/>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Column visibility dropdown -->
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				<Button variant="outline">
					<EyeOff class="mr-2 h-4 w-4" />
					View
					<ChevronDown class="ml-2 h-4 w-4" />
				</Button>
			</DropdownMenu.Trigger>
			<DropdownMenu.Content align="end" class="w-[200px]">
				<DropdownMenu.Label>Toggle columns</DropdownMenu.Label>
				<DropdownMenu.Separator />
				{#each table.getAllColumns().filter((col) => col.getCanHide()) as column (column.id)}
					<DropdownMenu.CheckboxItem
						class="capitalize"
						checked={column.getIsVisible()}
						onCheckedChange={(value) => column.toggleVisibility(!!value)}
					>
						{column.id}
					</DropdownMenu.CheckboxItem>
				{/each}
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</div>
	<!-- Table -->
	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup, groupIndex (`header-group-${groupIndex}`)}
					<Table.Row>
						{#each headerGroup.headers as header, headerIndex (`header-${groupIndex}-${headerIndex}-${header.column.id}`)}
							<Table.Head class="whitespace-nowrap">
								{#if !header.isPlaceholder}
									<FlexRender
										content={header.column.columnDef.header}
										context={header.getContext()}
									/>
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#if loading}
					{#each Array(pageSize) as _, i (`loading-${i}`)}
						<Table.Row>
							{#each columns as _, j (`loading-cell-${i}-${j}`)}
								<Table.Cell>
									<Skeleton class="h-4 w-full" />
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else if table.getRowModel().rows.length}
					{#each table.getRowModel().rows as row, index (generateRowKey(row.original, index, tableName))}
						<Table.Row
							data-state={row.getIsSelected() && 'selected'}
							class="hover:bg-muted/50 cursor-pointer"
							onclick={() => onRowClick?.(row.original)}
						>
							{#each row.getVisibleCells() as cell, cellIndex (generateCellKey(cell, index, cell.column.id, tableName))}
								<Table.Cell class="whitespace-nowrap">
									<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={visibleColumnsCount} class="h-24 text-center">
							{emptyMessage}
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<!-- Pagination -->
	{#if showPagination}
		<div class="flex items-center justify-between">
			<!-- Results count -->
			<!-- <div class="flex items-center justify-between">
			
			</div> -->

			<div class="flex items-center space-x-2">
					<div class="flex items-center gap-2">
					<Badge variant="secondary">
						{table.getFilteredRowModel().rows.length} of {preparedData.length} record(s)
					</Badge>
					{#if globalFilter || columnFilters.length > 0}
						<Button
							variant="ghost"
							size="sm"
							onclick={() => {
								globalFilter = '';
								columnFilters = [];
							}}
						>
							Clear filters
						</Button>
					{/if}
				</div>
				<p class="text-muted-foreground text-sm">
					Records per page: {table.getState().pagination.pageSize}
				</p>
			</div>
			<div class="flex items-center space-x-2">
				<p class="text-muted-foreground text-sm">
					Page {table.getState().pagination.pageIndex + 1} of{' '}
					{table.getPageCount()}
				</p>
				<div class="flex items-center space-x-2">
					<Button
						variant="outline"
						size="sm"
						onclick={() => table.setPageIndex(0)}
						disabled={!table.getCanPreviousPage()}
					>
						First
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => table.previousPage()}
						disabled={!table.getCanPreviousPage()}
					>
						Previous
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => table.nextPage()}
						disabled={!table.getCanNextPage()}
					>
						Next
					</Button>
					<Button
						variant="outline"
						size="sm"
						onclick={() => table.setPageIndex(table.getPageCount() - 1)}
						disabled={!table.getCanNextPage()}
					>
						Last
					</Button>
				</div>
			</div>
		</div>
	{/if}
</div>
