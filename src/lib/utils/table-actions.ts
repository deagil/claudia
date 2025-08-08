// $lib/utils/table-actions.ts
import {
	Clipboard,
	TextSearch,
	PencilLine,
	Trash2,
	ExternalLink,
	FilePlus2,
} from '@lucide/svelte';

interface TableActionConfig {
	table: string;
	userRole: string;
	onNavigate: (url: string) => void;
	onNotify: (toast: { success: (msg: string) => void; error: (msg: string) => void }) => void;
}

interface TableAction {
	label: string;
	icon: any;
	onClick: () => void;
	show: boolean;
	group: 'primary' | 'copy' | 'destructive';
	variant?: 'destructive';
}

export function createTableActions(config: TableActionConfig) {
	const { table, userRole, onNavigate, onNotify } = config;

	function handleView(row: Record<string, any>) {
		onNavigate(`/app/tables/${table}/${row.id}`);
	}

	function handleEdit(row: Record<string, any>) {
		onNavigate(`/app/tables/${table}/${row.id}/edit`);
	}

	function handleOpenInNewTab(row: Record<string, any>) {
		window.open(`/app/tables/${table}/${row.id}`, '_blank');
	}

	function handleCopy(value: string, fieldName: string) {
		navigator.clipboard
			.writeText(value)
			.then(() => {
				onNotify.success(`${fieldName} copied to clipboard`);
			})
			.catch(() => {
				onNotify.error('Failed to copy to clipboard');
			});
	}

	function handleDelete(row: Record<string, any>) {
		if (confirm(`Are you sure you want to delete this record?`)) {
			// TODO: Implement actual delete logic
			console.log('Deleting row:', row);
			onNotify.success('Record deleted successfully');
		}
	}

	function getActionsForRow(row: Record<string, any>): TableAction[] {
		const actions: TableAction[] = [
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

		// Add copy actions for other string fields
		Object.entries(row).forEach(([key, value]) => {
			if (
				key !== 'id' && 
				key !== 'created_at' && 
				value && 
				typeof value === 'string' &&
				value.length < 200 // Only for reasonably short values
			) {
				actions.push({
					label: `Copy ${key.replace(/_/g, ' ')}`,
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

	return {
		getActionsForRow,
		handleView,
		handleEdit,
		handleCopy,
		handleDelete,
	};
}