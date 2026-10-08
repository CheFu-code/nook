import type { SocialStory } from "@/lib/social";
import { Image } from "expo-image";
import {
    ActivityIndicator,
    Pressable,
    Text,
    View,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedIcon } from "../feed-icon";
import { Avatar } from "./media";
import { StoryViewerOverlays } from "./story-viewer-overlays";
import { useStoryViewer } from "./use-story-viewer";
import { useNookLanguage } from "@/lib/language";

type Story = SocialStory;

export function StoryViewer({
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
    const { t } = useNookLanguage();
    const {
        source,
        error,
        retry,
        ready,
        setReady,
        viewerCount,
        failed,
        setFailed,
        paused,
        setPaused,
        optionsOpen,
        setOptionsOpen,
        deleteConfirmOpen,
        viewersOpen,
        setViewersOpen,
        feedback,
        setFeedback,
        viewersQuery,
        dismissGesture,
        dismissStyle,
        progressStyle,
        recordView,
        cancelDelete,
        openDeleteConfirmation,
        deleteStory,
        openStoryOptions,
        shareStory,
    } = useStoryViewer({ story, onNext, onClose, onBackActionChange });
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
                            {t("Story")} · {formatStoryAge(now - story._creationTime)}
                        </Text>
                    </View>
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("More story options")}
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
                        source={{ ...source, cacheKey: `nook-story-${story._id}` }}
                        cachePolicy="memory-disk"
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
                        accessibilityLabel={t("Previous story")}
                        onPress={onPrevious}
                        onLongPress={() => setPaused(true)}
                        onPressIn={() => setPaused(true)}
                        onPressOut={() => setPaused(false)}
                        style={{ width: "30%" }}
                    />
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("Next story")}
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
            <StoryViewerOverlays
                story={story}
                insetsBottom={insets.bottom}
                viewerCount={viewerCount}
                viewersOpen={viewersOpen}
                viewersQuery={viewersQuery}
                optionsOpen={optionsOpen}
                deleteConfirmOpen={deleteConfirmOpen}
                feedback={feedback}
                onCloseViewers={() => {
                    setViewersOpen(false);
                    setPaused(false);
                }}
                onShare={() => void shareStory()}
                onDeleteRequest={openDeleteConfirmation}
                onCancelOptions={() => {
                    setOptionsOpen(false);
                    setPaused(false);
                }}
                onCancelDelete={cancelDelete}
                onDelete={() => void deleteStory()}
                onDismissFeedback={() => {
                    setFeedback(null);
                    setPaused(false);
                }}
            />
            </Animated.View>
        </View>
    );
}

function formatStoryAge(ageMs: number) {
    const ageMinutes = Math.max(0, Math.floor(ageMs / 60_000));
    if (ageMinutes === 0) return "Just now";
    if (ageMinutes < 60) return `${ageMinutes}m ago`;
    return `${Math.floor(ageMinutes / 60)}h ago`;
}
