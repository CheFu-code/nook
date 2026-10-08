import { useNookLanguage } from "@/lib/language";
import { openLegalDocument } from "@/lib/legal-links";
import { useAppTheme } from "@/lib/theme";
import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
    Alert,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedIcon } from "./feed-icon";
import { Row, SettingsProps } from "./settings-screen.types";


export function SettingsScreen({
    onClose,
    onEdit,
    onSaved,
    onBlockedUsers,
    onSignOut,
    preview = false,
}: SettingsProps) {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const { language, setLanguage, t } = useNookLanguage();
    const s = width / 390;
    const v = (height - insets.top - insets.bottom) / 810;
    const [signingOut, setSigningOut] = useState(false);
    const [languageOpen, setLanguageOpen] = useState(false);
    const [savingLanguage, setSavingLanguage] = useState(false);
    const account: Row[] = [
        { label: t("Edit profile"), icon: "profile", action: onEdit },
        {
            label: t("Account"),
            icon: "settings",
            trailingIcon: "open-link",
            action: () => {
                void Linking.openURL("https://myaccount.chefu.co.za/account").catch(() => {
                    Alert.alert(t("Unable to open link"), t("Please try again."));
                });
            },
        },
        { label: t("Language"), icon: "language", detail: language === "zu" ? "isiZulu" : language === "fr" ? "Français" : language === "ts" ? "Xitsonga" : t("English"), action: () => setLanguageOpen(true) },
        { label: t("Blocked users"), icon: "blocked", action: onBlockedUsers },
        { label: t("Saved posts"), icon: "bookmark", action: onSaved },
    ];
    const support: Row[] = [
        {
            label: t("Help & support"),
            icon: "help",
            trailingIcon: "open-link",
            action: () => {
                void Linking.openURL("mailto:support@chefu.co.za").catch(() => {
                    Alert.alert(t("Unable to open email"), t("Please try again."));
                });
            },
        },
        {
            label: t("Report a problem"),
            icon: "support",
            action: Sentry.showFeedbackForm,
        },
        {
            label: t("Privacy Policy"),
            icon: "document",
            trailingIcon: "open-link",
            action: () => {
                void openLegalDocument("Privacy Policy");
            },
        },
        {
            label: t("Terms of Service"),
            icon: "document",
            trailingIcon: "open-link",
            action: () => {
                void openLegalDocument("Terms of Service");
            },
        },
        {
            label: t("About"),
            icon: "info",
            detail: `${t("Version")} ${Constants.expoConfig?.version ?? t("Unknown")}`,
        },
    ];
    const group = (rows: Row[]) => (
        <View
            style={[
                styles.card,
                {
                    borderRadius: 14 * s,
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                },
            ]}
        >
            {rows.map((row, index) => (
                <Pressable
                    key={row.label}
                    accessibilityRole={row.action ? "button" : undefined}
                    accessibilityLabel={
                        row.detail ? `${row.label}, ${row.detail}` : row.label
                    }
                    disabled={!row.action}
                    onPress={row.action}
                    style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        minHeight: Math.max(44, 40.5 * v),
                        backgroundColor:
                            pressed && row.action ? theme.subtle : "transparent",
                    })}
                >
                    <View style={{ width: 64 * s, alignItems: "center" }}>
                        <FeedIcon name={row.icon} size={21 * s} color={theme.ink} />
                    </View>
                    <View
                        style={{
                            flex: 1,
                            minHeight: Math.max(44, 40.5 * v),
                            flexDirection: "row",
                            alignItems: "center",
                            paddingRight: 17 * s,
                            borderBottomWidth:
                                index < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
                            borderBottomColor: theme.border,
                            gap: 8 * s,
                        }}
                    >
                        <Text
                            style={{
                                flex: 1,
                                color: theme.ink,
                                fontSize: 14.5 * s,
                                letterSpacing: -0.35 * s,
                            }}
                        >
                            {row.label}
                        </Text>
                        {row.detail ? (
                            <Text
                                style={{
                                    color: theme.muted,
                                    fontSize: 13.5 * s,
                                    letterSpacing: -0.4 * s,
                                }}
                            >
                                {row.detail}
                            </Text>
                        ) : row.action ? (
                            <FeedIcon
                                name={row.trailingIcon ?? "chevron-right"}
                                size={14 * s}
                                color={theme.muted}
                            />
                        ) : null}
                    </View>
                </Pressable>
            ))}
        </View>
    );
   
    return (
        <View
            style={[
                styles.screen,
                { paddingTop: insets.top, backgroundColor: theme.background },
            ]}
        >
            <StatusBar style={theme.isDark ? "light" : "dark"} />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: 14 * s,
                    paddingBottom: insets.bottom + 100,
                }}
            >
                <View
                    style={{
                        minHeight: 52 * v,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10 * s,
                        marginBottom: 11 * v,
                    }}
                >
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("Back to profile")}
                        onPress={onClose}
                        style={{
                            minWidth: 44,
                            minHeight: 44,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <FeedIcon name="back" size={24 * s} color={theme.ink} />
                    </Pressable>
                    <Text
                        accessibilityRole="header"
                        style={{
                            color: theme.ink,
                            fontSize: 30 * s,
                            lineHeight: 43 * s,
                            fontWeight: "700",
                            letterSpacing: -1.2 * s,
                        }}
                    >
                        {t("Settings")}
                    </Text>
                </View>
                <Text
                    accessibilityRole="header"
                    style={[
                        styles.section,
                        {
                            color: theme.ink,
                            fontSize: 16 * s,
                            marginHorizontal: 8 * s,
                            marginBottom: 9 * v,
                        },
                    ]}
                >
                    {t("Account")}
                </Text>
                {group(account)}
                {/* <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Share feedback"
                    accessibilityHint="Opens a form to send feedback about nook"
                    onPress={Sentry.showFeedbackForm}
                    style={({ pressed }) => [
                        styles.feedbackCard,
                        {
                            marginTop: 18 * v,
                            padding: 18 * s,
                            gap: 14 * s,
                            opacity: pressed ? 0.75 : 1,
                            backgroundColor: theme.blueSoft,
                            borderColor: theme.border,
                        },
                    ]}
                >
                    <View
                        style={[styles.feedbackIcon, { backgroundColor: theme.surface }]}
                    >
                        <FeedIcon name="comment" size={25} color={theme.blue} />
                    </View>
                    <View style={{ flex: 1, gap: 5 }}>
                        <Text
                            style={{
                                color: theme.ink,
                                fontSize: 17 * s,
                                fontWeight: "700",
                                letterSpacing: -0.4,
                            }}
                        >
                            Help shape nook
                        </Text>
                        <Text
                            style={{
                                color: theme.secondary,
                                fontSize: 13 * s,
                                lineHeight: 19 * s,
                            }}
                        >
                            An idea, a little hiccup, or something you love? We’re listening.
                        </Text>
                        <Text
                            style={{
                                color: theme.blue,
                                fontSize: 14 * s,
                                fontWeight: "600",
                                marginTop: 5,
                            }}
                        >
                            Share feedback →
                        </Text>
                    </View>
                </Pressable> */}
                <Text
                    accessibilityRole="header"
                    style={[
                        styles.section,
                        {
                            color: theme.ink,
                            fontSize: 16 * s,
                            marginHorizontal: 8 * s,
                            marginTop: 17 * v,
                            marginBottom: 8 * v,
                        },
                    ]}
                >
                    {t("Support & Legal")}
                </Text>
                {group(support)}
                
               
                <Pressable
                    accessibilityRole="button"
                    disabled={signingOut}
                    onPress={async () => {
                        if (preview) {
                            Alert.alert(
                                t("Preview account"),
                                t("Sign out is available from your live profile."),
                            );
                            return;
                        }
                        setSigningOut(true);
                        try {
                            await onSignOut();
                        } catch {
                            Alert.alert(t("Unable to sign out"), t("Please try again."));
                        } finally {
                            setSigningOut(false);
                        }
                    }}
                    style={({ pressed }) => [
                        styles.action,
                        {
                            height: Math.max(44, 46 * v),
                            marginTop: 16 * v,
                            borderRadius: 16 * s,
                            backgroundColor: "#E5485D",
                            opacity: pressed || signingOut ? 0.6 : 1,
                            gap: 17 * s,
                        },
                    ]}
                >
                    <FeedIcon name="sign-out" size={24 * s} color="white" />
                    <Text
                        style={{
                            color: "white",
                            fontSize: 16 * s,
                            fontWeight: "500",
                            letterSpacing: -0.4 * s,
                        }}
                    >
                        {signingOut ? t("Signing out…") : t("Sign Out")}
                    </Text>
                </Pressable>
            </ScrollView>
            <Modal
                visible={languageOpen}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => {
                    if (!savingLanguage) setLanguageOpen(false);
                }}
            >
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        padding: 24,
                        backgroundColor: "rgba(5, 10, 20, 0.58)",
                    }}
                >
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("Cancel")}
                        disabled={savingLanguage}
                        onPress={() => setLanguageOpen(false)}
                        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    />
                    <View
                        accessibilityViewIsModal
                        style={{
                            width: "100%",
                            maxWidth: 380,
                            padding: 20 * s,
                            borderRadius: 22 * s,
                            borderWidth: 1,
                            borderColor: theme.border,
                            backgroundColor: theme.surface,
                        }}
                    >
                        <Text
                            accessibilityRole="header"
                            style={{
                                color: theme.ink,
                                fontSize: 20 * s,
                                fontWeight: "700",
                            }}
                        >
                            {t("Language")}
                        </Text>
                        <Text
                            style={{
                                color: theme.muted,
                                fontSize: 14 * s,
                                lineHeight: 20 * s,
                                marginTop: 6 * s,
                                marginBottom: 16 * s,
                            }}
                        >
                            {t("Choose the language used in nook.")}
                        </Text>
                        {([
                            ["en", "English"],
                            ["zu", "isiZulu"],
                            ["fr", "Français"],
                            ["ts", "Xitsonga"],
                        ] as const).map(([value, label]) => {
                            const selected = language === value;
                            return (
                                <Pressable
                                    key={value}
                                    accessibilityRole="radio"
                                    accessibilityState={{ checked: selected, disabled: savingLanguage }}
                                    disabled={savingLanguage}
                                    onPress={async () => {
                                        if (savingLanguage) return;
                                        setSavingLanguage(true);
                                        try {
                                            await setLanguage(value);
                                            setLanguageOpen(false);
                                        } catch (error) {
                                            Alert.alert(
                                                t("Could not change language"),
                                                error instanceof Error
                                                    ? error.message
                                                    : t("Please try again."),
                                            );
                                        } finally {
                                            setSavingLanguage(false);
                                        }
                                    }}
                                    style={{
                                        minHeight: 52 * s,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        paddingHorizontal: 12 * s,
                                        borderRadius: 12 * s,
                                        backgroundColor: selected ? theme.blueSoft : "transparent",
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: selected ? theme.blue : theme.ink,
                                            fontSize: 15 * s,
                                            fontWeight: selected ? "700" : "500",
                                        }}
                                    >
                                        {label}
                                    </Text>
                                    {selected && (
                                        <FeedIcon name="check" size={18 * s} color={theme.blue} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </Modal>
        </View>
    );
}
const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#FCFDFE" },
    section: { color: "#080E3B", fontWeight: "600", letterSpacing: -0.45 },
    card: {
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#E0E8F5",
        backgroundColor: "#FFFFFF80",
        overflow: "hidden",
    },
    action: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    feedbackCard: {
        flexDirection: "row",
        alignItems: "flex-start",
        backgroundColor: "#EDF4FF",
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#D3E3FC",
        borderRadius: 20,
    },
    feedbackIcon: {
        width: 46,
        height: 46,
        borderRadius: 15,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
    },
});
