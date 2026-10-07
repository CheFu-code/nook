import * as AuthSession from 'expo-auth-session';
import { randomUUID } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

WebBrowser.maybeCompleteAuthSession();

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
  emailAddresses?: { emailAddress?: string }[];
};

export type ChefuAuthSession = {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  user: ChefuUser;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.chefu.co.za';
const CLIENT_ID = 'nook-mobile';
const CHEFU_APP_ID = 'nook';
const SESSION_KEY = 'chefu_auth_session';
const TOKEN_REFRESH_BUFFER_MS = 60_000;
const REDIRECT_URI = AuthSession.makeRedirectUri({ path: 'sso-callback', scheme: 'nook' });
const DISCOVERY = {
  authorizationEndpoint: `${API_BASE_URL.replace(/\/$/, '')}/oauth/authorize`,
  tokenEndpoint: `${API_BASE_URL.replace(/\/$/, '')}/oauth/token`,
  userInfoEndpoint: `${API_BASE_URL.replace(/\/$/, '')}/oauth/userinfo`,
};

type UserInfo = {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  photoURL?: string;
  roles?: string[];
};

let refreshInFlight: Promise<ChefuAuthSession> | null = null;

async function getStoredValue(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function setStoredValue(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    if (typeof localStorage === 'undefined') return;
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}

async function readStoredSession(): Promise<ChefuAuthSession | null> {
  const raw = await getStoredValue(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ChefuAuthSession>;
    if (!parsed.token || !parsed.user || !parsed.expiresAt) return null;
    return {
      token: parsed.token,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      user: parsed.user,
    };
  } catch {
    return null;
  }
}

async function writeStoredSession(session: ChefuAuthSession | null) {
  await setStoredValue(SESSION_KEY, session ? JSON.stringify(session) : null);
}

async function fetchOAuthUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch(DISCOVERY.userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'x-chefu-app': CHEFU_APP_ID,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as {
      error?: string;
      message?: string | string[];
    };
    const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
    throw new Error(message || body.error || 'Unable to load your Chefu account.');
  }
  return response.json() as Promise<UserInfo>;
}

function mapUser(info: UserInfo): ChefuUser {
  return {
    uid: info.sub,
    email: info.email,
    displayName: info.name || info.email,
    name: info.name,
    photoURL: info.picture || info.photoURL || null,
    roles: info.roles,
  };
}

function getExpiry(issuedAt: number, expiresIn: number): number {
  return (issuedAt + expiresIn) * 1000;
}

export type ChefuAuthContextValue = {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId?: string;
  session: ChefuAuthSession | null;
  user: ChefuUser | null;
  sessionClaims?: { aud?: string };
  getToken: (options?: { template?: string } | Record<string, never>) => Promise<string | null>;
  signInWithChefuAccount: () => Promise<ChefuUser | null>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<ChefuUser | null>;
};

const ChefuAuthContext = createContext<ChefuAuthContextValue | null>(null);

export function ChefuAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ChefuAuthSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshSession = useCallback((current: ChefuAuthSession) => {
    if (refreshInFlight) return refreshInFlight;
    if (!current.refreshToken) {
      return Promise.reject(new Error('Your session expired. Please sign in again.'));
    }

    const pending = (async () => {
      const token = await AuthSession.refreshAsync(
        { clientId: CLIENT_ID, refreshToken: current.refreshToken },
        DISCOVERY,
      );
      if (!token.accessToken || !token.expiresIn) {
        throw new Error('Your session could not be refreshed. Please sign in again.');
      }
      const refreshed: ChefuAuthSession = {
        ...current,
        token: token.accessToken,
        refreshToken: token.refreshToken || current.refreshToken,
        expiresAt: getExpiry(token.issuedAt, token.expiresIn),
      };
      await writeStoredSession(refreshed);
      setSession(refreshed);
      return refreshed;
    })();

    refreshInFlight = pending;
    void pending.finally(() => {
      if (refreshInFlight === pending) refreshInFlight = null;
    }).catch(() => undefined);
    return pending;
  }, []);

  const getValidSession = useCallback(async (current: ChefuAuthSession | null) => {
    if (!current) return null;
    if (current.expiresAt > Date.now() + TOKEN_REFRESH_BUFFER_MS) return current;
    return refreshSession(current);
  }, [refreshSession]);

  useEffect(() => {
    void (async () => {
      try {
        const saved = await readStoredSession();
        if (!saved) return;
        try {
          const active = await getValidSession(saved);
          if (!active) return;
          const info = await fetchOAuthUserInfo(active.token);
          if (!info.sub || !info.email) throw new Error('Invalid user info response.');
          const restored = { ...active, user: mapUser(info) };
          await writeStoredSession(restored);
          setSession(restored);
        } catch {
          await writeStoredSession(null);
          setSession(null);
        }
      } finally {
        setIsLoaded(true);
      }
    })();
  }, [getValidSession]);

  const value = useMemo<ChefuAuthContextValue>(() => ({
    isLoaded,
    isSignedIn: !!session,
    userId: session?.user.uid || session?.user.email || undefined,
    session,
    user: session?.user ?? null,
    sessionClaims: { aud: 'chefu' },
    getToken: async () => {
      const active = await getValidSession(session);
      return active?.token ?? null;
    },
    signInWithChefuAccount: async () => {
      const state = randomUUID();
      const nonce = randomUUID();
      const request = new AuthSession.AuthRequest({
        clientId: CLIENT_ID,
        extraParams: { nonce },
        prompt: AuthSession.Prompt.Login,
        redirectUri: REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        scopes: ['openid', 'profile', 'email'],
        state,
        usePKCE: true,
      });
      const result = await request.promptAsync(DISCOVERY);
      if (result.type !== 'success') {
        if (result.type === 'error') {
          throw new Error(result.params.error_description || result.params.error || 'Chefu Account sign-in failed.');
        }
        return null;
      }
      if (result.params.state !== state || !result.params.code || !request.codeVerifier) {
        throw new Error('Sign-in response failed security validation.');
      }

      const token = await AuthSession.exchangeCodeAsync({
        clientId: CLIENT_ID,
        code: result.params.code,
        extraParams: { code_verifier: request.codeVerifier },
        redirectUri: REDIRECT_URI,
      }, DISCOVERY);
      if (!token.accessToken || !token.expiresIn) {
        throw new Error('Sign-in did not return a valid session.');
      }
      const info = await fetchOAuthUserInfo(token.accessToken);
      if (!info.sub || !info.email) {
        throw new Error('Sign-in did not return a valid Chefu account.');
      }

      const next: ChefuAuthSession = {
        token: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: getExpiry(token.issuedAt, token.expiresIn),
        user: mapUser(info),
      };
      await writeStoredSession(next);
      setSession(next);
      return next.user;
    },
    signOut: async () => {
      setSession(null);
      await writeStoredSession(null);
    },
    refreshUser: async () => {
      try {
        const active = await getValidSession(session);
        if (!active) return null;
        const info = await fetchOAuthUserInfo(active.token);
        if (!info.sub || !info.email) throw new Error('Invalid user info response.');
        const refreshed = { ...active, user: mapUser(info) };
        await writeStoredSession(refreshed);
        setSession(refreshed);
        return refreshed.user;
      } catch {
        setSession(null);
        await writeStoredSession(null);
        return null;
      }
    },
  }), [getValidSession, isLoaded, session]);

  return createElement(ChefuAuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(ChefuAuthContext);
  if (!context) throw new Error('ChefuAuthProvider is required.');
  return context;
}
