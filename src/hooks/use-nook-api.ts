import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/chefu-auth';
import { requestJson, type Page } from '@/lib/social';

export type NookQueryStatus = 'LoadingFirstPage' | 'LoadingMore' | 'CanLoadMore' | 'Exhausted' | 'Error';

const CACHE_MAX_ENTRIES = 60;
const CACHE_FRESH_MS = 30_000;
type QueryCacheEntry = { value: unknown; updatedAt: number };
const queryCache = new Map<string, QueryCacheEntry>();

function cacheKeyFor(userId: string | undefined, path: string) {
    return JSON.stringify([userId ?? 'signed-out', path]);
}

function readCache<T>(key: string): QueryCacheEntry & { value: T } | undefined {
    return queryCache.get(key) as (QueryCacheEntry & { value: T }) | undefined;
}

function writeCache(key: string, value: unknown) {
    queryCache.delete(key);
    queryCache.set(key, { value, updatedAt: Date.now() });
    while (queryCache.size > CACHE_MAX_ENTRIES) {
        const oldestKey = queryCache.keys().next().value;
        if (oldestKey === undefined) break;
        queryCache.delete(oldestKey);
    }
}

function isCacheFresh(key: string) {
    const entry = queryCache.get(key);
    return entry !== undefined && Date.now() - entry.updatedAt < CACHE_FRESH_MS;
}

export function invalidateNookQueryCache(userId: string | undefined, mutationPath: string) {
    const path = mutationPath.split('?')[0];
    const prefixes: string[] = [];
    if (path.startsWith('/nook/posts')) prefixes.push('/nook/posts');
    if (path.startsWith('/nook/stories')) prefixes.push('/nook/stories');
    if (path.startsWith('/nook/profiles') || path === '/nook/profile' ||
        path === '/auth/profile' || path === '/auth/profile-picture') {
        prefixes.push('/nook/profile', '/nook/profiles', '/nook/posts');
    }
    if (path.startsWith('/nook/conversations') || path.startsWith('/nook/messages')) {
        prefixes.push('/nook/conversations');
    }
    if (!prefixes.length) return;
    for (const key of queryCache.keys()) {
        const [cachedUserId, cachedPath] = JSON.parse(key) as [string, string];
        if (cachedUserId === (userId ?? 'signed-out') &&
            prefixes.some(prefix => cachedPath.startsWith(prefix))) {
            queryCache.delete(key);
        }
    }
}

export function useNookApi() {
    const { getToken, userId } = useAuth();
    return useCallback(async <T,>(path: string, options: { method?: string; body?: unknown } = {}) => {
        const result = await requestJson<T>(getToken, path, options);
        if (options.method && options.method.toUpperCase() !== 'GET') {
            invalidateNookQueryCache(userId, path);
        }
        return result;
    }, [getToken, userId]);
}

export function useNookQuery<T>(path: string | null) {
    const { userId } = useAuth();
    const request = useNookApi();
    const [query, setQuery] = useState<{ key: string; data?: T; error?: Error }>();
    const [reloadKey, setReloadKey] = useState(0);
    const cacheKey = path ? cacheKeyFor(userId, path) : '';
    const queryKey = JSON.stringify([cacheKey, reloadKey]);
    const refresh = useCallback(() => setReloadKey(value => value + 1), []);
    const focusedOnce = useRef(false);

    useFocusEffect(useCallback(() => {
        if (focusedOnce.current) {
            if (!isCacheFresh(cacheKey)) setReloadKey(value => value + 1);
        } else focusedOnce.current = true;
    }, [cacheKey]));

    useEffect(() => {
        let active = true;
        if (!path) return () => { active = false; };
        if (reloadKey === 0 && isCacheFresh(cacheKey)) return () => { active = false; };
        void request<T>(path).then(value => {
            if (active) {
                if (value !== null && value !== undefined) writeCache(cacheKey, value);
                setQuery({ key: queryKey, data: value });
            }
        }).catch(reason => {
            if (active) setQuery({ key: queryKey, error: reason instanceof Error ? reason : new Error(String(reason)) });
        });
        return () => { active = false; };
    }, [path, cacheKey, queryKey, reloadKey, request]);

    const cached = path ? readCache<T>(cacheKey) : undefined;
    const current = query?.key === queryKey
        ? { ...query, data: query.data !== undefined ? query.data : cached?.value }
        : cached ? { key: queryKey, data: cached.value } : undefined;
    return { data: current?.data, error: current?.error ?? null, refresh };
}

export function useNookPaginatedQuery<T>(path: string) {
    const { userId } = useAuth();
    const request = useNookApi();
    const [query, setQuery] = useState<{
        key: string;
        results: T[];
        status: NookQueryStatus;
        error?: Error;
    }>();
    const [reloadKey, setReloadKey] = useState(0);
    const cacheKey = cacheKeyFor(userId, path);
    const queryKey = JSON.stringify([cacheKey, reloadKey]);
    const refresh = useCallback(() => setReloadKey(value => value + 1), []);
    const pageRef = useRef({ key: '', page: -1 });
    const loadingRef = useRef<string | null>(null);
    const focusedOnce = useRef(false);

    useFocusEffect(useCallback(() => {
        if (focusedOnce.current) {
            if (!isCacheFresh(cacheKey)) setReloadKey(value => value + 1);
        } else focusedOnce.current = true;
    }, [cacheKey]));

    useEffect(() => {
        let active = true;
        if (reloadKey === 0 && isCacheFresh(cacheKey)) {
            const cached = readCache<{ results: T[]; hasMore: boolean; page: number }>(cacheKey);
            if (cached) pageRef.current = { key: queryKey, page: cached.value.page };
            return () => { active = false; };
        }
        pageRef.current = { key: queryKey, page: -1 };
        loadingRef.current = queryKey;
        void request<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=0&limit=20`).then(result => {
            if (!active) return;
            pageRef.current = { key: queryKey, page: 0 };
            writeCache(cacheKey, { results: result.items, hasMore: result.hasMore, page: 0 });
            setQuery({
                key: queryKey,
                results: result.items,
                status: result.hasMore ? 'CanLoadMore' : 'Exhausted',
            });
        }).catch(reason => {
            if (!active) return;
            setQuery({
                key: queryKey,
                results: [],
                status: 'Error',
                error: reason instanceof Error ? reason : new Error(String(reason)),
            });
        }).finally(() => {
            if (loadingRef.current === queryKey) loadingRef.current = null;
        });
        return () => { active = false; };
    }, [path, cacheKey, queryKey, reloadKey, request]);

    const cached = readCache<{ results: T[]; hasMore: boolean; page: number }>(cacheKey);
    const current = query?.key === queryKey ? {
        ...query,
        results: query.status === 'Error' && cached ? cached.value.results : query.results,
    } : cached ? {
        key: queryKey,
        results: cached.value.results,
        status: cached.value.hasMore ? 'CanLoadMore' as const : 'Exhausted' as const,
    } : undefined;
    const status = current?.status ?? 'LoadingFirstPage';
    const loadMore = useCallback((_count = 20) => {
        if (loadingRef.current === queryKey || (status !== 'CanLoadMore' && status !== 'Error')) return;
        loadingRef.current = queryKey;
        setQuery(previous => previous?.key === queryKey
            ? { ...previous, status: 'LoadingMore', error: undefined }
            : previous);
        const nextPage = pageRef.current.key === queryKey ? pageRef.current.page + 1 : 0;
        void request<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${nextPage}&limit=20`).then(result => {
            if (pageRef.current.key !== queryKey) return;
            pageRef.current = { key: queryKey, page: nextPage };
            const results = [...(current?.results ?? []), ...result.items];
            writeCache(cacheKey, { results, hasMore: result.hasMore, page: nextPage });
            setQuery(previous => previous?.key === queryKey
                ? {
                    ...previous,
                    results,
                    status: result.hasMore ? 'CanLoadMore' : 'Exhausted',
                }
                : previous);
        }).catch(reason => {
            setQuery(previous => previous?.key === queryKey
                ? { ...previous, status: 'Error', error: reason instanceof Error ? reason : new Error(String(reason)) }
                : previous);
        }).finally(() => {
            if (loadingRef.current === queryKey) loadingRef.current = null;
        });
    }, [path, cacheKey, queryKey, request, status, current?.results]);

    return { results: current?.results ?? [], status, error: current?.error ?? null, loadMore, refresh };
}
