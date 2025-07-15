<!-- /app/select-org/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import UsersIcon from '@lucide/svelte/icons/users';
	import Button from '$lib/components/ui/button/button.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	let loading = $state(false);
	let error: string | null = $state(null);
	let selectedOrgId: string | null = $state(null);

	const { data } = $props();

	async function selectOrganization(orgId: string, orgName: string) {
		if (selectedOrgId === orgId) return; // Prevent double-selection
		
		loading = true;
		error = null;
		selectedOrgId = orgId;
		
		try {
			// Create and submit a form to use the server action
			const form = document.createElement('form');
			form.method = 'POST';
			form.action = '?/selectOrg';
			
			const input = document.createElement('input');
			input.type = 'hidden';
			input.name = 'orgId';
			input.value = orgId;
			
			form.appendChild(input);
			document.body.appendChild(form);
			form.submit();
			
		} catch (e) {
			error = 'Failed to select organization';
			selectedOrgId = null;
			loading = false;
		}
	}

	// Check if user has organizations available
	const hasOrganizations = $derived(() => data.orgData && data.orgData.length > 0);
	const userProfile = $derived(() => data.profileData);
</script>

<div class="flex min-h-screen flex-col items-center py-8 px-4">
	<Card class="w-full max-w-2xl">
		<CardHeader class="flex flex-col items-center gap-4">
			<div class="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
				<BuildingIcon class="h-8 w-8 text-blue-600" />
			</div>
			<CardTitle class="text-2xl text-center">Select Your Organization</CardTitle>
			<CardDescription class="text-center max-w-md">
				{#if data.profileData.firstname}
					Welcome back, {data.profileData.firstname}!
				{:else}
					Welcome!
				{/if}
				Choose an organization to continue. All your data and settings are organized by workspace.
			</CardDescription>
		</CardHeader>
		
		<CardContent class="flex flex-col items-center gap-6">
			{#if !hasOrganizations}
				<Alert variant="destructive">
					<AlertCircleIcon />
					<AlertTitle>No Organizations Found</AlertTitle>
					<AlertDescription>
						You don't have access to any organizations. Please contact your administrator or create a new organization.
					</AlertDescription>
				</Alert>
				
				<Button onclick={() => goto('/app/create-org')} class="cursor-pointer">
					<BuildingIcon class="mr-2 h-4 w-4" />
					Create New Organization
				</Button>
			{:else}
				<div class="w-full space-y-4">
					<h3 class="text-lg font-semibold text-center mb-4">
						Available Organizations ({data.orgData.length})
					</h3>
					
					<div class="grid gap-3">
						{#each data.orgData as org}
							<AlertDialog.Root>
								<AlertDialog.Trigger class="w-full">
									<Card class="cursor-pointer transition-all hover:shadow-md hover:border-blue-300 {selectedOrgId === org.id ? 'ring-2 ring-blue-500 border-blue-500' : ''} {loading ? 'opacity-50 pointer-events-none' : ''}">
										<CardContent class="p-4">
											<div class="flex items-center justify-between">
												<div class="flex items-center gap-3">
													<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
														<BuildingIcon class="h-5 w-5 text-gray-600" />
													</div>
													<div class="text-left">
														<h4 class="font-medium">{org.name}</h4>
														{#if org.description}
															<p class="text-sm text-gray-600">{org.description}</p>
														{/if}
													</div>
												</div>
												<div class="flex items-center gap-2 text-sm text-gray-500">
													<UsersIcon class="h-4 w-4" />
													<span>{org.member_count || 0} members</span>
												</div>
											</div>
										</CardContent>
									</Card>
								</AlertDialog.Trigger>
								
								<AlertDialog.Content>
									<AlertDialog.Header>
										<AlertDialog.Title>Open the {org.name} workspace</AlertDialog.Title>
										<AlertDialog.Description>
											You're about to launch to the "{org.name}" organization. 
											All your data and settings will be scoped to this workspace.
											{#if org.description}
												<br><br>
												<strong>Description:</strong> {org.description}
											{/if}
										</AlertDialog.Description>
									</AlertDialog.Header>
									<AlertDialog.Footer>
										<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
										<AlertDialog.Action 
											class="cursor-pointer bg-blue-600 hover:bg-blue-700"
											onclick={() => selectOrganization(org.id, org.name)}
											disabled={loading}
										>
											{#if loading && selectedOrgId === org.id}
												Switching...
											{:else}
												Switch to {org.name}
											{/if}
										</AlertDialog.Action>
									</AlertDialog.Footer>
								</AlertDialog.Content>
							</AlertDialog.Root>
						{/each}
					</div>
				</div>
			{/if}
			
			{#if error}
				<Alert variant="destructive" class="w-full">
					<AlertCircleIcon />
					<AlertTitle>Error</AlertTitle>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			{/if}
		</CardContent>
		
		<CardFooter class="flex justify-center">
			<Button 
				variant="outline" 
				onclick={() => goto('/app/profile')}
				class="cursor-pointer"
			>
				Manage Profile
			</Button>
		</CardFooter>
	</Card>
</div>