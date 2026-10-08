import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
    Keyboard,
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
import { useAppTheme } from "@/lib/theme";

export type ChatMessage = {
    id: string;
    text: string;
    outgoing: boolean;
    time: string;
    status?: "pending" | "failed";
    retry?: () => void;
};
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
    peer: { name: string; avatar: (size: number) => ReactNode };
    onSend: (text: string) => void;
    beforeMessages?: ReactNode;
    onAtBottom?: (atBottom: boolean) => void;
}) {
    const [draft, setDraft] = useState("");
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    useEffect(() => {
        const show = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            () => {
                setKeyboardVisible(true);
                requestAnimationFrame(() =>
                    scrollRef.current?.scrollToEnd({ animated: true }),
                );
            },
        );
        const hide = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
            () => setKeyboardVisible(false),
        );
        return () => {
            show.remove();
            hide.remove();
        };
    }, []);
    const scrollRef = useRef<ScrollView>(null);
    const shouldScroll = useRef(false);
    const nearBottom = useRef(true);
    const lastId = messages.at(-1)?.id;
    useEffect(() => {
        if (!lastId || !nearBottom.current) return;
        const frame = requestAnimationFrame(() =>
            scrollRef.current?.scrollToEnd({ animated: false }),
        );
        return () => cancelAnimationFrame(frame);
    }, [lastId]);
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const theme = useAppTheme();
    const s = width / 390;
    const v = (height - insets.top - Math.min(insets.bottom, 34)) / 784;
    const fs = (value: number) => value * s;
    const canSend = !!draft.trim();
    const send = () => {
        if (!canSend) return;
        shouldScroll.current = true;
        onSend(draft.trim());
        setDraft("");
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
                <View style={{ marginLeft: fs(14) }}>{peer.avatar(fs(49))}</View>
                <View style={{ flex: 1, gap: 4 * v }}>
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
                </View>
            </View>
            <ScrollView
                ref={scrollRef}
                automaticallyAdjustKeyboardInsets
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={100}
                onScroll={(event) => {
                    const { contentOffset, contentSize, layoutMeasurement } =
                        event.nativeEvent;
                    nearBottom.current =
                        contentOffset.y + layoutMeasurement.height >=
                        contentSize.height - 40;
                    onAtBottom?.(nearBottom.current);
                }}
                onContentSizeChange={() => {
                    if (shouldScroll.current) {
                        scrollRef.current?.scrollToEnd({ animated: true });
                        shouldScroll.current = false;
                    }
                }}
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
                    <View
                        key={message.id}
                        style={{
                            marginBottom: 4.5 * v,
                            alignItems: message.outgoing ? "flex-end" : "flex-start",
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
                                        backgroundColor: message.outgoing
                                            ? theme.blue
                                            : theme.subtle,
                                        borderRadius: fs(16),
                                        paddingHorizontal: fs(14),
                                        paddingVertical: 9 * v,
                                    }}
                                >
                                    <Text
                                        style={{
                                            fontSize: fs(14),
                                            lineHeight: 19 * v,
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
                                marginTop: 4 * v,
                                marginLeft: message.outgoing ? 0 : fs(47),
                                marginRight: message.outgoing ? fs(5) : 0,
                            }}
                        >
                            <Text
                                style={{
                                    color: theme.muted,
                                    fontSize: fs(11),
                                    lineHeight: 13 * v,
                                }}
                            >
                                {message.status === "pending" ? "Sending…" : message.time}
                            </Text>
                            {message.outgoing && !message.status && (
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
                    </View>
                ))}
            </ScrollView>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: fs(9),
                    paddingHorizontal: fs(11),
                    paddingTop: 7 * v,
                    paddingBottom: keyboardVisible
                        ? 8
                        : Math.max(Math.min(insets.bottom, 34), 12),
                }}
            >
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
                        onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
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
