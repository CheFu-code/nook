import { useAuth } from '@/lib/chefu-auth';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { authErrorMessage } from '@/lib/auth-errors';

export type AuthProvider = 'Email';

export function useSocialAuth() {
  const { isLoaded, signInWithPassword } = useAuth();
  const inFlight = useRef(false);
  const [pendingProvider, setPendingProvider] = useState<AuthProvider | null>(null);

  async function signIn(provider: AuthProvider, email: string, password: string) {
    if (!isLoaded || inFlight.current) return;
    inFlight.current = true;
    setPendingProvider(provider);
    try {
      await signInWithPassword(email, password);
    } catch (error) {
      const message = authErrorMessage(error);
      if (message) Alert.alert('Unable to sign in', message);
    } finally {
      inFlight.current = false;
      setPendingProvider(null);
    }
  }

  return { signIn, pendingProvider, isReady: isLoaded };
}
