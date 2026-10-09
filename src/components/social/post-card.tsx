import { useRouter } from "expo-router";
import {
    Alert,
    type GestureResponderEvent,
    Pressable,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import {
    errorMessage,
    type SocialPost,
    type SocialProfile,
} from "@/lib/social";
import { useFollowMutation, usePostLikeMutation } from "@/hooks/use-social-mutations";
import { FeedIcon } from "../feed-icon";
import { Avatar, PostMedia } from "./media";
import { DetailActions } from "./post-detail-actions";
import { ui } from "./ui";
import { useAppTheme } from "@/lib/theme";
import { PostCardOptions } from "./post-card-options";
import { usePostCardOptions } from "./use-post-card-options";
import { useNookLanguage } from "@/lib/language";

function stopCardNavigation(event: GestureResponderEvent) {
    event.stopPropagation();
}

export function FollowButton({
    profile,
    compactScale,
}: {
    profile: SocialProfile;
    compactScale?: number;
}) {
    const theme = useAppTheme();
    const { t } = useNookLanguage();
    const followMutation = useFollowMutation(profile);
    const following = profile.isFollowing ?? false;
    if (profile.isOwn) return null;
    async function toggle() {
        const next = !following;
        try {
            await followMutation.mutateAsync(next);
        } catch (e) {
            Alert.alert(t("Could not update follow"), errorMessage(e));
        }
    }
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t(following ? "Unfollow" : "Follow")} ${profile.username}`}
            accessibilityState={{ selected: following, disabled: followMutation.isPending }}
            disabled={followMutation.isPending}
            onPress={(event) => {
                stopCardNavigation(event);
                void toggle();
            }}
            style={{
                backgroundColor: following ? theme.subtle : theme.blue,
                paddingVertical: 9,
                paddingHorizontal: 14,
                borderRadius: 18,
                ...(compactScale
                    ? {
                        width: 57 * compactScale,
                        height: 19 * compactScale,
                        paddingVertical: 0,
                        paddingHorizontal: 0,
                        alignItems: "center",
                        justifyContent: "center",
                    }
                    : {}),
            }}
        >
            <Text
                style={{
                    color: following ? theme.secondary : "white",
                    fontSize: compactScale ? 8.6 * compactScale : 12,
                    fontWeight: compactScale ? "500" : "600",
                }}
            >
                {t(following ? "Following" : "Follow")}
            </Text>
        </Pressable>
    );
}
export function PostCard({
    post,
    visible = false,
    onComments,
    detail = false,
    home = false,
}: {
    post: SocialPost;
    visible?: boolean;
    onComments?: () => void;
    detail?: boolean;
    home?: boolean;
}) {
    const theme = useAppTheme();
    const { t } = useNookLanguage();
    const { width, height } = useWindowDimensions();
    const s = detail || home ? width / 390 : 1;
    const v = height / 916;
    const tags =
        detail || home
            ? [
                ...new Set(
                    (post.caption.match(/#[\p{L}\p{N}_]+/gu) ?? []) as string[],
                ),
            ]
            : [];
    const caption =
        detail || home
            ? post.caption
                .replace(/#[\p{L}\p{N}_]+/gu, "")
                .replace(/[ \t]{2,}/g, " ")
                .trim()
            : post.caption;
    const router = useRouter();
    const postOptions = usePostCardOptions(
        post,
        detail ? () => router.back() : undefined,
    );
    const likeMutation = usePostLikeMutation();
    const liked = post.isLiked ?? false;
    const likes = post.likesCount ?? 0;
    async function toggleLike() {
        const next = !liked;
        try {
            await likeMutation.mutateAsync({ postId: post._id, liked: next });
        } catch (e) {
            Alert.alert(t("Could not update like"), errorMessage(e));
        }
    }
    const member = () =>
        router.push({ pathname: "/member/[id]", params: { id: post.author._id } });
    const openPost = () =>
        router.push({ pathname: "/post/[id]", params: { id: post._id } });
    const author = {
        ...post.author,
        name: post.author.name ?? post.author.username,
    } as SocialProfile;
    const comments = () =>
        onComments
            ? onComments()
            : router.push({ pathname: "/post/[id]", params: { id: post._id } });
    if (home) {
        const [title, ...body] = caption.split("\n");
        const elapsed = Math.max(0, Date.now() - post._creationTime);
        const time =
            elapsed < 3600000
                ? `${Math.max(1, Math.floor(elapsed / 60000))}m ago`
                : elapsed < 86400000
                    ? `${Math.floor(elapsed / 3600000)}h ago`
                    : `${Math.floor(elapsed / 86400000)}d ago`;
        return (
            <>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${t("Open post")}${post.caption ? `: ${post.caption}` : ""}`}
                    onPress={openPost}
                    style={{
                        backgroundColor: theme.surface,
                        marginHorizontal: 8 * s,
                        marginBottom: 9 * v,
                        borderRadius: 16 * s,
                        paddingHorizontal: 5 * s,
                        paddingBottom: 5 * v,
                        boxShadow: "0px 3px 10px #1A284009",
                    }}
                >
                <View
                    style={{
                        height: 50 * v,
                        paddingHorizontal: 4 * s,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10 * s,
                    }}
                >
                    <Pressable
                        accessibilityLabel={`${t("View")} ${post.author.username}`}
                        onPress={(event) => {
                            stopCardNavigation(event);
                            member();
                        }}
                    >
                        <Avatar
                            profile={author as any}
                            size={39 * s}
                            showPresence
                        />
                    </Pressable>
                    <Pressable
                        onPress={(event) => {
                            stopCardNavigation(event);
                            member();
                        }}
                        style={{ flex: 1, gap: 3 * v }}
                    >
                        <Text
                            numberOfLines={1}
                            style={{
                                color: theme.ink,
                                fontWeight: "700",
                                fontSize: 13 * s,
                                letterSpacing: -0.3 * s,
                            }}
                        >
                            {post.author.username}
                        </Text>
                        <Text
                            numberOfLines={1}
                            style={{ color: theme.muted, fontSize: 10 * s }}
                        >
                            {time}
                            {post.author.location ? ` · ${post.author.location}` : ""}
                        </Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("Post options")}
                        onPress={(event) => {
                            stopCardNavigation(event);
                            postOptions.setOptionsOpen(true);
                        }}
                        hitSlop={10}
                        style={{ padding: 6 * s }}
                    >
                        <Text
                            style={{
                                fontSize: 15 * s,
                                letterSpacing: 1.4,
                                color: theme.secondary,
                            }}
                        >
                            •••
                        </Text>
                    </Pressable>
                </View>
                {post.kind === "text" ? (
                    <View
                        style={{
                            marginHorizontal: 5 * s,
                            marginTop: 4 * v,
                            borderRadius: 13 * s,
                            backgroundColor: theme.blueSoft,
                            padding: 16 * s,
                        }}
                    >
                        <Text
                            style={{
                                color: theme.ink,
                                fontSize: 15 * s,
                                lineHeight: 22 * s,
                            }}
                        >
                            {caption}
                        </Text>
                    </View>
                ) : (
                    <PostMedia post={post} visible={visible} />
                )}
                <View
                    style={{
                        paddingHorizontal: 5 * s,
                        paddingTop: 9 * s,
                        paddingBottom: 3 * s,
                    }}
                >
                    {post.kind !== "text" && (
                        <>
                        <Text
                            numberOfLines={2}
                            style={{
                                color: theme.ink,
                                fontSize: 11.8 * s,
                                fontWeight: "500",
                                letterSpacing: -0.25 * s,
                                lineHeight: 17 * s,
                            }}
                        >
                            {title}
                        </Text>
                        {!!body.join("").trim() && (
                            <Text
                                numberOfLines={1}
                                style={{
                                    color: theme.muted,
                                    fontSize: 10.5 * s,
                                    lineHeight: 15 * v,
                                }}
                            >
                                {body.join(" ")}
                            </Text>
                        )}
                        </>
                    )}
                    {!!tags.length && (
                        <View
                            style={{
                                flexDirection: "row",
                                gap: 5 * s,
                                paddingVertical: 4 * v,
                            }}
                        >
                            {tags.slice(0, 4).map((tag: string) => (
                                <Pressable
                                    key={String(tag)}
                                    accessibilityLabel={`${t("Explore")} ${tag}`}
                                    onPress={(event) => {
                                        stopCardNavigation(event);
                                        router.navigate("/explore");
                                    }}
                                    style={{
                                        backgroundColor: theme.blueSoft,
                                        borderRadius: 12 * s,
                                        paddingHorizontal: 8 * s,
                                        paddingVertical: 3 * v,
                                    }}
                                >
                                    <Text style={{ fontSize: 9 * s, color: theme.blue }}>
                                        {tag}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    )}
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            minHeight: 40 * s,
                            gap: 16 * s,
                            marginTop: 6 * s,
                        }}
                    >
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t(liked ? "Unlike post" : "Like post")}
                            accessibilityState={{ selected: liked }}
                            disabled={likeMutation.isPending}
                            onPress={(event) => {
                                stopCardNavigation(event);
                                void toggleLike();
                            }}
                            hitSlop={6}
                            style={{ minWidth: 40 * s, minHeight: 40 * s, flexDirection: "row", alignItems: "center", gap: 7 * s }}
                        >
                            <FeedIcon
                                name="heart"
                                size={25 * s}
                                color={liked ? "#FF3659" : theme.ink}
                                filled={liked}
                            />
                            <Text style={{ fontSize: 13 * s, fontWeight: "600", color: theme.ink }}>
                                {Math.max(0, likes)}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityLabel={t("View comments")}
                            onPress={(event) => {
                                stopCardNavigation(event);
                                comments();
                            }}
                            hitSlop={6}
                            style={{ minWidth: 40 * s, minHeight: 40 * s, flexDirection: "row", alignItems: "center", gap: 7 * s }}
                        >
                            <FeedIcon name="post-comment" size={24 * s} color={theme.ink} />
                            <Text style={{ fontSize: 13 * s, fontWeight: "600", color: theme.ink }}>
                                {post.commentsCount}
                            </Text>
                        </Pressable>
                        <DetailActions post={post} scale={0.95 * s} />
                    </View>
                </View>
                </Pressable>
                <PostCardOptions
                        post={post}
                        scale={s}
                        optionsOpen={postOptions.optionsOpen}
                        onOptionsClose={() => postOptions.setOptionsOpen(false)}
                        onEdit={postOptions.beginEdit}
                        onShare={() => void postOptions.sharePost()}
                        deleteConfirmOpen={postOptions.deleteConfirmOpen}
                        onDeleteRequest={() => {
                            postOptions.setOptionsOpen(false);
                            postOptions.setDeleteConfirmOpen(true);
                        }}
                        onDeleteCancel={() => postOptions.setDeleteConfirmOpen(false)}
                        onDelete={() => void postOptions.deletePost()}
                        editOpen={postOptions.editOpen}
                        caption={postOptions.caption}
                        onCaptionChange={postOptions.setCaption}
                        onEditCancel={() => postOptions.setEditOpen(false)}
                        onSave={() => void postOptions.saveCaption()}
                        busy={postOptions.busy}
                        feedback={postOptions.feedback}
                        onDismissFeedback={() => postOptions.setFeedback(null)}
                />
            </>
        );
    }
    return (
        <>
            <Pressable
                accessibilityRole={detail ? undefined : "button"}
                accessibilityLabel={
                    detail
                        ? undefined
                        : `Open post${post.caption ? `: ${post.caption}` : ""}`
                }
                disabled={detail}
                onPress={openPost}
                style={
                    detail
                        ? {
                            backgroundColor: theme.background,
                            paddingHorizontal: 10,
                            paddingTop: 8,
                        }
                        : {
                            backgroundColor: theme.surface,
                            marginHorizontal: 10,
                            marginBottom: 12,
                            padding: 8,
                            borderRadius: 18,
                            boxShadow: "0px 3px 10px #1A284009",
                        }
                }
            >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    padding: 4,
                    paddingBottom: 12,
                }}
            >
                <Pressable
                    accessibilityLabel={`${t("View")} ${post.author.username}`}
                    onPress={(event) => {
                        stopCardNavigation(event);
                        member();
                    }}
                >
                    <Avatar profile={author as any} showPresence />
                </Pressable>
                <Pressable
                    onPress={(event) => {
                        stopCardNavigation(event);
                        member();
                    }}
                    style={{ flex: 1 }}
                >
                    <Text style={{ color: theme.ink, fontWeight: "700", fontSize: 14 }}>
                        {post.author.username}
                    </Text>
                    <Text style={{ color: theme.muted, fontSize: 11, marginTop: 3 }}>
                        {new Date(post._creationTime).toLocaleDateString()}
                        {post.author.location ? ` · ${post.author.location}` : ""}
                    </Text>
                </Pressable>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("Post options")}
                        onPress={(event) => {
                            stopCardNavigation(event);
                            postOptions.setOptionsOpen(true);
                        }}
                        hitSlop={12}
                        style={{ padding: 8 }}
                    >
                        <Text style={{ color: theme.muted }}>•••</Text>
                    </Pressable>
                    {!post.isOwn && <FollowButton profile={author} />}
                </View>
            </View>
            {post.kind === "text" ? null : <PostMedia post={post} visible={visible} />}
            <View
                style={{
                    paddingHorizontal: detail ? 10 * s : 7,
                    paddingTop: detail ? 12 * s : 7,
                    paddingBottom: detail ? 10 * s : 7,
                    gap: 10 * s,
                }}
            >
                {!!caption && (
                    <Text
                        style={
                            detail
                                ? {
                                    color: theme.ink,
                                    fontSize: 16 * s,
                                    lineHeight: 22 * s,
                                    letterSpacing: -0.3,
                                }
                                : [ui.text, { color: theme.ink }]
                        }
                    >
                        {caption}
                    </Text>
                )}
                {!!tags.length && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 * s }}>
                        {tags.map((tag: string) => (
                            <View
                                key={String(tag)}
                                style={{
                                    backgroundColor: theme.blueSoft,
                                    borderRadius: 18 * s,
                                    paddingVertical: 6 * s,
                                    paddingHorizontal: 11 * s,
                                }}
                            >
                                <Text
                                    style={{
                                        color: theme.blue,
                                        fontSize: 12 * s,
                                        fontWeight: "500",
                                    }}
                                >
                                    {tag}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: (detail ? 20 : 24) * s,
                        paddingLeft: detail ? 8 * s : 0,
                        marginTop: detail ? 4 * s : 0,
                    }}
                >
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t(liked ? "Unlike post" : "Like post")}
                        accessibilityState={{ selected: liked }}
                        disabled={likeMutation.isPending}
                        onPress={(event) => {
                            stopCardNavigation(event);
                            void toggleLike();
                        }}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 7 * s,
                            minHeight: 36 * s,
                            width: detail ? 68 * s : undefined,
                        }}
                    >
                        <FeedIcon
                            name="heart"
                            size={(detail ? 25 : 22) * s}
                            filled={liked}
                            color={liked ? "#FF244E" : theme.ink}
                        />
                        <Text
                            style={
                                detail
                                    ? { fontSize: 14 * s, fontWeight: "600", color: theme.ink }
                                    : [ui.text, { color: theme.ink }]
                            }
                        >
                            {Math.max(0, likes)}
                        </Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("View comments")}
                        onPress={(event) => {
                            stopCardNavigation(event);
                            comments();
                        }}
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 7 * s,
                            minHeight: 36 * s,
                            width: detail ? 62 * s : undefined,
                        }}
                    >
                        <FeedIcon
                            name="comment"
                            size={(detail ? 24 : 21) * s}
                            color={theme.ink}
                        />
                        <Text
                            style={
                                detail
                                    ? { fontSize: 14 * s, fontWeight: "600", color: theme.ink }
                                    : [ui.text, { color: theme.ink }]
                            }
                        >
                            {post.commentsCount}
                        </Text>
                    </Pressable>
                    {detail && <DetailActions post={post} scale={s} />}
                </View>
            </View>
            </Pressable>
            <PostCardOptions
                    post={post}
                    scale={s}
                    optionsOpen={postOptions.optionsOpen}
                    onOptionsClose={() => postOptions.setOptionsOpen(false)}
                    onEdit={postOptions.beginEdit}
                    onShare={() => void postOptions.sharePost()}
                    deleteConfirmOpen={postOptions.deleteConfirmOpen}
                    onDeleteRequest={() => {
                        postOptions.setOptionsOpen(false);
                        postOptions.setDeleteConfirmOpen(true);
                    }}
                    onDeleteCancel={() => postOptions.setDeleteConfirmOpen(false)}
                    onDelete={() => void postOptions.deletePost()}
                    editOpen={postOptions.editOpen}
                    caption={postOptions.caption}
                    onCaptionChange={postOptions.setCaption}
                    onEditCancel={() => postOptions.setEditOpen(false)}
                    onSave={() => void postOptions.saveCaption()}
                    busy={postOptions.busy}
                    feedback={postOptions.feedback}
                    onDismissFeedback={() => postOptions.setFeedback(null)}
            />
        </>
    );
}
