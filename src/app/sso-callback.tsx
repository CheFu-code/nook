import { useAuth } from '@/lib/chefu-auth';
import { useAppTheme } from '@/lib/theme';
import { Image } from 'expo-image';
import { Redirect } from 'expo-router';
import { StatusBar, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SSOCallback() {
  const { isLoaded, isSignedIn, isAuthenticating } = useAuth();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  if (!isLoaded || isAuthenticating) {
    return (
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Completing sign in"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingHorizontal: 28,
          backgroundColor: theme.background,
        }}
      >
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
        <View
          style={{
            width: 112,
            height: 112,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            borderRadius: 34,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Image
            source={require('../../assets/images/logo-2.png')}
            tintColor={theme.ink}
            contentFit="contain"
            accessibilityLabel="Nook"
            style={{ width: 68, height: 68 }}
          />
        </View>
        <Text
          accessibilityRole="header"
          style={{
            color: theme.ink,
            fontSize: 24,
            fontWeight: '700',
            letterSpacing: -0.6,
            textAlign: 'center',
          }}
        >
          {isAuthenticating ? 'Finishing sign in' : 'Getting things ready'}
        </Text>
        <Text
          style={{
            maxWidth: 280,
            marginTop: 9,
            color: theme.muted,
            fontSize: 14,
            lineHeight: 21,
            textAlign: 'center',
          }}
        >
          Your account is being connected securely. This will only take a moment.
        </Text>
        
        
      </View>
    );
  }
  return <Redirect href={isSignedIn ? '/home' : '/'} />;
}
