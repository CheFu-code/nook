import { useAuth } from '@/lib/chefu-auth';
import { Redirect } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

export default function SSOCallback() {
  const { isLoaded, isSignedIn, isAuthenticating } = useAuth();
  if (!isLoaded || isAuthenticating) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <ActivityIndicator color="#1680FF" />
        <Text>Completing sign in…</Text>
      </View>
    );
  }
  return <Redirect href={isSignedIn ? '/home' : '/'} />;
}
