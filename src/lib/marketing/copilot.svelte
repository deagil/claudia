<script lang="ts">
  import { onMount } from "svelte";
  import Card from "./nugget_card.svelte";
  import ArrowUp from "@lucide/svelte/icons/arrow-up";
  import Globe from "@lucide/svelte/icons/globe";
  import Plus from "@lucide/svelte/icons/plus";
  import Sparkles from "@lucide/svelte/icons/sparkles";
  import Button from "$lib/components/ui/button/button.svelte";

  const AIDEN_BLESER = "https://avatars.githubusercontent.com/u/117548273?v=4";
  const BHIDE_SVELTE = "https://avatars.githubusercontent.com/u/93428946?v=4";
  const RICH_HARRIS = "https://avatars.githubusercontent.com/u/1162160?v=4";
  const HUNTER_JOHNSTON =
    "https://avatars.githubusercontent.com/u/64506580?v=4";

  let avatars = [
    { src: BHIDE_SVELTE, alt: "Bhide Svelte" },
    { src: AIDEN_BLESER, alt: "Aiden Blesser" },
    { src: RICH_HARRIS, alt: "Rich Harris" },
    { src: HUNTER_JOHNSTON, alt: "Hunter Johnston" },
  ];

  let glowing = false;
  let featureSection: HTMLElement;

  onMount(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        glowing = entry.isIntersecting;
      },
      { threshold: 0.5 }
    );
    if (featureSection) observer.observe(featureSection);
    return () => observer.disconnect();
  });
</script>

<section bind:this={featureSection} class="relative">
  <div class="feature-card-glow mx-auto my-12" class:glowing={glowing}>
    <div class="feature-card-content">
      <h2 class="text-foreground text-balance text-3xl font-semibold md:text-4xl">
        <span class="text-muted-foreground">Intelligence that's</span>
        actually smart.
      </h2>
      <div class="@container mt-12 space-y-12">
        <Card variant="soft" class="relative overflow-hidden p-0 sm:col-span-2 feature-image-mask">
          <img
            src="https://images.unsplash.com/photo-1635776062043-223faf322554?q=80&w=3132&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt=""
            class="absolute inset-0 size-full object-cover feature-image"
          />
          <div class="m-auto max-w-md p-4 sm:p-12 z-10 relative">
            {@render AIAssistantIllustration()}
          </div>
        </Card>
        <div class="@sm:grid-cols-2 @2xl:grid-cols-3 grid gap-6">
          <div class="space-y-2">
            <h3 class="text-xl font-medium">Deeply integrated.</h3>
            <p class="text-muted-foreground">
              By working across all of your tools and data, Copilot can help with all sorts of issues, across teams, projects, and workflows. 
            </p>
          </div>
                <div class="space-y-2">
            <h3 class="text-xl font-medium">This time it's personal.</h3>
            <span class="text-muted-foreground">Copilot learns individual preferences, writing styles and tasks. It becomes a </span>
               unique assistant for each member of the team.
          </div>
          <div class="space-y-2">
            <h3 class="text-xl font-medium"> An upgrade, not an upsell.</h3>
            <span class="text-muted-foreground"> Claudia is designed around making the power of LLMs accessible to entire teams, which is why fair use of Copilot is</span>
              included for free for each user.
          </div>
    
        </div>
      </div>
    </div>
    <div class="glow-border pointer-events-none" aria-hidden="true"></div>
  </div>
</section>

<style>
.feature-card-glow {
  position: relative;
  max-width: 900px;
  margin-left: auto;
  margin-right: auto;
  border-radius: 2rem;
  overflow: visible;
  padding: 3rem 2rem;
  box-shadow: 0 2px 24px 0 rgba(0,0,0,0.03);
}
.feature-card-content {
  position: relative;
  z-index: 10;
}
.glow-border {
  position: absolute;
  inset: 0;
  border-radius: 2rem;
  pointer-events: none;
  z-index: 1;
  box-shadow: 0 0 0 0 transparent;
  transition: box-shadow 0.7s cubic-bezier(.4,2,.6,1);
}
.glowing .glow-border {
  box-shadow:
    0 0 0 4px rgba(120, 87, 255, 0.15),
    0 0 24px 8px rgba(120, 87, 255, 0.25),
    0 0 64px 16px rgba(120, 87, 255, 0.15);
}
.feature-image {
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.85) 80%, transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,0.85) 80%, transparent 100%);
  z-index: 2;
  border-radius: 1.5rem;
  transition: filter 0.4s;
}
.glowing .feature-image {
  filter: brightness(0.95) blur(0.5px);
}
</style>
{#snippet AIAssistantIllustration()}
  <Card
    aria-hidden
    class="mt-6 aspect-video translate-y-4 p-4 pb-6 transition-transform duration-200 group-hover:translate-y-0"
  >
    <div class="w-fit">
      <Sparkles class="size-3.5 fill-purple-300 stroke-purple-300" />
      <p class="mt-2 line-clamp-2 text-sm">
        How many members signed up in the last 6 months?
      </p>
    </div>
    <div class="bg-foreground/5 -mx-3 -mb-3 mt-3 space-y-3 rounded-lg p-3">
      <div class="text-muted-foreground text-sm">Ask AI Assistant</div>

      <div class="flex justify-between">
        <div class="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            class="size-7 rounded-2xl bg-transparent shadow-none"
          >
            <Plus />
          </Button>
          <Button
            variant="outline"
            size="icon"
            class="size-7 rounded-2xl bg-transparent shadow-none"
          >
            <Globe />
          </Button>
        </div>

        <Button size="icon" class="size-7 rounded-2xl bg-black">
          <ArrowUp strokeWidth={3} />
        </Button>
      </div>
    </div>
  </Card>
{/snippet}
