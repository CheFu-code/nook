import { MessagesProvider } from '@/context/messages-context';
import { useAuth, ChefuAuthProvider } from '@/lib/chefu-auth';
import { Stack } from 'expo-router';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'https://d49d5db24e3765ff90211c22ad7532b3@o4509813037137920.ingest.de.sentry.io/4512078093942864',
  sendDefaultPii: false,
  enableLogs: true,
  integrations: [
    Sentry.feedbackIntegration({
      colorScheme: 'light',
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
        container: { backgroundColor: '#FCFDFE' },
        title: { color: '#080E3B', fontWeight: '700' },
        label: { color: '#080E3B' },
        input: { color: '#080E3B', backgroundColor: '#F2F6FC', borderRadius: 12 },
        textArea: { color: '#080E3B', backgroundColor: '#F2F6FC', borderRadius: 12 },
        submitButton: { backgroundColor: '#007AFF', borderRadius: 14, minHeight: 48 },
        submitText: { color: '#FFFFFF', fontWeight: '600' },
        cancelButton: { borderRadius: 14, minHeight: 44 },
        cancelText: { color: '#52617D' },
      },
    }),
  ],
});

Sentry.logger.info('nook initialized', { platform: Platform.OS });

function AuthenticatedRoutes() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#1680FF" accessibilityLabel="Loading your account" /></View>;
  }
  return (
    <MessagesProvider key={userId ?? "signed-out"}><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#FCFDFE' } }}>
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="index" />
      </Stack.Protected>
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="story-compose" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="compose" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="post/[id]" />
        <Stack.Screen name="member/[id]" />
        <Stack.Screen name="chat/[id]" />
      </Stack.Protected>
      <Stack.Screen name="sso-callback" />
    </Stack></MessagesProvider>
  );
}

function RootLayout() {
  return (
    <ChefuAuthProvider>
      <AuthenticatedRoutes />
    </ChefuAuthProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCFDFE' },
});

export default Sentry.wrap(RootLayout);
