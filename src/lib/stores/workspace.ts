//$lib/stores/workspace.ts
import { writable, type Writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { setContext, getContext } from 'svelte';

interface Workspace {
	id: string;
	name: string;
	description?: string;
}

export class WorkspaceState {
	selectedWorkspace: Writable<Workspace | null>;
	workspaces: Writable<Workspace[]>;
	isLoading: Writable<boolean>;

	constructor(initialWorkspace: Workspace | null, allWorkspaces: Workspace[]) {
		this.selectedWorkspace = writable(initialWorkspace);
		this.workspaces = writable(allWorkspaces || []);
		this.isLoading = writable(false);
	}

	// Set the selected workspace and update cookie
	async setSelectedWorkspace(workspaceId: string) {
		this.isLoading.set(true);
		
		try {
			// Update cookie via API call
			const response = await fetch('/api/set-workspace', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ workspaceId })
			});

			if (response.ok) {
				// Update the store
				const workspaces = await this.getWorkspaces();
				const newSelectedWorkspace = workspaces.find(workspace => workspace.id === workspaceId);
				if (newSelectedWorkspace) {
					this.selectedWorkspace.set(newSelectedWorkspace);
				}
				
				// Refresh the page to reload data with new workspace context
				await goto(window.location.pathname, { replaceState: true });
			}
		} catch (error) {
			console.error('Error setting workspace:', error);
		} finally {
			this.isLoading.set(false);
		}
	}

	// Get current workspaces
	async getWorkspaces(): Promise<Workspace[]> {
		let workspaces: Workspace[] = [];
		this.workspaces.subscribe(value => workspaces = value)();
		return workspaces;
	}

	// Get current selected workspace
	async getSelectedWorkspace(): Promise<Workspace | null> {
		let workspace: Workspace | null = null;
		this.selectedWorkspace.subscribe(value => workspace = value)();
		return workspace;
	}

	// Set context for use in components
	setContext() {
		if (typeof setContext !== 'undefined') {
			setContext('workspaceState', this);
		}
	}
}

// Helper function to get workspace state from context
export function getWorkspaceState(): WorkspaceState | null {
	if (typeof getContext !== 'undefined') {
		return getContext('workspaceState');
	}
	return null;
}