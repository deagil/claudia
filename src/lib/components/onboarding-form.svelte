<script module lang="ts">
	export type FormSuccessData = {
		success: true;
	};
	export type FormFailureData = {
		success: false;
		message: string;
		workspaceName?: string;
		workspaceDescription?: string;
		firstname?: string;
		lastname?: string;
	};
	export type FormData = FormSuccessData | FormFailureData | null;

	export type OnboardingFormProps = {
		form?: FormData;
		step: string;
		submitButton: Snippet<[{ pending: boolean; success: boolean }]>;
	};
</script>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
	import { toast } from 'svelte-sonner';

	let { form, step, submitButton }: OnboardingFormProps = $props();

	let pending = $state(false);
	let avatarPreview = $state<string | null>(null);
	let fileInput: HTMLInputElement | null = $state(null);

	const enhanceCallback: SubmitFunction<FormSuccessData, FormFailureData> = () => {
		pending = true;
		return async ({ result, update }) => {
			if (result.type === 'failure' && result.data?.message) {
				toast.error(result.data.message, { duration: 5000 });
			} else if (result.type === 'success') {
				toast.success('Setup completed successfully!');
			}
			pending = false;
			return update();
		};
	};

	const handleAvatarChange = (event: Event) => {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				avatarPreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	};

	const isWorkspaceStep = $derived(step === 'workspace');
	const isProfileStep = $derived(step === 'profile');
</script>

<form method="POST" class="flex flex-col gap-4 px-4 sm:px-16" use:enhance={enhanceCallback} enctype="multipart/form-data">
	{#if isWorkspaceStep}
		<!-- Workspace setup fields -->
		<div class="flex flex-col gap-2">
			<Label for="workspaceName" class="text-zinc-600 dark:text-zinc-400"> Workspace Name</Label>
			<Input
				id="workspaceName"
				name="workspaceName"
				class="text-md bg-muted md:text-sm"
				type="text"
				placeholder="Pear Programming Ltd"
				required
				autofocus
				defaultValue={!form?.success ? form?.workspaceName : undefined}
			/>
		</div>

		<div class="flex flex-col gap-2">
			<Label for="workspaceDescription" class="text-zinc-600 dark:text-zinc-400">Description</Label>
			<Textarea
				id="workspaceDescription"
				name="workspaceDescription"
				class="text-md bg-muted md:text-sm resize-none"
				placeholder="Tell us about your workspace..."
				rows={3}
				defaultValue={!form?.success ? form?.workspaceDescription : undefined}
			/>
		</div>
	{:else if isProfileStep}
		<!-- Profile setup fields -->
		<div class="flex flex-col gap-2">
			<Label for="firstname" class="text-zinc-600 dark:text-zinc-400">First Name</Label>
			<Input
				id="firstname"
				name="firstname"
				class="text-md bg-muted md:text-sm"
				type="text"
				placeholder="Jane"
				required
				autofocus
				defaultValue={!form?.success ? form?.firstname : undefined}
			/>
		</div>

		<div class="flex flex-col gap-2">
			<Label for="lastname" class="text-zinc-600 dark:text-zinc-400">Last Name</Label>
			<Input
				id="lastname"
				name="lastname"
				class="text-md bg-muted md:text-sm"
				type="text"
				placeholder="Appleseed"
				required
				defaultValue={!form?.success ? form?.lastname : undefined}
			/>
		</div>

		<div class="flex flex-col gap-2">
			<Label for="avatar" class="text-zinc-600 dark:text-zinc-400">Profile Picture (Optional)</Label>
			<div class="flex items-center gap-4">
				{#if avatarPreview}
					<img 
						src={avatarPreview} 
						alt="Avatar preview" 
						class="h-16 w-16 rounded-full object-cover"
					/>
				{:else}
					<div class="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
						<span class="text-xs text-muted-foreground">No image</span>
					</div>
				{/if}
				<div class="flex-1">
					<input
						id="avatar"
						name="avatar"
						class="text-md bg-muted md:text-sm"
						type="file"
						accept="image/*"
						bind:this={fileInput}
						onchange={handleAvatarChange}
					/>
				</div>
			</div>
		</div>
	{/if}

	{@render submitButton({ pending, success: !!form?.success })}
</form>