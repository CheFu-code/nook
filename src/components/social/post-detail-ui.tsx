import { useRouter } from "expo-router";
import {
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useRef, useState } from "react";
import { errorMessage } from "@/lib/social";
import { useCommentLikeMutation } from "@/hooks/use-social-mutations";
import { FeedIcon } from "../feed-icon";
import { Avatar } from "./media";
import { useAppTheme } from "@/lib/theme";
import {
  relativeTime,
  type NestedComment,
} from "./post-detail-logic";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNookLanguage } from "@/lib/language";

export function CommentSortMenu({
  order,
  scale: s,
  onSelect,
}: {
  order: "asc" | "desc";
  scale: number;
  onSelect: (order: "asc" | "desc") => void;
}) {
  const theme = useAppTheme();
  const { t } = useNookLanguage();
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ left: 0, top: 0 });
  const trigger = useRef<View>(null);
  const { width } = useWindowDimensions();
  const menuWidth = 166 * s;
  const options: { order: "desc" | "asc"; label: string }[] = [
    { order: "desc", label: t("Newest first") },
    { order: "asc", label: t("Oldest first") },
  ];
  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      return;
    }
    trigger.current?.measureInWindow((x, y, triggerWidth, triggerHeight) => {
      setMenuPosition({
        left: Math.max(12 * s, Math.min(x + triggerWidth - menuWidth, width - menuWidth - 12 * s)),
        top: y + triggerHeight + 8 * s,
      });
      setOpen(true);
    });
  };
  return (
    <View ref={trigger} collapsable={false} style={{ alignSelf: "flex-end" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t("Sort comments")}: ${t(order === "desc" ? "Newest" : "Oldest")}`}
        accessibilityState={{ expanded: open }}
        onPress={toggleMenu}
        hitSlop={10}
        style={{ flexDirection: "row", alignItems: "center", gap: 10 * s }}
      >
        <Text style={{ fontSize: 14 * s, color: theme.muted }}>
          {t(order === "desc" ? "Newest" : "Oldest")}
        </Text>
        <View style={{ transform: [{ rotate: "-90deg" }] }}>
          <FeedIcon name="back" size={12 * s} color={theme.muted} />
        </View>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1 }}>
          <Pressable
            accessibilityLabel={t("Close sort menu")}
            onPress={() => setOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: menuPosition.top,
              left: menuPosition.left,
              width: menuWidth,
              padding: 5 * s,
              borderRadius: 14 * s,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.isDark ? "#111827" : "#FFFFFF",
              shadowColor: "#000",
              shadowOpacity: 0.16,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 12,
              zIndex: 1,
            }}
          >
            {options.map((option) => {
              const selected = order === option.order;
              return (
                <Pressable
                  key={option.order}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setOpen(false);
                    onSelect(option.order);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 44 * s,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 11 * s,
                    borderRadius: 10 * s,
                    backgroundColor: pressed ? theme.subtle : "transparent",
                  })}
                >
                  <Text
                    style={{
                      color: theme.ink,
                      fontSize: 14 * s,
                      fontWeight: selected ? "700" : "500",
                    }}
                  >
                    {option.label}
                  </Text>
                  {selected && (
                    <FeedIcon name="check" size={16 * s} color={theme.blue} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export function CommentRow({
  item,
  postId,
  scale: s,
  now,
  onEdit,
  onDelete,
  onError,
  onReply,
}: {
  item: NestedComment;
  postId: string;
  scale: number;
  now: number;
  onEdit: () => void;
  onDelete: () => void;
  onError: (title: string, message: string) => void;
  onReply: () => void;
}) {
  const likeMutation = useCommentLikeMutation(postId);
  const liked = item.isLiked;
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useNookLanguage();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [optionsPosition, setOptionsPosition] = useState({ top: 0, left: 0 });
  const optionsTrigger = useRef<View>(null);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const optionsMenuWidth = 174 * s;
  const optionsMenuHeight = 102 * s;
  const toggleOptions = () => {
    if (optionsOpen) {
      setOptionsOpen(false);
      return;
    }
    optionsTrigger.current?.measureInWindow((x, y, width, height) => {
      const below = y + height + optionsMenuHeight + 4 * s;
      setOptionsPosition({
        left: Math.max(
          8 * s,
          Math.min(
            x + width - optionsMenuWidth,
            windowWidth - optionsMenuWidth - 8 * s,
          ),
        ),
        top:
          below <= windowHeight - insets.bottom
            ? y + height + 4 * s
            : Math.max(insets.top + 8 * s, y - optionsMenuHeight - 4 * s),
      });
      setOptionsOpen(true);
    });
  };
  const openProfile = () =>
    router.push({ pathname: "/member/[id]", params: { id: item.author._id } });
  return (
    <View
      style={{
        zIndex: optionsOpen ? 2 : 0,
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 17 * s,
        paddingHorizontal: 18 * s,
        marginLeft: item.depth ? Math.min(item.depth, 3) * 20 * s : 0,
        paddingLeft: item.depth ? 10 * s : 0,
        paddingBottom: 17 * s,
      }}
    >
      {item.depth > 0 && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 18 * s + 10 * s + 16 * s,
            top: 32 * s,
            bottom: 0,
            width: 1,
            backgroundColor: theme.border,
          }}
        />
      )}
      <Pressable
        accessibilityLabel={`View ${item.author.username}`}
        onPress={openProfile}
      >
        <Avatar
          profile={item.author}
          size={(item.depth ? 32 : 42) * s}
          showPresence
        />
      </Pressable>
      <View style={{ flex: 1, gap: 3 * s }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 9 * s,
            zIndex: 1,
          }}
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
            <View
              ref={optionsTrigger}
              collapsable={false}
              style={{ marginLeft: "auto" }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Comment options")}
                accessibilityHint={t("Edit or delete your comment")}
                accessibilityState={{ expanded: optionsOpen }}
                onPress={toggleOptions}
                hitSlop={8}
                style={{ paddingHorizontal: 4 * s }}
              >
                <View style={{ transform: [{ rotate: "90deg" }] }}>
                  <FeedIcon
                    name="more-vertical"
                    size={18 * s}
                    color={theme.muted}
                  />
                </View>
              </Pressable>
            </View>
          )}
        </View>
        <Modal
          visible={optionsOpen}
          transparent
          animationType="none"
          statusBarTranslucent
          onRequestClose={() => setOptionsOpen(false)}
        >
          <View
            style={{
              flex: 1,
            }}
          >
            <Pressable
              accessibilityLabel={t("Close comment options")}
              onPress={() => setOptionsOpen(false)}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            />
            <View
              style={{
                position: "absolute",
                top: optionsPosition.top,
                left: optionsPosition.left,
                width: optionsMenuWidth,
                padding: 5 * s,
                borderRadius: 14 * s,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.isDark ? "#111827" : "#FFFFFF",
                shadowColor: "#000",
                shadowOpacity: 0.16,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Edit comment")}
                onPress={() => {
                  setOptionsOpen(false);
                  onEdit();
                }}
                style={({ pressed }) => ({
                  minHeight: 44 * s,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 11 * s,
                  paddingHorizontal: 11 * s,
                  borderRadius: 10 * s,
                  backgroundColor: pressed ? theme.subtle : "transparent",
                })}
              >
                <FeedIcon name="compose" size={17 * s} color={theme.ink} />
                <Text
                  style={{
                    color: theme.ink,
                    fontSize: 14 * s,
                    fontWeight: "600",
                  }}
                >
                  Edit
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Delete comment")}
                onPress={() => {
                  setOptionsOpen(false);
                  onDelete();
                }}
                style={({ pressed }) => ({
                  minHeight: 44 * s,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 11 * s,
                  paddingHorizontal: 11 * s,
                  borderRadius: 10 * s,
                  backgroundColor: pressed
                    ? theme.isDark
                      ? "#3A2029"
                      : "#FFF0F1"
                    : "transparent",
                })}
              >
                <FeedIcon name="trash" size={17 * s} color="#E5485D" />
                <Text
                  style={{
                    color: "#E5485D",
                    fontSize: 14 * s,
                    fontWeight: "600",
                  }}
                >
                  Delete
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
        {!!item.parentUsername && item.depth > 0 && (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{
              alignSelf: "flex-start",
              color: theme.blue,
              fontSize: 12 * s,
              lineHeight: 16 * s,
              marginTop: 1 * s,
            }}
          >
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
            gap: 8 * s,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Reply to ${item.author.username}`}
            onPress={onReply}
            style={{
              minHeight: 28 * s,
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                color: theme.muted,
                fontSize: 13 * s,
                lineHeight: 18 * s,
              }}
            >
              Reply
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(liked ? "Unlike comment" : "Like comment")}
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
            hitSlop={8}
            style={{
              minWidth: 28 * s,
              minHeight: 28 * s,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FeedIcon
              name="heart"
              size={16 * s}
              color={liked ? "#FF244E" : theme.muted}
              filled={liked}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
