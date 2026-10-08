import { randomUUID } from 'expo-crypto';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { nookApiQueryKey } from '@/lib/query-client';
import { useNookApi } from '@/hooks/use-nook-api';
import { useAuth } from '@/lib/chefu-auth';
import type { Id } from '@/lib/social';

type Pending = { id: string; conversationId: Id<'conversations'>; text: string; createdAt: number; status: 'pending' | 'failed' };
const Context = createContext<{ pending: Pending[]; send: (id: Id<'conversations'>, text: string) => void; retry: (item: Pending) => void } | null>(null);
export function MessagesProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const request = useNookApi();
  const [pending, setPending] = useState<Pending[]>([]); const busy = useRef(new Set<string>());
  const sendMutation = useMutation({
    mutationFn: (item: Pending) =>
      request(`/nook/messages/${encodeURIComponent(item.conversationId)}/messages`, {
        method: 'POST',
        body: { text: item.text, requestId: item.id },
      }),
    onSuccess: (_result, item) => {
      void queryClient.invalidateQueries({
        queryKey: nookApiQueryKey(
          userId,
          `/nook/conversations/${encodeURIComponent(item.conversationId)}/messages`,
        ),
      });
    },
  });
  async function retry(item: Pending) {
    if (busy.current.has(item.id)) return; busy.current.add(item.id);
    setPending(items => items.map(row => row.id === item.id ? { ...row, status: 'pending' } : row));
    try {
      await sendMutation.mutateAsync(item);
      setPending(items => items.filter(row => row.id !== item.id));
    } catch {
      setPending(items => items.map(row => row.id === item.id ? { ...row, status: 'failed' } : row));
    } finally {
      busy.current.delete(item.id);
    }
  }
  function send(conversationId: Id<'conversations'>, text: string) {
    const item: Pending = { id: randomUUID(), conversationId, text, createdAt: Date.now(), status: 'pending' };
    setPending(items => [...items, item]); void retry(item);
  }
  return <Context.Provider value={{ pending, send, retry: item => void retry(item) }}>{children}</Context.Provider>;
}
export function useMessages() { const value = useContext(Context); if (!value) throw new Error('MessagesProvider is required.'); return value; }
