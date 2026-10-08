import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { AppState, Modal, Platform, Pressable, Text, View } from "react-native";
import { useAuth } from "./chefu-auth";
import { useNookLanguage } from "./language";
import { useAppTheme } from "./theme";
import { FeedIcon } from "@/components/feed-icon";

type BiometricLockContextValue = {
    isAvailable: boolean;
    isLoaded: boolean;
    isEnabled: boolean;
    setEnabled: (enabled: boolean) => Promise<void>;
};

const BiometricLockContext = createContext<BiometricLockContextValue | null>(null);

function preferenceKey(userId: string) {
    return `nook_biometric_lock:${userId}`;
}

async function authenticate(promptMessage: string, cancelLabel: string) {
    const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel,
        disableDeviceFallback: true,
    });
    if (!result.success) {
        if (result.error === "user_cancel" || result.error === "system_cancel" || result.error === "app_cancel") {
            return false;
        }
        throw new Error("Biometric authentication failed. Please try again.");
    }
    return true;
}

export function BiometricAppLockProvider({ children }: { children: ReactNode }) {
    const { isLoaded: authLoaded, isSignedIn, userId, signOut } = useAuth();
    const { t } = useNookLanguage();
    const theme = useAppTheme();
    const [isAvailable, setIsAvailable] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
    const [isEnabled, setIsEnabled] = useState(false);
    const [lockedUserId, setLockedUserId] = useState<string | null>(null);
    const [unlocking, setUnlocking] = useState(false);
    const [unlockError, setUnlockError] = useState<string | null>(null);
    const isLoaded = Platform.OS === "web" || !isSignedIn || (!!userId && loadedUserId === userId);
    const isLocked = !!userId && lockedUserId === userId;
    const isEnabledRef = useRef(isEnabled);
    const signedInRef = useRef(isSignedIn);
    const unlockingRef = useRef(false);

    useEffect(() => {
        isEnabledRef.current = isEnabled;
    }, [isEnabled]);

    useEffect(() => {
        signedInRef.current = isSignedIn;
    }, [isSignedIn]);

    useEffect(() => {
        let active = true;

        void (async () => {
            if (Platform.OS === "web" || !userId) {
                return;
            }

            try {
                const [hasHardware, isEnrolled, types, saved] = await Promise.all([
                    LocalAuthentication.hasHardwareAsync(),
                    LocalAuthentication.isEnrolledAsync(),
                    LocalAuthentication.supportedAuthenticationTypesAsync(),
                    SecureStore.getItemAsync(preferenceKey(userId)),
                ]);
                if (!active) return;
                setIsAvailable(hasHardware && isEnrolled && types.length > 0);
                setIsEnabled(saved === "enabled");
                setLockedUserId(
                    authLoaded && isSignedIn && saved === "enabled" ? userId : null,
                );
                setLoadedUserId(userId);
            } catch (error) {
                console.error("Unable to load biometric app-lock settings.", error);
                if (active) {
                    setIsAvailable(false);
                    setIsEnabled(false);
                    setLockedUserId(null);
                    setLoadedUserId(userId);
                }
                return;
            }
        })();

        return () => {
            active = false;
        };
    }, [authLoaded, isSignedIn, userId]);

    useEffect(() => {
        let previousState = AppState.currentState;
        const subscription = AppState.addEventListener("change", nextState => {
            if (
                nextState === "background" &&
                previousState === "active" &&
                isLoaded &&
                isEnabledRef.current &&
                signedInRef.current &&
                !unlockingRef.current
            ) {
                setUnlockError(null);
                setLockedUserId(userId ?? null);
            }
            previousState = nextState;
        });
        return () => subscription.remove();
    }, [isLoaded, userId]);

    const setEnabled = useCallback(async (enabled: boolean) => {
        if (!userId || Platform.OS === "web") {
            throw new Error("Biometric app lock is available only on a supported mobile device.");
        }
        if (!isAvailable) {
            throw new Error("Set up Face ID or fingerprint unlock on your device first.");
        }

        unlockingRef.current = true;
        let verified: boolean;
        try {
            verified = await authenticate(
                t(enabled ? "Enable biometric app lock" : "Disable biometric app lock"),
                t("Cancel"),
            );
        } finally {
            unlockingRef.current = false;
        }
        if (!verified) return;

        if (enabled) {
            await SecureStore.setItemAsync(preferenceKey(userId), "enabled");
            setIsEnabled(true);
            isEnabledRef.current = true;
        } else {
            await SecureStore.deleteItemAsync(preferenceKey(userId));
            setIsEnabled(false);
            isEnabledRef.current = false;
            setLockedUserId(null);
        }
    }, [isAvailable, t, userId]);

    const unlock = useCallback(async () => {
        if (unlockingRef.current) return;
        unlockingRef.current = true;
        setUnlocking(true);
        setUnlockError(null);
        try {
            const verified = await authenticate(t("Unlock nook"), t("Cancel"));
            if (verified) setLockedUserId(null);
        } catch (error) {
            setUnlockError(error instanceof Error ? error.message : "Biometric authentication failed. Please try again.");
        } finally {
            unlockingRef.current = false;
            setUnlocking(false);
        }
    }, [t]);

    const value = useMemo(() => ({
        isAvailable,
        isLoaded,
        isEnabled,
        setEnabled,
    }), [isAvailable, isEnabled, isLoaded, setEnabled]);

    return (
        <BiometricLockContext.Provider value={value}>
            {children}
            {Platform.OS !== "web" && isSignedIn && (!isLoaded || isLocked) && (
                <Modal
                    visible
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => undefined}
                >
                    <View
                        style={{
                            flex: 1,
                            alignItems: "center",
                            justifyContent: "center",
                            padding: 28,
                            backgroundColor: theme.background,
                        }}
                    >
                        <View
                            style={{
                                width: 76,
                                height: 76,
                                borderRadius: 24,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: theme.blueSoft,
                            }}
                        >
                            <FeedIcon name="lock" size={34} color={theme.blue} />
                        </View>

                        <Text
                            accessibilityRole="header"
                            style={{
                                marginTop: 24,
                                color: theme.ink,
                                fontSize: 25,
                                fontWeight: "700",
                            }}
                        >
                            {t(isLoaded ? "Nook is locked" : "Checking…")}
                        </Text>
                        {isLoaded && <Text
                            style={{
                                marginTop: 8,
                                color: theme.muted,
                                fontSize: 15,
                                lineHeight: 22,
                                textAlign: "center",
                            }}
                        >
                            {t("Verify your identity to continue.")}
                        </Text>}
                        {!!unlockError && (
                            <Text
                                accessibilityRole="alert"
                                style={{
                                    marginTop: 16,
                                    color: "#E5485D",
                                    textAlign: "center",
                                }}
                            >
                                {t(unlockError)}
                            </Text>
                        )}
                        {isLoaded && <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ busy: unlocking, disabled: unlocking }}
                            disabled={unlocking}
                            onPress={() => void unlock()}
                            style={{
                                minHeight: 50,
                                minWidth: 210,
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: 24,
                                paddingHorizontal: 24,
                                borderRadius: 16,
                                backgroundColor: theme.blue,
                                opacity: unlocking ? 0.7 : 1,
                            }}
                        >
                            <Text style={{ color: "white", fontSize: 16, fontWeight: "600" }}>
                                {unlocking ? t("Verifying…") : t("Unlock with biometrics")}
                            </Text>
                        </Pressable>}
                        {isLoaded && <Pressable
                            accessibilityRole="button"
                            onPress={() => void signOut()}
                            style={{ minHeight: 48, justifyContent: "center", marginTop: 12, paddingHorizontal: 16 }}
                        >
                            <Text style={{ color: theme.muted, fontSize: 14 }}>
                                {t("Sign out")}
                            </Text>
                        </Pressable>}
                    </View>
                </Modal>
            )}
        </BiometricLockContext.Provider>
    );
}

export function useBiometricAppLock() {
    const context = useContext(BiometricLockContext);
    if (!context) {
        throw new Error("useBiometricAppLock must be used inside BiometricAppLockProvider.");
    }
    return context;
}
