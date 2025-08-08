<!-- +page.svelte (Improved with Svelte 5 patterns and extracted logic) -->
<script lang="ts">
	import DataTable from '../data-table.svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import { generateColumns, getFilterableColumns } from '$lib/utils/columns.js';
	import DataTableActions from '../data-table-actions.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { createTableActions } from '$lib/utils/table-actions';

	interface Props {
		data: {
			columns: any[];
			rows: Record<string, any>[];
			pagination: any;
			tableMetadata: any;
			tableName: string;
		};
	}

	let { data }: Props = $props();
	
	// Derived state
	const columns = $derived(generateColumns(data.columns));
	const filterableColumns = $derived(getFilterableColumns(data.columns));
	const table = $derived(data.tableName);
	const userRole = 'admin'; // TODO: Get from session/auth context

	// Create table actions handler
	const tableActions = createTableActions({
		table,
		userRole,
		onNavigate: goto,
		onNotify: toast
	});

	// Add actions column to the table
	const columnsWithActions = $derived([
		...columns,
		{
			id: 'actions',
			header: 'Actions',
			cell: ({ row }) =>
				renderComponent(DataTableActions, {
					row: row.original,
					actions: tableActions.getActionsForRow(row.original),
				}),
			enableSorting: false,
			enableHiding: false,
		},
	]);

	// Event handlers
	function handleRowClick(row: Record<string, any>) {
		goto(`/app/tables/${table}/${row.id}`);
	}

	// Computed page title
	const pageTitle = $derived(`${table.charAt(0).toUpperCase() + table.slice(1)} Table`);
</script>

<svelte:head>
	<title>{pageTitle} - Database Table</title>
</svelte:head>

<div class="container mx-auto py-6">
	<header class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight">
			{pageTitle}
		</h1>
		<p class="text-muted-foreground">
			Manage records in the {table} table
		</p>
	</header>

	<DataTable
		columns={columnsWithActions}
		data={data.rows}
		filterColumns={filterableColumns}
		onRowClick={handleRowClick}
		searchPlaceholder={`Search ${table}...`}
		emptyMessage={`No ${table} records found.`}
		tableName={table}
	/>
</div>