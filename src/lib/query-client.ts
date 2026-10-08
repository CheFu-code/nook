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
    const userScope = userId ?? 'signed-out';
    const invalidateSelectedPaths = (matches: (cachedPath: string) => boolean) =>
        queryClient.invalidateQueries({
            predicate: query => {
                const [namespace, cachedUserId, type, cachedPath] = query.queryKey;
                return namespace === 'nook' &&
                    cachedUserId === userScope &&
                    type === 'api' &&
                    typeof cachedPath === 'string' &&
                    matches(cachedPath);
            },
        });

    if (
        path === '/nook/presence-token' ||
        /^\/nook\/stories\/[^/]+\/view$/.test(path) ||
        /^\/nook\/posts\/[^/]+\/(?:like|bookmark)$/.test(path) ||
        /^\/nook\/posts\/[^/]+\/comments\/[^/]+\/like$/.test(path) ||
        /^\/nook\/messages\/[^/]+\/messages\/[^/]+\/reactions?$/.test(path)
    ) {
        return;
    }

    const commentMutation = path.match(
        /^\/nook\/posts\/([^/]+)\/comments(?:\/[^/]+)?$/,
    );
    if (commentMutation) {
        const postPath = `/nook/posts/${commentMutation[1]}`;
        const commentsPath = `${postPath}/comments`;
        await invalidateSelectedPaths(cachedPath =>
            cachedPath === postPath || cachedPath.startsWith(commentsPath),
        );
        return;
    }

    const followMutation = path.match(/^\/nook\/profiles\/([^/]+)\/follow$/);
    if (followMutation) {
        await invalidateSelectedPaths(cachedPath =>
            cachedPath === '/nook/profile' ||
            cachedPath === `/nook/profiles/${followMutation[1]}` ||
            cachedPath.startsWith('/nook/posts?feed=home'),
        );
        return;
    }

    const blockMutation = path.match(/^\/nook\/profiles\/([^/]+)\/block$/);
    if (blockMutation) {
        await invalidateSelectedPaths(cachedPath =>
            cachedPath === '/nook/blocks' ||
            cachedPath === '/nook/profile' ||
            cachedPath.startsWith('/nook/profiles') ||
            cachedPath.startsWith('/nook/posts') ||
            cachedPath.startsWith('/nook/stories') ||
            cachedPath.startsWith('/nook/conversations'),
        );
        return;
    }

    const conversationAction = path.match(/^\/nook\/conversations\/([^/]+)\/(?:request|read)$/);
    const messageConversation = path.match(/^\/nook\/messages\/([^/]+)\/messages(?:\/[^/]+(?:\/(?:delete-for-me|delete-for-everyone))?)?$/);
    if (path === '/nook/conversations' || conversationAction || messageConversation) {
        const targetConversationId = conversationAction?.[1] ?? messageConversation?.[1];
        await invalidateSelectedPaths(cachedPath =>
            cachedPath.startsWith('/nook/conversations?') ||
            (targetConversationId !== undefined &&
                (cachedPath === `/nook/conversations/${targetConversationId}` ||
                    cachedPath === `/nook/conversations/${targetConversationId}/messages`)),
        );
        return;
    }

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
                cachedUserId === userScope &&
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
