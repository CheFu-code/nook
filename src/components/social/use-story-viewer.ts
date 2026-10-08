import { useNookApi, useNookQuery } from "@/hooks/use-nook-api";
import { errorMessage, siteUrl, type SocialProfile, type SocialStory } from "@/lib/social";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState, BackHandler, PanResponder, Share, useWindowDimensions } from "react-native";
import {
    cancelAnimation,
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useMediaSource } from "./media";

type StoryViewerProfile = SocialProfile & { viewedAt: number };
const STORY_DURATION_MS = 5000;

type UseStoryViewerProps = {
    story: SocialStory;
    onNext: () => void;
    onClose: () => void;
    onBackActionChange: (action: (() => boolean) | null) => void;
};

export function useStoryViewer({
    story,
    onNext,
    onClose,
    onBackActionChange,
}: UseStoryViewerProps) {
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
    return {
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
    };
}
