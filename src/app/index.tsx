import { useSocialAuth } from "@/hooks/use-social-auth";
import { openLegalDocument } from "@/lib/legal-links";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useColorScheme,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";


interface Theme {
  background: string;
  surface: string;
  ink: string;
  body: string;
  muted: string;
  border: string;
  borderFocus: string;
  placeholder: string;
  buttonBackground: string;
  buttonText: string;
}

const themes: Record<"light" | "dark", Theme> = {
  light: {
    background: "#FFFFFF",
    surface: "#FAFAFA",
    ink: "#09090B",
    body: "#3F3F46",
    muted: "#71717A",
    border: "#E4E4E7",
    borderFocus: "#09090B",
    placeholder: "#A1A1AA",
    buttonBackground: "#09090B",
    buttonText: "#FFFFFF",
  },
  dark: {
    background: "#09090B",
    surface: "#111113",
    ink: "#FAFAFA",
    body: "#D4D4D8",
    muted: "#A1A1AA",
    border: "#27272A",
    borderFocus: "#FAFAFA",
    placeholder: "#71717A",
    buttonBackground: "#FAFAFA",
    buttonText: "#09090B",
  },
};

type Styles = ReturnType<typeof createStyles>;

export default function Index() {
  const { signIn, pendingProvider, isReady } = useSocialAuth();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const theme = themes[isDark ? "dark" : "light"];
  const styles = useMemo(() => createStyles(theme), [theme]);

  const isBusy = Boolean(pendingProvider);
  const canSubmit = isReady && !isBusy;

  const submit = () => {
    if (!canSubmit) return;
    void signIn();
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          bounces={false}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: insets.top + 56,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <View style={styles.column}>
            <Image
              source={require("../../assets/images/ct-logo.png")}
              contentFit="contain"
              tintColor={theme.ink}
              style={styles.logo}
              accessibilityLabel="Logo"
            />

            <View style={styles.header}>
              <Text accessibilityRole="header" style={styles.heading}>
                Sign in
              </Text>
              <Text style={styles.subtitle}>
                Sign in securely with your Chefu Account.
              </Text>
            </View>

            <View style={styles.form}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Continue with Chefu Account"
                accessibilityState={{ disabled: !canSubmit, busy: isBusy }}
                disabled={!canSubmit}
                onPress={submit}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  !canSubmit && styles.disabledButton,
                ]}
              >
                {isBusy ? (
                  <View style={styles.busyRow}>
                    <ActivityIndicator color={theme.buttonText} size="small" />
                    <Text style={styles.primaryButtonLabel}>Connecting</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonLabel}>Continue with Chefu Account</Text>
                )}
              </Pressable>
              
            </View>
          </View>

          <View style={styles.column}>
            <Text style={styles.legal}>
              By continuing, you agree to our{" "}
              <Text
                accessibilityRole="link"
                onPress={() => {
                  void openLegalDocument("Terms of Service");
                }}
                style={styles.legalLink}
              >
                Terms of Service
              </Text>{" "}
              and acknowledge our{" "}
              <Text
                accessibilityRole="link"
                onPress={() => {
                  void openLegalDocument("Privacy Policy");
                }}
                style={styles.legalLink}
              >
                Privacy Policy
              </Text>
              .
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function createStyles(theme: Theme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: theme.background },
    content: {
      flexGrow: 1,
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 24,
    },
    column: { width: "100%", maxWidth: 420 },
    logo: { width: 48, aspectRatio: 512 / 359 },
    header: { marginTop: 40, marginBottom: 36 },
    heading: {
      fontSize: 30,
      lineHeight: 36,
      fontWeight: "600",
      letterSpacing: -0.6,
      color: theme.ink,
    },
    subtitle: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      color: theme.muted,
    },
    form: { gap: 16 },
    accountLinks: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 2,
    },
    forgotLabel: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "500",
      color: theme.ink,
    },
    primaryButton: {
      height: 52,
      marginTop: 4,
      borderRadius: 12,
      backgroundColor: theme.buttonBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryButtonLabel: {
      fontSize: 15,
      fontWeight: "600",
      letterSpacing: -0.1,
      color: theme.buttonText,
    },
    busyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    disabledButton: { opacity: 0.4 },
    pressed: { opacity: 0.85 },
    legal: {
      marginTop: 40,
      textAlign: "center",
      fontSize: 12,
      lineHeight: 18,
      color: theme.muted,
    },
    legalLink: {
      color: theme.ink,
      textDecorationLine: "underline",
    },
  });
}
