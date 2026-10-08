import { useProfile } from "@/context/social-context";
import { useNookQuery } from "@/hooks/use-nook-api";
import { useAuth } from "@/lib/chefu-auth";
import type { SocialStory } from "@/lib/social";
import { useAppTheme } from "@/lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    Modal,
    Pressable,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { FeedIcon } from "../feed-icon";
import { Avatar } from "./media";
import { StoryViewer } from "./story-viewer";

type Story = SocialStory;
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
