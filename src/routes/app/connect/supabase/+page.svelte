<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import NotionCard from '$lib/marketing/nugget_card.svelte';
	import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import HistoryIcon from '@lucide/svelte/icons/history';
	import FlashConicalIcon from '@lucide/svelte/icons/flask-conical';
	import LockIcon from '@lucide/svelte/icons/lock';
	import UnlockIcon from '@lucide/svelte/icons/unlock';
	import Button from '$lib/components/ui/button/button.svelte';
	import FlaskConical from '@lucide/svelte/icons/flask-conical';
	import { FlaskConicalIcon } from '@lucide/svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	let loading = $state(true);
	let status: string | null = $state(null);
	let error: string | null = $state(null);
	let connected = $state(false);
	let supabaseOrganization: { name?: string; id?: string } | null = $state(null);
	let projectLocked = $state(false);
	let selectedProjectDetails: { name?: string; id?: string; status?: string; } | null = $state(null);

	// On mount, check if the user is already connected
	onMount(async () => {
		loading = true;
		status = null;
		error = null;
		const res = await fetch('/api/supabase/check');
		if (res.ok) {
			const { team, project } = await res.json();
			if (team) {
				connected = true;
				supabaseOrganization = team;

				// Check if a project is already locked in
				if (project) {
					projectLocked = true;
					selectedProjectDetails = project;
				}
			}
		} else {
			error = 'Failed to check Supabase connection';
		}
		loading = false;
	});

	async function connectSupabase() {
		loading = true;
		status = null;
		error = null;
		try {
			const res = await fetch('/api/supabase/connect/url');
			if (res.ok) {
				const { authorizationUrl } = await res.json();
				window.location.href = authorizationUrl;
			} else {
				error = 'Failed to initiate Supabase connection';
			}
		} catch (e) {
			error = 'Failed to initiate Supabase connection';
		}
		loading = false;
	}

	async function selectAndLockProject(projectId: string, projectName: string) {
		loading = true;
		status = null;
		error = null;

		try {
			const res = await fetch('/api/supabase/select-project', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ projectId, projectName })
			});

			if (res.ok) {
				projectLocked = true;
				selectedProjectDetails = { id: projectId, name: projectName };
				status = `Successfully connected to project: ${projectName}`;
			} else {
				error = 'Failed to select project';
			}
		} catch (e) {
			error = 'Failed to select project';
		}

		loading = false;
	}

	async function disconnectProject() {
		loading = true;
		status = null;
		error = null;

		try {
			const res = await fetch('/api/supabase/disconnect-project', {
				method: 'POST'
			});

			if (res.ok) {
				projectLocked = false;
				selectedProjectDetails = null;
				status = 'Project disconnected successfully';
			} else {
				error = 'Failed to disconnect project';
			}
		} catch (e) {
			error = 'Failed to disconnect project';
		}

		loading = false;
	}

	async function enableHistory() {
		loading = true;
		status = null;
		error = null;
		try {
			const res = await fetch('/api/supabase/enable_history',{
				method: 'POST'
			});
			if (res.ok) {
				const { authorizationUrl } = await res.json();
				window.location.href = authorizationUrl;
			} else {
				error = 'Failed to initiate Supabase connection';
			}
		} catch (e) {
			error = 'Failed to initiate Supabase connection';
		}
		loading = false;
	}

	let { data } = $props();
</script>

<div class="flex min-h-[80vh] flex-col items-center justify-center py-8">
	<Card class="w-full max-w-[70%]">
		<CardHeader class="flex flex-col items-center gap-4">
			<img src="/logos/supabase.svg" alt="Supabase logo" class="h-12 w-12" />
			{#if connected}
				<CardTitle class="text-2xl">Your Supabase Account</CardTitle>
				<CardDescription class="text-center">
					Your connected Supabase project, and any power-ups you've enabled.
				</CardDescription>
			{:else}
				<CardTitle class="text-2xl">Connect Your Supabase Account</CardTitle>
				<CardDescription class="text-center">
					To get an overview of your projects and use all our features, please connect your Supabase
					account.
				</CardDescription>
			{/if}
		</CardHeader>
		<CardContent class="flex flex-col items-center gap-6">
			{#if connected && supabaseOrganization}
				<Alert variant="default" class="border-green-200 bg-green-50">
					<UnlockIcon class="text-green-600" />
					<AlertTitle class="text-green-800">
						Connected as {supabaseOrganization.name} ({supabaseOrganization.id})
					</AlertTitle>
				</Alert>

				{#if projectLocked && selectedProjectDetails}
					<!-- Project is locked in -->
					<Alert variant="default" class="border-green-200 bg-green-50">
						<UnlockIcon class="text-green-600" />
						<AlertTitle class="text-green-800">
							Project Connected: {selectedProjectDetails.name}
						</AlertTitle>
						<AlertDescription class="text-green-700">
							You're currently connected to project {selectedProjectDetails.name} ({selectedProjectDetails.id})
						</AlertDescription>
					</Alert>

					<AlertDialog.Root>
						<AlertDialog.Trigger>
							<Button variant="outline" class="cursor-pointer">
								<LockIcon class="mr-2 h-4 w-4" />
								Disconnect Project
							</Button>
						</AlertDialog.Trigger>
						<AlertDialog.Content>
							<AlertDialog.Header>
								<AlertDialog.Title>Disconnect Project</AlertDialog.Title>
								<AlertDialog.Description>
									Are you sure you want to disconnect from project "{selectedProjectDetails.name}"?
									This will disable all power-ups and you'll need to select a project again to
									continue using the features.
								</AlertDialog.Description>
							</AlertDialog.Header>
							<AlertDialog.Footer>
								<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
								<AlertDialog.Action
									class="cursor-pointer bg-red-500 hover:bg-red-600"
									onclick={disconnectProject}
								>
									Disconnect Project
								</AlertDialog.Action>
							</AlertDialog.Footer>
						</AlertDialog.Content>
					</AlertDialog.Root>
				{:else if data.projects && data.projects.length > 0}
					<!-- Project selection required -->
					<Alert variant="default" class="border-orange-200 bg-orange-50">
						<AlertCircleIcon class="text-orange-600" />
						<AlertTitle class="text-orange-800">Project Selection Required</AlertTitle>
						<AlertDescription class="text-orange-700">
							Please select a project to continue and access power-ups.
						</AlertDescription>
					</Alert>

					<h3 class="mt-3 mb-2 text-lg font-semibold">Choose a Supabase project to connect</h3>
					<div class="mb-6 flex flex-row gap-3">
						{#each data.projects as project}
							<AlertDialog.Root>
								<AlertDialog.Trigger>
									<Button
										variant="outline"
										class="cursor-pointer"
										aria-label={`Select project ${project.name}`}
									>
										{project.name}
									</Button>
								</AlertDialog.Trigger>
								<AlertDialog.Content>
									<AlertDialog.Header>
										<AlertDialog.Title>Connect to Project: {project.name}</AlertDialog.Title>
										<AlertDialog.Description>
											You're about to connect to project "{project.name}" ({project.id}). This will
											enable all power-ups for this project. You can disconnect later if needed.
										</AlertDialog.Description>
									</AlertDialog.Header>
									<AlertDialog.Footer>
										<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
										<AlertDialog.Action
											class="cursor-pointer bg-green-500 hover:bg-green-600"
											onclick={() => selectAndLockProject(project.id, project.name)}
										>
											Connect to {project.name}
										</AlertDialog.Action>
									</AlertDialog.Footer>
								</AlertDialog.Content>
							</AlertDialog.Root>
						{/each}
					</div>
				{/if}

				<!-- Power-ups section -->
				<div class="w-full">
					{#if !projectLocked}
						<Alert variant="default" class="mb-4 border-gray-200 bg-gray-50">
							<LockIcon class="text-gray-600" />
							<AlertTitle class="text-gray-800">Power-ups Locked</AlertTitle>
							<AlertDescription class="text-gray-700">
								Select a project above to unlock and configure power-ups.
							</AlertDescription>
						</Alert>
					{:else}
						<h2 class="mb-4 justify-start text-xl font-semibold">
							Supacharge your database with these power-ups.
						</h2>
					{/if}

					<div
						class="flex flex-row gap-4"
						class:opacity-50={!projectLocked}
						class:pointer-events-none={!projectLocked}
					>
						<!-- feature - time machine -->
						<NotionCard
							variant="soft"
							class="group flex-1 flex-col justify-center overflow-hidden p-5"
						>
							<div class="bg-background flex size-10 items-center justify-center rounded-lg">
								<HistoryIcon class="size-7" />
							</div>

							<h3 class="text-foreground mt-5 text-lg font-semibold">
								Don't miss a thing with History.
							</h3>
							<p class="text-muted-foreground my-3 text-balance">
								Enable change logging and get a full change history for every record in your
								database.
							</p>
							<AlertDialog.Root>
								<AlertDialog.Trigger>
									<Button class="cursor-pointer" disabled={!projectLocked}>Enable History</Button>
								</AlertDialog.Trigger>
								<AlertDialog.Content>
									<AlertDialog.Header>
										<AlertDialog.Title>
											Record History requires writing to your database.
										</AlertDialog.Title>
										<AlertDialog.Description>
											<p>
												A new table <code class="text-orange-400">audit_log</code> will be created in
												your database, used to store a log of changes made to records.
											</p>
											<p class="py-2">
												A logging function <code class="text-orange-400">record_audit_log</code> and
												associated triggers for each table will be added.
											</p>
										</AlertDialog.Description>
									</AlertDialog.Header>
									<AlertDialog.Footer>
										<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
										<AlertDialog.Action onclick={()=> enableHistory()} class="cursor-pointer bg-green-500 hover:bg-green-300">
											Run SQL and enable History
										</AlertDialog.Action>
									</AlertDialog.Footer>
								</AlertDialog.Content>
							</AlertDialog.Root>
						</NotionCard>

						<!-- feature 2 -->
						<NotionCard
							variant="soft"
							class="group flex-1 flex-col justify-center overflow-hidden p-5"
						>
							<div class="bg-background flex size-10 items-center justify-center rounded-lg">
								<FlaskConicalIcon class="size-7" />
							</div>

							<h3 class="text-foreground mt-5 text-lg font-semibold">
								This feature is still in the lab.
							</h3>
							<p class="text-muted-foreground my-3 text-balance">
								Check back later to see what we've cooked up.
							</p>
						</NotionCard>

						<!-- feature 3 -->
						<NotionCard
							variant="soft"
							class="group flex-1 flex-col justify-center overflow-hidden p-5"
						>
							<div class="bg-background flex size-10 items-center justify-center rounded-lg">
								<FlaskConicalIcon class="size-7" />
							</div>

							<h3 class="text-foreground mt-5 text-lg font-semibold">
								This feature is still in the lab.
							</h3>
							<p class="text-muted-foreground my-3 text-balance">
								Check back later to see what we've cooked up.
							</p>
						</NotionCard>
					</div>
				</div>
			{:else if loading}
				<Alert>
					<CheckCircle2Icon />
					<AlertTitle>Checking Supabase connection...</AlertTitle>
				</Alert>
			{:else if !loading}
				<Button
					onclick={connectSupabase}
					disabled={loading}
					class="mx-auto flex max-w-[260px] min-w-[180px] cursor-pointer items-center justify-center border-none bg-transparent p-0"
					aria-label="Connect Supabase"
					type="button"
				>
					<img
						src="/logos/supabase-connect-dark.svg"
						alt="Connect Supabase"
						class="max-w-[260px] min-w-[180px]"
					/>
				</Button>
			{/if}
		</CardContent>
		<CardFooter />
	</Card>
</div>
