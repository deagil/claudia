<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import CirclePlay from '@lucide/svelte/icons/circle-play';
    import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Header from './header.svelte';
</script>

<Header />
<main class="overflow-hidden [--color-primary:var(--color-indigo-500)]">
	<section class="to-muted from-background bg-linear-to-b">
        <div class="relative pt-30"></div>
                <!-- notification glass -->
		<div class="relative -mb-9 hidden">
			<a
				href="#link"
				class="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-zinc-950/5 transition-colors duration-300 dark:border-t-white/5 dark:shadow-zinc-950"
			>
				<span class="text-foreground text-sm">Join</span>
				<span class="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"
				></span>
				<div
					class="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500"
				>
					<div
						class="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0"
					>
						<span class="flex size-6">
							<ArrowRight class="m-auto size-3" />
						</span>
						<span class="flex size-6">
							<ArrowRight class="m-auto size-3" />
						</span>
					</div>
				</div>
			</a>
		</div>
        <!-- end notification glass -->
		<div class="relative py-30">
			<div class="relative z-10 mx-auto w-full max-w-5xl px-6">
				<div class="md:w-1/2">
					<div>
						<h1 class="max-w-md text-5xl font-medium text-balance md:text-6xl">
							Make your best tools better.
						</h1>
						<p class="text-muted-foreground my-8 mr-4 max-w-2xl text-xl text-balance">
							Startups rely on a variety of tools to manage their systems. Claudia is a
							superconnector that lets you combine the powers of best-in-class tools in a single
							platform, without coding or technical expertise.
						</p>

						<div class="flex items-center gap-3">
							<Button variant="mdefault" size="lg" class="pr-4.5">
								<span class="text-nowrap">Get Started</span>
								<ChevronRight class="opacity-50" />
							</Button>
							<Button href="#" size="lg" variant="outline" class="pl-5">
								<CirclePlay class="fill-primary/25 stroke-primary" />
								<span class="text-nowrap">Watch video</span>
							</Button>
						</div>
					</div>

					<div class="mt-10">
						<p class="text-muted-foreground">Trusted by teams at :</p>
						<div class="mt-6 grid max-w-sm grid-cols-3 gap-6">
							<div class="flex">
								<img
									class="h-4 w-fit"
									src="https://html.tailus.io/blocks/customers/column.svg"
									alt="Column Logo"
									height="16"
									width="auto"
								/>
							</div>
							<div class="flex">
								<img
									class="h-5 w-fit"
									src="https://html.tailus.io/blocks/customers/nvidia.svg"
									alt="Nvidia Logo"
									height="20"
									width="auto"
								/>
							</div>
							<div class="flex">
								<img
									class="h-4 w-fit"
									src="https://html.tailus.io/blocks/customers/github.svg"
									alt="GitHub Logo"
									height="16"
									width="auto"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div
				class="mt-24 translate-x-12 perspective-near md:absolute md:top-40 md:-right-6 md:bottom-16 md:left-1/2 md:mt-0 md:translate-x-0"
			>
				<div
					class="before:border-foreground/5 before:bg-foreground/5 relative h-full before:absolute before:-inset-x-4 before:top-0 before:bottom-7 before:skew-x-6 before:rounded-[calc(var(--radius)+1rem)] before:border"
				>
					<div
						class="bg-background shadow-foreground/10 relative h-full -translate-y-12 skew-x-6 overflow-hidden rounded-(--radius) border border-transparent shadow-md ring-1"
					>
						<img
							src="/images/welcome-tour.png"
							alt="app screen"
							width="2318"
							height="1570"
							class="size-full object-cover object-top-left"
						/>
					</div>
				</div>
			</div>
		</div>
	</section>
</main>
