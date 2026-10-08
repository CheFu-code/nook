import { useState } from "react";
import { useRouter } from "expo-router";
import { useNookPaginatedQuery } from "@/hooks/use-nook-api";
import type { Conversation } from "@/lib/social";

export function useMessagesTab() {
    const [unread, setUnread] = useState(false);
    const rows = useNookPaginatedQuery<Conversation>(
        `/nook/conversations?unreadOnly=${unread}`,
    );
    const router = useRouter();

    return {
        conversations: rows.results,
        onFilter: setUnread,
        onOpenConversation: (id: Conversation["_id"]) =>
            router.push({ pathname: "/chat/[id]", params: { id } }),
        footerStatus: rows.status,
        loadMore: rows.loadMore,
        loading: rows.status === "LoadingFirstPage",
        showEmpty: rows.status === "Exhausted",
    };
}
