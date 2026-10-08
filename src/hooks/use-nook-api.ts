import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/chefu-auth';
import { invalidateNookQueries, nookApiQueryKey } from '@/lib/query-client';
import { requestJson, type Page } from '@/lib/social';

export type NookQueryStatus = 'LoadingFirstPage' | 'LoadingMore' | 'CanLoadMore' | 'Exhausted' | 'Error';

export function useNookApi() {
    const { getToken, userId } = useAuth();
    const queryClient = useQueryClient();
    return useCallback(async <T,>(path: string, options: { method?: string; body?: unknown } = {}) => {
        const result = await requestJson<T>(getToken, path, options);
        if (options.method && options.method.toUpperCase() !== 'GET') {
            void invalidateNookQueries(queryClient, userId, path);
        }
        return result;
    }, [getToken, queryClient, userId]);
}

export function useNookQuery<T>(path: string | null) {
    const { userId } = useAuth();
    const request = useNookApi();
    const query = useQuery({
        queryKey: nookApiQueryKey(userId, path ?? ''),
        queryFn: () => request<T>(path!),
        enabled: path !== null,
    });
    const { isStale, refetch } = query;

    useFocusEffect(useCallback(() => {
        if (path && isStale) void refetch();
    }, [path, isStale, refetch]));

    const refresh = useCallback(() => {
        void refetch();
    }, [refetch]);
    return { data: query.data, error: query.error ?? null, refresh };
}

export function useNookPaginatedQuery<T>(path: string, enabled = true) {
    const { userId } = useAuth();
    const request = useNookApi();
    const query = useInfiniteQuery({
        queryKey: nookApiQueryKey(userId, path),
        enabled,
        initialPageParam: 0,
        queryFn: ({ pageParam }) =>
            request<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${pageParam}&limit=20`),
        getNextPageParam: (lastPage, _pages, lastPageParam) =>
            lastPage.hasMore ? lastPageParam + 1 : undefined,
    });
    const { isStale, refetch, isFetching, isFetchingNextPage, isPending, isError, data, hasNextPage, fetchNextPage, error } = query;

    useFocusEffect(useCallback(() => {
        if (enabled && isStale && !isFetching) void refetch();
    }, [enabled, isStale, isFetching, refetch]));

    const results = data?.pages.flatMap(page => page.items) ?? [];
    let status: NookQueryStatus;
    if (isFetchingNextPage) status = 'LoadingMore';
    else if (isPending) status = 'LoadingFirstPage';
    else if (isError && !data) status = 'Error';
    else if (hasNextPage) status = 'CanLoadMore';
    else status = 'Exhausted';

    const loadMore = useCallback((_count = 20) => {
        if (isFetchingNextPage) return;
        if (isError && !data) {
            void refetch();
            return;
        }
        if (hasNextPage) void fetchNextPage();
    }, [data, fetchNextPage, hasNextPage, isError, isFetchingNextPage, refetch]);

    const refresh = useCallback(() => {
        void refetch();
    }, [refetch]);
    return { results, status, error: error ?? null, loadMore, refresh };
}
