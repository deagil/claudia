<script lang="ts">
	import { onMount } from 'svelte';
    import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "$lib/components/ui/card";
    import { Alert, AlertTitle, AlertDescription } from "$lib/components/ui/alert";
    import CheckCircle2Icon from "@lucide/svelte/icons/check-circle-2";
    import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
    import Button from "$lib/components/ui/button/button.svelte";

	let loading = $state(true);
	let status: string | null = $state(null);
	let error: string | null = $state(null);
	let connected = $state(false);
	let supabaseOrganization: { name?: string; id?: string } | null = $state(null);

	// On mount, check if the user is already connected
	onMount(async () => {
		loading = true;
		status = null;
		error = null;
		const res = await fetch('/api/supabase/check');
		if (res.ok) {
			const { team } = await res.json();
			if (team) {
				connected = true;
				supabaseOrganization = team;
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


    let {data} = $props();
</script>

<div class="flex min-h-[80vh] flex-col items-center justify-center py-8">
    <Card class="w-full max-w-xl">
        <CardHeader class="flex flex-col items-center gap-4">
            <img
                src="/logos/supabase.svg"
                alt="Supabase logo"
                class="h-12 w-12"
            />
            <CardTitle class="text-2xl">Connect Your Supabase Account</CardTitle>
            <CardDescription class="text-center">
                To get an overview of your projects and use all our features, please
                connect your Supabase account.
            </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-col items-center gap-6">
            {#if connected && supabaseOrganization}
                <Alert>
                    <CheckCircle2Icon />
                    <AlertTitle>
                        Connected as {supabaseOrganization.name} ({supabaseOrganization.id})
                    </AlertTitle>
                </Alert>
                <!-- <Button
                    onclick={() => {
                        window.location.href = '/api/supabase/check';
                    }}
                    class="button-primary"
                    aria-label="Check Supabase"
                    type="button"
                >
                    Check connection
                </Button> -->
            {:else if loading}
                <Alert>
                    <CheckCircle2Icon />
                    <AlertTitle>Checking Supabase connection...</AlertTitle>
                </Alert>
            {:else if !loading}
                <Button
                    onclick={connectSupabase}
                    disabled={loading}
                    class="mx-auto flex min-w-[180px] max-w-[260px] cursor-pointer items-center justify-center border-none bg-transparent p-0"
                    aria-label="Connect Supabase"
                    type="button"
                >
                    <img
                        src="/logos/supabase-connect-dark.svg"
                        alt="Connect Supabase"
                        class="min-w-[180px] max-w-[260px]"
                    />
                </Button>
            {/if}
            {#if status}
                <Alert>
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