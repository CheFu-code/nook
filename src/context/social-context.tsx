import { ProfileLoading } from "@/components/social/profileLoading";
import { ui } from "@/components/social/ui";
import { useNookApi, useNookQuery } from "@/hooks/use-nook-api";
import { useAuth } from "@/lib/chefu-auth";
import { errorMessage, type SocialProfile } from "@/lib/social";
import { useAppTheme } from "@/lib/theme";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from "react-native";

const ProfileContext = createContext<SocialProfile | null>(null);
export function useProfile() {
    const profile = useContext(ProfileContext);
    if (!profile) throw new Error("A completed profile is required.");
    return profile;
}

export function ProfileGate({ children }: { children: ReactNode }) {
    const { isSignedIn, isLoaded, signOut, session, saveNookProfile } = useAuth();
    const theme = useAppTheme();
    const [retrying, setRetrying] = useState(false);
    const [retryError, setRetryError] = useState("");
    const profile = useNookQuery<SocialProfile | null>(
        isSignedIn ? "/nook/profile" : null,
    );
    const visibleProfile =
        profile.data !== undefined ? profile.data : session?.nookProfile;
    const refreshProfile = () => profile.refresh();

    useEffect(() => {
        if (profile.data) {
            void saveNookProfile(profile.data).catch((error) => {
                console.warn("Unable to cache Nook profile for startup.", error);
            });
        }
    }, [profile.data, saveNookProfile]);

    if (
        !isLoaded ||
        (isSignedIn && !visibleProfile && !profile.error)
    ) {
        return <ProfileLoading
        />;
    }

    if (!isSignedIn) {
        return (
            <View style={[ui.center, { backgroundColor: theme.background }]}>
                <Text style={[ui.title, { color: theme.ink }]}>Connecting your account</Text>
                <Text style={[ui.muted, { color: theme.muted }]}>
                    Unable to authenticate with our servers. Check your connection and
                    sign in again.
                </Text>
                <Pressable style={ui.button} onPress={() => void signOut()}>
                    <Text style={ui.buttonText}>Back to sign in</Text>
                </Pressable>
            </View>
        );
    }
    if (profile.error && !visibleProfile) {
        const failure = profile.error;
        const sessionExpired = /session.*expired|sign in again/i.test(
            failure?.message ?? "",
        );
        async function recoverProfile() {
            if (retrying) return;
            setRetrying(true);
            setRetryError("");
            try {
                if (sessionExpired) {
                    await signOut();
                    return;
                }
                profile.refresh();
            } catch (reason) {
                setRetryError(errorMessage(reason));
            } finally {
                setRetrying(false);
            }
        }
        return (
            <View style={[ui.center, { backgroundColor: theme.background }]}>
                <Text style={[ui.title, { color: theme.ink }]}>Couldn’t load your profile</Text>
                <Text style={[ui.muted, { color: theme.muted }]}>{errorMessage(failure)}</Text>
                {!!retryError && (
                    <Text accessibilityRole="alert" style={ui.error}>
                        {retryError}
                    </Text>
                )}
                <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: retrying, busy: retrying }}
                    disabled={retrying}
                    style={ui.button}
                    onPress={() => void recoverProfile()}
                >
                    <Text style={ui.buttonText}>
                        {retrying
                            ? sessionExpired
                                ? "Returning to sign in…"
                                : "Retrying…"
                            : sessionExpired
                                ? "Sign in again"
                                : "Try again"}
                    </Text>
                </Pressable>
            </View>
        );
    }
    if (!visibleProfile)
        return (
            <Onboarding onCreated={refreshProfile} />
        );
    return (
        <ProfileContext.Provider value={visibleProfile}>
            {children}
        </ProfileContext.Provider>
    );
}

function Onboarding({ onCreated }: { onCreated: () => void }) {
    const { user } = useAuth();
    const theme = useAppTheme();
    const request = useNookApi();
    const [username, setUsername] = useState(user?.username ?? "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    async function submit() {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            await request("/nook/profiles", {
                method: "POST",
                body: { username },
            });
            onCreated();
        } catch (reason) {
            setError(errorMessage(reason));
        } finally {
            setBusy(false);
        }
    }
    return (
        <KeyboardAvoidingView
            style={[ui.screen, { backgroundColor: theme.background }]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <ScrollView
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                contentContainerStyle={{ flexGrow: 1 }}
            >
                <View style={[ui.center, { backgroundColor: theme.background }]}>
                    <Text style={[ui.title, { color: theme.ink }]}>Make yourself at home</Text>
                    <Text style={[ui.muted, { color: theme.muted }]}>
                        Choose a unique username so friends can find you.
                    </Text>
                    <TextInput
                        accessibilityLabel="Username"
                        placeholder="Username"
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={30}
                        value={username}
                        onChangeText={setUsername}
                        placeholderTextColor={theme.muted}
                        style={[ui.input, { width: "100%", backgroundColor: theme.input, borderColor: theme.border, color: theme.ink }]}
                    />
                    {!!error && (
                        <Text accessibilityRole="alert" style={ui.error}>
                            {error}
                        </Text>
                    )}
                    <Pressable
                        disabled={busy || !username.trim()}
                        style={[
                            ui.button,
                            (busy || !username.trim()) && ui.disabled,
                        ]}
                        onPress={() => void submit()}
                    >
                        <Text style={ui.buttonText}>
                            {busy ? "Creating profile…" : "Continue"}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

export function useChefuAccessToken() {
    const { getToken } = useAuth();
    return getToken;
}
