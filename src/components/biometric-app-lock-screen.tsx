import { FeedIcon } from "@/components/feed-icon";
import {
    Image,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
    type ImageStyle,
    type TextStyle,
    type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
    isLoaded: boolean;
    unlocking: boolean;
    unlockError: string | null;
    t: (key: string) => string;
    onUnlock: () => void;
    onSignOut: () => void;
};

export function BiometricAppLockScreen({
    isLoaded,
    unlocking,
    unlockError,
    t,
    onUnlock,
    onSignOut,
}: Props) {
    const theme = {
        background: "#FCFDFE",
        surface: "#FFFFFF",
        border: "#E7EAF0",
        ink: "#0D1529",
        muted: "#7C879F",
        secondary: "#52617A",
        blue: "#087EFF",
        blueSoft: "#E8F1FF",
    };
    const insets = useSafeAreaInsets();

    return (
        <Modal
            visible
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => undefined}
        >
            <View
                style={[
                    styles.screen,
                    {
                        paddingTop: Math.max(insets.top, 24),
                        paddingBottom: Math.max(insets.bottom, 24),
                        backgroundColor: theme.background,
                    },
                ]}
            >
                <View
                    pointerEvents="none"
                    style={[
                        styles.glow,
                        {
                            backgroundColor: theme.blueSoft,
                            opacity: 0.75,
                        },
                    ]}
                />

                <View style={styles.content}>
                    <View style={styles.brand}>
                        <Image
                            source={require("@/assets/images/logo-2.png")}
                            resizeMode="contain"
                            style={styles.logo}
                            accessibilityLabel="Nook"
                        />
                        <Text style={[styles.brandName, { color: theme.ink }]}>nook</Text>
                    </View>

                    <View
                        style={[
                            styles.card,
                            {
                                backgroundColor: theme.surface,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <Text
                            accessibilityRole="header"
                            style={[styles.title, { color: theme.ink }]}
                        >
                            {t(isLoaded ? "Nook is locked" : "Checking…")}
                        </Text>

                        {isLoaded && (
                            <>
                                <Text style={[styles.description, { color: theme.secondary }]}>
                                    {t("Verify your identity to continue.")}
                                </Text>

                                {!!unlockError && (
                                    <View
                                        accessibilityRole="alert"
                                        style={[
                                            styles.errorBox,
                                            {
                                                backgroundColor: "#FFF0F1",
                                                borderColor: "#FFD8DC",
                                            },
                                        ]}
                                    >
                                        <Text style={styles.errorText}>{t(unlockError)}</Text>
                                    </View>
                                )}

                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityState={{ busy: unlocking, disabled: unlocking }}
                                    disabled={unlocking}
                                    onPress={onUnlock}
                                    style={({ pressed }) => [
                                        styles.unlockButton,
                                        {
                                            backgroundColor: theme.blue,
                                            opacity: unlocking ? 0.65 : pressed ? 0.86 : 1,
                                        },
                                    ]}
                                >
                                    <FeedIcon name="lock" size={18} color="#FFFFFF" />
                                    <Text style={styles.unlockLabel}>
                                        {unlocking ? t("Verifying…") : t("Unlock with biometrics")}
                                    </Text>
                                </Pressable>

                                <View style={[styles.divider, { backgroundColor: theme.border }]} />

                                <Pressable
                                    accessibilityRole="button"
                                    onPress={onSignOut}
                                    hitSlop={8}
                                    style={({ pressed }) => [
                                        styles.signOutButton,
                                        { opacity: pressed ? 0.65 : 1 },
                                    ]}
                                >
                                    <Text style={[styles.signOutLabel, { color: theme.muted }]}>
                                        {t("Sign out")}
                                    </Text>
                                </Pressable>
                            </>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles: {
    screen: ViewStyle;
    glow: ViewStyle;
    content: ViewStyle;
    brand: ViewStyle;
    logo: ImageStyle;
    brandName: TextStyle;
    card: ViewStyle;
    lockIcon: ViewStyle;
    title: TextStyle;
    description: TextStyle;
    errorBox: ViewStyle;
    errorText: TextStyle;
    unlockButton: ViewStyle;
    unlockLabel: TextStyle;
    divider: ViewStyle;
    signOutButton: ViewStyle;
    signOutLabel: TextStyle;
} = StyleSheet.create({
    screen: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24,
        overflow: "hidden",
    },
    glow: {
        position: "absolute",
        width: 330,
        height: 330,
        borderRadius: 165,
        top: "14%",
        alignSelf: "center",
        transform: [{ scaleX: 1.35 }],
    },
    content: {
        width: "100%",
        maxWidth: 400,
        alignItems: "center",
    },
    brand: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 28,
    },
    logo: {
        width: 96,
        height: 96,
    },
    brandName: {
        fontSize: 23,
        fontWeight: "800",
        letterSpacing: -0.8,
    },
    card: {
        width: "100%",
        alignItems: "center",
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 12,
        borderRadius: 28,
        borderWidth: StyleSheet.hairlineWidth,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 28,
        elevation: 5,
    },
    lockIcon: {
        width: 72,
        height: 72,
        borderRadius: 24,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 22,
    },
    title: {
        fontSize: 25,
        lineHeight: 31,
        fontWeight: "700",
        letterSpacing: -0.6,
        textAlign: "center",
    },
    description: {
        marginTop: 9,
        fontSize: 15,
        lineHeight: 22,
        textAlign: "center",
    },
    errorBox: {
        width: "100%",
        marginTop: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius: 14,
    },
    errorText: {
        color: "#E5485D",
        fontSize: 13,
        lineHeight: 19,
        textAlign: "center",
    },
    unlockButton: {
        width: "100%",
        minHeight: 54,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        marginTop: 26,
        paddingHorizontal: 18,
        borderRadius: 16,
    },
    unlockLabel: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "700",
        letterSpacing: -0.1,
    },
    divider: {
        width: "100%",
        height: StyleSheet.hairlineWidth,
        marginTop: 14,
    },
    signOutButton: {
        minHeight: 48,
        minWidth: 100,
        alignItems: "center",
        justifyContent: "center",
    },
    signOutLabel: {
        fontSize: 14,
        fontWeight: "600",
    },
});
