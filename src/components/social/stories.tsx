import { useProfile } from "@/context/social-context";
import { useNookApi, useNookQuery } from "@/hooks/use-nook-api";
import { useAuth } from "@/lib/chefu-auth";
import { errorMessage, siteUrl, type SocialProfile, type SocialStory } from "@/lib/social";
import { useAppTheme } from "@/lib/theme";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    BackHandler,
    Modal,
    PanResponder,
    Pressable,
    ScrollView,
    Share,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedIcon, type IconName } from "../feed-icon";
import { Avatar, useMediaSource } from "./media";

type Story = SocialStory;
type StoryViewerProfile = SocialProfile & { viewedAt: number };
const STORY_DURATION_MS = 5000;
export function Stories({
    initialStoryId,
    onInitialStoryClose,
}: {
    initialStoryId?: string;
    onInitialStoryClose?: () => void;
} = {}) {
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
    const initialStoryOpened = useRef(false);
    const storyBackAction = useRef<(() => boolean) | null>(null);
    const registerStoryBackAction = useCallback(
        (action: (() => boolean) | null) => {
            storyBackAction.current = action;
        },
        [],
    );
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
    useEffect(() => {
        if (!initialStoryId || initialStoryOpened.current || !stories) return;
        initialStoryOpened.current = true;
        if (stories.some((story) => story._id === initialStoryId && story.expiresAt > Date.now())) {
            const timer = setTimeout(() => {
                setSelected(initialStoryId);
                setSeen((values) =>
                    values.includes(initialStoryId)
                        ? values
                        : [...values, initialStoryId],
                );
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [initialStoryId, stories]);
    const open = (id: string) => {
        setSelected(id);
        setSeen((values) => (values.includes(id) ? values : [...values, id]));
    };
    const closeSelected = () => {
        setSelected(null);
        onInitialStoryClose?.();
    };
    const openProfile = (id: string) => {
        setSelected(null);
        router.push({ pathname: "/member/[id]", params: { id } });
    };
    const next = () => {
        if (currentStories[index + 1]) open(currentStories[index + 1]._id);
        else closeSelected();
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
                animationType="none"
                presentationStyle="fullScreen"
                onRequestClose={() => {
                    if (storyBackAction.current?.()) return;
                    closeSelected();
                }}
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
                        onClose={closeSelected}
                        onAuthorPress={() => openProfile(current.author._id)}
                        onBackActionChange={registerStoryBackAction}
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
    onBackActionChange,
}: {
    story: Story;
    now: number;
    index: number;
    count: number;
    onNext: () => void;
    onPrevious: () => void;
    onClose: () => void;
    onAuthorPress: () => void;
    onBackActionChange: (action: (() => boolean) | null) => void;
}) {
    const insets = useSafeAreaInsets();
    const { height } = useWindowDimensions();
    const { source, error, retry } = useMediaSource(story._id, "story");
    const request = useNookApi();
    const [ready, setReady] = useState(false);
    const [viewerCount, setViewerCount] = useState(story.viewerCount ?? 0);
    const viewRecorded = useRef(false);
    const [failed, setFailed] = useState(false);
    const [paused, setPaused] = useState(false);
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [viewersOpen, setViewersOpen] = useState(false);
    const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
    const viewersQuery = useNookQuery<{
        items: StoryViewerProfile[];
        hasMore: boolean;
    }>(
        viewersOpen && story.author.isOwn
            ? `/nook/stories/${encodeURIComponent(story._id)}/viewers`
            : null,
    );
    const dismissOffset = useSharedValue(0);
    const dismissStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: dismissOffset.get() }],
    }));
    const dismissGesture = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponderCapture: (_, gesture) =>
                    !optionsOpen &&
                    !deleteConfirmOpen &&
                    !viewersOpen &&
                    !feedback &&
                    gesture.dy > 10 &&
                    gesture.dy > Math.abs(gesture.dx) * 1.2,
                onPanResponderMove: (_, gesture) => {
                    dismissOffset.set(Math.max(0, gesture.dy));
                },
                onPanResponderRelease: (_, gesture) => {
                    if (gesture.dy > 120 || (gesture.dy > 48 && gesture.vy > 0.9)) {
                        dismissOffset.set(
                            withTiming(height, { duration: 180 }, (finished) => {
                                if (finished) runOnJS(onClose)();
                            }),
                        );
                    } else {
                        dismissOffset.set(withSpring(0, { damping: 22, stiffness: 220 }));
                    }
                },
                onPanResponderTerminate: () => {
                    dismissOffset.set(withSpring(0, { damping: 22, stiffness: 220 }));
                },
                onPanResponderTerminationRequest: () => false,
            }),
        [
            deleteConfirmOpen,
            dismissOffset,
            feedback,
            height,
            onClose,
            optionsOpen,
            viewersOpen,
        ],
    );
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
    useEffect(() => {
        if (!optionsOpen && !deleteConfirmOpen && !viewersOpen && !feedback) return;
        const handleBack = () => {
            if (feedback) {
                setFeedback(null);
                setPaused(false);
            } else if (viewersOpen) {
                setViewersOpen(false);
                setPaused(false);
            } else if (deleteConfirmOpen) {
                setDeleteConfirmOpen(false);
                setPaused(false);
            } else {
                setOptionsOpen(false);
                setPaused(false);
            }
            return true;
        };
        onBackActionChange(handleBack);
        return () => onBackActionChange(null);
    }, [optionsOpen, deleteConfirmOpen, viewersOpen, feedback, onBackActionChange]);
    useEffect(() => {
        if (!optionsOpen && !deleteConfirmOpen && !viewersOpen && !feedback) return;
        const subscription = BackHandler.addEventListener(
            "hardwareBackPress",
            () => {
                if (feedback) {
                    setFeedback(null);
                    setPaused(false);
                } else if (viewersOpen) {
                    setViewersOpen(false);
                    setPaused(false);
                } else if (deleteConfirmOpen) {
                    setDeleteConfirmOpen(false);
                    setPaused(false);
                } else {
                    setOptionsOpen(false);
                    setPaused(false);
                }
                return true;
            },
        );
        return () => subscription.remove();
    }, [optionsOpen, deleteConfirmOpen, viewersOpen, feedback]);
    function cancelDelete() {
        setDeleteConfirmOpen(false);
        setPaused(false);
    }
    function openDeleteConfirmation() {
        setOptionsOpen(false);
        setPaused(true);
        setDeleteConfirmOpen(true);
    }
    async function deleteStory() {
        try {
            await request(`/nook/stories/${encodeURIComponent(story._id)}`, {
                method: "DELETE",
            });
            setDeleteConfirmOpen(false);
            onClose();
        } catch (error) {
            setDeleteConfirmOpen(false);
            setFeedback({
                title: "Could not delete story",
                message: errorMessage(error),
            });
        }
    }
    function openStoryOptions() {
        setPaused(true);
        setOptionsOpen(true);
    }
    async function shareStory() {
        setOptionsOpen(false);
        const storyUrl = `${siteUrl}/nook/share/stories/${encodeURIComponent(story._id)}`;
        try {
            await Share.share({
                message: `Check out @${story.author.username}'s story on nook:\n${storyUrl}`,
                url: storyUrl,
            });
            setPaused(false);
        } catch (error) {
            setPaused(true);
            setFeedback({
                title: "Could not share",
                message: errorMessage(error),
            });
        }
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
                setPaused(true);
                setFeedback({
                    title: "Could not record story view",
                    message: errorMessage(error),
                });
            });
    }
    return (
        <View style={{ flex: 1, backgroundColor: "#080C16" }}>
            <Animated.View
                {...dismissGesture.panHandlers}
                style={[
                    {
                        flex: 1,
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                    },
                    dismissStyle,
                ]}
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
                    </View>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="More story options"
                    onPress={openStoryOptions}
                    hitSlop={8}
                    style={{ padding: 6 }}
                >
                    <FeedIcon name="more-vertical" color="white" />
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
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    paddingHorizontal: 18,
                    paddingTop: 8,
                    paddingBottom: Math.max(insets.bottom, 12),
                }}
            >
                {story.author.isOwn && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${viewerCount} story ${viewerCount === 1 ? "viewer" : "viewers"}. Show viewer count`}
                        onPress={() => {
                            setPaused(true);
                            setViewersOpen(true);
                        }}
                        style={({ pressed }) => ({
                            minHeight: 42,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 9,
                            paddingHorizontal: 16,
                            borderRadius: 22,
                            borderWidth: 1,
                            borderColor: "#FFFFFF24",
                            backgroundColor: pressed ? "#FFFFFF22" : "#101827CC",
                        })}
                    >
                        <FeedIcon name="profile" size={17} color="white" />
                        <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                            {viewerCount} {viewerCount === 1 ? "viewer" : "viewers"}
                        </Text>
                    </Pressable>
                )}
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={paused ? "Resume story" : "Pause story"}
                    onPress={() => setPaused((value) => !value)}
                    hitSlop={8}
                    style={{ flex: 1 }}
                >
                    <Text style={{ color: "#BBC4D5", fontSize: 12, textAlign: "center" }}>
                        {paused ? "Tap to resume" : "Tap to pause · Tap sides to navigate"}
                    </Text>
                </Pressable>
            </View>
            {viewersOpen && (
                <Modal
                    visible
                    transparent
                    animationType="slide"
                    statusBarTranslucent
                    onRequestClose={() => {
                        setViewersOpen(false);
                        setPaused(false);
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            justifyContent: "flex-end",
                            backgroundColor: "#00000099",
                        }}
                    >
                        <Pressable
                            accessibilityLabel="Close story viewers"
                            onPress={() => {
                                setViewersOpen(false);
                                setPaused(false);
                            }}
                            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                        />
                        <View
                            style={{
                                maxHeight: "75%",
                                minHeight: 320,
                                paddingHorizontal: 24,
                                paddingTop: 12,
                                paddingBottom: Math.max(insets.bottom, 20),
                                borderTopLeftRadius: 28,
                                borderTopRightRadius: 28,
                                borderTopWidth: 1,
                                borderColor: "#FFFFFF18",
                                backgroundColor: "#111827",
                            }}
                        >
                            <View
                                style={{
                                    width: 38,
                                    height: 4,
                                    borderRadius: 2,
                                    alignSelf: "center",
                                    backgroundColor: "#667085",
                                    marginBottom: 22,
                                }}
                            />
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                }}
                            >
                                <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>
                                    Story viewers
                                </Text>
                                <Text
                                    accessibilityLabel={`${viewerCount} ${viewerCount === 1 ? "viewer" : "viewers"}`}
                                    style={{ color: "#AAB5C7", fontSize: 14, fontWeight: "600" }}
                                >
                                    {viewerCount}
                                </Text>
                            </View>
                            <Text style={{ color: "#AAB5C7", fontSize: 13, marginTop: 5 }}>
                                People who have seen this story
                            </Text>
                            {viewersQuery.error ? (
                                <View
                                    style={{
                                        flex: 1,
                                        minHeight: 120,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 12,
                                    }}
                                >
                                    <Text style={{ color: "#AAB5C7", fontSize: 14, textAlign: "center" }}>
                                        Viewer details couldn’t be loaded.
                                    </Text>
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={viewersQuery.refresh}
                                        style={{
                                            paddingHorizontal: 18,
                                            paddingVertical: 10,
                                            borderRadius: 18,
                                            backgroundColor: "#20334F",
                                        }}
                                    >
                                        <Text style={{ color: "#8BC4FF", fontWeight: "600" }}>
                                            Try again
                                        </Text>
                                    </Pressable>
                                </View>
                            ) : viewersQuery.data === undefined ? (
                                <View
                                    style={{
                                        flex: 1,
                                        minHeight: 120,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 10,
                                    }}
                                >
                                    <ActivityIndicator color="#8BC4FF" />
                                    <Text style={{ color: "#AAB5C7", fontSize: 13 }}>
                                        Loading viewers…
                                    </Text>
                                </View>
                            ) : viewersQuery.data.items.length === 0 ? (
                                <View
                                    style={{
                                        flex: 1,
                                        minHeight: 120,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Text style={{ color: "#AAB5C7", fontSize: 14 }}>
                                        No viewers yet.
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView
                                    style={{ flexShrink: 1 }}
                                    contentContainerStyle={{ paddingBottom: 8 }}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled
                                >
                                    {viewersQuery.data.items.map((viewer) => (
                                        <View
                                            key={viewer._id}
                                            style={{
                                                minHeight: 64,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 12,
                                                borderBottomWidth: 1,
                                                borderBottomColor: "#FFFFFF10",
                                            }}
                                        >
                                            <Avatar profile={viewer} size={42} />
                                            <View style={{ flex: 1, gap: 3 }}>
                                                <Text
                                                    numberOfLines={1}
                                                    style={{ color: "white", fontSize: 14, fontWeight: "600" }}
                                                >
                                                    {viewer.name || viewer.username}
                                                </Text>
                                                <Text
                                                    numberOfLines={1}
                                                    style={{ color: "#AAB5C7", fontSize: 12 }}
                                                >
                                                    @{viewer.username}
                                                </Text>
                                            </View>
                                            <Text style={{ color: "#77869C", fontSize: 11 }}>
                                                Viewed
                                            </Text>
                                        </View>
                                    ))}
                                    {viewersQuery.data.hasMore && (
                                        <Text
                                            style={{
                                                color: "#77869C",
                                                fontSize: 12,
                                                textAlign: "center",
                                                paddingTop: 12,
                                            }}
                                        >
                                            Showing the latest 100 viewers
                                        </Text>
                                    )}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </Modal>
            )}
            {optionsOpen && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 10,
                        flex: 1,
                        justifyContent: "flex-end",
                        backgroundColor: "#00000099",
                    }}
                >
                    <Pressable
                        accessibilityLabel="Close story options"
                        onPress={() => {
                            setOptionsOpen(false);
                            setPaused(false);
                        }}
                        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    />
                    <View
                        style={{
                            paddingHorizontal: 22,
                            paddingTop: 12,
                            paddingBottom: Math.max(insets.bottom, 16) + 8,
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            borderTopWidth: 1,
                            borderColor: "#FFFFFF18",
                            backgroundColor: "#111827",
                        }}
                    >
                        <View
                            style={{
                                width: 38,
                                height: 4,
                                borderRadius: 2,
                                alignSelf: "center",
                                backgroundColor: "#667085",
                                marginBottom: 20,
                            }}
                        />
                        <Text style={{ color: "white", fontSize: 21, fontWeight: "700" }}>
                            Story options
                        </Text>
                        <Text style={{ color: "#AAB5C7", fontSize: 13, marginTop: 5, marginBottom: 18 }}>
                            Choose what you’d like to do with this story.
                        </Text>
                        <View
                            style={{
                                padding: 6,
                                borderRadius: 18,
                                backgroundColor: "#1B2434",
                                borderWidth: 1,
                                borderColor: "#FFFFFF0D",
                                marginBottom: 12,
                            }}
                        >
                            <StoryOptionRow
                                icon="post-share"
                                title="Share story"
                                subtitle="Send a link to this story"
                                onPress={() => void shareStory()}
                            />
                        {story.author.isOwn && (
                                <>
                                    <View style={{ height: 1, marginHorizontal: 12, backgroundColor: "#FFFFFF12" }} />
                                    <StoryOptionRow
                                        icon="trash"
                                        title="Delete story"
                                        subtitle="Remove it before it expires"
                                        destructive
                                        onPress={openDeleteConfirmation}
                                    />
                                </>
                            )}
                        </View>
                        <StoryModalButton
                            label="Cancel"
                            onPress={() => {
                                setOptionsOpen(false);
                                setPaused(false);
                            }}
                        />
                    </View>
                </View>
            )}
            {deleteConfirmOpen && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        backgroundColor: "#000000AA",
                    }}
                >
                    <Pressable
                        accessibilityLabel="Cancel deleting story"
                        onPress={cancelDelete}
                        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    />
                    <View
                        style={{
                            width: "100%",
                            maxWidth: 360,
                            padding: 24,
                            borderRadius: 26,
                            borderWidth: 1,
                            borderColor: "#FFFFFF18",
                            backgroundColor: "#141D2C",
                            alignItems: "center",
                        }}
                    >
                        <View
                            style={{
                                width: 54,
                                height: 54,
                                borderRadius: 27,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#482731",
                                marginBottom: 16,
                            }}
                        >
                            <FeedIcon name="trash" size={23} color="#FF7A88" />
                        </View>
                        <Text style={{ color: "white", fontSize: 20, fontWeight: "700", textAlign: "center" }}>
                            Delete your story?
                        </Text>
                        <Text style={{ color: "#AAB5C7", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 9 }}>
                            This photo will be removed from your stories and can’t be restored.
                        </Text>
                        <View style={{ flexDirection: "row", gap: 10, width: "100%", marginTop: 22 }}>
                            <StoryModalButton label="Keep story" onPress={cancelDelete} />
                            <StoryModalButton
                                label="Delete"
                                destructive
                                onPress={() => void deleteStory()}
                            />
                        </View>
                    </View>
                </View>
            )}
            {feedback && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 12,
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        backgroundColor: "#000000AA",
                    }}
                >
                    <Pressable
                        accessibilityLabel="Dismiss message"
                        onPress={() => {
                            setFeedback(null);
                            setPaused(false);
                        }}
                        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    />
                    <View
                        style={{
                            width: "100%",
                            maxWidth: 360,
                            padding: 24,
                            borderRadius: 26,
                            borderWidth: 1,
                            borderColor: "#FFFFFF18",
                            backgroundColor: "#141D2C",
                            alignItems: "center",
                        }}
                    >
                        <View
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 26,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#20334F",
                                marginBottom: 16,
                            }}
                        >
                            <FeedIcon name="info" size={23} color="#8BC4FF" />
                        </View>
                        <Text style={{ color: "white", fontSize: 20, fontWeight: "700", textAlign: "center" }}>
                            {feedback?.title}
                        </Text>
                        <Text style={{ color: "#AAB5C7", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 9 }}>
                            {feedback?.message}
                        </Text>
                        <View style={{ width: "100%", marginTop: 22 }}>
                            <StoryModalButton
                                label="OK"
                                onPress={() => {
                                    setFeedback(null);
                                    setPaused(false);
                                }}
                            />
                        </View>
                    </View>
                </View>
            )}
            </Animated.View>
        </View>
    );
}

function StoryOptionRow({
    icon,
    title,
    subtitle,
    onPress,
    destructive = false,
}: {
    icon: IconName;
    title: string;
    subtitle: string;
    onPress: () => void;
    destructive?: boolean;
}) {
    const color = destructive ? "#FF7A88" : "#8BC4FF";
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => ({
                minHeight: 68,
                flexDirection: "row",
                alignItems: "center",
                gap: 13,
                paddingHorizontal: 10,
                borderRadius: 13,
                backgroundColor: pressed ? "#FFFFFF0D" : "transparent",
            })}
        >
            <View
                style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: destructive ? "#482731" : "#20334F",
                }}
            >
                <FeedIcon name={icon} size={19} color={color} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: destructive ? color : "white", fontSize: 15, fontWeight: "600" }}>
                    {title}
                </Text>
                <Text style={{ color: "#98A5B8", fontSize: 12 }}>
                    {subtitle}
                </Text>
            </View>
            <FeedIcon name="chevron-right" size={15} color="#78869B" />
        </Pressable>
    );
}

function StoryModalButton({
    label,
    onPress,
    destructive = false,
}: {
    label: string;
    onPress: () => void;
    destructive?: boolean;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={{
                        flex: 1,
                        minHeight: 48,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 16,
                        borderRadius: 15,
                        backgroundColor: destructive ? "#482731" : "#263246",
                    }}
                >
                    <Text
                        style={{
                            color: destructive ? "#FF7A88" : "white",
                            fontSize: 15,
                            fontWeight: "600",
                            textAlign: "center",
                        }}
                    >
                {label}
            </Text>
        </Pressable>
    );
}

function formatStoryAge(ageMs: number) {
    const ageMinutes = Math.max(0, Math.floor(ageMs / 60_000));
    if (ageMinutes === 0) return "Just now";
    if (ageMinutes < 60) return `${ageMinutes}m ago`;
    return `${Math.floor(ageMinutes / 60)}h ago`;
}
