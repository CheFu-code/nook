import { useRouter } from "expo-router";
import {
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { errorMessage } from "@/lib/social";
import { useCommentLikeMutation } from "@/hooks/use-social-mutations";
import { FeedIcon } from "../feed-icon";
import { Avatar } from "./media";
import { useAppTheme } from "@/lib/theme";
import {
  relativeTime,
  type Dialog,
  type NestedComment,
} from "./post-detail-logic";

export function CommentRow({
  item,
  postId,
  scale: s,
  now,
  onOptions,
  onError,
  onReply,
}: {
  item: NestedComment;
  postId: string;
  scale: number;
  now: number;
  onOptions: () => void;
  onError: (title: string, message: string) => void;
  onReply: () => void;
}) {
  const likeMutation = useCommentLikeMutation(postId);
  const liked = item.isLiked;
  const router = useRouter();
  const theme = useAppTheme();
  const openProfile = () =>
    router.push({ pathname: "/member/[id]", params: { id: item.author._id } });
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 17 * s,
        paddingHorizontal: 18 * s,
        marginLeft: item.depth ? Math.min(item.depth, 3) * 20 * s : 0,
        paddingLeft: item.depth ? 10 * s : 0,
        paddingBottom: 17 * s,
        borderLeftWidth: item.depth ? 1 : 0,
        borderColor: theme.border,
      }}
    >
      <Pressable
        accessibilityLabel={`View ${item.author.username}`}
        onPress={openProfile}
      >
        <Avatar profile={item.author} size={(item.depth ? 32 : 42) * s} />
      </Pressable>
      <View style={{ flex: 1, gap: 3 * s }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", gap: 9 * s }}
        >
          <Pressable onPress={openProfile} style={{ flexShrink: 1 }}>
            <Text
              numberOfLines={1}
              style={{
                color: theme.ink,
                fontWeight: "700",
                fontSize: 14 * s,
                letterSpacing: -0.3,
              }}
            >
              {item.author.username}
            </Text>
          </Pressable>
          <Text style={{ color: theme.muted, fontSize: 12 * s }}>
            {relativeTime(item._creationTime, now)}
          </Text>
          {item.isOwn && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Comment options"
              accessibilityHint="Edit or delete your comment"
              onPress={onOptions}
              hitSlop={8}
              style={{ marginLeft: "auto", paddingHorizontal: 4 * s }}
            >
              <View style={{ transform: [{ rotate: "90deg" }] }}>
                <FeedIcon
                  name="more-vertical"
                  size={18 * s}
                  color={theme.muted}
                />
              </View>
            </Pressable>
          )}
        </View>
        {!!item.parentUsername && item.depth > 0 && (
          <Text style={{ color: theme.blue, fontSize: 12 * s }}>
            Replying to @{item.parentUsername}
          </Text>
        )}
        <View>
          <Text
            style={{
              color: theme.ink,
              fontSize: 14 * s,
              lineHeight: 19 * s,
              letterSpacing: -0.25,
            }}
          >
            {item.text}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Reply to ${item.author.username}`}
          onPress={onReply}
          style={{ alignSelf: "flex-start", paddingVertical: 3 * s }}
        >
          <Text style={{ color: theme.muted, fontSize: 13 * s }}>Reply</Text>
        </Pressable>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={liked ? "Unlike comment" : "Like comment"}
        accessibilityState={{ selected: liked }}
        disabled={
          likeMutation.isPending &&
          likeMutation.variables?.commentId === item._id
        }
        onPress={() =>
          void likeMutation
            .mutateAsync({ commentId: item._id, liked: !liked })
            .catch((error) =>
              onError("Could not update like", errorMessage(error)),
            )
        }
        hitSlop={10}
        style={{ paddingTop: 10 * s, paddingLeft: 2 * s }}
      >
        <FeedIcon
          name="heart"
          size={18 * s}
          color={liked ? "#FF244E" : theme.ink}
          filled={liked}
        />
      </Pressable>
    </View>
  );
}

export function PostDetailDialog({
  dialog,
  scale: s,
  bottomInset,
  onDismiss,
  onAction,
}: {
  dialog: Dialog | null;
  scale: number;
  bottomInset: number;
  onDismiss: () => void;
  onAction: (action: Dialog["actions"][number]) => void;
}) {
  const theme = useAppTheme();
  return (
    <Modal
      visible={dialog !== null}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(5, 12, 25, 0.42)",
        }}
      >
        <Pressable
          accessibilityLabel="Close dialog"
          onPress={onDismiss}
          style={{ flex: 1 }}
        />
        {dialog && (
          <View
            style={{
              paddingHorizontal: 18 * s,
              paddingTop: 20 * s,
              paddingBottom: Math.max(bottomInset, 16) + 12 * s,
              borderTopLeftRadius: 26 * s,
              borderTopRightRadius: 26 * s,
              backgroundColor: theme.surface,
              gap: 9 * s,
            }}
          >
            <Text
              style={{
                color: theme.ink,
                fontSize: 19 * s,
                fontWeight: "700",
                textAlign: "center",
              }}
            >
              {dialog.title}
            </Text>
            {!!dialog.message && (
              <Text
                style={{
                  color: theme.muted,
                  fontSize: 14 * s,
                  lineHeight: 20 * s,
                  textAlign: "center",
                  paddingHorizontal: 8 * s,
                  paddingBottom: 5 * s,
                }}
              >
                {dialog.message}
              </Text>
            )}
            {dialog.actions.map((action, index) => (
              <Pressable
                key={`${action.label}-${index}`}
                accessibilityRole="button"
                onPress={() => onAction(action)}
                style={({ pressed }) => ({
                  minHeight: 50 * s,
                  borderRadius: 15 * s,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    action.tone === "destructive"
                      ? theme.isDark
                        ? "#3A2029"
                        : "#FFF0F1"
                      : action.label === "Cancel" || action.label === "OK"
                        ? theme.subtle
                        : theme.blueSoft,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text
                  style={{
                    color:
                      action.tone === "destructive" ? "#E5485D" : theme.ink,
                    fontSize: 15 * s,
                    fontWeight: "600",
                  }}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}
