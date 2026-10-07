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
import { ui } from "./ui";

export function useMediaSource(
    id: string,
    kind: "post" | "avatar" | "story",
    enabled = true,
    revision = 0,
) {
    const request = useNookApi();
    const [source, setSource] = useState<{
        uri: string;
        headers: Record<string, string>;
    } | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        if (!enabled) {
            setSource(null);
            return;
        }
        let active = true;
        setSource(null);
        setError(false);
        void request<{ url: string }>(
            `/nook/media/${kind}/${encodeURIComponent(id)}?v=${revision}`,
        )
            .then((result) => {
                if (active) setSource({ uri: result.url, headers: {} });
            })
            .catch(() => {
                if (active) setError(true);
            });
        return () => {
            active = false;
        };
    }, [id, kind, enabled, revision, attempt, request]);
    return { source, error, retry: () => setAttempt((value) => value + 1) };
}

export function Avatar({
    profile,
    size = 40,
}: {
    profile: SocialProfile;
    size?: number;
}) {
    const { user } = useAuth();
    const { source } = useMediaSource(
        profile._id,
        "avatar",
        profile.hasAvatar,
        profile.avatarVersion,
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
            cachePolicy="none"
            style={{ width: size, height: size, borderRadius: size / 2 }}
        />
    ) : (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: "#E8F1FF",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Text
                style={{ color: "#087EFF", fontWeight: "700", fontSize: size * 0.4 }}
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
                    cachePolicy="none"
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
