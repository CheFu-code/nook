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
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Theme {
  background: string;
  surface: string;
  ink: string;
  body: string;
  muted: string;
  border: string;
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
    buttonBackground: "#FAFAFA",
    buttonText: "#09090B",
  },
};

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
              paddingTop: insets.top,
              paddingBottom: insets.bottom + 20,
            },
          ]}
        >
          <View style={styles.centerArea}>
            <View style={styles.main}>
              <Image
                source={require("../../assets/images/ct-logo.png")}
                contentFit="contain"
                tintColor={theme.ink}
                style={styles.logo}
                accessibilityLabel="App logo"
              />

              <View style={styles.header}>
                <Text accessibilityRole="header" style={styles.heading}>
                  Welcome back
                </Text>

                <Text style={styles.subtitle}>
                  Sign in to continue to your account and pick up where you left
                  off.
                </Text>
              </View>

              <View style={styles.form}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Continue"
                  accessibilityState={{
                    disabled: !canSubmit,
                    busy: isBusy,
                  }}
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
                      <ActivityIndicator
                        color={theme.buttonText}
                        size="small"
                      />

                      <Text style={styles.primaryButtonLabel}>
                        Signing in...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonLabel}>Continue</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
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
    flex: {
      flex: 1,
    },

    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },

    content: {
      flexGrow: 1,
      paddingHorizontal: 24,
    },

    centerArea: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },

    main: {
      width: "100%",
      maxWidth: 420,
    },

    logo: {
      width: 52,
      height: 37,
      alignSelf: "center",
    },

    header: {
      alignItems: "center",
      marginTop: 42,
      marginBottom: 34,
    },

    heading: {
      fontSize: 32,
      lineHeight: 38,
      fontWeight: "600",
      letterSpacing: -0.8,
      color: theme.ink,
      textAlign: "center",
    },

    subtitle: {
      maxWidth: 320,
      marginTop: 11,
      fontSize: 15,
      lineHeight: 22,
      color: theme.muted,
      textAlign: "center",
    },

    form: {
      width: "100%",
    },

    primaryButton: {
      height: 54,
      borderRadius: 13,
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

    busyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },

    disabledButton: {
      opacity: 0.45,
    },

    pressed: {
      opacity: 0.82,
      transform: [{ scale: 0.99 }],
    },

    footer: {
      width: "100%",
      maxWidth: 420,
    },

    legal: {
      marginTop: 24,
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
