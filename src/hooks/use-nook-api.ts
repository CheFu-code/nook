import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/chefu-auth';
import { requestJson, type Page } from '@/lib/social';

export type NookQueryStatus = 'LoadingFirstPage' | 'LoadingMore' | 'CanLoadMore' | 'Exhausted' | 'Error';

export function useNookApi() {
    const { getToken } = useAuth();
    return useCallback(<T,>(path: string, options: { method?: string; body?: unknown } = {}) =>
        requestJson<T>(getToken, path, options), [getToken]);
}

export function useNookQuery<T>(path: string | null) {
    const request = useNookApi();
    const [query, setQuery] = useState<{ key: string; data?: T; error?: Error }>();
    const [reloadKey, setReloadKey] = useState(0);
    const queryKey = JSON.stringify([path, reloadKey]);
    const refresh = useCallback(() => setReloadKey(value => value + 1), []);
    const focusedOnce = useRef(false);

    useFocusEffect(useCallback(() => {
        if (focusedOnce.current) setReloadKey(value => value + 1);
        else focusedOnce.current = true;
    }, []));

    useEffect(() => {
        let active = true;
        if (!path) return () => { active = false; };
        void request<T>(path).then(value => {
            if (active) setQuery({ key: queryKey, data: value });
        }).catch(reason => {
            if (active) setQuery({ key: queryKey, error: reason instanceof Error ? reason : new Error(String(reason)) });
        });
        return () => { active = false; };
    }, [path, queryKey, request]);

    const current = query?.key === queryKey ? query : undefined;
    return { data: current?.data, error: current?.error ?? null, refresh };
}

export function useNookPaginatedQuery<T>(path: string) {
    const request = useNookApi();
    const [query, setQuery] = useState<{
        key: string;
        results: T[];
        status: NookQueryStatus;
        error?: Error;
    }>();
    const [reloadKey, setReloadKey] = useState(0);
    const queryKey = JSON.stringify([path, reloadKey]);
    const refresh = useCallback(() => setReloadKey(value => value + 1), []);
    const pageRef = useRef({ key: '', page: -1 });
    const loadingRef = useRef<string | null>(null);
    const focusedOnce = useRef(false);

    useFocusEffect(useCallback(() => {
        if (focusedOnce.current) setReloadKey(value => value + 1);
        else focusedOnce.current = true;
    }, []));

    useEffect(() => {
        let active = true;
        pageRef.current = { key: queryKey, page: -1 };
        loadingRef.current = queryKey;
        void request<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=0&limit=20`).then(result => {
            if (!active) return;
            pageRef.current = { key: queryKey, page: 0 };
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
    }, [path, queryKey, request]);

    const current = query?.key === queryKey ? query : undefined;
    const status = current?.status ?? 'LoadingFirstPage';
    const loadMore = useCallback((_count = 20) => {
        if (loadingRef.current === queryKey || (status !== 'CanLoadMore' && status !== 'Error')) return;
        loadingRef.current = queryKey;
        setQuery(previous => previous?.key === queryKey
            ? { ...previous, status: 'LoadingMore', error: undefined }
            : previous);
        const nextPage = pageRef.current.key === queryKey ? pageRef.current.page + 1 : 0;
        void request<Page<T>>(`${path}${path.includes('?') ? '&' : '?'}page=${nextPage}&limit=20`).then(result => {
            if (pageRef.current.key === queryKey) pageRef.current = { key: queryKey, page: nextPage };
            setQuery(previous => previous?.key === queryKey
                ? {
                    ...previous,
                    results: [...previous.results, ...result.items],
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
    }, [path, queryKey, request, status]);

    return { results: current?.results ?? [], status, error: current?.error ?? null, loadMore, refresh };
}
