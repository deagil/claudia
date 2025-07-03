<script lang="ts">
  import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
  } from "$lib/components/ui/card";
  import Button from "$lib/components/ui/button/button.svelte";
  import UserPlus from "@lucide/svelte/icons/user-plus";
  import X from "@lucide/svelte/icons/x";
  import Plus from "$lib/components/icons/plus.svelte";
  import User from "@lucide/svelte/icons/user";
  import Check from "@lucide/svelte/icons/check";
  import MessageCircleQuestion from "@lucide/svelte/icons/message-circle-question";
</script>

<div
  class="bg-muted dark:bg-muted/30 relative py-16 md:py-32 [--color-primary:var(--color-indigo-500)]"
>
  <div class="mx-auto max-w-5xl px-6">
    <div class="mx-auto max-w-2xl text-center">
      <h2 class="text-balance text-3xl font-bold md:text-4xl lg:text-5xl">
        Pricing that scale with your business
      </h2>
      <p
        class="text-muted-foreground mx-auto mt-4 max-w-xl text-balance text-lg"
      >
        Choose the perfect plan for your needs and start optimizing your
        workflow today
      </p>
    </div>
    <div class="@container relative mt-12 md:mt-20">
      <Card class="@4xl:max-w-full relative mx-auto max-w-sm">
        <div class="@4xl:grid-cols-3 grid">
          <div>
            <CardHeader class="p-8">
              <CardTitle class="font-medium">Free</CardTitle>
                for indie hackers and solo devs
              <span class="mb-0.5 mt-2 block text-2xl font-semibold"
                >£0</span
              >
              <CardDescription class="text-sm">forever</CardDescription>
            </CardHeader>
            <div class="border-y px-8 py-4">
              <Button class="w-full" variant="outline">Get Started</Button>
            </div>

            <ul role="list" class="space-y-3 p-8">
              <!-- FREE INCLUDED -->
              {#each ["Connect your tools", "Bring your own LLM"] as item}
                <li class="flex items-center gap-2">
                  <Check class="text-primary size-3" strokeWidth={3.5} />
                  {item}
                </li>
              {/each}
              <!-- FREE ADD ONS -->
                {#each ["Cloud Copilot"] as item}
                  <li class="flex items-center gap-2">
                    <Plus class="text-primary size-3" />
                    {item}
                  </li>
                {/each}
            </ul>
          </div>
          <div
            class=" bg-background rounded-(--radius) @3xl:mx-0 @3xl:-my-3 -mx-1 dark:border-x shadow ring-1"
          >
            <div class="@3xl:py-3  @3xl:px-0 relative px-1">
              <CardHeader class="p-8">
                <CardTitle class="font-medium">Team</CardTitle>
                best for most
                <span class="mb-0.5 mt-2 block text-2xl font-semibold"
                  >£49</span
                >
                <CardDescription class="text-sm">per month, incl 6 users</CardDescription>
              </CardHeader>
              <div class="@3xl:mx-0 -mx-1 border-y px-8 py-4">
                <Button variant="default" class="w-full">Get Started</Button>
              </div>

              <ul role="list" class="space-y-3 p-8">
                <!-- TEAM INCLUDED -->
                {#each ["Connect your tools", "Bring your own LLM", "Fair use of Cloud Copilot", "Proactive Copilot",] as item}
                  <li class="flex items-center gap-2">
                    <Check class="text-primary size-3" strokeWidth={3.5} />
                    {item}
                  </li>
                {/each}
                <!-- TEAM UNIQUE -->
                 <li class="flex items-center gap-2">
                    <User class="text-primary size-4"  />
                    Extra users £9 pp/mo
                  </li>
                <!-- TEAM ADD ONS -->
                {#each ["Extra Copilot"] as item}
                  <li class="flex items-center gap-2">
                    <Plus class="text-primary size-3" />
                    {item}
                  </li>
                {/each}
              </ul>
            </div>
          </div>
          <div>
            <CardHeader class="p-8">
              <CardTitle class="font-medium">Big Team</CardTitle>
              get everyone on board
              <span class="mb-0.5 mt-2 block text-2xl font-semibold"
                >£499</span
              >
              <CardDescription class="text-sm">per month, incl 50 users</CardDescription>
            </CardHeader>
            <div class="border-y px-8 py-4">
              <Button class="w-full" variant="outline">Get Started</Button>
            </div>

            <ul role="list" class="space-y-3 p-8">
              <!-- BIG TEAM INCLUDED -->
              {#each ["Everything in Team Plan"] as item}
                <li class="flex items-center gap-2">
                  <Check class="text-primary size-4" strokeWidth={3.5} />
                  {item}
                </li>
              {/each}
              <!-- BIG TEAM UNIQUE -->
                <li class="flex items-center gap-2">
                    <MessageCircleQuestion class="text-primary size-5"  />
                    Dedicated support
                </li>
               <li class="flex items-center gap-2">
                    <User class="text-primary size-5"  />
                    Add users for £5 pp/mo
                </li>
                <!-- BIG TEAM ADD ONS -->
                {#each ["Unfair use "] as item}
                  <li class="flex items-center gap-2">
                    <Plus class="text-primary size-4" />
                    {item}
                  </li>
                {/each}
            </ul>
          </div>
        </div>
      </Card>
    </div>
  </div>
</div>
