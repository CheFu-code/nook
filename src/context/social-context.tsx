import { ProfileLoading } from "@/components/social/profileLoading";
import { ui } from "@/components/social/ui";
import { useNookApi, useNookQuery } from "@/hooks/use-nook-api";
import { useAuth } from "@/lib/chefu-auth";
import { errorMessage, type SocialProfile } from "@/lib/social";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
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

type DeletionStatus = {
    state: "pending" | "cleanup" | "complete" | "failed";
    error?: string;
} | null;

export function ProfileGate({ children }: { children: ReactNode }) {
    const { isSignedIn, isLoaded, signOut } = useAuth();
    const [profileVersion, setProfileVersion] = useState(0);
    const [retrying, setRetrying] = useState(false);
    const [retryError, setRetryError] = useState("");
    const deletion = useNookQuery<DeletionStatus>(
        isSignedIn ? "/nook/account/deletion" : null,
    );
    const profile = useNookQuery<SocialProfile | null>(
        isSignedIn ? `/nook/profile?refresh=${profileVersion}` : null,
    );


    if (
        !isLoaded ||
        (isSignedIn &&
            ((!profile.error && profile.data === undefined) ||
                (!deletion.error && deletion.data === undefined)))
    ) {
        return <ProfileLoading
        />;
    }

    if (!isSignedIn) {
        return (
            <View style={ui.center}>
                <Text style={ui.title}>Connecting your account</Text>
                <Text style={ui.muted}>
                    Unable to authenticate with our servers. Check your connection and
                    sign in again.
                </Text>
                <Pressable style={ui.button} onPress={() => void signOut()}>
                    <Text style={ui.buttonText}>Back to sign in</Text>
                </Pressable>
            </View>
        );
    }
    if (deletion.data)
        return (
            <DeletionProgress
                state={deletion.data.state}
                error={deletion.data.error}
            />
        );
    if (profile.error || deletion.error) {
        const failure = profile.error ?? deletion.error;
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
                deletion.refresh();
            } catch (reason) {
                setRetryError(errorMessage(reason));
            } finally {
                setRetrying(false);
            }
        }
        return (
            <View style={ui.center}>
                <Text style={ui.title}>Couldn’t load your profile</Text>
                <Text style={ui.muted}>{errorMessage(failure)}</Text>
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
    if (!profile.data)
        return (
            <Onboarding onCreated={() => setProfileVersion((value) => value + 1)} />
        );
    return (
        <ProfileContext.Provider value={profile.data}>
            {children}
        </ProfileContext.Provider>
    );
}

function Onboarding({ onCreated }: { onCreated: () => void }) {
    const { user } = useAuth();
    const request = useNookApi();
    const [username, setUsername] = useState(user?.username ?? "");
    const [name, setName] = useState(user?.displayName ?? user?.name ?? "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    async function submit() {
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            await request("/nook/profiles", {
                method: "POST",
                body: { username, name },
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
            style={ui.screen}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <View style={ui.center}>
                <Text style={ui.title}>Make yourself at home</Text>
                <Text style={ui.muted}>
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
                    style={[ui.input, { width: "100%" }]}
                />
                <TextInput
                    accessibilityLabel="Display name"
                    placeholder="Display name"
                    maxLength={60}
                    value={name}
                    onChangeText={setName}
                    style={[ui.input, { width: "100%" }]}
                />
                {!!error && (
                    <Text accessibilityRole="alert" style={ui.error}>
                        {error}
                    </Text>
                )}
                <Pressable
                    disabled={busy || !username.trim() || !name.trim()}
                    style={[
                        ui.button,
                        (busy || !username.trim() || !name.trim()) && ui.disabled,
                    ]}
                    onPress={() => void submit()}
                >
                    <Text style={ui.buttonText}>
                        {busy ? "Creating profile…" : "Continue"}
                    </Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

export function useChefuAccessToken() {
    const { getToken } = useAuth();
    return getToken;
}

function DeletionProgress({
    state,
    error,
}: {
    state: NonNullable<DeletionStatus>["state"];
    error?: string;
}) {
    const { signOut } = useAuth();
    const request = useNookApi();
    const [busy, setBusy] = useState(false);
    const [failure, setFailure] = useState("");
    useEffect(() => {
        if (state === "cleanup" || state === "complete")
            void signOut().catch(() => setFailure("Please tap Sign out to finish."));
    }, [state, signOut]);
    return (
        <View style={ui.center}>
            {state === "pending" && <ActivityIndicator color="#087EFF" />}
            <Text style={ui.title}>
                {state === "failed"
                    ? "Deletion needs attention"
                    : state === "pending"
                        ? "Deleting your account…"
                        : "Account deleted"}
            </Text>
            <Text style={[ui.muted, { textAlign: "center" }]}>
                {error ??
                    (state === "pending"
                        ? "Your deletion request is saved. You can close the app; we’ll keep processing it."
                        : "Your sign-in account has been deleted. Associated app data is being removed.")}
            </Text>
            {!!failure && (
                <Text accessibilityRole="alert" style={ui.error}>
                    {failure}
                </Text>
            )}
            {state === "failed" && (
                <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    style={ui.button}
                    onPress={async () => {
                        setBusy(true);
                        setFailure("");
                        try {
                            await request("/nook/account/deletion", { method: "POST" });
                            await signOut();
                        } catch (reason) {
                            setFailure(errorMessage(reason));
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    <Text style={ui.buttonText}>
                        {busy ? "Retrying…" : "Retry deletion"}
                    </Text>
                </Pressable>
            )}
            <Pressable
                accessibilityRole="button"
                style={ui.button}
                onPress={() =>
                    void signOut().catch(() =>
                        setFailure("Unable to sign out. Please try again."),
                    )
                }
            >
                <Text style={ui.buttonText}>Sign out</Text>
            </Pressable>
        </View>
    );
}
