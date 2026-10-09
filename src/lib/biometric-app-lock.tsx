import * as LocalAuthentication from "expo-local-authentication";
import * as Crypto from "expo-crypto";
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
import { AppState, Platform } from "react-native";
import { BiometricAppLockOffer } from "@/components/biometric-app-lock-offer";
import { BiometricAppLockScreen } from "@/components/biometric-app-lock-screen";
import { useAuth } from "./chefu-auth";
import { useNookLanguage } from "./language";

type BiometricLockContextValue = {
    isAvailable: boolean;
    isLoaded: boolean;
    isEnabled: boolean;
    setEnabled: (enabled: boolean) => Promise<boolean>;
};

const BiometricLockContext = createContext<BiometricLockContextValue | null>(null);
const BIOMETRIC_OFFER_DELAY_MS = 24 * 60 * 60 * 1000;

async function userStorageKey(userId: string, name: string) {
    const userIdHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        userId,
    );
    return `nook_${name}_${userIdHash}`;
}

async function preferenceKey(userId: string) {
    return userStorageKey(userId, "biometric_lock");
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
    const [isAvailable, setIsAvailable] = useState(false);
    const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
    const [isEnabled, setIsEnabled] = useState(false);
    const [lockedUserId, setLockedUserId] = useState<string | null>(null);
    const [firstUse, setFirstUse] = useState<{ userId: string; timestamp: number } | null>(null);
    const [offerHandledUserId, setOfferHandledUserId] = useState<string | null>(null);
    const [offerVisibleUserId, setOfferVisibleUserId] = useState<string | null>(null);
    const [offerBusy, setOfferBusy] = useState(false);
    const [offerError, setOfferError] = useState<string | null>(null);
    const [unlocking, setUnlocking] = useState(false);
    const [unlockError, setUnlockError] = useState<string | null>(null);
    const isLoaded = Platform.OS === "web" || !isSignedIn || (!!userId && loadedUserId === userId);
    const isLocked = !!userId && lockedUserId === userId;
    const isEnabledRef = useRef(isEnabled);
    const signedInRef = useRef(isSignedIn);
    const unlockingRef = useRef(false);
    const offerScheduledUserId = useRef<string | null>(null);

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
                const [key, firstUseKey, offerKey, hasHardware, isEnrolled, types] = await Promise.all([
                    preferenceKey(userId),
                    userStorageKey(userId, "biometric_first_use"),
                    userStorageKey(userId, "biometric_offer"),
                    LocalAuthentication.hasHardwareAsync(),
                    LocalAuthentication.isEnrolledAsync(),
                    LocalAuthentication.supportedAuthenticationTypesAsync(),
                ]);
                const [saved, firstUseValue, offerStatus] = await Promise.all([
                    SecureStore.getItemAsync(key),
                    SecureStore.getItemAsync(firstUseKey),
                    SecureStore.getItemAsync(offerKey),
                ]);
                const firstUseTimestamp = firstUseValue
                    ? Number(firstUseValue)
                    : Date.now();
                if (!Number.isFinite(firstUseTimestamp) || firstUseTimestamp <= 0) {
                    throw new Error("Stored biometric offer start time is invalid.");
                }
                if (!firstUseValue) {
                    await SecureStore.setItemAsync(firstUseKey, String(firstUseTimestamp));
                }
                if (!active) return;
                setIsAvailable(hasHardware && isEnrolled && types.length > 0);
                setIsEnabled(saved === "enabled");
                setFirstUse({ userId, timestamp: firstUseTimestamp });
                setOfferHandledUserId(offerStatus === "shown" ? userId : null);
                setOfferVisibleUserId(null);
                setOfferError(null);
                setLockedUserId(
                    authLoaded && isSignedIn && saved === "enabled" ? userId : null,
                );
                setLoadedUserId(userId);
            } catch (error) {
                console.error("Unable to load biometric app-lock settings.", error);
                if (active) {
                    setIsAvailable(false);
                    setIsEnabled(false);
                    setFirstUse(null);
                    setOfferHandledUserId(null);
                    setOfferVisibleUserId(null);
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
        if (
            !userId ||
            !isSignedIn ||
            !isLoaded ||
            !isAvailable ||
            isEnabled ||
            isLocked ||
            firstUse?.userId !== userId ||
            offerHandledUserId === userId ||
            offerScheduledUserId.current === userId
        ) {
            return;
        }

        const offerKeyPromise = userStorageKey(userId, "biometric_offer");
        const delay = Math.max(
            0,
            firstUse.timestamp + BIOMETRIC_OFFER_DELAY_MS - Date.now(),
        );
        offerScheduledUserId.current = userId;
        let active = true;
        const timer = setTimeout(() => {
            void (async () => {
                try {
                    const offerKey = await offerKeyPromise;
                    await SecureStore.setItemAsync(offerKey, "shown");
                    if (active) {
                        setOfferHandledUserId(userId);
                        setOfferVisibleUserId(userId);
                    }
                } catch (error) {
                    console.error("Unable to record biometric app-lock offer.", error);
                } finally {
                    if (offerScheduledUserId.current === userId) {
                        offerScheduledUserId.current = null;
                    }
                }
            })();
        }, delay);

        return () => {
            active = false;
            clearTimeout(timer);
            if (offerScheduledUserId.current === userId) {
                offerScheduledUserId.current = null;
            }
        };
    }, [
        firstUse,
        isAvailable,
        isEnabled,
        isLoaded,
        isLocked,
        isSignedIn,
        offerHandledUserId,
        userId,
    ]);

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
        if (!verified) return false;

        const key = await preferenceKey(userId);
        if (enabled) {
            await SecureStore.setItemAsync(key, "enabled");
            setIsEnabled(true);
            isEnabledRef.current = true;
        } else {
            await SecureStore.deleteItemAsync(key);
            setIsEnabled(false);
            isEnabledRef.current = false;
            setLockedUserId(null);
        }
        return true;
    }, [isAvailable, t, userId]);

    const dismissOffer = useCallback(() => {
        setOfferVisibleUserId(null);
        setOfferError(null);
    }, []);

    const enableFromOffer = useCallback(async () => {
        if (offerBusy) return;
        setOfferBusy(true);
        setOfferError(null);
        try {
            const enabled = await setEnabled(true);
            if (enabled) setOfferVisibleUserId(null);
        } catch (error) {
            setOfferError(error instanceof Error ? error.message : "Please try again.");
        } finally {
            setOfferBusy(false);
        }
    }, [offerBusy, setEnabled]);

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
                <BiometricAppLockScreen
                    isLoaded={isLoaded}
                    unlocking={unlocking}
                    unlockError={unlockError}
                    t={t}
                    onUnlock={() => void unlock()}
                    onSignOut={() => void signOut()}
                />
            )}
            {Platform.OS !== "web" &&
                isSignedIn &&
                isLoaded &&
                offerVisibleUserId === userId &&
                !isLocked && (
                    <BiometricAppLockOffer
                        t={t}
                        error={offerError}
                        busy={offerBusy}
                        onEnable={() => void enableFromOffer()}
                        onDismiss={dismissOffer}
                    />
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
