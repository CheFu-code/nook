import { useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/chefu-auth";
import { cacheNookConversationPreview } from "@/lib/query-client";
import { useNookPaginatedQuery } from "@/hooks/use-nook-api";
import type { Conversation } from "@/lib/social";

export function useMessagesTab() {
    const [unread, setUnread] = useState(false);
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    const rows = useNookPaginatedQuery<Conversation>(
        `/nook/conversations?unreadOnly=${unread}`,
    );
    const router = useRouter();

    return {
        conversations: rows.results,
        onFilter: setUnread,
        onOpenConversation: (conversation: Conversation) => {
            cacheNookConversationPreview(
                queryClient,
                userId,
                conversation._id,
                conversation.other,
            );
            router.push({
                pathname: "/chat/[id]",
                params: { id: conversation._id },
            });
        },
        footerStatus: rows.status,
        loadMore: rows.loadMore,
        loading: rows.status === "LoadingFirstPage",
        showEmpty: rows.status === "Exhausted",
    };
}
