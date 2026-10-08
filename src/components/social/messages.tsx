import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  errorMessage,
  type Id,
  type Conversation,
  type Message,
  type SocialProfile,
} from "@/lib/social";
import {
  useNookApi,
  useNookCursorPaginatedQuery,
  useNookPaginatedQuery,
  useNookQuery,
} from "@/hooks/use-nook-api";
import { useMessages } from "@/context/messages-context";
import { useAuth } from "@/lib/chefu-auth";
import { cacheNookConversationPreview } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";
import { ChatScreen, type ChatMessage } from "../chat-screen";
import type { MessageReactor } from "../chat-screen-ui";
import { Avatar } from "./media";
import { ConnectionStatus, LoadMore, ui } from "./ui";
import { useAppTheme } from "@/lib/theme";

export const messageTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
export function inboxTime(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString())
    return messageTime(timestamp);
  today.setDate(today.getDate() - 1);
  return date.toDateString() === today.toDateString()
    ? "Yesterday"
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
export function LiveChat() {
  const { id } = useLocalSearchParams<{ id: Id<"conversations"> }>();
  const router = useRouter();
  const theme = useAppTheme();
  const conversationQuery = useNookQuery<Pick<Conversation, "_id" | "other">>(
    id ? `/nook/conversations/${encodeURIComponent(id)}` : null,
  );
  const conversation = conversationQuery.data;
  const history = useNookPaginatedQuery<Message>(
    `/nook/conversations/${encodeURIComponent(id)}/messages`,
  );
  const messageResults = history.results;
  const messageStatus = history.status;
  const loadMoreMessages = history.loadMore;
  const request = useNookApi();
  const outbox = useMessages();
  const { confirmDelivered } = outbox;
  const [atBottom, setAtBottom] = useState(true);
  const [focused, setFocused] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [reactionOverrides, setReactionOverrides] = useState<
    Record<string, Message["reactions"]>
  >({});
  const [reactionDetails, setReactionDetails] = useState<{
    message: ChatMessage;
    emoji: string;
    loading: boolean;
    reactors: MessageReactor[];
  } | null>(null);
  const reactionDetailsRequestId = useRef(0);
  const onReactionPress = async (message: ChatMessage, emoji: string) => {
    if (!message.backendId) return;
    const requestId = ++reactionDetailsRequestId.current;
    setReactionDetails({ message, emoji, loading: true, reactors: [] });
    try {
      const reactors = await request<MessageReactor[]>(
        `/nook/messages/${encodeURIComponent(id)}/messages/${encodeURIComponent(message.backendId)}/reactions`,
      );
      if (reactionDetailsRequestId.current === requestId) {
        setReactionDetails({ message, emoji, loading: false, reactors });
      }
    } catch (error) {
      if (reactionDetailsRequestId.current === requestId) {
        setReactionDetails(null);
        Alert.alert("Could not load reactions", errorMessage(error));
      }
    }
  };
  const dismissReactionDetails = () => {
    reactionDetailsRequestId.current += 1;
    setReactionDetails(null);
  };
  const [jumpTargetId, setJumpTargetId] = useState<string | null>(null);
  const [readyJumpId, setReadyJumpId] = useState<string | null>(null);
  const onJumpToMessage = useCallback((messageId: string) => {
    setReadyJumpId(null);
    setJumpTargetId(messageId);
  }, []);
  const onJumpToMessageComplete = useCallback(() => {
    setReadyJumpId(null);
    setJumpTargetId(null);
  }, []);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (!focused || !active) return;
    const timer = setInterval(history.refresh, 5000);
    return () => clearInterval(timer);
  }, [focused, active, history.refresh]);
  const latest = history.results.reduce(
    (max, item) => Math.max(max, item.sequence),
    0,
  );
  const deliveredRequestIds = history.results
    .map((item) => item.requestId)
    .filter((requestId): requestId is string => Boolean(requestId))
    .join("|");
  useEffect(() => {
    confirmDelivered(
      id,
      deliveredRequestIds ? deliveredRequestIds.split("|") : [],
    );
  }, [id, deliveredRequestIds, confirmDelivered]);
  useEffect(() => {
    if (focused && active && atBottom && latest)
      void request(`/nook/conversations/${encodeURIComponent(id)}/read`, {
        method: "POST",
        body: { throughSequence: latest },
      }).catch(() => {});
  }, [id, latest, request, focused, active, atBottom]);
  useEffect(() => {
    if (!jumpTargetId || readyJumpId) return;
    const target = messageResults.find(
      (item) => item._id === jumpTargetId || item.requestId === jumpTargetId,
    );
    if (target) {
      const timer = setTimeout(() => setReadyJumpId(target._id), 0);
      return () => clearTimeout(timer);
    } else if (messageStatus === "CanLoadMore") {
      loadMoreMessages(30);
    } else if (messageStatus === "Exhausted" || messageStatus === "Error") {
      const timer = setTimeout(() => {
        setJumpTargetId(null);
        Alert.alert(
          "Message unavailable",
          "The original message could not be found in this conversation.",
        );
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [
    loadMoreMessages,
    messageResults,
    messageStatus,
    jumpTargetId,
    readyJumpId,
  ]);
  const messages: ChatMessage[] = history.results
    .slice()
    .reverse()
    .map((item) => ({
      id: item.requestId ?? item._id,
      backendId: item._id,
      text: item.text,
      time: `${new Date(item._creationTime).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${messageTime(item._creationTime)}`,
      outgoing: item.outgoing,
      replyTo: item.replyTo,
      reactions: reactionOverrides[item._id] ?? item.reactions,
    }));
  for (const item of outbox.pending.filter(
    (item) =>
      item.conversationId === id &&
      !history.results.some(
        (saved) => saved.outgoing && saved.requestId === item.id,
      ),
  ))
    messages.push({
      id: item.id,
      text: item.text,
      time: messageTime(item.createdAt),
      outgoing: true,
      status: item.status,
      retry: () => outbox.retry(item),
      replyTo: item.replyTo,
    });
  if (!conversation && !conversationQuery.error)
    return (
      <View style={[ui.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.blue} />
        <Text style={[ui.muted, { color: theme.muted }]}>
          Opening conversation…
        </Text>
      </View>
    );
  if (!conversation)
    return (
      <View style={[ui.center, { backgroundColor: theme.background }]}>
        <Text style={[ui.title, { color: theme.ink }]}>
          Couldn’t open conversation
        </Text>
        <Text style={[ui.muted, { color: theme.muted, textAlign: "center" }]}>
          Check your connection and try again.
        </Text>
        <Pressable onPress={conversationQuery.refresh} style={ui.button}>
          <Text style={ui.buttonText}>Try again</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} style={{ padding: 12 }}>
          <Text style={[ui.link, { color: theme.blue }]}>Back to messages</Text>
        </Pressable>
      </View>
    );
  return (
    <ChatScreen
      onAtBottom={setAtBottom}
      onJumpToMessage={onJumpToMessage}
      jumpToMessageId={readyJumpId}
      onJumpToMessageComplete={onJumpToMessageComplete}
      reactionDetails={reactionDetails}
      onReactionPress={onReactionPress}
      onDismissReactionDetails={dismissReactionDetails}
      onBack={() => router.back()}
      messages={messages}
      onSend={(text, replyTo) => outbox.send(id, text, replyTo)}
      onReact={async (message, emoji) => {
        if (!message.backendId) return;
        const previous = message.reactions ?? [];
        const next = previous
          .map((reaction) => ({
            ...reaction,
            count: reaction.count - (reaction.reacted ? 1 : 0),
            reacted: false,
          }))
          .filter((reaction) => reaction.count > 0);
        if (emoji) {
          const existing = next.find((reaction) => reaction.emoji === emoji);
          if (existing) {
            existing.count += 1;
            existing.reacted = true;
          } else {
            next.push({ emoji, count: 1, reacted: true });
          }
        }
        setReactionOverrides((current) => ({
          ...current,
          [message.backendId!]: next,
        }));
        try {
          const reactions = await request<
            { emoji: string; count: number; reacted: boolean }[]
          >(
            `/nook/messages/${encodeURIComponent(id)}/messages/${encodeURIComponent(message.backendId)}/reaction`,
            { method: "POST", body: { emoji } },
          );
          setReactionOverrides((current) => ({
            ...current,
            [message.backendId!]: reactions,
          }));
          await history.refresh();
          setReactionOverrides((current) => {
            const updated = { ...current };
            delete updated[message.backendId!];
            return updated;
          });
        } catch (error) {
          setReactionOverrides((current) => ({
            ...current,
            [message.backendId!]: previous,
          }));
          Alert.alert("Could not react to message", errorMessage(error));
        }
      }}
      peer={{
        name: conversation.other.username,
        avatar: (size) => <Avatar profile={conversation.other} size={size} />,
        onPress: () =>
          router.push({
            pathname: "/member/[id]",
            params: { id: conversation.other._id },
          }),
      }}
      beforeMessages={
        <>
          <ConnectionStatus />
          {history.status === "CanLoadMore" ? (
            <Pressable
              onPress={() => history.loadMore(30)}
              style={{ padding: 12, alignSelf: "center" }}
            >
              <Text style={ui.link}>Load earlier messages</Text>
            </Pressable>
          ) : history.status.startsWith("Loading") ? (
            <ActivityIndicator color="#087EFF" />
          ) : !messages.length ? (
            <Text style={[ui.muted, { textAlign: "center", padding: 24 }]}>
              Say hello to {conversation.other.username}.
            </Text>
          ) : null}
        </>
      }
    />
  );
}
export function NewConversation({ close }: { close: () => void }) {
  const [text, setText] = useState("");
  const [opening, setOpening] = useState(false);
  const router = useRouter();
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const result = useNookCursorPaginatedQuery<SocialProfile>(
    `/nook/profiles?cursorMode=true&q=${encodeURIComponent(text)}`,
  );
  const request = useNookApi();
  const members = result.results.filter((item) => !item.isOwn);
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View
        style={[
          ui.screen,
          { paddingTop: insets.top, backgroundColor: theme.background },
        ]}
      >
        <View style={ui.header}>
          <Text style={[ui.title, { flex: 1, color: theme.ink }]}>
            New message
          </Text>
          <Pressable onPress={close} style={{ padding: 10 }}>
            <Text style={[ui.link, { color: theme.blue }]}>Cancel</Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel="Search members to message"
          value={text}
          onChangeText={setText}
          placeholder="Search name or username"
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          style={{
            backgroundColor: theme.input,
            borderColor: theme.border,
            borderWidth: 1,
            color: theme.ink,
            borderRadius: 16,
            padding: 16,
            margin: 18,
            fontSize: 16,
          }}
        />
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={members}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const openConversation = async () => {
              if (opening) return;
              setOpening(true);
              try {
                const conversation = await request<{ id: string }>(
                  "/nook/conversations",
                  { method: "POST", body: { profileId: item._id } },
                );
                cacheNookConversationPreview(
                  queryClient,
                  userId,
                  conversation.id,
                  item,
                );
                close();
                router.push({
                  pathname: "/chat/[id]",
                  params: { id: conversation.id },
                });
              } catch (e) {
                Alert.alert("Could not open chat", errorMessage(e));
              } finally {
                setOpening(false);
              }
            };
            const openProfile = () => {
              close();
              router.push({ pathname: "/member/[id]", params: { id: item._id } });
            };
            return (
              <View
                style={{
                  padding: 18,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${item.username}`}
                  disabled={opening}
                  onPress={() => void openConversation()}
                  style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.username}'s profile`}
                  onPress={openProfile}
                >
                  <Avatar profile={item} size={50} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`View ${item.username}'s profile`}
                  onPress={openProfile}
                  style={{ flex: 1 }}
                >
                  <Text style={[ui.text, { color: theme.ink }]}>
                    {item.username}
                  </Text>
                  <Text style={[ui.muted, { color: theme.muted }]}>
                    {item.name}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${item.username}`}
                  disabled={opening}
                  onPress={() => void openConversation()}
                  style={{ padding: 10 }}
                >
                  <Text style={[ui.link, { color: theme.blue }]}>Message</Text>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={
            result.status !== "LoadingFirstPage" ? (
              <Text
                style={[
                  ui.muted,
                  { padding: 24, textAlign: "center", color: theme.muted },
                ]}
              >
                No members found. Search for an existing Nook profile to start a
                private conversation.
              </Text>
            ) : null
          }
          ListFooterComponent={
            <LoadMore status={result.status} loadMore={result.loadMore} />
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}
