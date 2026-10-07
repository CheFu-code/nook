import { useAuth } from '@/lib/chefu-auth';
import { useAppTheme } from '@/lib/theme';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

export default function SSOCallback() {
  const { isLoaded, isSignedIn, isAuthenticating } = useAuth();
  const theme = useAppTheme();
  if (!isLoaded || isAuthenticating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.blue} />
        <Text style={{ color: theme.ink }}>Completing sign in…</Text>
      </View>
    );
  }
  return <Redirect href={isSignedIn ? '/home' : '/'} />;
}
