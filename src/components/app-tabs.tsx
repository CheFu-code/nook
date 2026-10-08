import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useAppTheme } from '@/lib/theme';
import { useNookLanguage } from '@/lib/language';

export function AppTabs() {
  const theme = useAppTheme();
  const { t } = useNookLanguage();
  const routerTheme = theme.isDark ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={routerTheme}>
      <NativeTabs tintColor={theme.blue} iconColor={{ default: theme.muted, selected: theme.blue }} labelStyle={{ default: { color: theme.muted }, selected: { color: theme.blue } }} backgroundColor={theme.background} shadowColor="transparent">
        <NativeTabs.Trigger name="home" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Label>{t("Home")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="messages" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Label>{t("Messages")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} md="chat_bubble" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="explore" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Label>{t("Explore")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'safari', selected: 'safari.fill' }} md="explore" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile" disableAutomaticContentInsets>
          <NativeTabs.Trigger.Label>{t("Profile")}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
        </NativeTabs.Trigger>
      </NativeTabs>
    </ThemeProvider>
  );
}
