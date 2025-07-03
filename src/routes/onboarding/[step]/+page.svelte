<script lang="ts">
	import OnboardingForm from '$lib/components/onboarding-form.svelte';
	import SubmitButton from '$lib/components/submit-button.svelte';
	import { page } from '$app/state';

	let { form } = $props();

	const step = $derived(page.params.step);
	const isOrgStep = $derived(step === 'org');
	const isProfileStep = $derived(step === 'profile');

	const stepConfig = $derived.by(() => {
		if (isOrgStep) {
			return {
				title: 'Set up your organization',
				description: 'Resources and tools are saved in team projects to make them easy to share and manage. Everything here can be changed later.',
				buttonText: 'Create Organization'
			};
		} else if (isProfileStep) {
			return {
				title: 'Complete your profile',
				description: 'Add your personal information to finish setup',
				buttonText: 'Complete Profile'
			};
		}
		return {
			title: 'Setup',
			description: 'Complete your setup',
			buttonText: 'Continue'
		};
	});
</script>

<div
	class="bg-background flex h-dvh w-screen items-start justify-center pt-12 md:items-center md:pt-0"
>
	<div class="flex w-full max-w-md flex-col gap-12 overflow-hidden rounded-2xl">
		<div class="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
			<h3 class="text-xl font-semibold dark:text-zinc-50">{stepConfig.title}</h3>
			<p class="text-sm text-gray-500 dark:text-zinc-400">
				{stepConfig.description}
			</p>
		</div>
		
		<OnboardingForm {form} {step}>
			{#snippet submitButton({ pending, success })}
				<SubmitButton {pending} {success}>{stepConfig.buttonText}</SubmitButton>
			{/snippet}
		</OnboardingForm>
	</div>
</div>