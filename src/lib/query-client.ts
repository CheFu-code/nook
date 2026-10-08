import { QueryClient, type QueryClient as QueryClientType } from '@tanstack/react-query';
import type { SocialProfile } from './social';

export function createNookQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                gcTime: 5 * 60_000,
                retry: 1,
                refetchOnWindowFocus: false,
            },
        },
    });
}

export function nookApiQueryKey(userId: string | undefined, path: string) {
    return ['nook', userId ?? 'signed-out', 'api', path] as const;
}

export function cacheNookConversationPreview(
    queryClient: QueryClientType,
    userId: string | undefined,
    conversationId: string,
    other: SocialProfile,
) {
    const path = `/nook/conversations/${encodeURIComponent(conversationId)}`;
    queryClient.setQueryData(nookApiQueryKey(userId, path), {
        _id: conversationId,
        other,
    });
}

export function nookMediaQueryKey(
    userId: string | undefined,
    kind: 'post' | 'avatar' | 'story',
    id: string,
    revision: string | number,
) {
    return ['nook', userId ?? 'signed-out', 'media', kind, id, revision] as const;
}

export async function invalidateNookQueries(
    queryClient: QueryClientType,
    userId: string | undefined,
    mutationPath: string,
) {
    const path = mutationPath.split('?')[0];
    const prefixes: string[] = [];
    if (path.startsWith('/nook/posts')) prefixes.push('/nook/posts');
    if (path.startsWith('/nook/stories')) prefixes.push('/nook/stories');
    if (
        path.startsWith('/nook/profiles') ||
        path === '/nook/profile' ||
        path === '/auth/profile' ||
        path === '/auth/profile-picture'
    ) {
        prefixes.push('/nook/profile', '/nook/profiles', '/nook/posts');
    }
    if (
        path.startsWith('/nook/conversations') ||
        (path.startsWith('/nook/messages') && path !== '/nook/messages/push-token')
    ) {
        prefixes.push('/nook/conversations');
    }
    if (!prefixes.length) return;

    await queryClient.invalidateQueries({
        predicate: query => {
            const [namespace, cachedUserId, type, cachedPath] = query.queryKey;
            return namespace === 'nook' &&
                cachedUserId === (userId ?? 'signed-out') &&
                type === 'api' &&
                typeof cachedPath === 'string' &&
                prefixes.some(prefix => cachedPath.startsWith(prefix));
        },
    });

    if (path === '/auth/profile-picture' && userId) {
        queryClient.removeQueries({
            predicate: query => {
                const [namespace, cachedUserId, type, kind, mediaId] = query.queryKey;
                return namespace === 'nook' &&
                    cachedUserId === userId &&
                    type === 'media' &&
                    kind === 'avatar' &&
                    mediaId === userId;
            },
        });
    }

    const deletedPost = path.match(/^\/nook\/posts\/([^/]+)$/)?.[1];
    const deletedStory = path.match(/^\/nook\/stories\/([^/]+)$/)?.[1];
    const deletedMedia = deletedPost
        ? { kind: 'post', id: deletedPost }
        : deletedStory
            ? { kind: 'story', id: deletedStory }
            : null;
    if (deletedMedia) {
        queryClient.removeQueries({
            predicate: query => {
                const [namespace, cachedUserId, type, kind, mediaId] = query.queryKey;
                return namespace === 'nook' &&
                    cachedUserId === (userId ?? 'signed-out') &&
                    type === 'media' &&
                    kind === deletedMedia.kind &&
                    mediaId === deletedMedia.id;
            },
        });
    }
}
