//$lib/stores/organization.ts
import { writable } from 'svelte/store';
import { goto } from '$app/navigation';

export class OrganizationState {
	constructor(initialOrg, allOrgs) {
		this.selectedOrg = writable(initialOrg);
		this.organizations = writable(allOrgs || []);
		this.isLoading = writable(false);
	}

	// Set the selected organization and update cookie
	async setSelectedOrg(orgId) {
		this.isLoading.set(true);
		
		try {
			// Update cookie via API call
			const response = await fetch('/api/set-org', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ orgId })
			});

			if (response.ok) {
				// Update the store
				const orgs = await this.getOrganizations();
				const newSelectedOrg = orgs.find(org => org.id === orgId);
				if (newSelectedOrg) {
					this.selectedOrg.set(newSelectedOrg);
				}
				
				// Refresh the page to reload data with new org context
				await goto(window.location.pathname, { replaceState: true });
			}
		} catch (error) {
			console.error('Error setting organization:', error);
		} finally {
			this.isLoading.set(false);
		}
	}

	// Get current organizations
	async getOrganizations() {
		let orgs = [];
		this.organizations.subscribe(value => orgs = value)();
		return orgs;
	}

	// Get current selected org
	async getSelectedOrg() {
		let org = null;
		this.selectedOrg.subscribe(value => org = value)();
		return org;
	}

	// Set context for use in components
	setContext() {
		if (typeof setContext !== 'undefined') {
			setContext('organizationState', this);
		}
	}
}

// Helper function to get organization state from context
export function getOrganizationState() {
	if (typeof getContext !== 'undefined') {
		return getContext('organizationState');
	}
	return null;
}