import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/lib/chefu-auth";
import { useQueryClient } from "@tanstack/react-query";
import { cacheNookConversationPreview } from "@/lib/query-client";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useChefuAccessToken, useProfile } from "@/context/social-context";
import {
    errorMessage,
    type Id,
    type SocialProfile,
    type SocialPost,
} from "@/lib/social";
import {
    useNookApi,
    useNookPaginatedQuery,
    useNookQuery,
} from "@/hooks/use-nook-api";
import type { ProfileDraft } from "@/lib/profile-form";
import { readUploadBlob, uploadProfilePicture } from "@/lib/upload";
import { EditProfileScreen } from "../edit-profile-screen";
import { Avatar, PostMedia, useMediaSource } from "./media";
import { FollowButton } from "./post-card";
import { ConnectionStatus, LoadMore, ui } from "./ui";
import {
    ProfileHeader,
    ProfileSummary,
    ProfileGalleryTabs,
    useProfileScale,
    type ProfilePanel,
} from "../profile-layout";
import { FeedIcon } from "../feed-icon";
import { SettingsScreen } from "../settings-screen";
import { useAppTheme } from "@/lib/theme";

export function OwnProfile() {
    const me = useProfile();
    return <MemberProfile id={me._id} />;
}
export function MemberRoute() {
    const { id } = useLocalSearchParams<{ id: Id<"profiles"> }>();
    return <MemberProfile id={id} back />;
}
function MemberProfile({
    id,
    back = false,
}: {
    id: Id<"profiles">;
    back?: boolean;
}) {
    const profileQuery = useNookQuery<SocialProfile | null>(
        id ? `/nook/profiles/${encodeURIComponent(id)}` : null,
    );
    const profile = profileQuery.data;
    const [panel, setPanel] = useState<ProfilePanel>("posts");
    const posts = useNookPaginatedQuery<SocialPost>(
        `/nook/posts?feed=profile&profileId=${encodeURIComponent(id)}`,
        !!profile && (panel === "posts" || panel === "videos"),
    );
    const savedPosts = useNookPaginatedQuery<SocialPost>(
        "/nook/posts/saved",
        !!profile?.isOwn && panel === "saved",
    );
    const request = useNookApi();
    const router = useRouter();
    const { signOut, userId } = useAuth();
    const queryClient = useQueryClient();
    const { s, v, width, insets } = useProfileScale();
    const theme = useAppTheme();
    const [sheet, setSheet] = useState<
        "followers" | "following" | "edit" | "settings" | null
    >(null);
    const gallery =
        panel === "posts"
            ? posts.results
            : panel === "videos"
                ? posts.results.filter((post) => post.kind === "video")
                : panel === "saved" && profile?.isOwn
                    ? savedPosts.results
                    : [];
    const hasPostFeed = panel === "posts" || panel === "videos" || (panel === "saved" && profile?.isOwn === true);
    const galleryStatus = panel === "saved" ? savedPosts.status : posts.status;
    if (sheet === "settings")
        return (
            <SettingsScreen
                accountName={profile?.username ?? "Your account"}
                onClose={() => setSheet(null)}
                onEdit={() => setSheet("edit")}
                onSaved={() => {
                    setPanel("saved");
                    setSheet(null);
                }}
                onSignOut={signOut}
            />
        );
    return (
        <View
            style={[
                ui.screen,
                {
                    paddingTop: Math.max(40, insets.top - 9),
                    backgroundColor: theme.background,
                },
            ]}
        >
            <ProfileHeader back={back} onSettings={() => setSheet("settings")} />
            <ConnectionStatus />
            {!profile ? (
                profile === undefined ? (
                    <ActivityIndicator color={theme.blue} />
                ) : (
                    <View style={[ui.center, { backgroundColor: theme.background }]}>
                        <Text style={[ui.title, { color: theme.ink }]}>
                            Profile unavailable
                        </Text>
                    </View>
                )
            ) : (
                <>
                    <FlatList
                        data={gallery}
                        numColumns={3}
                        keyExtractor={(item) => item._id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                        columnWrapperStyle={{ gap: 4 * s, paddingHorizontal: 6 * s }}
                        ListHeaderComponent={
                            <>
                                <ProfileSummary
                                    avatar={<Avatar profile={profile} size={108 * s} />}
                                    username={profile.username}
                                    name={profile.name}
                                    bio={profile.bio ?? ""}
                                    onEdit={profile.isOwn ? () => setSheet("edit") : undefined}
                                    onDiscover={() => router.navigate("/explore")}
                                    stats={[
                                        {
                                            label: "Posts",
                                            count: profile.postsCount ?? 0,
                                            onPress: () => setPanel("posts"),
                                        },
                                        {
                                            label: "Followers",
                                            count: profile.followersCount ?? 0,
                                            onPress: () => setSheet("followers"),
                                        },
                                        {
                                            label: "Following",
                                            count: profile.followingCount ?? 0,
                                            onPress: () => setSheet("following"),
                                        },
                                    ]}
                                >
                                    {!profile.isOwn && (
                                        <View
                                            style={{
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 12,
                                                marginTop: 16 * v,
                                            }}
                                        >
                                            <FollowButton profile={profile} />
                                            <Pressable
                                                accessibilityRole="button"
                                                style={[ui.button, { flex: 1 }]}
                                                onPress={async () => {
                                                    try {
                                                        const conversation = await request<{ id: string }>(
                                                            "/nook/conversations",
                                                            {
                                                                method: "POST",
                                                                body: { profileId: profile._id },
                                                            },
                                                        );
                                                        cacheNookConversationPreview(
                                                            queryClient,
                                                            userId,
                                                            conversation.id,
                                                            profile,
                                                        );
                                                        router.push({
                                                            pathname: "/chat/[id]",
                                                            params: { id: conversation.id },
                                                        });
                                                    } catch (e) {
                                                        Alert.alert("Could not open chat", errorMessage(e));
                                                    }
                                                }}
                                            >
                                                <Text style={ui.buttonText}>Message</Text>
                                            </Pressable>
                                        </View>
                                    )}
                                </ProfileSummary>
                                <ProfileGalleryTabs panel={panel} onChange={setPanel} showSaved={profile.isOwn} />
                                <View style={{ height: 4 * v }} />
                            </>
                        }
                        renderItem={({ item }) => (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`Open post${item.caption ? `: ${item.caption}` : ""}`}
                                onPress={() =>
                                    router.push({
                                        pathname: "/post/[id]",
                                        params: { id: item._id },
                                    })
                                }
                                style={{
                                    width: (width - 20 * s) / 3,
                                    marginBottom: 4 * s,
                                    borderRadius: 7 * s,
                                    overflow: "hidden",
                                }}
                            >
                                <View pointerEvents="none">
                                    <PostMedia post={item} thumbnail aspectRatio={1 / 0.925} />
                                </View>
                            </Pressable>
                        )}
                        onEndReached={() => {
                            if (!hasPostFeed) return;
                            if (panel === "saved" && savedPosts.status === "CanLoadMore")
                                savedPosts.loadMore(21);
                            else if (panel !== "saved" && posts.status === "CanLoadMore")
                                posts.loadMore(21);
                        }}
                        ListEmptyComponent={
                            !hasPostFeed || galleryStatus !== "LoadingFirstPage" ? (
                                <View style={{ alignItems: "center", padding: 38, gap: 16 }}>
                                    <FeedIcon
                                        name={
                                            panel === "posts"
                                                ? "grid"
                                                : panel === "videos"
                                                    ? "video"
                                                    : panel === "saved"
                                                        ? "bookmark"
                                                        : "tagged"
                                        }
                                        size={36}
                                        color={theme.muted}
                                    />
                                    <Text
                                        style={[
                                            ui.muted,
                                            { textAlign: "center", color: theme.muted },
                                        ]}
                                    >
                                        {panel === "saved"
                                            ? savedPosts.status === "Error"
                                                ? "Couldn’t load saved posts. Tap Saved again to retry."
                                                : "No saved posts yet."
                                            : panel === "tagged"
                                                ? "Tagged posts are not available yet."
                                                : panel === "videos"
                                                    ? "No videos to show."
                                                    : "No posts yet. Your moments will appear here."}
                                    </Text>
                                </View>
                            ) : null
                        }
                        ListFooterComponent={
                            hasPostFeed ? (
                                panel === "saved"
                                    ? <LoadMore status={savedPosts.status} loadMore={savedPosts.loadMore} />
                                    : <LoadMore status={posts.status} loadMore={posts.loadMore} />
                            ) : null
                        }
                    />
                    <Modal
                        visible={sheet !== null}
                        animationType="slide"
                        presentationStyle="fullScreen"
                        onRequestClose={() => {
                            if (sheet !== "edit") setSheet(null);
                        }}
                    >
                        {sheet === "edit" ? (
                            <LiveEdit
                                profile={profile}
                                close={() => setSheet(null)}
                                onSaved={profileQuery.refresh}
                            />
                        ) : (
                            sheet && (
                                <Connections
                                    profileId={id}
                                    kind={sheet}
                                    close={() => setSheet(null)}
                                />
                            )
                        )}
                    </Modal>
                </>
            )}
        </View>
    );
}

function Connections({
    profileId,
    kind,
    close,
}: {
    profileId: Id<"profiles">;
    kind: "followers" | "following";
    close: () => void;
}) {
    const result = useNookPaginatedQuery<SocialProfile>(
        `/nook/profiles/${encodeURIComponent(profileId)}/connections?kind=${kind}`,
    );
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    return (
        <View
            style={[
                ui.screen,
                { paddingTop: insets.top, backgroundColor: theme.background },
            ]}
        >
            <View style={ui.header}>
                <Text style={[ui.title, { flex: 1, color: theme.ink }]}>
                    {kind === "followers" ? "Followers" : "Following"}
                </Text>
                <Pressable onPress={close} style={{ padding: 10 }}>
                    <Text style={[ui.link, { color: theme.blue }]}>Done</Text>
                </Pressable>
            </View>
            <FlatList
                data={result.results}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            padding: 16,
                            gap: 12,
                        }}
                    >
                        <Pressable
                            onPress={() => {
                                close();
                                router.push({
                                    pathname: "/member/[id]",
                                    params: { id: item._id },
                                });
                            }}
                        >
                            <Avatar profile={item as any} size={48} />
                        </Pressable>
                        <Pressable
                            style={{ flex: 1 }}
                            onPress={() => {
                                close();
                                router.push({
                                    pathname: "/member/[id]",
                                    params: { id: item._id },
                                });
                            }}
                        >
                            <Text style={[ui.text, { color: theme.ink }]}>
                                {item.username ?? "User"}
                            </Text>
                            <Text style={[ui.muted, { color: theme.muted }]}>
                                {item.name ?? item.username ?? "User"}
                            </Text>
                        </Pressable>
                        <FollowButton profile={item as SocialProfile} />
                    </View>
                )}
                ListEmptyComponent={
                    result.status !== "LoadingFirstPage" ? (
                        <Text style={[ui.muted, { padding: 24, color: theme.muted }]}>
                            No {kind} yet.
                        </Text>
                    ) : null
                }
                ListFooterComponent={
                    <LoadMore status={result.status} loadMore={result.loadMore} />
                }
            />
        </View>
    );
}
function LiveEdit({
    profile,
    close,
    onSaved,
}: {
    profile: SocialProfile;
    close: () => void;
    onSaved: () => void;
}) {
    const request = useNookApi();
    const getToken = useChefuAccessToken();
    const theme = useAppTheme();
    const { source } = useMediaSource(
        profile._id,
        "avatar",
        profile.hasAvatar,
        profile.avatarVersion,
    );
    const [saving, setSaving] = useState(false);
    const initial: ProfileDraft = {
        username: profile.username,
        name: profile.name,
        bio: profile.bio ?? "",
        website: profile.website ?? "",
        location: profile.location ?? "",
        photoUri: "",
    };
    async function save(draft: ProfileDraft) {
        if (saving) return;
        setSaving(true);
        try {
            const avatar = draft.photoUri
                ? await readUploadBlob(
                    draft.photoUri,
                    5 * 1024 * 1024,
                    /\.png$/i.test(draft.photoUri) ? "image/png" : "image/jpeg",
                )
                : null;
            await request("/nook/profile", {
                method: "PATCH",
                body: { username: draft.username },
            });
            await request("/auth/profile", {
                method: "PATCH",
                body: {
                    fullname: draft.name,
                    bio: draft.bio ?? "",
                    website: draft.website ?? "",
                    location: draft.location ?? "",
                },
            });
            if (avatar) {
                const token = await getToken();
                if (!token) throw new Error("Your session has expired. Sign in again.");
                await uploadProfilePicture(avatar, token);
            }
            onSaved();
            close();
        } catch (e) {
            Alert.alert("Could not save profile", errorMessage(e));
        } finally {
            setSaving(false);
        }
    }
    return (
        <View style={{ flex: 1 }}>
            <EditProfileScreen
                initial={initial}
                avatar={
                    source ??
                    (profile.avatarUrl
                        ? { uri: profile.avatarUrl }
                        : require("../../../assets/images/logo.png"))
                }
                onSave={(draft) => void save(draft)}
                onClose={() => {
                    if (!saving) close();
                }}
            />
            {saving && (
                <View
                    accessibilityRole="progressbar"
                    accessibilityLabel="Saving your profile"
                    style={{
                        position: "absolute",
                        inset: 0,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        backgroundColor: theme.isDark
                            ? "rgba(0,0,0,0.62)"
                            : "rgba(13,21,41,0.28)",
                    }}
                >
                    <View
                        style={{
                            alignItems: "center",
                            gap: 12,
                            minWidth: 190,
                            paddingHorizontal: 24,
                            paddingVertical: 22,
                            borderRadius: 20,
                            backgroundColor: theme.surface,
                            borderWidth: 1,
                            borderColor: theme.border,
                        }}
                    >
                        <ActivityIndicator
                            color={theme.blue}
                            size="large"
                            accessibilityLabel="Saving"
                        />
                        <Text
                            style={{
                                color: theme.ink,
                                fontSize: 15,
                                fontWeight: "700",
                            }}
                        >
                            Saving your profile…
                        </Text>
                        <Text
                            style={{
                                color: theme.muted,
                                fontSize: 12,
                                textAlign: "center",
                            }}
                        >
                            Your changes are being securely updated.
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}
