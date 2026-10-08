import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import Animated, {
    cancelAnimation,
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import {
    ActivityIndicator,
    Alert,
    AppState,
    Modal,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/lib/chefu-auth";
import { errorMessage, type SocialStory } from "@/lib/social";
import { useNookApi, useNookQuery } from "@/hooks/use-nook-api";
import { useProfile } from "@/context/social-context";
import { FeedIcon } from "../feed-icon";
import { Avatar, useMediaSource } from "./media";
import { useAppTheme } from "@/lib/theme";

type Story = SocialStory;
const STORY_DURATION_MS = 5000;
export function Stories() {
    const { user } = useAuth();
    const theme = useAppTheme();
    const profile = useProfile();
    const ownProfile = {
        ...profile,
        avatarUrl: profile.avatarUrl ?? user?.photoURL ?? user?.imageUrl,
    };
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        const listener = AppState.addEventListener("change", (state) => {
            if (state === "active") setNow(Date.now());
        });
        return () => {
            clearInterval(timer);
            listener.remove();
        };
    }, []);
    const storiesQuery = useNookQuery<Story[]>("/nook/stories");
    const stories = storiesQuery.data;
    const router = useRouter();
    const [selected, setSelected] = useState<string | null>(null);
    const [seen, setSeen] = useState<string[]>([]);
    const { width, height } = useWindowDimensions();
    const s = width / 390;
    const v = height / 916;
    const active = (stories ?? []).filter((story) => story.expiresAt > now);
    const people = [
        ...new Map(
            active.map((story) => [story.author._id, story.author]),
        ).values(),
    ].sort((a, b) => Number(b.isOwn) - Number(a.isOwn));
    const ordered = people.flatMap((person) =>
        active.filter((story) => story.author._id === person._id).reverse(),
    );
    const selectedIndex = ordered.findIndex((story) => story._id === selected);
    const current = ordered[selectedIndex];
    const currentStories = current
        ? ordered.filter((story) => story.author._id === current.author._id)
        : [];
    const index = currentStories.findIndex((story) => story._id === selected);
    const open = (id: string) => {
        setSelected(id);
        setSeen((values) => (values.includes(id) ? values : [...values, id]));
    };
    const openProfile = (id: string) => {
        setSelected(null);
        router.push({ pathname: "/member/[id]", params: { id } });
    };
    const next = () => {
        if (currentStories[index + 1]) open(currentStories[index + 1]._id);
        else setSelected(null);
    };
    return (
        <>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: 9 * v,
                    paddingBottom: 11 * v,
                    paddingHorizontal: 14 * s,
                    gap: 16 * s,
                    alignItems: "flex-start",
                    minHeight: 91 * v,
                }}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add your story"
                    onPress={() => router.push("/story-compose")}
                    style={{ width: 50 * s, alignItems: "center", gap: 6 * v }}
                >
                    <View style={{ width: 50 * s, height: 50 * s }}>
                        <Avatar profile={ownProfile} size={50 * s} />
                        <View style={{
                            position: "absolute",
                            right: -2 * s,
                            bottom: -1 * s,
                            width: 21 * s,
                            height: 21 * s,
                            borderRadius: 11 * s,
                            backgroundColor: "#087EFF",
                            borderWidth: 2 * s,
                            borderColor: theme.background,
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            <FeedIcon name="plus" size={13 * s} color="white" />
                        </View>
                    </View>
                    <Text style={{ color: theme.muted, fontSize: 9.5 * s }}>
                        Your story
                    </Text>
                </Pressable>
                {people.map((person, i) => {
                    const group = ordered.filter(
                        (story) => story.author._id === person._id,
                    );
                    const unread = group.find((story) => !seen.includes(story._id));
                    return (
                        <View
                            key={person._id}
                            style={{
                                width: 53 * s,
                                alignItems: "center",
                                gap: 4 * v,
                                marginTop: -2 * v,
                            }}
                        >
                            <View style={{ width: 53 * s, height: 53 * s }}>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`View ${person.username}'s stories`}
                                    onPress={() => open((unread ?? group[0])._id)}
                                    style={{
                                        position: "absolute",
                                        inset: 0,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <LinearGradient
                                        colors={
                                            !unread
                                                ? ["#C9CFDA", "#C9CFDA"]
                                                : i % 2
                                                    ? ["#CF60EC", "#FFD3A4"]
                                                    : ["#0788FF", "#BBDEFF"]
                                        }
                                        style={{
                                            padding: 1.3 * s,
                                            borderRadius: 30 * s,
                                        }}
                                    >
                                        <View
                                            style={{
                                                width: 50 * s,
                                                height: 50 * s,
                                                backgroundColor: theme.background,
                                                borderRadius: 30 * s,
                                            }}
                                        />
                                    </LinearGradient>
                                </Pressable>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`View ${person.username}'s stories`}
                                    onPress={() => open((unread ?? group[0])._id)}
                                    style={{
                                        position: "absolute",
                                        top: 3 * s,
                                        left: 3 * s,
                                    }}
                                >
                                    <Avatar profile={person} size={47 * s} />
                                </Pressable>
                            </View>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`View ${person.username}'s stories`}
                                onPress={() => open((unread ?? group[0])._id)}
                                style={{ maxWidth: "100%" }}
                            >
                                <Text
                                    numberOfLines={1}
                                    style={{ color: theme.ink, fontSize: 9.5 * s }}
                                >
                                    {person.isOwn ? "Your photos" : person.username}
                                </Text>
                            </Pressable>
                        </View>
                    );
                })}
                {stories === undefined ? (
                    <ActivityIndicator style={{ padding: 20 * s }} color={theme.blue} />
                ) : (
                    !people.length && (
                        <Text
                            style={{
                                color: theme.muted,
                                fontSize: 11 * s,
                                alignSelf: "center",
                                maxWidth: 240 * s,
                            }}
                        >
                            Share the first story. Photos stay here for 24 hours.
                        </Text>
                    )
                )}
            </ScrollView>
            <Modal
                visible={!!current}
                animationType="fade"
                presentationStyle="fullScreen"
                onRequestClose={() => setSelected(null)}
            >
                {current && (
                    <StoryViewer
                        key={current._id}
                        story={current}
                        now={now}
                        index={index}
                        count={currentStories.length}
                        onNext={next}
                        onPrevious={() => {
                            if (currentStories[index - 1]) open(currentStories[index - 1]._id);
                        }}
                        onClose={() => setSelected(null)}
                        onAuthorPress={() => openProfile(current.author._id)}
                    />
                )}
            </Modal>
        </>
    );
}
function StoryViewer({
    story,
    now,
    index,
    count,
    onNext,
    onPrevious,
    onClose,
    onAuthorPress,
}: {
    story: Story;
    now: number;
    index: number;
    count: number;
    onNext: () => void;
    onPrevious: () => void;
    onClose: () => void;
    onAuthorPress: () => void;
}) {
    const insets = useSafeAreaInsets();
    const { source, error, retry } = useMediaSource(story._id, "story");
    const request = useNookApi();
    const [ready, setReady] = useState(false);
    const [viewerCount, setViewerCount] = useState(story.viewerCount ?? 0);
    const viewRecorded = useRef(false);
    const [failed, setFailed] = useState(false);
    const [paused, setPaused] = useState(false);
    const [foreground, setForeground] = useState(
        AppState.currentState === "active",
    );
    const progress = useSharedValue(0);
    const progressStyle = useAnimatedStyle(() => ({
        width: `${interpolate(progress.get(), [0, 1], [0, 100])}%`,
    }));
    useEffect(() => {
        const listener = AppState.addEventListener("change", (state) =>
            setForeground(state === "active"),
        );
        return () => listener.remove();
    }, []);
    useEffect(() => {
        if (!ready || paused || !foreground || failed) return;
        progress.set(withTiming(
            1,
            {
                duration: STORY_DURATION_MS * (1 - progress.get()),
                easing: Easing.linear,
            },
            (finished) => {
                if (finished) runOnJS(onNext)();
            },
        ));
        return () => cancelAnimation(progress);
    }, [ready, paused, foreground, failed, onNext, progress]);
    useEffect(() => {
        const timer = setTimeout(
            onClose,
            Math.max(0, story.expiresAt - Date.now()),
        );
        return () => clearTimeout(timer);
    }, [story.expiresAt, onClose]);
    function deleteStory() {
        setPaused(true);
        Alert.alert(
            "Delete your story?",
            "This photo will be removed from stories.",
            [
                { text: "Cancel", style: "cancel", onPress: () => setPaused(false) },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        void request(`/nook/stories/${encodeURIComponent(story._id)}`, {
                            method: "DELETE",
                        })
                            .then(onClose)
                            .catch((e) => {
                                Alert.alert("Could not delete story", errorMessage(e));
                                setPaused(false);
                            });
                    },
                },
            ],
            { onDismiss: () => setPaused(false) },
        );
    }
    function recordView() {
        if (viewRecorded.current) return;
        viewRecorded.current = true;
        void request<{ viewerCount: number }>(
            `/nook/stories/${encodeURIComponent(story._id)}/view`,
            {
            method: "POST",
            },
        )
            .then((result) => {
                if (story.author.isOwn) setViewerCount(result.viewerCount);
            })
            .catch((error) => {
                viewRecorded.current = false;
                Alert.alert("Could not record story view", errorMessage(error));
            });
    }
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: "#080C16",
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    gap: 4,
                    paddingHorizontal: 12,
                    paddingTop: 8,
                }}
            >
                {Array.from({ length: count }, (_, i) => (
                    <View
                        key={i}
                        style={{
                            flex: 1,
                            height: 3,
                            backgroundColor: "#FFFFFF44",
                            borderRadius: 2,
                            overflow: "hidden",
                        }}
                    >
                        {i < index ? (
                            <View style={{ height: 3, width: "100%", backgroundColor: "white" }} />
                        ) : i === index ? (
                            <Animated.View
                                style={[
                                    { height: 3, backgroundColor: "white" },
                                    progressStyle,
                                ]}
                            />
                        ) : null}
                    </View>
                ))}
            </View>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 14,
                }}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${story.author.username}'s profile`}
                    onPress={onAuthorPress}
                    style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                    }}
                >
                    <Avatar profile={story.author} size={34} />
                    <View>
                        <Text style={{ color: "white", fontWeight: "600" }}>
                            {story.author.username}
                        </Text>
                        <Text style={{ color: "#BBC4D5", fontSize: 11 }}>
                            Story · {formatStoryAge(now - story._creationTime)}
                        </Text>
                        {story.author.isOwn && (
                            <Text style={{ color: "#BBC4D5", fontSize: 11 }}>
                                {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
                            </Text>
                        )}
                    </View>
                </Pressable>
                {story.author.isOwn && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Delete your story"
                        onPress={deleteStory}
                        style={{ padding: 10 }}
                    >
                        <Text style={{ color: "white" }}>Delete</Text>
                    </Pressable>
                )}
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close story"
                    onPress={onClose}
                    hitSlop={12}
                >
                    <FeedIcon name="close" color="white" />
                </Pressable>
            </View>
            <View style={{ flex: 1 }}>
                {source && (
                    <Image
                        source={source}
                        cachePolicy="memory"
                        contentFit="contain"
                        style={{ width: "100%", height: "100%" }}
                        onLoad={() => {
                            setReady(true);
                            recordView();
                        }}
                        onError={() => setFailed(true)}
                    />
                )}
                {!ready && !error && !failed && (
                    <ActivityIndicator
                        color="white"
                        style={{ position: "absolute", top: "45%", alignSelf: "center" }}
                    />
                )}
                <View style={{ position: "absolute", inset: 0, flexDirection: "row" }}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Previous story"
                        onPress={onPrevious}
                        onLongPress={() => setPaused(true)}
                        onPressIn={() => setPaused(true)}
                        onPressOut={() => setPaused(false)}
                        style={{ width: "30%" }}
                    />
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Next story"
                        onPress={onNext}
                        onLongPress={() => setPaused(true)}
                        onPressIn={() => setPaused(true)}
                        onPressOut={() => setPaused(false)}
                        style={{ flex: 1 }}
                    />
                </View>
                {(error || failed) && (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                            setFailed(false);
                            setReady(false);
                            retry();
                        }}
                        style={{
                            position: "absolute",
                            top: "45%",
                            alignSelf: "center",
                            backgroundColor: "#273248",
                            padding: 20,
                            borderRadius: 16,
                        }}
                    >
                        <Text style={{ color: "white" }}>
                            Photo unavailable. Tap to retry.
                        </Text>
                    </Pressable>
                )}
            </View>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={paused ? "Resume story" : "Pause story"}
                onPress={() => setPaused((value) => !value)}
                style={{ alignItems: "center", padding: 12 }}
            >
                <Text style={{ color: "#BBC4D5", fontSize: 12 }}>
                    {paused ? "Tap to resume" : "Tap to pause · Tap sides to navigate"}
                </Text>
            </Pressable>
        </View>
    );
}

function formatStoryAge(ageMs: number) {
    const ageMinutes = Math.max(0, Math.floor(ageMs / 60_000));
    if (ageMinutes === 0) return "Just now";
    if (ageMinutes < 60) return `${ageMinutes}m ago`;
    return `${Math.floor(ageMinutes / 60)}h ago`;
}
