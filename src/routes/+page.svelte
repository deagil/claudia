<script lang="ts">
    // import type { PageData } from './$types';
    import Hero from '$lib/marketing/hero.svelte';
    import Nuggets from '$lib/marketing/features.svelte';
    import Copilot from '$lib/marketing/copilot.svelte';
	import Pricing from '$lib/marketing/pricing.svelte';
	import PricingTable from '$lib/marketing/pricing_table.svelte';
    // let { data }: { data: PageData } = $props();
</script>

<Hero></Hero>
<Nuggets></Nuggets>
<Copilot></Copilot>
<Pricing></Pricing>
<PricingTable></PricingTable>
