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
    useNookCursorPaginatedQuery,
    useNookPaginatedQuery,
    useNookQuery,
} from "@/hooks/use-nook-api";
import type { ProfileDraft } from "@/lib/profile-form";
import { readUploadBlob, uploadProfilePicture } from "@/lib/upload";
import { EditProfileScreen } from "../edit-profile-screen";
import { Avatar, PostMedia, TextPostPreview, useMediaSource } from "./media";
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
import { BlockedUsersScreen } from "../blocked-users-screen";
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
    const posts = useNookCursorPaginatedQuery<SocialPost>(
        `/nook/posts?feed=profile&profileId=${encodeURIComponent(id)}&cursorMode=true`,
        !!profile && !profile.isBlockedByMe && !profile.isBlockingMe &&
            (panel === "posts" || panel === "videos"),
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
        "followers" | "following" | "edit" | "settings" | "blocked-users" | null
    >(null);
    const [blockBusy, setBlockBusy] = useState(false);
    const [blockConfirmationOpen, setBlockConfirmationOpen] = useState(false);
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
    const emptyGalleryMessage =
        panel === "saved"
            ? savedPosts.status === "Error"
                ? "Couldn’t load saved posts. Tap Saved again to retry."
                : "No saved posts yet."
            : panel === "tagged"
                ? "Tagged posts are not available yet."
                : panel === "videos"
                    ? profile?.isOwn
                        ? "No videos to show."
                        : `No videos from @${profile?.username} yet.`
                    : profile?.isOwn
                        ? "No posts yet. Your moments will appear here."
                        : `No posts yet. @${profile?.username} hasn’t shared any moments.`;
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
                onBlockedUsers={() => setSheet("blocked-users")}
                onSignOut={signOut}
            />
        );
    if (sheet === "blocked-users")
        return <BlockedUsersScreen onClose={() => setSheet("settings")} />;

    async function updateBlock(blocked: boolean) {
        if (!profile || blockBusy) return;
        setBlockBusy(true);
        try {
            await request(
                `/nook/profiles/${encodeURIComponent(profile._id)}/block`,
                { method: blocked ? "POST" : "DELETE" },
            );
            await profileQuery.refresh();
        } catch (error) {
            Alert.alert(
                blocked ? "Could not block user" : "Could not unblock user",
                errorMessage(error),
            );
        } finally {
            setBlockBusy(false);
        }
    }

    function confirmBlock() {
        if (!profile) return;
        setBlockConfirmationOpen(true);
    }
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
            <ProfileHeader
                back={back}
                onSettings={
                    profile?.isOwn ? () => setSheet("settings") : undefined
                }
            />
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
            ) : profile.isBlockingMe ? (
                <View style={[ui.center, { backgroundColor: theme.background, padding: 28 }]}>
                    <Text style={[ui.title, { color: theme.ink }]}>Profile unavailable</Text>
                    <Text style={[ui.muted, { color: theme.muted, textAlign: "center" }]}>
                        This profile isn’t available.
                    </Text>
                </View>
            ) : (
                <>
                    <FlatList
                        data={profile.isBlockedByMe ? [] : gallery}
                        numColumns={3}
                        keyExtractor={(item) => item._id}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                        columnWrapperStyle={{ gap: 4 * s, paddingHorizontal: 6 * s }}
                        ListHeaderComponent={
                            <>
                                <ProfileSummary
                                    avatar={
                                        <Avatar
                                            profile={profile}
                                            size={108 * s}
                                            showPresence
                                        />
                                    }
                                    username={profile.username}
                                    name={profile.name}
                                    bio={profile.bio ?? ""}
                                    onEdit={profile.isOwn ? () => setSheet("edit") : undefined}
                                    onDiscover={() => router.navigate("/explore")}
                                    stats={profile.isBlockedByMe ? [] : [
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
                                        profile.isBlockedByMe ? (
                                            <Pressable
                                                accessibilityRole="button"
                                                accessibilityState={{ disabled: blockBusy, busy: blockBusy }}
                                                disabled={blockBusy}
                                                style={{
                                                    minHeight: Math.max(44, 42 * v),
                                                    width: "100%",
                                                    flexDirection: "row",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    gap: 8 * s,
                                                    marginTop: 12 * v,
                                                    borderRadius: 14 * s,
                                                    borderWidth: 1,
                                                    borderColor: theme.border,
                                                    backgroundColor: theme.subtle,
                                                }}
                                                onPress={() => void updateBlock(false)}
                                            >
                                                <FeedIcon name="blocked" size={16 * s} color={theme.ink} />
                                                <Text style={{ color: theme.ink, fontSize: 14 * s, fontWeight: "600" }}>
                                                    {blockBusy ? "Unblocking…" : "Unblock"}
                                                </Text>
                                            </Pressable>
                                        ) : (
                                            <>
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
                                                <Pressable
                                                    accessibilityRole="button"
                                                    accessibilityState={{ disabled: blockBusy }}
                                                    disabled={blockBusy}
                                                    onPress={confirmBlock}
                                                    style={{
                                                        minHeight: Math.max(44, 42 * v),
                                                        width: "100%",
                                                        flexDirection: "row",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: 8 * s,
                                                        marginTop: 8 * v,
                                                        borderRadius: 14 * s,
                                                        borderWidth: 1,
                                                        borderColor: theme.isDark ? "#68313D" : "#F4D6DA",
                                                        backgroundColor: theme.isDark ? "#321E27" : "#FFF5F6",
                                                    }}
                                                >
                                                    <FeedIcon name="blocked" size={16 * s} color="#E5485D" />
                                                    <Text style={{ color: "#E5485D", fontSize: 14 * s, fontWeight: "600" }}>
                                                        Block user
                                                    </Text>
                                                </Pressable>
                                            </>
                                        )
                                    )}
                                </ProfileSummary>
                                {profile.isBlockedByMe ? (
                                    <Text
                                        style={{
                                            color: theme.muted,
                                            textAlign: "center",
                                            marginTop: 18 * v,
                                            paddingHorizontal: 24,
                                        }}
                                    >
                                        You’ve blocked this account. Unblock them to see their posts and interact again.
                                    </Text>
                                ) : (
                                    <ProfileGalleryTabs panel={panel} onChange={setPanel} showSaved={profile.isOwn} />
                                )}
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
                                    {item.kind === "text" ? (
                                        <TextPostPreview caption={item.caption} thumbnail aspectRatio={1 / 0.925} />
                                    ) : (
                                        <PostMedia post={item} thumbnail aspectRatio={1 / 0.925} />
                                    )}
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
                                        {emptyGalleryMessage}
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
                    <Modal
                        visible={blockConfirmationOpen}
                        transparent
                        animationType="fade"
                        statusBarTranslucent
                        onRequestClose={() => {
                            if (!blockBusy) setBlockConfirmationOpen(false);
                        }}
                    >
                        <View
                            style={{
                                flex: 1,
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 24,
                                backgroundColor: "rgba(5, 10, 20, 0.58)",
                            }}
                        >
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Cancel block confirmation"
                                disabled={blockBusy}
                                onPress={() => setBlockConfirmationOpen(false)}
                                style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                            />
                            <View
                                accessibilityViewIsModal
                                style={{
                                    width: "100%",
                                    maxWidth: 380,
                                    alignItems: "center",
                                    paddingHorizontal: 24,
                                    paddingTop: 26,
                                    paddingBottom: 20,
                                    borderRadius: 24,
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    backgroundColor: theme.surface,
                                }}
                            >
                                <View
                                    style={{
                                        width: 54,
                                        height: 54,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        borderRadius: 27,
                                        backgroundColor: theme.isDark ? "#482731" : "#FFF0F1",
                                        marginBottom: 16,
                                    }}
                                >
                                    <FeedIcon name="blocked" size={24} color="#E5485D" />
                                </View>
                                <Text
                                    accessibilityRole="header"
                                    style={{
                                        color: theme.ink,
                                        fontSize: 19,
                                        fontWeight: "700",
                                        textAlign: "center",
                                    }}
                                >
                                    Block @{profile?.username}?
                                </Text>
                                <Text
                                    style={{
                                        color: theme.secondary,
                                        fontSize: 14,
                                        lineHeight: 21,
                                        textAlign: "center",
                                        marginTop: 9,
                                    }}
                                >
                                    They won’t be able to see your posts or message you. You won’t see their posts, and you’ll both be unfollowed.
                                </Text>
                                <View
                                    style={{
                                        width: "100%",
                                        flexDirection: "row",
                                        gap: 10,
                                        marginTop: 24,
                                    }}
                                >
                                    <Pressable
                                        accessibilityRole="button"
                                        disabled={blockBusy}
                                        onPress={() => setBlockConfirmationOpen(false)}
                                        style={{
                                            flex: 1,
                                            minHeight: 46,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: 14,
                                            backgroundColor: theme.subtle,
                                            borderWidth: 1,
                                            borderColor: theme.border,
                                            opacity: blockBusy ? 0.6 : 1,
                                        }}
                                    >
                                        <Text style={{ color: theme.ink, fontSize: 14, fontWeight: "600" }}>
                                            Cancel
                                        </Text>
                                    </Pressable>
                                    <Pressable
                                        accessibilityRole="button"
                                        accessibilityState={{ disabled: blockBusy, busy: blockBusy }}
                                        disabled={blockBusy}
                                        onPress={() => {
                                            setBlockConfirmationOpen(false);
                                            void updateBlock(true);
                                        }}
                                        style={{
                                            flex: 1,
                                            minHeight: 46,
                                            alignItems: "center",
                                            justifyContent: "center",
                                            borderRadius: 14,
                                            backgroundColor: "#E5485D",
                                            opacity: blockBusy ? 0.6 : 1,
                                        }}
                                    >
                                        <Text style={{ color: "white", fontSize: 14, fontWeight: "700" }}>
                                            {blockBusy ? "Blocking…" : "Block"}
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
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
                            <Avatar profile={item as any} size={48} showPresence />
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
                        <View
                            style={{
                                alignItems: "center",
                                paddingHorizontal: 32,
                                paddingVertical: 56,
                                gap: 12,
                            }}
                        >
                            <View
                                style={{
                                    width: 64,
                                    height: 64,
                                    borderRadius: 32,
                                    backgroundColor: theme.subtle,
                                    alignItems: "center",
                                    justifyContent: "center",
                                }}
                            >
                                <FeedIcon
                                    name="profile"
                                    size={30}
                                    color={theme.muted}
                                />
                            </View>
                            <Text
                                style={{
                                    color: theme.ink,
                                    fontSize: 17,
                                    fontWeight: "700",
                                    textAlign: "center",
                                }}
                            >
                                {kind === "followers"
                                    ? "No followers yet"
                                    : "Not following anyone yet"}
                            </Text>
                            <Text
                                style={[
                                    ui.muted,
                                    {
                                        maxWidth: 260,
                                        color: theme.muted,
                                        textAlign: "center",
                                        lineHeight: 20,
                                    },
                                ]}
                            >
                                {kind === "followers"
                                    ? "When people follow this profile, they’ll appear here."
                                    : "The profiles they follow will appear here."}
                            </Text>
                        </View>
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
