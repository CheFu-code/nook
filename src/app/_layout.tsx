import { MessagesProvider } from '@/context/messages-context';
import { useAuth, ChefuAuthProvider } from '@/lib/chefu-auth';
import { Stack } from 'expo-router';
import { ActivityIndicator, AppState, Platform, StyleSheet, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { useAppTheme } from '@/lib/theme';
import { createNookQueryClient } from '@/lib/query-client';
import { focusManager, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { MessageNotifications } from '@/components/message-notifications';
import { PresenceSession } from '@/components/presence-session';
import { LanguageProvider, useNookLanguage } from '@/lib/language';

Sentry.init({
  dsn: 'https://b763f67faea237307e894e7707208c9a@o4512011915296768.ingest.de.sentry.io/4512221576101968',

  sendDefaultPii: false,
  enableLogs: true,
  integrations: [
    Sentry.feedbackIntegration({
      colorScheme: 'system',
      formTitle: 'Share your feedback',
      messageLabel: 'What’s on your mind?',
      messagePlaceholder: 'Tell us what you love, what could be better, or what went wrong…',
      submitButtonLabel: 'Send feedback',
      nameLabel: 'Name (optional)',
      emailLabel: 'Email (optional)',
      emailPlaceholder: 'So we can follow up with you',
      isNameRequired: false,
      isEmailRequired: false,
      successMessageText: 'Thanks for helping improve nook!',
      styles: {
        title: { fontWeight: '700' },
        input: { borderRadius: 12 },
        textArea: { borderRadius: 12 },
        submitButton: { borderRadius: 14, minHeight: 48 },
        submitText: { fontWeight: '600' },
        cancelButton: { borderRadius: 14, minHeight: 44 },
      },
    }),
  ],
});

Sentry.logger.info('nook initialized', { platform: Platform.OS });

function AuthenticatedRoutes() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const theme = useAppTheme();
  if (!isLoaded) {
    return <View style={[styles.loading, { backgroundColor: theme.background }]}><ActivityIndicator size="large" color={theme.blue} accessibilityLabel="Loading your account" /></View>;
  }
  return (
    <UserScopedQueryProvider key={userId ?? "signed-out"}>
      <PresenceSession />
      <MessagesProvider>
        <MessageNotifications />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.background } }}>
          <Stack.Protected guard={!isSignedIn}>
            <Stack.Screen name="index" />
          </Stack.Protected>
          <Stack.Protected guard={!!isSignedIn}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="story-compose" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="story/[id]" options={{ presentation: 'fullScreenModal' }} />
            <Stack.Screen name="compose" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
            <Stack.Screen name="post/[id]" />
            <Stack.Screen name="member/[id]" />
            <Stack.Screen name="chat/[id]" />
          </Stack.Protected>
          <Stack.Screen name="sso-callback" />
        </Stack>
      </MessagesProvider>
    </UserScopedQueryProvider>
  );
}

function LanguageReadyRoutes() {
  const { isLanguageLoaded, t } = useNookLanguage();
  const theme = useAppTheme();
  if (!isLanguageLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator
          size="large"
          color={theme.blue}
          accessibilityLabel={t('Loading…')}
        />
      </View>
    );
  }
  return <AuthenticatedRoutes />;
}

function UserScopedQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createNookQueryClient);
  useEffect(() => {
    focusManager.setEventListener(handleFocus => {
      const subscription = AppState.addEventListener('change', state => {
        handleFocus(state === 'active');
      });
      return () => subscription.remove();
    });
  }, []);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function RootLayout() {
  return (
    <LanguageProvider>
      <ChefuAuthProvider>
        <LanguageReadyRoutes />
      </ChefuAuthProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCFDFE' },
});

export default Sentry.wrap(RootLayout);
