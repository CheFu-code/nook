import { StatusBar } from "expo-status-bar";
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
import { useChatScreenLogic, type ChatMessage } from "@/hooks/use-chat-screen";

export type { ChatMessage } from "@/hooks/use-chat-screen";

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
}: {
    onBack: () => void;
    messages: ChatMessage[];
    peer: {
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
    const inputRef = useRef<TextInput>(null);
    const blurTargetRef = useRef<View>(null);
    const messageOffsets = useRef(new Map<string, number>());
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
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
                    <Text style={{ color: theme.muted, fontSize: fs(12) }}>
                        Private conversation
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
                <Text
                    style={{
                        color: theme.muted,
                        fontSize: fs(11),
                        textAlign: "center",
                        marginTop: 12 * v,
                        marginBottom: 10 * v,
                    }}
                >
                    Messages
                </Text>
                {beforeMessages}
                {messages.map((message) => (
                    <MessageRow
                        key={message.id}
                        message={message}
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
                    />
                ))}
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
                {replyTo && (
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
                <View style={{ flexDirection: "row", alignItems: "center", gap: fs(9) }}>
                    <View
                        style={[
                            styles.inputWrap,
                            {
                                minHeight: fs(45),
                                borderRadius: fs(25),
                                paddingLeft: fs(15),
                                paddingRight: fs(13),
                                gap: fs(8),
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
                            placeholder="Message..."
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
                        accessibilityLabel="Send message"
                        accessibilityState={{ disabled: !canSend }}
                        disabled={!canSend}
                        onPress={send}
                        style={[
                            styles.circle,
                            { width: fs(46), height: fs(46), backgroundColor: theme.blue },
                        ]}
                    >
                        <FeedIcon name="chat-send" size={fs(23)} color="white" />
                    </Pressable>
                </View>
            </View>
            </BlurTargetView>
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
