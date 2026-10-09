import { FeedIcon } from "@/components/feed-icon";
import { useAppTheme } from "@/lib/theme";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
    t: (key: string) => string;
    error: string | null;
    busy: boolean;
    onEnable: () => void;
    onDismiss: () => void;
};

export function BiometricAppLockOffer({
    t,
    error,
    busy,
    onEnable,
    onDismiss,
}: Props) {
    const theme = useAppTheme();

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("Not now")}
                    disabled={busy}
                    onPress={onDismiss}
                    style={styles.backdrop}
                />
                <View
                    accessibilityViewIsModal
                    style={[
                        styles.card,
                        { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                >
                    <View style={[styles.icon, { backgroundColor: theme.blueSoft }]}>
                        <FeedIcon name="lock" size={28} color={theme.blue} />
                    </View>
                    <Text accessibilityRole="header" style={[styles.title, { color: theme.ink }]}>
                        {t("Protect your nook")}
                    </Text>
                    <Text style={[styles.message, { color: theme.secondary }]}>
                        {t("Would you like to turn on biometric unlock to help keep your account private?")}
                    </Text>
                    {!!error && (
                        <Text accessibilityRole="alert" style={styles.error}>
                            {t(error)}
                        </Text>
                    )}
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ busy, disabled: busy }}
                        disabled={busy}
                        onPress={onEnable}
                        style={({ pressed }) => [
                            styles.primary,
                            {
                                backgroundColor: theme.blue,
                                opacity: busy ? 0.65 : pressed ? 0.85 : 1,
                            },
                        ]}
                    >
                        <Text style={styles.primaryText}>
                            {busy ? t("Verifying…") : t("Turn on biometric lock")}
                        </Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: busy }}
                        disabled={busy}
                        onPress={onDismiss}
                        style={styles.secondary}
                    >
                        <Text style={[styles.secondaryText, { color: theme.muted }]}>
                            {t("Not now")}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        backgroundColor: "rgba(5, 10, 20, 0.52)",
    },
    backdrop: {
        ...StyleSheet.absoluteFill,
    },
    card: {
        width: "100%",
        maxWidth: 380,
        alignItems: "center",
        padding: 24,
        borderRadius: 24,
        borderWidth: StyleSheet.hairlineWidth,
    },
    icon: {
        width: 64,
        height: 64,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 21,
        marginBottom: 18,
    },
    title: {
        fontSize: 21,
        fontWeight: "700",
        letterSpacing: -0.4,
        textAlign: "center",
    },
    message: {
        marginTop: 9,
        fontSize: 14,
        lineHeight: 21,
        textAlign: "center",
    },
    error: {
        marginTop: 14,
        color: "#E5485D",
        fontSize: 13,
        lineHeight: 19,
        textAlign: "center",
    },
    primary: {
        width: "100%",
        minHeight: 50,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 22,
        paddingHorizontal: 16,
        borderRadius: 15,
    },
    primaryText: {
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: "700",
    },
    secondary: {
        minHeight: 44,
        minWidth: 100,
        justifyContent: "center",
        alignItems: "center",
        marginTop: 4,
    },
    secondaryText: {
        fontSize: 14,
        fontWeight: "600",
    },
});
