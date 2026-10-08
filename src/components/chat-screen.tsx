import { StatusBar } from "expo-status-bar";
import { type ReactNode, useMemo, useState } from "react";
import {
    Animated,
    KeyboardAvoidingView,
    PanResponder,
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
import { useAppTheme } from "@/lib/theme";
import { useChatScreenLogic, type ChatMessage } from "@/hooks/use-chat-screen";

export type { ChatMessage } from "@/hooks/use-chat-screen";
export function ChatScreen({
    onBack,
    messages,
    peer,
    onSend,
    beforeMessages,
    onAtBottom,
}: {
    onBack: () => void;
    messages: ChatMessage[];
    peer: {
        name: string;
        avatar: (size: number) => ReactNode;
        onPress: () => void;
    };
    onSend: (text: string, replyTo?: ChatMessage["replyTo"]) => void;
    beforeMessages?: ReactNode;
    onAtBottom?: (atBottom: boolean) => void;
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
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const s = width / 390;
    const v = (height - insets.top - Math.min(insets.bottom, 34)) / 784;
    const fs = (value: number) => value * s;
    return (
        <KeyboardAvoidingView
            style={[
                styles.screen,
                { paddingTop: insets.top, backgroundColor: theme.background },
            ]}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
            <StatusBar style={theme.isDark ? "light" : "dark"} />
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
                        onReply={setReplyTo}
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
                            <Text numberOfLines={1} style={{ color: theme.muted, fontSize: fs(12) }}>
                                {replyTo.text}
                            </Text>
                        </View>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Cancel reply"
                            onPress={() => setReplyTo(null)}
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
        </KeyboardAvoidingView>
    );
}

function MessageRow({
    message,
    peer,
    scale,
    vertical,
    onReply,
}: {
    message: ChatMessage;
    peer: {
        name: string;
        avatar: (size: number) => ReactNode;
    };
    scale: number;
    vertical: number;
    onReply: (message: ChatMessage) => void;
}) {
    const theme = useAppTheme();
    const fs = (value: number) => value * scale;
    const [translateX] = useState(() => new Animated.Value(0));
    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (_, gesture) =>
                    !message.status &&
                    gesture.dx > 12 &&
                    gesture.dx > Math.abs(gesture.dy) * 1.2,
                onPanResponderMove: (_, gesture) =>
                    translateX.setValue(Math.min(68 * scale, Math.max(0, gesture.dx))),
                onPanResponderRelease: (_, gesture) => {
                    if (gesture.dx >= 58 * scale && !message.status) {
                        onReply(message);
                    }
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                        bounciness: 4,
                    }).start();
                },
                onPanResponderTerminate: () =>
                    Animated.spring(translateX, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start(),
            }),
        [message, onReply, scale, translateX],
    );
    const quoteAuthor = message.replyTo?.outgoing ? "You" : peer.name;
    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={{
                marginBottom: 4.5 * vertical,
                alignItems: message.outgoing ? "flex-end" : "flex-start",
                transform: [{ translateX }],
            }}
        >
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: fs(10),
                    maxWidth: "100%",
                }}
            >
                {!message.outgoing && peer.avatar(fs(35))}
                <View
                    style={{
                        maxWidth: fs(290),
                        alignItems: message.outgoing ? "flex-end" : "flex-start",
                    }}
                >
                    <View
                        style={{
                            backgroundColor: message.outgoing ? theme.blue : theme.subtle,
                            borderRadius: fs(16),
                            paddingHorizontal: fs(14),
                            paddingVertical: 9 * vertical,
                        }}
                    >
                        {message.replyTo && (
                            <View
                                style={{
                                    borderLeftWidth: 3,
                                    borderLeftColor: message.outgoing ? "#FFFFFFB3" : theme.blue,
                                    backgroundColor: message.outgoing ? "#FFFFFF26" : theme.input,
                                    borderRadius: fs(7),
                                    padding: fs(7),
                                    marginBottom: 6 * vertical,
                                }}
                            >
                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: message.outgoing ? "white" : theme.blue,
                                        fontSize: fs(11),
                                        fontWeight: "700",
                                    }}
                                >
                                    {quoteAuthor}
                                </Text>
                                <Text
                                    numberOfLines={2}
                                    style={{
                                        color: message.outgoing ? "white" : theme.ink,
                                        opacity: 0.8,
                                        fontSize: fs(12),
                                    }}
                                >
                                    {message.replyTo.text}
                                </Text>
                            </View>
                        )}
                        <Text
                            style={{
                                fontSize: fs(14),
                                lineHeight: 19 * vertical,
                                color: message.outgoing ? "white" : theme.ink,
                                letterSpacing: -0.2,
                            }}
                        >
                            {message.text}
                        </Text>
                    </View>
                </View>
            </View>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: fs(8),
                    marginTop: 4 * vertical,
                    marginLeft: message.outgoing ? 0 : fs(47),
                    marginRight: message.outgoing ? fs(5) : 0,
                }}
            >
                <Text style={{ color: theme.muted, fontSize: fs(11), lineHeight: 13 * vertical }}>
                    {message.status === "pending" ? "Sending…" : message.time}
                </Text>
                {message.outgoing &&
                    message.status !== "pending" &&
                    message.status !== "failed" && (
                        <FeedIcon name="check" size={fs(16)} color={theme.muted} />
                    )}
            </View>
            {message.status === "failed" && (
                <Pressable
                    accessibilityRole="button"
                    onPress={message.retry}
                    style={{ padding: 8 }}
                >
                    <Text style={{ color: "#D93848", fontSize: 12 }}>
                        Not sent · Tap to retry
                    </Text>
                </Pressable>
            )}
        </Animated.View>
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
