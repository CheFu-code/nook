import {
    useMutation,
    useQueryClient,
    type QueryKey,
} from "@tanstack/react-query";
import { useAuth } from "@/lib/chefu-auth";
import type { SocialPost, SocialProfile } from "@/lib/social";
import { useNookApi } from "./use-nook-api";

type CacheSnapshot = [QueryKey, unknown][];

function apiPath(queryKey: QueryKey, userId: string | undefined) {
    if (
        queryKey[0] !== "nook" ||
        queryKey[1] !== (userId ?? "signed-out") ||
        queryKey[2] !== "api" ||
        typeof queryKey[3] !== "string"
    ) {
        return null;
    }
    return queryKey[3];
}

async function snapshotQueries(
    queryClient: ReturnType<typeof useQueryClient>,
    userId: string | undefined,
    includes: (path: string) => boolean,
): Promise<CacheSnapshot> {
    const predicate = (query: { queryKey: QueryKey }) => {
        const path = apiPath(query.queryKey, userId);
        return path !== null && includes(path);
    };
    await queryClient.cancelQueries({ predicate });
    return queryClient.getQueriesData({ predicate });
}

function restoreQueries(
    queryClient: ReturnType<typeof useQueryClient>,
    snapshots: CacheSnapshot | undefined,
) {
    snapshots?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

function updateQueryData(
    queryClient: ReturnType<typeof useQueryClient>,
    snapshots: CacheSnapshot,
    update: (data: unknown, path: string) => unknown,
    userId: string | undefined,
) {
    snapshots.forEach(([key, data]) => {
        const path = apiPath(key, userId);
        if (path !== null) queryClient.setQueryData(key, update(data, path));
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function updatePageItems<T>(
    data: unknown,
    update: (item: T) => T,
): unknown {
    if (!isRecord(data)) return data;
    if (Array.isArray(data.pages)) {
        return {
            ...data,
            pages: data.pages.map((page) => {
                if (!isRecord(page) || !Array.isArray(page.items)) return page;
                return { ...page, items: page.items.map((item) => update(item as T)) };
            }),
        };
    }
    if (Array.isArray(data.items)) {
        return { ...data, items: data.items.map((item) => update(item as T)) };
    }
    return data;
}

function isSocialPost(value: unknown): value is SocialPost {
    return isRecord(value) &&
        typeof value._id === "string" &&
        typeof value.likesCount === "number" &&
        isRecord(value.author);
}

function patchPost(
    value: unknown,
    postId: string,
    update: (post: SocialPost) => SocialPost,
): unknown {
    if (isSocialPost(value)) return value._id === postId ? update(value) : value;
    return updatePageItems<unknown>(value, (item) =>
        isSocialPost(item) && item._id === postId ? update(item) : item,
    );
}

function patchPostsInSnapshot(
    queryClient: ReturnType<typeof useQueryClient>,
    snapshots: CacheSnapshot,
    userId: string | undefined,
    postId: string,
    update: (post: SocialPost) => SocialPost,
) {
    updateQueryData(
        queryClient,
        snapshots,
        (data, path) => {
            if (path === `/nook/posts/${encodeURIComponent(postId)}/bookmark`) {
                return data;
            }
            return patchPost(data, postId, update);
        },
        userId,
    );
}

export function usePostLikeMutation() {
    const queryClient = useQueryClient();
    const { userId } = useAuth();
    const request = useNookApi();

    return useMutation({
        mutationFn: ({ postId, liked }: { postId: string; liked: boolean }) =>
            request(`/nook/posts/${encodeURIComponent(postId)}/like`, {
                method: "POST",
                body: { liked },
            }),
        onMutate: async ({ postId, liked }) => {
            const snapshots = await snapshotQueries(
                queryClient,
                userId,
                (path) => path.startsWith("/nook/posts"),
            );
            patchPostsInSnapshot(queryClient, snapshots, userId, postId, (post) => {
                const wasLiked = post.isLiked ?? false;
                return {
                    ...post,
                    isLiked: liked,
                    likesCount: Math.max(0, post.likesCount + Number(liked) - Number(wasLiked)),
                };
            });
            return { snapshots };
        },
        onError: (_error, _variables, context) =>
            restoreQueries(queryClient, context?.snapshots),
    });
}

export function usePostBookmarkMutation(post: SocialPost) {
    const queryClient = useQueryClient();
    const { userId } = useAuth();
    const request = useNookApi();

    return useMutation({
        mutationFn: (saved: boolean) =>
            request(`/nook/posts/${encodeURIComponent(post._id)}/bookmark`, {
                method: "POST",
                body: { saved },
            }),
        onMutate: async (saved) => {
            const snapshots = await snapshotQueries(
                queryClient,
                userId,
                (path) => path.startsWith("/nook/posts"),
            );
            updateQueryData(
                queryClient,
                snapshots,
                (data, path) => {
                    if (path === `/nook/posts/${encodeURIComponent(post._id)}/bookmark`) {
                        return saved;
                    }
                    if (path === "/nook/posts/saved") {
                        if (!isRecord(data) || !Array.isArray(data.pages)) return data;
                        return {
                            ...data,
                            pages: data.pages.map((page, index) => {
                                if (!isRecord(page) || !Array.isArray(page.items)) return page;
                                const items = (page.items as unknown[]).filter(
                                    (item) => !isSocialPost(item) || item._id !== post._id,
                                );
                                if (saved && index === 0) items.unshift({ ...post, isBookmarked: true });
                                return { ...page, items };
                            }),
                        };
                    }
                    return patchPost(data, post._id, (cachedPost) => ({
                        ...cachedPost,
                        isBookmarked: saved,
                    }));
                },
                userId,
            );
            return { snapshots };
        },
        onError: (_error, _saved, context) =>
            restoreQueries(queryClient, context?.snapshots),
    });
}

export function useFollowMutation(profile: SocialProfile) {
    const queryClient = useQueryClient();
    const { userId } = useAuth();
    const request = useNookApi();

    return useMutation({
        mutationFn: (following: boolean) =>
            request(`/nook/profiles/${encodeURIComponent(profile._id)}/follow`, {
                method: "POST",
                body: { following },
            }),
        onMutate: async (following) => {
            const snapshots = await snapshotQueries(
                queryClient,
                userId,
                (path) => path.startsWith("/nook/profiles") || path.startsWith("/nook/posts"),
            );
            updateQueryData(
                queryClient,
                snapshots,
                (data) => {
                    const updateProfile = (item: unknown) => {
                        if (!isRecord(item) || item._id !== profile._id) return item;
                        const wasFollowing = item.isFollowing === true;
                        return {
                            ...item,
                            isFollowing: following,
                            followersCount: typeof item.followersCount === "number"
                                ? Math.max(0, item.followersCount + Number(following) - Number(wasFollowing))
                                : item.followersCount,
                        };
                    };
                    if (
                        isRecord(data) &&
                        typeof data._id === "string" &&
                        "username" in data
                    ) {
                        return updateProfile(data);
                    }
                    return updatePageItems<unknown>(data, (item) => {
                        if (!isRecord(item)) return item;
                        if (isSocialPost(item)) {
                            return { ...item, author: updateProfile(item.author) as SocialPost["author"] };
                        }
                        return updateProfile(item);
                    });
                },
                userId,
            );
            return { snapshots };
        },
        onError: (_error, _following, context) =>
            restoreQueries(queryClient, context?.snapshots),
    });
}

export function useCommentLikeMutation(postId: string) {
    const queryClient = useQueryClient();
    const { userId } = useAuth();
    const request = useNookApi();

    return useMutation({
        mutationFn: ({ commentId, liked }: { commentId: string; liked: boolean }) =>
            request(
                `/nook/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}/like`,
                { method: "POST", body: { liked } },
            ),
        onMutate: async ({ commentId, liked }) => {
            const prefix = `/nook/posts/${encodeURIComponent(postId)}/comments`;
            const snapshots = await snapshotQueries(
                queryClient,
                userId,
                (path) => path.startsWith(prefix),
            );
            updateQueryData(
                queryClient,
                snapshots,
                (data) => updatePageItems<Record<string, unknown>>(data, (item) =>
                    item._id === commentId ? { ...item, isLiked: liked } : item,
                ),
                userId,
            );
            return { snapshots };
        },
        onError: (_error, _variables, context) =>
            restoreQueries(queryClient, context?.snapshots),
    });
}
