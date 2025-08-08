<script lang="ts">
	import { goto } from '$app/navigation';
	import DataTable from './data-table.svelte';
	const columns = [
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'description', header: 'Description' },
		{ accessorKey: 'row_estimate', header: 'Row Estimate' },
		{ accessorKey: 'total_size_pretty', header: 'Table Size' },
		{ accessorKey: 'rls_enabled', header: 'RLS Enabled' }
	];
	let { data } = $props();
	function handleRowClick(row: { name: any }) {
		// navigate to the table detail page
		goto(`/app/tables/${row.name}`);
	}
</script>

<div class="flex flex-1 flex-col gap-4 py-4">
	<!-- <div class="grid auto-rows-min gap-4 md:grid-cols-3">
		<div class="bg-muted/50 aspect-video rounded-xl"></div>
		<div class="bg-muted/50 aspect-video rounded-xl"></div>
		<div class="bg-muted/50 aspect-video rounded-xl"></div>
	</div> -->
	<DataTable {columns} data={data.tables} filterColumns={['name']} onRowClick={handleRowClick} />
</div>
