<script lang="ts">
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
    import Chat from "./chat.svelte";
	import { convertToUIMessages } from "$lib/utils/chat.js";
    export let data;
</script>
<!-- debug -->
<!-- <div class="bg-purple-200"> -->
<div class="">
        <Sidebar.Root variant="floating" side="right">
            <Chat
            chat={data?.chat}
            initialMessages={convertToUIMessages(data?.messages ?? [])}
            readonly={data?.user?.id !== data?.chat?.userId}
            user={data?.user}
        />
    </Sidebar.Root>
</div>
