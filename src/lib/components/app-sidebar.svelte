<script lang="ts">
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
    import Chat from "./chat.svelte";
	import { convertToUIMessages } from "$lib/utils/chat.js";
    export let data;
</script>

<Sidebar.Root variant="floating" side="right">
    <Sidebar.Header>
        <Sidebar.Menu>
            <Sidebar.MenuItem>
                <Sidebar.MenuButton size="lg">
                    <a href="##">
                        <div
                            class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
                        >
                            <GalleryVerticalEndIcon class="size-4" />
                        </div>
                        <div class="flex flex-col gap-0.5 leading-none">
                            <span class="font-medium">Documentation</span>
                            <span class="">v1.0.0</span>
                        </div>
                    </a>
                </Sidebar.MenuButton>
            </Sidebar.MenuItem>
        </Sidebar.Menu>
    </Sidebar.Header>
    <Chat
    chat={data?.chat}
    initialMessages={convertToUIMessages(data?.messages ?? [])}
    readonly={data?.user?.id !== data?.chat?.userId}
    user={data?.user}
/>
</Sidebar.Root>