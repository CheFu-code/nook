import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ChefuUser = {
  uid?: string;
  email?: string;
  displayName?: string;
  name?: string;
  photoURL?: string | null;
  roles?: string[];
  username?: string;
  fullName?: string;
  imageUrl?: string;
  primaryEmailAddress?: { emailAddress?: string };
  emailAddresses?: Array<{ emailAddress?: string }>;
};

export type ChefuAuthSession = {
  token: string;
  user: ChefuUser;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.chefu.co.za';
const SESSION_KEY = 'chefu_auth_session';

async function getStoredValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
    return;
  }

  if (value === null) {
    await SecureStore.deleteItemAsync(key);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function readStoredSession(): Promise<ChefuAuthSession | null> {
  const raw = await getStoredValue(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ChefuAuthSession>;
    if (!parsed.token || !parsed.user) return null;
    return { token: parsed.token, user: parsed.user };
  } catch {
    return null;
  }
}

async function writeStoredSession(session: ChefuAuthSession | null) {
  await setStoredValue(SESSION_KEY, session ? JSON.stringify(session) : null);
}

async function fetchChefuJson<T>(path: string, session: ChefuAuthSession | null, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers || {});
  if (session?.token) {
    headers.set('Authorization', `Bearer ${session.token}`);
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as { error?: string; message?: string };
    throw new Error(errorBody.error || errorBody.message || 'Unable to complete your request.');
  }

  return response.json() as Promise<T>;
}

export type ChefuAuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId?: string;
  session: ChefuAuthSession | null;
  user: ChefuUser | null;
  sessionClaims?: { aud?: string };
  getToken: (options?: { template?: string } | Record<string, never>) => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<ChefuUser>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<ChefuUser | null>;
};

const ChefuAuthContext = createContext<ChefuAuthContextValue | null>(null);

export function ChefuAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ChefuAuthSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await readStoredSession();
        if (saved) {
          try {
            const me = await fetchChefuJson<{ user?: { user?: ChefuUser; displayName?: string; photoURL?: string | null }; profile?: ChefuUser } | { user?: ChefuUser }>('/auth/me', saved);
            const resolvedUser = (() => {
              const base = me as any;
              if (base?.user && typeof base.user === 'object' && 'email' in base.user) return base.user;
              return base?.profile ?? base?.user ?? {};
            })();
            setSession({ token: saved.token, user: {
              ...saved.user,
              ...resolvedUser,
              displayName: resolvedUser?.displayName || resolvedUser?.name || saved.user.displayName || saved.user.name || saved.user.email,
              photoURL: resolvedUser?.photoURL ?? saved.user.photoURL ?? null,
            } });
          } catch {
            setSession(null);
            await writeStoredSession(null);
          }
        }
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const value = useMemo<ChefuAuthContextValue>(() => ({
    isLoaded,
    isSignedIn: !!session,
    userId: session?.user?.uid || session?.user?.email || undefined,
    session,
    user: session?.user ?? null,
    sessionClaims: { aud: 'chefu' },
    getToken: async () => session?.token ?? null,
    signInWithPassword: async (email: string, password: string) => {
      const login = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!login.ok) {
        const errorBody = await login.json().catch(() => ({})) as { error?: string; message?: string };
        throw new Error(errorBody.error || errorBody.message || 'Invalid email or password.');
      }

      const loginBody = await login.json() as { token?: string; idToken?: string; user?: ChefuUser };
      const token = loginBody.token || loginBody.idToken;
      if (!token) {
        throw new Error('Your Chefu account did not return a valid token.');
      }

      const nextSession = { token, user: loginBody.user || { email } };
      const me = await fetchChefuJson<{ user?: { user?: ChefuUser; displayName?: string; photoURL?: string | null }; profile?: ChefuUser } | { user?: ChefuUser }>('/auth/me', nextSession);
      const base = me as any;
      const resolvedUser = base?.user && typeof base.user === 'object' && 'email' in base.user ? base.user : (base?.profile ?? base?.user ?? { email });
      const normalizedUser = {
        ...nextSession.user,
        ...resolvedUser,
        displayName: resolvedUser.displayName || resolvedUser.name || resolvedUser.email || nextSession.user.email || nextSession.user.displayName,
        photoURL: resolvedUser.photoURL ?? nextSession.user.photoURL ?? null,
      } as ChefuUser;

      const finalSession = { token, user: normalizedUser };
      setSession(finalSession);
      await writeStoredSession(finalSession);
      return normalizedUser;
    },
    signOut: async () => {
      try {
        if (session?.token) {
          await fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/logout`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.token}` },
            credentials: 'include',
          }).catch(() => undefined);
        }
      } finally {
        setSession(null);
        await writeStoredSession(null);
      }
    },
    refreshUser: async () => {
      if (!session?.token) {
        setSession(null);
        await writeStoredSession(null);
        return null;
      }

      try {
        const me = await fetchChefuJson<{ user?: { user?: ChefuUser; displayName?: string; photoURL?: string | null }; profile?: ChefuUser } | { user?: ChefuUser }>('/auth/me', session);
        const base = me as any;
        const resolvedUser = base?.user && typeof base.user === 'object' && 'email' in base.user ? base.user : (base?.profile ?? base?.user ?? session.user);
        const nextSession = { token: session.token, user: { ...session.user, ...resolvedUser, displayName: resolvedUser.displayName || resolvedUser.name || session.user.displayName || session.user.email || resolvedUser.email, photoURL: resolvedUser.photoURL ?? session.user.photoURL ?? null } };
        setSession(nextSession);
        await writeStoredSession(nextSession);
        return nextSession.user;
      } catch {
        setSession(null);
        await writeStoredSession(null);
        return null;
      }
    },
  }), [isLoaded, session]);

  return createElement(ChefuAuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(ChefuAuthContext);
  if (!context) {
    throw new Error('ChefuAuthProvider is required.');
  }

  return context;
}

export function useUser() {
  const { user } = useAuth();
  return { user: user ?? null };
}

export function useClerk() {
  const { signOut } = useAuth();
  return { signOut };
}

export function useConvexAuth() {
  const { isLoaded, isSignedIn } = useAuth();
  return { isLoading: !isLoaded, isAuthenticated: isSignedIn };
}

export function useConvex() {
  return { isAuthenticated: !!useAuth().session };
}

export function useSSO() {
  return {
    startSSOFlow: async () => {
      throw new Error('SSO is not enabled in this build. Use email/password sign-in with the Chefu backend.');
    },
  };
}
