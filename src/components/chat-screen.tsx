import { StatusBar } from "expo-status-bar";
import EmojiPicker from "rn-emoji-keyboard";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { BlurTargetView } from "expo-blur";
import {
    Animated,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedIcon } from "./feed-icon";
import {
    MessageRow,
    ReactionDetailsSheet,
    ReactionSpotlight,
    type MessageReactor,
} from "./chat-screen-ui";
import { useAppTheme } from "@/lib/theme";
import { useUserPresenceStatus } from "@/hooks/use-user-presence";
import { useChatScreenLogic, type ChatMessage } from "@/hooks/use-chat-screen";

export type { ChatMessage } from "@/hooks/use-chat-screen";

function messageDateKey(timestamp: number) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function messageDateLabel(timestamp: number, now = new Date()) {
    const date = new Date(timestamp);
    const dateDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const daysAgo = Math.round((todayDay - dateDay) / 86_400_000);
    if (daysAgo === 0) return "Today";
    if (daysAgo === 1) return "Yesterday";
    if (daysAgo >= 2 && daysAgo < 7) {
        return date.toLocaleDateString("en-GB", { weekday: "long" });
    }
    return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function lastSeenLabel(timestamp: number, now = new Date()) {
    const date = new Date(timestamp);
    const elapsed = Math.max(0, now.getTime() - date.getTime());
    if (elapsed < 60_000) return "Last seen just now";
    if (elapsed < 3_600_000) {
        const minutes = Math.floor(elapsed / 60_000);
        return `Last seen ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }
    const time = date.toLocaleTimeString("en-GB", {
        hour: "numeric",
        minute: "2-digit",
    });
    const dateDay = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const daysAgo = Math.round((todayDay - dateDay) / 86_400_000);
    if (daysAgo === 0) return `Last seen today at ${time}`;
    if (daysAgo === 1) return `Last seen yesterday at ${time}`;
    return `Last seen ${date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
    })} at ${time}`;
}

export function ChatScreen({
    onBack,
    messages,
    peer,
    onSend,
    onReact,
    beforeMessages,
    onAtBottom,
    onJumpToMessage,
    jumpToMessageId,
    onJumpToMessageComplete,
    reactionDetails,
    onReactionPress,
    onDismissReactionDetails,
    messageRequest,
    requestDecisionLoading,
    onRespondToRequest,
    onEditMessage,
    onDeleteMessage,
}: {
    onBack: () => void;
    messages: ChatMessage[];
    peer: {
        uid: string;
        name: string;
        avatar: (size: number) => ReactNode;
        onPress: () => void;
    };
    onSend: (text: string, replyTo?: ChatMessage["replyTo"]) => void;
    onReact: (
        message: ChatMessage,
        emoji: string | null,
    ) => void;
    beforeMessages?: ReactNode;
    onAtBottom?: (atBottom: boolean) => void;
    onJumpToMessage: (messageId: string) => void;
    jumpToMessageId: string | null;
    onJumpToMessageComplete: () => void;
    reactionDetails: {
        message: ChatMessage;
        emoji: string;
        loading: boolean;
        reactors: MessageReactor[];
    } | null;
    onReactionPress: (message: ChatMessage, emoji: string) => void;
    onDismissReactionDetails: () => void;
    messageRequest: {
        status: "pending" | "accepted" | "declined";
        isRequester: boolean;
        sentCount: number;
    } | null;
    requestDecisionLoading: boolean;
    onRespondToRequest: (decision: "accepted" | "declined") => void;
    onEditMessage: (message: ChatMessage, text: string) => Promise<boolean>;
    onDeleteMessage: (
        message: ChatMessage,
        scope: "me" | "everyone",
    ) => Promise<void>;
}) {
    const {
        draft,
        setDraft,
        replyTo,
        setReplyTo,
        keyboardVisible,
        scrollRef,
        canSend,
        send,
        handleScroll,
        handleContentSizeChange,
        scrollToEnd,
    } = useChatScreenLogic({ messages, onSend, onAtBottom });
    const presence = useUserPresenceStatus(peer.uid);
    const [presenceClock, setPresenceClock] = useState(() => Date.now());
    const inputRef = useRef<TextInput>(null);
    const [emojiPickerVisible, setEmojiPickerVisible] = useState(false);
    useEffect(() => {
        if (presence?.online || !presence?.lastSeen) return;
        const interval = setInterval(() => setPresenceClock(Date.now()), 60_000);
        return () => clearInterval(interval);
    }, [presence?.lastSeen, presence?.online]);
    const [draftSelection, setDraftSelection] = useState({ start: 0, end: 0 });
    const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
    const blurTargetRef = useRef<View>(null);
    const messageOffsets = useRef(new Map<string, number>());
    const highlightPulse = useRef(0);
    const [highlightTarget, setHighlightTarget] = useState<{
        id: string;
        pulse: number;
    } | null>(null);
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const requestPending = messageRequest?.status === "pending";
    const requestDeclined = messageRequest?.status === "declined";
    const canSendRequestMessage =
        !requestDeclined &&
        (!requestPending ||
            (messageRequest.isRequester && messageRequest.sentCount < 3));
    const showRequestActions = requestPending && !messageRequest.isRequester;
    const requestLimitReached =
        requestPending &&
        messageRequest.isRequester &&
        messageRequest.sentCount >= 3;
    const s = width / 390;
    const v = (height - insets.top - Math.min(insets.bottom, 34)) / 784;
    const fs = (value: number) => value * s;
    const [reactionTarget, setReactionTarget] = useState<{
        message: ChatMessage;
        frame: { x: number; y: number; width: number; height: number };
    } | null>(null);
    const [reactionAnimation] = useState(() => new Animated.Value(0));
    const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const replyToMessage = (message: ChatMessage) => {
        setReplyTo({ ...message, id: message.backendId ?? message.id });
        if (focusTimer.current) clearTimeout(focusTimer.current);
        if (!keyboardVisible) inputRef.current?.blur();
        focusTimer.current = setTimeout(() => {
            inputRef.current?.focus();
            focusTimer.current = null;
        }, keyboardVisible ? 0 : 80);
    };
    const openReactionPicker = (
        message: ChatMessage,
        frame: { x: number; y: number; width: number; height: number },
    ) => {
        setReactionTarget({
            message,
            frame: { ...frame, y: frame.y - insets.top },
        });
        reactionAnimation.setValue(0);
        Animated.spring(reactionAnimation, {
            toValue: 1,
            useNativeDriver: true,
            damping: 18,
            stiffness: 220,
        }).start();
    };
    const closeReactionPicker = () => {
        Animated.timing(reactionAnimation, {
            toValue: 0,
            duration: 130,
            useNativeDriver: true,
        }).start(({ finished }) => {
            if (finished) setReactionTarget(null);
        });
    };
    const startEditingMessage = (message: ChatMessage) => {
        setEditingMessage(message);
        setDraft(message.text);
        setDraftSelection({
            start: message.text.length,
            end: message.text.length,
        });
        setReplyTo(null);
        closeReactionPicker();
        requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.setNativeProps({
                selection: { start: message.text.length, end: message.text.length },
            });
        });
    };
    const submitComposer = async () => {
        if (!editingMessage) {
            send();
            return;
        }
        const text = draft.trim();
        if (!text) return;
        if (await onEditMessage(editingMessage, text)) {
            setDraft("");
            setEditingMessage(null);
        }
    };
    useEffect(
        () => () => {
            if (focusTimer.current) clearTimeout(focusTimer.current);
        },
        [],
    );
    useEffect(() => {
        if (!jumpToMessageId) return;
        const target = messages.find(
            (message) =>
                message.backendId === jumpToMessageId ||
                message.id === jumpToMessageId,
        );
        if (!target) return;
        let attempts = 0;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const jump = () => {
            const offset =
                messageOffsets.current.get(target.backendId ?? "") ??
                messageOffsets.current.get(target.id);
            if (offset === undefined && attempts < 8) {
                attempts += 1;
                timer = setTimeout(jump, 50);
                return;
            }
            if (offset !== undefined) {
                scrollRef.current?.scrollTo({
                    y: Math.max(0, offset - 24 * s),
                    animated: true,
                });
                highlightPulse.current += 1;
                setHighlightTarget({
                    id: target.backendId ?? target.id,
                    pulse: highlightPulse.current,
                });
            }
            onJumpToMessageComplete();
        };
        requestAnimationFrame(jump);
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [jumpToMessageId, messages, onJumpToMessageComplete, s, scrollRef]);
    const onQuotePress = (messageId: string) => {
        if (reactionTarget) closeReactionPicker();
        onJumpToMessage(messageId);
    };
    return (
        <KeyboardAvoidingView
            style={[
                styles.screen,
                { paddingTop: insets.top, backgroundColor: theme.background },
            ]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <StatusBar style={theme.isDark ? "light" : "dark"} />
            <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
            <View
                style={[
                    styles.header,
                    {
                        height: 62 * v,
                        paddingBottom: 8 * v,
                        paddingHorizontal: fs(12),
                        gap: fs(12),
                    },
                ]}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back to messages"
                    onPress={onBack}
                    hitSlop={10}
                >
                    <FeedIcon name="back" size={fs(20)} color={theme.ink} />
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${peer.name}'s profile`}
                    onPress={peer.onPress}
                    style={{ marginLeft: fs(14) }}
                >
                    {peer.avatar(fs(49))}
                </Pressable>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`View ${peer.name}'s profile`}
                    onPress={peer.onPress}
                    style={{ flex: 1, gap: 4 * v }}
                >
                    <Text
                        style={{
                            color: theme.ink,
                            fontSize: fs(17),
                            fontWeight: "700",
                            letterSpacing: -0.5,
                        }}
                        numberOfLines={1}
                    >
                        {peer.name}
                    </Text>
                    <Text
                        style={{
                            color: presence?.online ? "#22C55E" : theme.muted,
                            fontSize: fs(12),
                        }}
                    >
                        {presence?.online
                            ? "Online"
                            : presence?.lastSeen
                              ? lastSeenLabel(presence.lastSeen, new Date(presenceClock))
                              : "Last seen unavailable"}
                    </Text>
                </Pressable>
            </View>
            <ScrollView
                ref={scrollRef}
                automaticallyAdjustKeyboardInsets
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={100}
                onScroll={handleScroll}
                onContentSizeChange={handleContentSizeChange}
                maintainVisibleContentPosition={{ minIndexForVisible: 1 }}
                contentContainerStyle={{
                    paddingHorizontal: fs(11),
                    paddingBottom: 10 * v,
                }}
            >
                {beforeMessages}
                {messages.flatMap((message, index) => {
                    const key = message.createdAt === undefined
                        ? null
                        : messageDateKey(message.createdAt);
                    const previousKey = index === 0 || messages[index - 1].createdAt === undefined
                        ? null
                        : messageDateKey(messages[index - 1].createdAt!);
                    const showDate = key !== null && key !== previousKey;
                    return [
                        ...(showDate
                            ? [
                                <View
                                    key={`date-${key}`}
                                    style={{
                                        alignSelf: "center",
                                        marginTop: 12 * v,
                                        marginBottom: 10 * v,
                                        paddingHorizontal: 12 * s,
                                        paddingVertical: 5 * v,
                                        borderRadius: 14 * s,
                                        backgroundColor: theme.subtle,
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: theme.secondary,
                                            fontSize: fs(11),
                                            fontWeight: "600",
                                        }}
                                    >
                                        {messageDateLabel(message.createdAt!)}
                                    </Text>
                                </View>,
                            ]
                            : []),
                        <MessageRow
                            key={message.id}
                            message={message}
                            highlightPulse={
                                highlightTarget?.id === (message.backendId ?? message.id)
                                    ? highlightTarget.pulse
                                    : 0
                            }
                            peer={peer}
                            scale={s}
                            vertical={v}
                            onReply={replyToMessage}
                            onLongPress={openReactionPicker}
                            onMessageLayout={(messageId, y) => {
                                messageOffsets.current.set(messageId, y);
                            }}
                            onPressReply={onQuotePress}
                            onReactionPress={onReactionPress}
                        />,
                    ];
                })}
            </ScrollView>
            <View
                style={{
                    flexDirection: "column",
                    paddingHorizontal: fs(11),
                    paddingTop: 7 * v,
                    paddingBottom: keyboardVisible
                        ? 8
                        : Math.max(Math.min(insets.bottom, 34), 12),
                }}
            >
                {editingMessage ? (
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: theme.subtle,
                            borderLeftWidth: 3,
                            borderLeftColor: theme.blue,
                            borderTopLeftRadius: fs(10),
                            borderTopRightRadius: fs(10),
                            padding: fs(9),
                            marginBottom: 6 * v,
                        }}
                    >
                        <Text style={{ flex: 1, color: theme.blue, fontSize: fs(12), fontWeight: "700" }}>
                            Editing message
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Cancel editing"
                            onPress={() => {
                                setEditingMessage(null);
                                setDraft("");
                            }}
                            hitSlop={10}
                        >
                            <FeedIcon name="close" size={fs(18)} color={theme.muted} />
                        </Pressable>
                    </View>
                ) : replyTo && canSendRequestMessage && (
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: theme.subtle,
                            borderLeftWidth: 3,
                            borderLeftColor: theme.blue,
                            borderTopLeftRadius: fs(10),
                            borderTopRightRadius: fs(10),
                            padding: fs(9),
                            marginBottom: 6 * v,
                        }}
                    >
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: theme.blue, fontSize: fs(12), fontWeight: "700" }}>
                                Replying to {replyTo.outgoing ? "you" : peer.name}
                            </Text>
                            <Text numberOfLines={2} style={{ color: theme.muted, fontSize: fs(12) }}>
                                {replyTo.text}
                            </Text>
                        </View>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Cancel reply"
                            onPress={() => {
                                if (focusTimer.current) clearTimeout(focusTimer.current);
                                setReplyTo(null);
                            }}
                            hitSlop={10}
                        >
                            <FeedIcon name="close" size={fs(18)} color={theme.muted} />
                        </Pressable>
                    </View>
                )}
                {showRequestActions ? (
                    <View style={{ gap: 8 * v }}>
                        <Text
                            style={{
                                color: theme.secondary,
                                fontSize: fs(13),
                                textAlign: "center",
                            }}
                        >
                            Message request · Accept to reply, or decline.
                        </Text>
                        <View
                            style={{
                                flexDirection: "row",
                                gap: fs(10),
                            }}
                        >
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Decline message request"
                            disabled={requestDecisionLoading}
                            onPress={() => onRespondToRequest("declined")}
                            style={{
                                flex: 1,
                                minHeight: fs(46),
                                borderRadius: fs(24),
                                borderWidth: 1,
                                borderColor: theme.border,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: requestDecisionLoading ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: theme.secondary, fontWeight: "700" }}>
                                Decline
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Accept message request"
                            disabled={requestDecisionLoading}
                            onPress={() => onRespondToRequest("accepted")}
                            style={{
                                flex: 1,
                                minHeight: fs(46),
                                borderRadius: fs(24),
                                backgroundColor: theme.blue,
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: requestDecisionLoading ? 0.6 : 1,
                            }}
                        >
                            <Text style={{ color: "white", fontWeight: "700" }}>
                                Accept
                            </Text>
                        </Pressable>
                        </View>
                    </View>
                ) : canSendRequestMessage || editingMessage ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: fs(9) }}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Open emoji picker"
                        onPress={() => setEmojiPickerVisible(true)}
                        hitSlop={6}
                        style={{
                            width: fs(40),
                            height: fs(45),
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <FeedIcon name="emoji" size={fs(24)} color={theme.muted} />
                    </Pressable>
                    <View
                        style={[
                            styles.inputWrap,
                            {
                                minHeight: fs(45),
                                borderRadius: fs(25),
                                paddingHorizontal: fs(15),
                                backgroundColor: theme.input,
                                borderWidth: 1,
                                borderColor: theme.border,
                            },
                        ]}
                    >
                        <TextInput
                            ref={inputRef}
                            accessibilityLabel="Message"
                            value={draft}
                            onChangeText={setDraft}
                            selection={draftSelection}
                            onSelectionChange={(event) =>
                                setDraftSelection(event.nativeEvent.selection)
                            }
                            placeholder={editingMessage ? "Edit message..." : "Message..."}
                            placeholderTextColor={theme.muted}
                            multiline
                            maxLength={2000}
                            onFocus={() => scrollToEnd(true)}
                            style={{
                                flex: 1,
                                color: theme.ink,
                                fontSize: fs(14),
                                paddingVertical: 10,
                                maxHeight: 110,
                            }}
                        />
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={editingMessage ? "Save edited message" : "Send message"}
                        accessibilityState={{ disabled: !canSend }}
                        disabled={!canSend}
                        onPress={() => void submitComposer()}
                        style={[
                            styles.circle,
                            { width: fs(46), height: fs(46), backgroundColor: theme.blue },
                        ]}
                    >
                        <FeedIcon name="chat-send" size={fs(23)} color="white" />
                    </Pressable>
                </View>
                ) : (
                    <View
                        style={{
                            alignItems: "center",
                            paddingVertical: 12 * v,
                            paddingHorizontal: 14 * s,
                            borderRadius: fs(20),
                            backgroundColor: theme.subtle,
                        }}
                    >
                        <Text
                            style={{
                                color: theme.secondary,
                                fontSize: fs(13),
                                textAlign: "center",
                            }}
                        >
                            {requestLimitReached
                                ? "Message limit reached. Waiting for them to accept your request."
                                : requestDeclined
                                  ? "This message request was declined."
                                  : "Messaging is unavailable."}
                        </Text>
                    </View>
                )}
            </View>
            </BlurTargetView>
            <EmojiPicker
                open={emojiPickerVisible}
                onClose={() => setEmojiPickerVisible(false)}
                onEmojiSelected={({ emoji }) => {
                    const start = Math.min(draftSelection.start, draft.length);
                    const end = Math.min(draftSelection.end, draft.length);
                    const nextDraft = (
                        draft.slice(0, start) +
                        emoji +
                        draft.slice(end)
                    ).slice(0, 2000);
                    const cursor = Math.min(start + emoji.length, nextDraft.length);
                    setDraft(nextDraft);
                    setDraftSelection({ start: cursor, end: cursor });
                    setEmojiPickerVisible(false);
                    requestAnimationFrame(() => inputRef.current?.focus());
                }}
                categoryPosition="bottom"
                defaultHeight="45%"
                enableRecentlyUsed
                disableSafeArea
                styles={{
                    container: {
                        marginBottom: Math.max(insets.bottom, 8),
                        borderTopLeftRadius: 24 * s,
                        borderTopRightRadius: 24 * s,
                        overflow: "hidden",
                    },
                }}
                theme={{
                    backdrop: theme.isDark
                        ? "rgba(0, 0, 0, 0.68)"
                        : "rgba(13, 21, 41, 0.38)",
                    knob: theme.border,
                    container: theme.surface,
                    header: theme.ink,
                    skinTonesContainer: theme.subtle,
                    category: {
                        icon: theme.muted,
                        iconActive: theme.blue,
                        container: theme.subtle,
                        containerActive: theme.surface,
                    },
                    search: {
                        text: theme.ink,
                        placeholder: theme.muted,
                        icon: theme.muted,
                        background: theme.input,
                    },
                    customButton: {
                        icon: theme.muted,
                        iconPressed: theme.blue,
                        background: theme.subtle,
                        backgroundPressed: theme.blueSoft,
                    },
                    emoji: { selected: theme.blueSoft },
                }}
            />
            <ReactionSpotlight
                target={reactionTarget}
                animation={reactionAnimation}
                blurTarget={blurTargetRef}
                scale={s}
                vertical={v}
                peerName={peer.name}
                width={width}
                onClose={closeReactionPicker}
                onReact={onReact}
                onPressReply={onQuotePress}
                onEditMessage={startEditingMessage}
                onDeleteMessageForMe={(message) => {
                    void onDeleteMessage(message, "me");
                }}
                onDeleteMessageForEveryone={(message) => {
                    void onDeleteMessage(message, "everyone");
                }}
                bottomInset={insets.bottom}
            />
            <ReactionDetailsSheet
                visible={Boolean(reactionDetails)}
                emoji={reactionDetails?.emoji ?? ""}
                reactors={reactionDetails?.reactors ?? []}
                loading={reactionDetails?.loading ?? false}
                scale={s}
                bottomInset={insets.bottom}
                onClose={onDismissReactionDetails}
                onRemove={() => {
                    if (reactionDetails) onReact(reactionDetails.message, null);
                    onDismissReactionDetails();
                }}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#FCFDFE" },
    header: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#ECEEF3",
    },
    circle: { borderRadius: 100, alignItems: "center", justifyContent: "center" },
    inputWrap: {
        flex: 1,
        backgroundColor: "#F1F3F6",
        flexDirection: "row",
        alignItems: "center",
    },
});
