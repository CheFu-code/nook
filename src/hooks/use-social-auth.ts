import { useAuth } from '@/lib/chefu-auth';
import { useRef, useState } from 'react';
import { Alert } from 'react-native';
import { authErrorMessage } from '@/lib/auth-errors';

export type AuthProvider = 'Chefu Account';

export function useSocialAuth() {
    const { isLoaded, signInWithChefuAccount } = useAuth();
    const inFlight = useRef(false);
    const [pendingProvider, setPendingProvider] = useState<AuthProvider | null>(null);

    async function signIn() {
        if (!isLoaded || inFlight.current) return;
        inFlight.current = true;
        setPendingProvider('Chefu Account');
        try {
            await signInWithChefuAccount();
        } catch (error) {
            const message = authErrorMessage(error);
            if (message) Alert.alert('Unable to sign in', message);
            console.error('Error signing in with Chefu Account', error);
        } finally {
            inFlight.current = false;
            setPendingProvider(null);
        }
    }

    return { signIn, pendingProvider, isReady: isLoaded };
}
