import { useState } from "react";
import { Share } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/chefu-auth";
import { errorMessage, siteUrl, type Page, type SocialPost } from "@/lib/social";
import { useNookApi } from "@/hooks/use-nook-api";

export function usePostCardOptions(post: SocialPost, onDelete?: () => void) {
    const { userId } = useAuth();
    const queryClient = useQueryClient();
    const request = useNookApi();
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [feedback, setFeedback] = useState<{
        title: string;
        message: string;
    } | null>(null);
    const [caption, setCaption] = useState(post.caption);
    const [busy, setBusy] = useState(false);

    function beginEdit() {
        setCaption(post.caption);
        setOptionsOpen(false);
        setEditOpen(true);
    }

    async function saveCaption() {
        if (busy) return;
        setBusy(true);
        const nextCaption = caption.trim();
        const matchesPostQuery = (query: { queryKey: readonly unknown[] }) => {
            const [namespace, cachedUserId, type, path] = query.queryKey;
            return namespace === "nook" &&
                cachedUserId === (userId ?? "signed-out") &&
                type === "api" &&
                typeof path === "string" &&
                (path === `/nook/posts/${encodeURIComponent(post._id)}` ||
                    path.startsWith("/nook/posts?"));
        };
        let previousQueries: [readonly unknown[], unknown][] = [];
        try {
            await queryClient.cancelQueries({ predicate: matchesPostQuery });
            previousQueries = queryClient.getQueriesData({ predicate: matchesPostQuery });
            queryClient.setQueriesData(
                { predicate: matchesPostQuery },
                (cached: unknown) => updateCachedPostCaption(cached, post._id, nextCaption),
            );
            setEditOpen(false);
            await request(`/nook/posts/${encodeURIComponent(post._id)}`, {
                method: "PATCH",
                body: { caption: nextCaption },
            });
        } catch (error) {
            for (const [queryKey, data] of previousQueries) {
                queryClient.setQueryData(queryKey, data);
            }
            setFeedback({
                title: "Could not save post",
                message: errorMessage(error),
            });
        } finally {
            setBusy(false);
        }
    }

    async function sharePost() {
        setOptionsOpen(false);
        const postUrl = `${siteUrl}/nook/share/posts/${encodeURIComponent(post._id)}`;
        try {
            await Share.share({
                message: `Check out @${post.author.username}'s post on nook:\n${postUrl}`,
                url: postUrl,
            });
        } catch (error) {
            setFeedback({
                title: "Could not share post",
                message: errorMessage(error),
            });
        }
    }

    async function deletePost() {
        if (busy) return;
        setBusy(true);
        try {
            await request(`/nook/posts/${encodeURIComponent(post._id)}`, {
                method: "DELETE",
            });
            setDeleteConfirmOpen(false);
            onDelete?.();
        } catch (error) {
            setDeleteConfirmOpen(false);
            setFeedback({
                title: "Could not delete post",
                message: errorMessage(error),
            });
        } finally {
            setBusy(false);
        }
    }

    return {
        optionsOpen,
        setOptionsOpen,
        editOpen,
        setEditOpen,
        deleteConfirmOpen,
        setDeleteConfirmOpen,
        feedback,
        setFeedback,
        caption,
        setCaption,
        busy,
        beginEdit,
        saveCaption,
        sharePost,
        deletePost,
    };
}

function updateCachedPostCaption(
    cached: unknown,
    postId: string,
    caption: string,
): unknown {
    if (!cached || typeof cached !== "object") return cached;
    if ("pages" in cached && Array.isArray(cached.pages)) {
        const data = cached as { pages: Page<SocialPost>[]; [key: string]: unknown };
        return {
            ...data,
            pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                    item._id === postId ? { ...item, caption } : item,
                ),
            })),
        };
    }
    if ("items" in cached && Array.isArray(cached.items)) {
        const page = cached as Page<SocialPost>;
        return {
            ...page,
            items: page.items.map((item) =>
                item._id === postId ? { ...item, caption } : item,
            ),
        };
    }
    if ("_id" in cached && cached._id === postId) {
        return { ...cached, caption };
    }
    return cached;
}
