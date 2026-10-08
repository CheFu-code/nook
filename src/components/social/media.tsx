import { Image, type ImageSource } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    AppState,
    Pressable,
    Text,
    View,
} from "react-native";
import { type SocialProfile, type SocialPost } from "@/lib/social";
import { useNookApi } from "@/hooks/use-nook-api";
import { useAuth } from "@/lib/chefu-auth";
import { useAppTheme } from "@/lib/theme";
import { ui } from "./ui";

const MEDIA_URL_CACHE_TTL = 4 * 60_000;
const MEDIA_URL_CACHE_LIMIT = 200;
const mediaUrlCache = new Map<string, { source: { uri: string; headers: Record<string, string> }; updatedAt: number }>();

function mediaCacheKey(userId: string | undefined, kind: "post" | "avatar" | "story", id: string, revision: string | number) {
    return JSON.stringify([userId ?? "signed-out", kind, id, revision]);
}

function readCachedMedia(key: string) {
    const entry = mediaUrlCache.get(key);
    if (!entry) return undefined;
    return Date.now() - entry.updatedAt < MEDIA_URL_CACHE_TTL ? entry.source : undefined;
}

function writeCachedMedia(key: string, source: { uri: string; headers: Record<string, string> }) {
    mediaUrlCache.delete(key);
    mediaUrlCache.set(key, { source, updatedAt: Date.now() });
    while (mediaUrlCache.size > MEDIA_URL_CACHE_LIMIT) {
        const oldestKey = mediaUrlCache.keys().next().value;
        if (oldestKey === undefined) break;
        mediaUrlCache.delete(oldestKey);
    }
}

export function useMediaSource(
    id: string,
    kind: "post" | "avatar" | "story",
    enabled = true,
    revision: string | number = 0,
) {
    const { userId } = useAuth();
    const request = useNookApi();
    const key = enabled ? mediaCacheKey(userId, kind, id, revision) : '';
    const [loaded, setLoaded] = useState<{ key: string; source: { uri: string; headers: Record<string, string> } } | null>(null);
    const [failure, setFailure] = useState<{ key: string; error: boolean } | null>(null);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!enabled) return;
        const cached = readCachedMedia(key);
        if (cached) return;
        let active = true;
        void request<{ url: string }>(
            `/nook/media/${kind}/${encodeURIComponent(id)}?v=${encodeURIComponent(String(revision))}`,
        )
            .then((result) => {
                if (active) {
                    const source = { uri: result.url, headers: {} };
                    writeCachedMedia(key, source);
                    setLoaded({ key, source });
                }
            })
            .catch(() => {
                if (active) setFailure({ key, error: true });
            });
        return () => {
            active = false;
        };
    }, [id, kind, enabled, key, revision, attempt, request]);
    const source = loaded?.key === key ? loaded.source : enabled ? readCachedMedia(key) ?? null : null;
    const error = !source && failure?.key === key && failure.error;
    return {
        source,
        error,
        retry: () => {
            mediaUrlCache.delete(key);
            setAttempt((value) => value + 1);
        },
    };
}

export function Avatar({
    profile,
    size = 40,
}: {
    profile: SocialProfile;
    size?: number;
}) {
    const { user } = useAuth();
    const theme = useAppTheme();
    const { source } = useMediaSource(
        profile._id,
        "avatar",
        profile.hasAvatar,
        profile.avatarVersion ?? profile.avatarUrl ?? 0,
    );
    const accountPhoto = profile.isOwn
        ? user?.photoURL || user?.imageUrl
        : undefined;
    const fallbackPhoto = profile.avatarUrl || accountPhoto;
    const photo: ImageSource | undefined = source
        ? source
        : fallbackPhoto
            ? { uri: fallbackPhoto }
            : undefined;
    return photo ? (
        <Image
            source={photo}
            cachePolicy="memory"
            style={{ width: size, height: size, borderRadius: size / 2 }}
        />
    ) : (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: theme.blueSoft,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Text
                style={{ color: theme.blue, fontWeight: "700", fontSize: size * 0.4 }}
            >
                {profile.name[0]?.toUpperCase()}
            </Text>
        </View>
    );
}

export function PostMedia({
    post,
    visible = false,
    thumbnail = false,
    aspectRatio: requestedAspectRatio,
}: {
    post: SocialPost;
    visible?: boolean;
    thumbnail?: boolean;
    aspectRatio?: number;
}) {
    const { source, error, retry } = useMediaSource(post._id, "post");
    const [failed, setFailed] = useState(false);
    const sourceAspectRatio =
        post.width && post.height ? post.width / post.height : 1;
    const aspectRatio =
        requestedAspectRatio ??
        (thumbnail ? 1 : Math.max(0.65, Math.min(1.8, sourceAspectRatio)));
    return (
        <View
            style={{
                width: "100%",
                aspectRatio,
                backgroundColor: "#EEF2F8",
                borderRadius: thumbnail ? 4 : 14,
                overflow: "hidden",
                justifyContent: "center",
            }}
        >
            {error || failed ? (
                <Pressable
                    onPress={() => {
                        setFailed(false);
                        retry();
                    }}
                    style={{ padding: 12 }}
                >
                    <Text style={ui.muted}>Media unavailable. Tap to retry.</Text>
                </Pressable>
            ) : !source ? (
                <ActivityIndicator color="#087EFF" />
            ) : post.kind === "video" ? (
                <InlineVideo
                    source={source}
                    active={visible}
                    thumbnail={thumbnail}
                    onError={() => setFailed(true)}
                />
            ) : (
                <Image
                    source={source}
                    cachePolicy="memory"
                    style={{ width: "100%", height: "100%" }}
                    contentFit={thumbnail ? "cover" : "contain"}
                    onError={() => setFailed(true)}
                    accessibilityLabel={post.caption || "Post image"}
                />
            )}
        </View>
    );
}

function InlineVideo({
    source,
    active,
    thumbnail,
    onError,
}: {
    source: { uri: string; headers: Record<string, string> };
    active: boolean;
    thumbnail: boolean;
    onError: () => void;
}) {
    const [focused, setFocused] = useState(true);
    useFocusEffect(
        useCallback(() => {
            setFocused(true);
            return () => setFocused(false);
        }, []),
    );
    const player = useVideoPlayer(source, (value) => {
        value.loop = false;
    });
    useEffect(() => {
        if (!active || !focused) player.pause();
    }, [active, focused, player]);
    useEffect(() => {
        const app = AppState.addEventListener("change", (state) => {
            if (state !== "active") player.pause();
        });
        const listener = player.addListener("statusChange", (event) => {
            if (event.status === "error") onError();
        });
        return () => {
            app.remove();
            listener.remove();
        };
    }, [player, onError]);
    return (
        <View
            style={{ flex: 1 }}
            pointerEvents={thumbnail || !active ? "none" : "auto"}
        >
            <VideoView
                player={player}
                style={{ flex: 1 }}
                contentFit="cover"
                nativeControls={!thumbnail && active}
                fullscreenOptions={{ enable: false }}
            />
            {thumbnail && (
                <Text
                    style={{
                        position: "absolute",
                        right: 8,
                        bottom: 8,
                        color: "white",
                        backgroundColor: "#0008",
                        padding: 4,
                        borderRadius: 6,
                    }}
                >
                    ▶ Video
                </Text>
            )}
        </View>
    );
}
