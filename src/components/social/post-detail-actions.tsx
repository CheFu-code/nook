import { Alert, Pressable, Share, View } from "react-native";
import { errorMessage, siteUrl, type SocialPost } from "@/lib/social";
import { useNookQuery } from "@/hooks/use-nook-api";
import { usePostBookmarkMutation } from "@/hooks/use-social-mutations";
import { useAppTheme } from "@/lib/theme";
import { FeedIcon } from "../feed-icon";

export function DetailActions({
    post,
    scale,
}: {
    post: SocialPost;
    scale: number;
}) {
    const theme = useAppTheme();
    const saved = useNookQuery<boolean>(
        `/nook/posts/${encodeURIComponent(post._id)}/bookmark`,
    );
    const bookmarkMutation = usePostBookmarkMutation(post);
    const bookmarked = post.isBookmarked ?? saved.data ?? false;
    const postUrl = `${siteUrl}/nook/share/posts/${encodeURIComponent(post._id)}`;
    return (
        <>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Share post"
                accessibilityHint="Shares a link that opens this post in nook"
                onPress={() =>
                    void Share.share({
                        message: `Check out @${post.author.username}'s post on nook:\n${postUrl}`,
                        url: postUrl,
                    }).catch((e) => Alert.alert("Could not share", errorMessage(e)))
                }
                hitSlop={6}
                style={{
                    width: 40 * scale,
                    height: 40 * scale,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <FeedIcon name="post-share" size={28 * scale} color={theme.ink} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark post"}
                accessibilityState={{
                    selected: bookmarked,
                    disabled:
                        bookmarkMutation.isPending ||
                        (saved.data === undefined && post.isBookmarked === undefined),
                }}
                disabled={
                    bookmarkMutation.isPending ||
                    (saved.data === undefined && post.isBookmarked === undefined)
                }
                onPress={() =>
                    void bookmarkMutation
                        .mutateAsync(!bookmarked)
                        .catch((e) =>
                            Alert.alert("Could not save bookmark", errorMessage(e)),
                        )
                }
                hitSlop={6}
                style={{
                    width: 44 * scale,
                    height: 44 * scale,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <FeedIcon
                    name="post-bookmark"
                    size={27 * scale}
                    filled={bookmarked}
                    color={bookmarked ? theme.blue : theme.ink}
                />
            </Pressable>
        </>
    );
}
