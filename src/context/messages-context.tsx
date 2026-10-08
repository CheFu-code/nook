import { randomUUID } from 'expo-crypto';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { invalidateNookQueryCache } from '@/hooks/use-nook-api';
import { useAuth } from '@/lib/chefu-auth';
import type { Id } from '@/lib/social';

type Pending = { id: string; conversationId: Id<'conversations'>; text: string; createdAt: number; status: 'pending' | 'failed' };
const Context = createContext<{ pending: Pending[]; send: (id: Id<'conversations'>, text: string) => void; retry: (item: Pending) => void } | null>(null);
export function MessagesProvider({ children }: { children: ReactNode }) {
  const { getToken, userId } = useAuth();
  const [pending, setPending] = useState<Pending[]>([]); const busy = useRef(new Set<string>());
  async function retry(item: Pending) {
    if (busy.current.has(item.id)) return; busy.current.add(item.id);
    setPending(items => items.map(row => row.id === item.id ? { ...row, status: 'pending' } : row));
    try {
      const token = await getToken();
      if (!token) throw new Error('You must be signed in to send messages.');
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.chefu.co.za'}/nook/messages/${item.conversationId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-chefu-app': 'nook' },
        body: JSON.stringify({ text: item.text, requestId: item.id }),
      });
      if (!response.ok) throw new Error('Unable to send message.');
      invalidateNookQueryCache(userId, `/nook/messages/${item.conversationId}/messages`);
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
