import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileGate } from "@/context/social-context";
import { Stories } from "@/components/social/stories";
import { useNookQuery } from "@/hooks/use-nook-api";
import type { SocialStory } from "@/lib/social";
import { useAppTheme } from "@/lib/theme";

export default function SharedStoryRoute() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const stories = useNookQuery<SocialStory[]>("/nook/stories");
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const story = stories.data?.find((item) => item._id === id);
        if (!story || story.expiresAt <= now) return;
        const timer = setTimeout(
            () => setNow(Date.now()),
            story.expiresAt - now,
        );
        return () => clearTimeout(timer);
    }, [id, now, stories.data]);
    const storyIsActive = stories.data?.some(
        (story) => story._id === id && story.expiresAt > now,
    );

    return (
        <ProfileGate>
            {storyIsActive ? (
                <View style={{ flex: 1, backgroundColor: "#080C16" }}>
                    <Stories
                        initialStoryId={id}
                        onInitialStoryClose={() => router.back()}
                    />
                </View>
            ) : (
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 28,
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                        backgroundColor: theme.background,
                    }}
                >
                    {stories.data === undefined && !stories.error ? (
                        <>
                            <ActivityIndicator color={theme.blue} />
                            <Text style={{ color: theme.muted, marginTop: 14 }}>
                                Checking this story…
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text
                                style={{
                                    color: theme.ink,
                                    fontSize: 22,
                                    fontWeight: "700",
                                    textAlign: "center",
                                }}
                            >
                                {stories.error
                                    ? "We couldn’t open this story"
                                    : "This story is no longer available"}
                            </Text>
                            <Text
                                style={{
                                    color: theme.muted,
                                    fontSize: 15,
                                    lineHeight: 22,
                                    textAlign: "center",
                                    marginTop: 10,
                                }}
                            >
                                {stories.error
                                    ? "Check your connection and try again."
                                    : "Stories disappear after 24 hours, and the owner may also have removed it."}
                            </Text>
                            {stories.error && (
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={stories.refresh}
                                    style={{
                                        backgroundColor: theme.blue,
                                        paddingHorizontal: 22,
                                        paddingVertical: 12,
                                        borderRadius: 22,
                                        marginTop: 22,
                                    }}
                                >
                                    <Text style={{ color: "white", fontWeight: "600" }}>
                                        Try again
                                    </Text>
                                </Pressable>
                            )}
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => router.back()}
                                style={{
                                    paddingHorizontal: 22,
                                    paddingVertical: 12,
                                    borderRadius: 22,
                                    backgroundColor: theme.subtle,
                                    marginTop: stories.error ? 10 : 22,
                                }}
                            >
                                <Text style={{ color: theme.ink, fontWeight: "600" }}>
                                    Go back
                                </Text>
                            </Pressable>
                        </>
                    )}
                </View>
            )}
        </ProfileGate>
    );
}
