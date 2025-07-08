<script lang="ts">
	import { onMount } from 'svelte';
    import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "$lib/components/ui/card";
    import { Alert, AlertTitle, AlertDescription } from "$lib/components/ui/alert";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
    import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
    import KeyIcon from "@lucide/svelte/icons/key";
    import EyeIcon from "@lucide/svelte/icons/eye";
    import EyeOffIcon from "@lucide/svelte/icons/eye-off";
    import Button from "$lib/components/ui/button/button.svelte";

	let loading = $state(true);
	let saving = $state(false);
	let status: string | null = $state(null);
	let error: string | null = $state(null);
	let connected = $state(false);
	let apiKey = $state('');
	let showKey = $state(false);
	let maskedKey = $state('');

	// On mount, check if the user already has an API key saved
	onMount(async () => {
		loading = true;
		status = null;
		error = null;
		try {
			const res = await fetch('/api/save-credentials?app=openai');
			if (res.ok) {
				const { config } = await res.json();
				if (config?.apiKey) {
					connected = true;
					// Create masked version of the key
					maskedKey = config.apiKey.substring(0, 7) + '...' + config.apiKey.slice(-4);
				}
			} else if (res.status !== 404) {
				error = 'Failed to check OpenAI API key status';
			}
		} catch (e) {
			error = 'Failed to check OpenAI API key status';
		}
		loading = false;
	});

	async function saveApiKey() {
		if (!apiKey.trim()) {
			error = 'Please enter a valid API key';
			return;
		}

		if (!apiKey.startsWith('sk-')) {
			error = 'OpenAI API keys should start with "sk-"';
			return;
		}

		saving = true;
		status = null;
		error = null;

		try {
			const res = await fetch('/api/save-credentials', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					app: 'openai', 
					config: { apiKey: apiKey.trim() } 
				}),
			});

			if (res.ok) {
				connected = true;
				maskedKey = apiKey.substring(0, 7) + '...' + apiKey.slice(-4);
				apiKey = '';
				status = 'API key saved successfully!';
			} else {
				const { error: errorMsg } = await res.json();
				error = errorMsg || 'Failed to save API key';
			}
		} catch (e) {
			error = 'Failed to save API key';
		}
		saving = false;
	}

	async function removeApiKey() {
		saving = true;
		status = null;
		error = null;

		try {
			const res = await fetch('/api/save-credentials', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ 
					app: 'openai', 
					config: null 
				}),
			});

			if (res.ok) {
				connected = false;
				maskedKey = '';
				status = 'API key removed successfully!';
			} else {
				const { error: errorMsg } = await res.json();
				error = errorMsg || 'Failed to remove API key';
			}
		} catch (e) {
			error = 'Failed to remove API key';
		}
		saving = false;
	}

    let {data} = $props();
</script>

<div class="flex min-h-[80vh] flex-col items-center justify-center py-8">
    <Card class="w-full max-w-xl">
        <CardHeader class="flex flex-col items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <KeyIcon class="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle class="text-2xl">OpenAI API Key Setup</CardTitle>
            <CardDescription class="text-center">
                To use OpenAI features, please save your API key securely. Your key will be encrypted and stored safely.
            </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col gap-6">
            {#if connected && maskedKey}
                <Alert>
                    <CheckCircle2Icon />
                    <AlertTitle>
                        API Key Connected
                    </AlertTitle>
                    <AlertDescription>
                        Your OpenAI API key is saved: {maskedKey}
                    </AlertDescription>
                </Alert>
                <div class="flex gap-2">
                    <Button
                        onclick={removeApiKey}
                        disabled={saving}
                        variant="destructive"
                        class="flex-1"
                        aria-label="Remove API Key"
                        type="button"
                    >
                        {saving ? 'Removing...' : 'Remove Key'}
                    </Button>
                </div>
            {:else if loading}
                <Alert>
                    <CheckCircle2Icon />
                    <AlertTitle>Checking API key status...</AlertTitle>
                </Alert>
            {:else if !loading}
                <div class="space-y-4">
                    <div class="space-y-2">
                        <Label for="api-key">OpenAI API Key</Label>
                        <div class="relative">
                            <Input
                                id="api-key"
                                type={showKey ? 'text' : 'password'}
                                placeholder="sk-..."
                                bind:value={apiKey}
                                class="pr-10"
                                disabled={saving}
                            />
                            <button
                                type="button"
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                onclick={() => showKey = !showKey}
                                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                            >
                                {#if showKey}
                                    <EyeOffIcon class="h-4 w-4" />
                                {:else}
                                    <EyeIcon class="h-4 w-4" />
                                {/if}
                            </button>
                        </div>
                    </div>
                    <Button
                        onclick={saveApiKey}
                        disabled={saving || !apiKey.trim()}
                        class="w-full"
                        aria-label="Save API Key"
                        type="button"
                    >
                        {saving ? 'Saving...' : 'Save API Key'}
                    </Button>
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                        <p class="mb-2">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-500 dark:text-blue-400">OpenAI Platform</a></p>
                        <p>Your key will be encrypted and stored securely.</p>
                    </div>
                </div>
            {/if}
            {#if status}
                <Alert>
                    <CheckCircle2Icon />
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            {:else if error}
                <Alert variant="destructive">
                    <AlertCircleIcon />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            {/if}
        </CardContent>
        <CardFooter />
    </Card>
</div>