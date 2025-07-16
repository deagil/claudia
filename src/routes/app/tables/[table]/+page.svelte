<!-- +page.svelte -->
<script lang="ts">
	import DataTable from '../data-table.svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import { generateColumns, getFilterableColumns } from '$lib/utils/columns.js';
	import DataTableActions from '../data-table-actions.svelte';
	import { page } from '$app/state';
	import {
		Clipboard,
		Wrench,
		FilePlus2,
		TextSearch,
		PencilLine,
		Trash2,
		ExternalLink,
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';

	let { data } = $props();
	
	// Generate columns from fetched metadata
	const columns = generateColumns(data.columns);
	const filterableColumns = getFilterableColumns(data.columns);
	const table = data.tableName;
	const userRole = 'admin'; // Get from session/auth

	// Add actions column
	const columnsWithActions = [
		...columns,
		{
			id: 'actions',
			header: 'Actions',
			cell: ({ row }) =>
				renderComponent(DataTableActions, {
					row: row.original,
					actions: getActionsForRow(row.original),
				}),
			enableSorting: false,
			enableHiding: false,
		},
	];

	function getActionsForRow(row: any) {
		const actions = [
			{
				label: 'View Details',
				icon: TextSearch,
				onClick: () => handleView(row),
				show: true,
				group: 'primary',
			},
			{
				label: 'Edit Record',
				icon: PencilLine,
				onClick: () => handleEdit(row),
				show: userRole === 'admin',
				group: 'primary',
			},
			{
				label: 'Open in New Tab',
				icon: ExternalLink,
				onClick: () => handleOpenInNewTab(row),
				show: true,
				group: 'primary',
			},
		];

		// Add copy actions for common fields
		if (row.id) {
			actions.push({
				label: 'Copy ID',
				icon: Clipboard,
				onClick: () => handleCopy(row.id, 'ID'),
				show: true,
				group: 'copy',
			});
		}

		if (row.created_at) {
			actions.push({
				label: 'Copy Created At',
				icon: FilePlus2,
				onClick: () => handleCopy(row.created_at, 'Created At'),
				show: true,
				group: 'copy',
			});
		}

		// Add any other copyable fields
		Object.entries(row).forEach(([key, value]) => {
			if (key !== 'id' && key !== 'created_at' && value && typeof value === 'string') {
				actions.push({
					label: `Copy ${key.replace('_', ' ')}`,
					icon: Clipboard,
					onClick: () => handleCopy(value, key),
					show: true,
					group: 'copy',
				});
			}
		});

		// Add destructive actions
		if (userRole === 'admin') {
			actions.push({
				label: 'Delete Record',
				icon: Trash2,
				onClick: () => handleDelete(row),
				show: true,
				group: 'destructive',
				variant: 'destructive',
			});
		}

		return actions;
	}

	function handleView(row: any) {
		goto(`/app/tables/${table}/${row.id}`);
	}

	function handleEdit(row: any) {
		goto(`/app/tables/${table}/${row.id}/edit`);
	}

	function handleOpenInNewTab(row: any) {
		window.open(`/app/tables/${table}/${row.id}`, '_blank');
	}

	function handleCopy(value: string, fieldName: string) {
		navigator.clipboard.writeText(value).then(() => {
			toast.success(`${fieldName} copied to clipboard`);
		}).catch(() => {
			toast.error('Failed to copy to clipboard');
		});
	}

	function handleDelete(row: any) {
		if (confirm(`Are you sure you want to delete this record?`)) {
			// Implement delete logic
			console.log('Deleting row:', row);
			toast.success('Record deleted successfully');
		}
	}

	function handleRowClick(row: any) {
		goto(`/app/tables/${table}/${row.id}`);
	}
</script>

<svelte:head>
	<title>{table} - Database Table</title>
</svelte:head>

<div class="container mx-auto py-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold tracking-tight">
			{table.charAt(0).toUpperCase() + table.slice(1)} Table
		</h1>
		<p class="text-muted-foreground">
			Manage records in the {table} table
		</p>
	</div>

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