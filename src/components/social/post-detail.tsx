import { randomUUID } from "expo-crypto";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useProfile } from "@/context/social-context";
import { useAuth } from "@/lib/chefu-auth";
import {
  errorMessage,
  type Id,
  type Page,
  type SocialPost,
} from "@/lib/social";
import {
  useNookApi,
  useNookPaginatedQuery,
  useNookQuery,
} from "@/hooks/use-nook-api";
import { nookApiQueryKey } from "@/lib/query-client";
import { FeedIcon } from "../feed-icon";
import { Avatar } from "./media";
import { PostCard } from "./post-card";
import { CommentRow, CommentSortMenu } from "./post-detail-ui";
import {
  nestComments,
  type Comment,
  type NestedComment,
} from "./post-detail-logic";
import { Header, ConnectionStatus, LoadMore, ui } from "./ui";
import { useAppTheme } from "@/lib/theme";

export function PostDetail() {
  const theme = useAppTheme();
  const { id } = useLocalSearchParams<{ id: Id<"posts"> }>();
  const insets = useSafeAreaInsets();
  const me = useProfile();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const s = width / 390;
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const commentsPath = `/nook/posts/${encodeURIComponent(id)}/comments?order=${order}`;
  const postQuery = useNookQuery<SocialPost | null>(
    id ? `/nook/posts/${encodeURIComponent(id)}` : null,
  );
  const post = postQuery.data;
  const comments = useNookPaginatedQuery<Comment>(
    commentsPath,
  );
  const commentsQueryKey = nookApiQueryKey(userId, commentsPath);
  const requestApi = useNookApi();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [replying, setReplying] = useState<{ id: string; username: string } | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [now, setNow] = useState(Date.now());
  const request = useRef({ id: randomUUID(), text: "", parentId: undefined as string | undefined });
  const input = useRef<TextInput>(null);
  const list = useRef<FlatList<NestedComment>>(null);
  const commentsTop = useRef(0);
  const scrollOffset = useRef(0);
  const restoreOffset = useRef<number | null>(null);
  const [postVisible, setPostVisible] = useState(true);
  const visibleComments = nestComments(comments.results, order);
  function sortComments(next: "asc" | "desc") {
    if (next === order) return;
    restoreOffset.current = scrollOffset.current;
    setOrder(next);
  }
  useEffect(() => {
    if (
      comments.status === "LoadingFirstPage" ||
      restoreOffset.current === null
    )
      return;
    const offset = restoreOffset.current;
    const frame = requestAnimationFrame(() => {
      list.current?.scrollToOffset({ offset, animated: false });
      restoreOffset.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [comments.status, order]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardVisible(false),
    );
    return () => {
      clearInterval(timer);
      show.remove();
      hide.remove();
    };
  }, []);
  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    setError("");
    const commentText = editingCommentId
      ? text.trim()
      : `${replying ? `@${replying.username} ` : ""}${text.trim()}`;
    if (editingCommentId) {
      let previous: InfiniteData<Page<Comment>> | undefined;
      try {
        await queryClient.cancelQueries({ queryKey: commentsQueryKey });
        previous = queryClient.getQueryData<InfiniteData<Page<Comment>>>(
          commentsQueryKey,
        );
        queryClient.setQueryData<InfiniteData<Page<Comment>>>(
          commentsQueryKey,
          (current) =>
            current
              ? {
                  ...current,
                  pages: current.pages.map((page) => ({
                    ...page,
                    items: page.items.map((item) =>
                      item._id === editingCommentId
                        ? { ...item, text: commentText }
                        : item,
                    ),
                  })),
                }
              : current,
        );
        await requestApi(
          `/nook/posts/${encodeURIComponent(id)}/comments/${encodeURIComponent(editingCommentId)}`,
          { method: "PATCH", body: { text: commentText } },
        );
        setText("");
        setEditingCommentId(null);
        Keyboard.dismiss();
      } catch (e) {
        if (previous) {
          queryClient.setQueryData(commentsQueryKey, previous);
        }
        setError(errorMessage(e));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (
      request.current.text !== commentText ||
      request.current.parentId !== replying?.id
    )
      request.current = { id: randomUUID(), text: commentText, parentId: replying?.id };
    const optimisticId = `optimistic-${request.current.id}`;
    const optimisticComment: Comment = {
      _id: optimisticId,
      _creationTime: Date.now(),
      text: commentText,
      ...(replying ? { parentId: replying.id } : {}),
      author: me,
      isOwn: true,
      isLiked: false,
    };
    let previous: InfiniteData<Page<Comment>> | undefined;
    try {
      await queryClient.cancelQueries({ queryKey: commentsQueryKey });
      previous = queryClient.getQueryData<InfiniteData<Page<Comment>>>(
        commentsQueryKey,
      );
      queryClient.setQueryData<InfiniteData<Page<Comment>>>(
        commentsQueryKey,
        (current) => {
          const pages = current?.pages ?? [{ items: [], hasMore: false }];
          const targetPage = order === "desc" ? 0 : pages.length - 1;
          return {
            pages: pages.map((page, index) =>
              index === targetPage
                ? {
                    ...page,
                    items:
                      order === "desc"
                        ? [optimisticComment, ...page.items]
                        : [...page.items, optimisticComment],
                  }
                : page,
            ),
            pageParams: current?.pageParams ?? [0],
          };
        },
      );
      await requestApi(`/nook/posts/${encodeURIComponent(id)}/comments`, {
        method: "POST",
        body: {
          text: request.current.text,
          requestId: request.current.id,
          parentId: request.current.parentId,
        },
      });
      setText("");
      setReplying(null);
      setEditingCommentId(null);
      setNow(Date.now());
      request.current = { id: randomUUID(), text: "", parentId: undefined };
      Keyboard.dismiss();
    } catch (e) {
      if (previous) {
        queryClient.setQueryData(commentsQueryKey, previous);
      } else {
        queryClient.setQueryData<InfiniteData<Page<Comment>>>(
          commentsQueryKey,
          (current) =>
            current
              ? {
                  ...current,
                  pages: current.pages.map((page) => ({
                    ...page,
                    items: page.items.filter(
                      (comment) => comment._id !== optimisticId,
                    ),
                  })),
                }
              : current,
        );
      }
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  function deleteComment(item: Comment) {
    if (!item.isOwn) return;
    Alert.alert(
      "Delete comment?",
      "This comment and its replies will no longer be visible.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            let previous: InfiniteData<Page<Comment>> | undefined;
            try {
              await queryClient.cancelQueries({ queryKey: commentsQueryKey });
              previous = queryClient.getQueryData<InfiniteData<Page<Comment>>>(
                commentsQueryKey,
              );
              const removedIds = new Set([item._id]);
              let addedDescendant = true;
              while (addedDescendant) {
                addedDescendant = false;
                for (const comment of previous?.pages.flatMap((page) => page.items) ?? []) {
                  if (
                    comment.parentId &&
                    removedIds.has(comment.parentId) &&
                    !removedIds.has(comment._id)
                  ) {
                    removedIds.add(comment._id);
                    addedDescendant = true;
                  }
                }
              }
              queryClient.setQueryData<InfiniteData<Page<Comment>>>(
                commentsQueryKey,
                (current) =>
                  current
                    ? {
                        ...current,
                        pages: current.pages.map((page) => ({
                          ...page,
                          items: page.items.filter(
                            (comment) => !removedIds.has(comment._id),
                          ),
                        })),
                      }
                    : current,
              );
              await requestApi(
                `/nook/posts/${encodeURIComponent(id)}/comments/${encodeURIComponent(item._id)}`,
                { method: "DELETE" },
              );
            } catch (e) {
              if (previous) {
                queryClient.setQueryData(commentsQueryKey, previous);
              }
              Alert.alert("Could not delete comment", errorMessage(e));
            }
          },
        },
      ],
      { cancelable: true },
    );
  }
  function editComment(item: Comment) {
    setReplying(null);
    setEditingCommentId(item._id);
    setText(item.text);
    input.current?.focus();
  }
  function showError(title: string, message: string) {
    Alert.alert(title, message);
  }
  return (
    <KeyboardAvoidingView
      style={[
        ui.screen,
        { backgroundColor: theme.background, paddingTop: insets.top },
      ]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Header title="Post" back compose={false} />
      <ConnectionStatus />
      {post === undefined ? (
        <ActivityIndicator color={theme.blue} />
      ) : post === null ? (
        <View style={[ui.center, { backgroundColor: theme.background }]}>
          <Text style={[ui.title, { color: theme.ink }]}>Post unavailable</Text>
          <Text style={[ui.muted, { color: theme.muted }]}>
            This post may have been deleted.
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={list}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            showsVerticalScrollIndicator={false}
            data={visibleComments}
            keyExtractor={(item) => item._id}
            onScroll={(e) => {
              scrollOffset.current = e.nativeEvent.contentOffset.y;
              setPostVisible(e.nativeEvent.contentOffset.y < 250);
            }}
            scrollEventThrottle={100}
            contentContainerStyle={{ paddingBottom: 12 * s }}
            ListHeaderComponent={
              <>
                <PostCard
                  detail
                  post={post}
                  visible={postVisible}
                  onComments={() =>
                    list.current?.scrollToOffset({
                      offset: Math.max(0, commentsTop.current - 100 * s),
                      animated: true,
                    })
                  }
                />
                <View
                  onLayout={(event) => {
                    commentsTop.current = event.nativeEvent.layout.y;
                  }}
                  style={{
                    marginHorizontal: 19 * s,
                    borderTopWidth: 1,
                    borderColor: theme.border,
                    paddingTop: 14 * s,
                    paddingBottom: 16 * s,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text
                    style={{
                      color: theme.ink,
                      fontSize: 16 * s,
                      fontWeight: "700",
                      letterSpacing: -0.4,
                    }}
                  >
                    Comments
                  </Text>
                  <CommentSortMenu
                    order={order}
                    scale={s}
                    onSelect={sortComments}
                  />
                </View>
              </>
            }
            renderItem={({ item }) => (
              <CommentRow
                item={item}
                postId={id}
                scale={s}
                now={now}
                onEdit={() => editComment(item)}
                onDelete={() => deleteComment(item)}
                onError={showError}
                onReply={() => {
                  setEditingCommentId(null);
                  setReplying({ id: item._id, username: item.author.username });
                  setText("");
                  request.current = { id: randomUUID(), text: "", parentId: item._id };
                  input.current?.focus();
                }}
              />
            )}
            ListEmptyComponent={
              comments.status !== "LoadingFirstPage" ? (
                <Text style={[ui.muted, { padding: 20, color: theme.muted }]}>
                  Start the conversation.
                </Text>
              ) : null
            }
            ListFooterComponent={
              <LoadMore status={comments.status} loadMore={comments.loadMore} />
            }
          />
          {!!error && (
            <Text
              accessibilityRole="alert"
              style={[ui.error, { paddingHorizontal: 16 }]}
            >
              {error}
            </Text>
          )}
          {(replying || editingCommentId) && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 20,
                paddingVertical: 8,
              }}
            >
              <Text style={[ui.muted, { flex: 1, color: theme.muted }]}>
                {editingCommentId
                  ? "Editing your comment"
                  : `Replying to @${replying?.username}`}
              </Text>
              <Pressable
                accessibilityLabel={editingCommentId ? "Cancel editing comment" : "Cancel reply"}
                onPress={() => {
                  setReplying(null);
                  setEditingCommentId(null);
                  setText("");
                  request.current = { id: randomUUID(), text: "", parentId: undefined };
                }}
                hitSlop={10}
              >
                <FeedIcon name="close" size={16} color={theme.ink} />
              </Pressable>
            </View>
          )}
          <View
            style={{
              backgroundColor: theme.background,
              borderTopWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16 * s,
              paddingTop: 11 * s,
              paddingBottom: keyboardVisible
                ? 8
                : Math.max(insets.bottom, 16) + 8,
              gap: 10 * s,
            }}
          >
            <Avatar profile={me} size={39 * s} />
            <View
              style={{
                flex: 1,
                minHeight: 40 * s,
                maxHeight: 120,
                borderRadius: 24 * s,
                backgroundColor: theme.input,
                borderWidth: 1,
                borderColor: theme.border,
                paddingHorizontal: 15 * s,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              {replying && (
                <Text
                  accessibilityLabel={`Fixed mention: @${replying.username}`}
                  style={{
                    color: theme.blue,
                    fontSize: 15 * s,
                    fontWeight: "600",
                  }}
                >
                  @{replying.username}{" "}
                </Text>
              )}
              <TextInput
                ref={input}
                accessibilityLabel={replying ? `Reply to ${replying.username}` : "Add a comment"}
                editable={!busy}
                value={text}
                onChangeText={setText}
                maxLength={Math.max(1, 2000 - (replying ? replying.username.length + 2 : 0))}
                multiline
                placeholder={
                  editingCommentId
                    ? "Edit your comment..."
                    : replying
                      ? "Write a reply..."
                      : "Add a comment..."
                }
                placeholderTextColor={theme.muted}
                style={{
                  flex: 1,
                  maxHeight: 118,
                  minHeight: 38 * s,
                  paddingVertical: 9 * s,
                  fontSize: 15 * s,
                  color: theme.ink,
                  textAlignVertical: "center",
                }}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                editingCommentId ? "Save comment" : replying ? "Send reply" : "Post comment"
              }
              accessibilityState={{ disabled: busy || !text.trim() }}
              disabled={busy || !text.trim()}
              onPress={() => void submit()}
              style={{
                backgroundColor: "#087EFF",
                borderRadius: 14 * s,
                width: 42 * s,
                height: 42 * s,
                alignItems: "center",
                justifyContent: "center",
                opacity: busy || !text.trim() ? 0.55 : 1,
              }}
            >
              {busy ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <FeedIcon name="chat-send" size={18 * s} color="white" />
              )}
            </Pressable>
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
