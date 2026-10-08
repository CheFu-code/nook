import { Image, type ImageSource } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { useUserPresence } from "@/hooks/use-user-presence";
import { nookMediaQueryKey } from "@/lib/query-client";
import { useAppTheme } from "@/lib/theme";
import { ui } from "./ui";
import { useNookLanguage } from "@/lib/language";

export function useMediaSource(
    id: string,
    kind: "post" | "avatar" | "story",
    enabled = true,
    revision: string | number = 0,
) {
    const { userId } = useAuth();
    const request = useNookApi();
    const media = useQuery({
        queryKey: nookMediaQueryKey(userId, kind, id, revision),
        queryFn: async ({ signal }) => {
            const result = await request<{ url: string }>(
                `/nook/media/${kind}/${encodeURIComponent(id)}?v=${encodeURIComponent(String(revision))}`,
                { signal },
            );
            return { uri: result.url, headers: {} };
        },
        enabled,
        staleTime: 4 * 60_000,
        gcTime: 10 * 60_000,
    });
    return {
        source: media.data ?? null,
        error: media.isError,
        retry: () => void media.refetch(),
    };
}

export function Avatar({
    profile,
    size = 40,
    showPresence = false,
}: {
    profile: SocialProfile;
    size?: number;
    showPresence?: boolean;
}) {
    const { user } = useAuth();
    const { t } = useNookLanguage();
    const theme = useAppTheme();
    const online = useUserPresence(profile._id, showPresence);
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
    return (
        <View
            style={{
                position: "relative",
                width: size,
                height: size,
            }}
        >
            <View
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: theme.blueSoft,
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                }}
            >
                <Text
                    style={{
                        color: theme.blue,
                        fontWeight: "700",
                        fontSize: size * 0.4,
                    }}
                >
                    {profile.name[0]?.toUpperCase()}
                </Text>
                {photo && (
                    <Image
                        source={photo}
                        cachePolicy="memory-disk"
                        transition={100}
                        style={{
                            position: "absolute",
                            width: size,
                            height: size,
                            borderRadius: size / 2,
                        }}
                    />
                )}
            </View>
            {online && (
                <View
                    accessibilityLabel={t("Online")}
                    style={{
                        position: "absolute",
                        right: -1,
                        bottom: -1,
                        width: Math.max(9, size * 0.27),
                        height: Math.max(9, size * 0.27),
                        borderRadius: size,
                        backgroundColor: "#22C55E",
                        borderWidth: Math.max(1.5, size * 0.05),
                        borderColor: theme.background,
                    }}
                />
            )}
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
    const { t } = useNookLanguage();
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
                    <Text style={ui.muted}>{t("Media unavailable. Tap to retry.")}</Text>
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

export function TextPostPreview({
    caption,
    thumbnail = false,
    aspectRatio = 1,
}: {
    caption: string;
    thumbnail?: boolean;
    aspectRatio?: number;
}) {
    const theme = useAppTheme();
    return (
        <View
            style={{
                width: "100%",
                aspectRatio,
                borderRadius: thumbnail ? 4 : 14,
                backgroundColor: theme.blueSoft,
                justifyContent: "center",
                padding: thumbnail ? 10 : 18,
                overflow: "hidden",
            }}
        >
            <Text
                numberOfLines={thumbnail ? 8 : undefined}
                style={{
                    color: theme.ink,
                    fontSize: thumbnail ? 11 : 16,
                    lineHeight: thumbnail ? 15 : 23,
                    fontWeight: "500",
                }}
            >
                {caption}
            </Text>
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
