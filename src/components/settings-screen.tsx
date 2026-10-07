import { StatusBar } from 'expo-status-bar';
import * as Sentry from '@sentry/react-native';
import { openLegalDocument } from '@/lib/legal-links';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedIcon, type IconName } from './feed-icon';
import { SentryTestScreen } from './sentry-test-screen';
import { useAppTheme } from '@/lib/theme';

type SettingsProps = {
  onClose: () => void;
  onEdit: () => void;
  onSaved: () => void;
  onSignOut: () => Promise<void>;
  accountName: string;
  preview?: boolean;
};
type Row = { label: string; icon: IconName; action: () => void; detail?: string };

export function SettingsScreen({ onClose, onEdit, onSaved, onSignOut, accountName, preview = false }: SettingsProps) {
  const { width, height } = useWindowDimensions(); const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const s = width / 390; const v = (height - insets.top - insets.bottom) / 810;
  const [signingOut, setSigningOut] = useState(false);
  const [showSentryTest, setShowSentryTest] = useState(false);
  const unavailable = (title: string, message: string) => () => Alert.alert(title, message);
  const account: Row[] = [
    { label: 'Edit profile', icon: 'profile', action: onEdit },
    { label: 'Account', icon: 'settings', action: unavailable('Account', `Signed in as ${accountName}.`) },
    { label: 'Notifications', icon: 'bell', action: unavailable('Notifications', 'Notification preferences are not available yet.') },
    { label: 'Privacy', icon: 'lock', action: unavailable('Privacy', 'Privacy controls are not available yet.') },
    { label: 'Blocked users', icon: 'blocked', action: unavailable('Blocked users', 'Blocking controls are not available yet.') },
    { label: 'Saved posts', icon: 'bookmark', action: onSaved },
  ];
  const support: Row[] = [
    { label: 'Help & support', icon: 'help', action: unavailable('Help & support', 'A support contact has not been configured yet.') },
    { label: 'Report a problem', icon: 'support', action: Sentry.showFeedbackForm },
    { label: 'Privacy Policy', icon: 'document', action: () => { void openLegalDocument('Privacy Policy'); } },
    { label: 'Terms of Service', icon: 'document', action: () => { void openLegalDocument('Terms of Service'); } },
    { label: 'About', icon: 'info', detail: 'Version 1.0 (2026)', action: unavailable('nook', 'Version 1.0 (2026)') },
  ];
  const group = (rows: Row[]) =>   <View style={[styles.card, { borderRadius: 14 * s, backgroundColor: theme.surface, borderColor: theme.border }]}>{rows.map((row, index) => <Pressable key={row.label} accessibilityRole="button" accessibilityLabel={row.detail ? `${row.label}, ${row.detail}` : row.label} onPress={row.action} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: Math.max(44, 40.5 * v), backgroundColor: pressed ? theme.subtle : 'transparent' })}>
  <View style={{ width: 64 * s, alignItems: 'center' }}><FeedIcon name={row.icon} size={21 * s} color={theme.ink} /></View>
  <View style={{ flex: 1, minHeight: Math.max(44, 40.5 * v), flexDirection: 'row', alignItems: 'center', paddingRight: 17 * s, borderBottomWidth: index < rows.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: theme.border, gap: 8 * s }}>
    <Text style={{ flex: 1, color: theme.ink, fontSize: 14.5 * s, letterSpacing: -0.35 * s }}>{row.label}</Text>
    {row.detail ? <Text style={{ color: theme.muted, fontSize: 13.5 * s, letterSpacing: -0.4 * s }}>{row.detail}</Text> : <FeedIcon name="chevron-right" size={14 * s} color={theme.muted} />}
    </View>
  </Pressable>)}</View>;
  if (showSentryTest) return <SentryTestScreen onClose={() => setShowSentryTest(false)} />;
  return <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: theme.background }]}>
    <StatusBar style={theme.isDark ? 'light' : 'dark'} />
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14 * s, paddingBottom: insets.bottom + 100 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to profile" onPress={onClose} style={{ minHeight: 44, alignSelf: 'flex-start', paddingHorizontal: 8 * s, justifyContent: 'center' }}><FeedIcon name="back" size={24 * s} color={theme.ink} /></Pressable>
      <Text accessibilityRole="header" style={{ color: theme.ink, fontSize: 34 * s, lineHeight: 43 * s, fontWeight: '700', letterSpacing: -1.2 * s, marginHorizontal: 8 * s, marginBottom: 11 * v }}>Settings</Text>
      <Text accessibilityRole="header" style={[styles.section, { color: theme.ink, fontSize: 16 * s, marginHorizontal: 8 * s, marginBottom: 9 * v }]}>Account</Text>
      {group(account)}
      <Pressable accessibilityRole="button" accessibilityLabel="Share feedback" accessibilityHint="Opens a form to send feedback about nook" onPress={Sentry.showFeedbackForm} style={({ pressed }) => [styles.feedbackCard, { marginTop: 18 * v, padding: 18 * s, gap: 14 * s, opacity: pressed ? 0.75 : 1, backgroundColor: theme.blueSoft, borderColor: theme.border }]}>
        <View style={[styles.feedbackIcon, { backgroundColor: theme.surface }]}><FeedIcon name="comment" size={25} color={theme.blue} /></View>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ color: theme.ink, fontSize: 17 * s, fontWeight: '700', letterSpacing: -0.4 }}>Help shape nook</Text>
          <Text style={{ color: theme.secondary, fontSize: 13 * s, lineHeight: 19 * s }}>An idea, a little hiccup, or something you love? We’re listening.</Text>
          <Text style={{ color: theme.blue, fontSize: 14 * s, fontWeight: '600', marginTop: 5 }}>Share feedback →</Text>
        </View>
      </Pressable>
      <Text accessibilityRole="header" style={[styles.section, { color: theme.ink, fontSize: 16 * s, marginHorizontal: 8 * s, marginTop: 17 * v, marginBottom: 8 * v }]}>Support &amp; Legal</Text>
      {group(support)}
      <Text accessibilityRole="header" style={[styles.section, { color: theme.ink, fontSize: 16 * s, marginHorizontal: 8 * s, marginTop: 17 * v, marginBottom: 8 * v }]}>Diagnostics</Text>
      {group([{ label: 'Sentry test', icon: 'info', action: () => setShowSentryTest(true) }])}
      <Pressable accessibilityRole="button" disabled={signingOut} onPress={async () => {
        if (preview) { Alert.alert('Preview account', 'Sign out is available from your live profile.'); return; }
        setSigningOut(true); try { await onSignOut(); } catch { Alert.alert('Unable to sign out', 'Please try again.'); } finally { setSigningOut(false); }
      }} style={({ pressed }) => [styles.action, { height: Math.max(44, 46 * v), marginTop: 16 * v, borderRadius: 16 * s, backgroundColor: theme.blueSoft, opacity: pressed || signingOut ? 0.6 : 1, gap: 17 * s }]}><FeedIcon name="sign-out" size={24 * s} color={theme.blue} /><Text style={{ color: theme.blue, fontSize: 16 * s, fontWeight: '500', letterSpacing: -0.4 * s }}>{signingOut ? 'Signing out…' : 'Sign Out'}</Text></Pressable>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FCFDFE' },
  section: { color: '#080E3B', fontWeight: '600', letterSpacing: -0.45 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderColor: '#E0E8F5', backgroundColor: '#FFFFFF80', overflow: 'hidden' },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  feedbackCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EDF4FF', borderWidth: StyleSheet.hairlineWidth, borderColor: '#D3E3FC', borderRadius: 20 },
  feedbackIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
