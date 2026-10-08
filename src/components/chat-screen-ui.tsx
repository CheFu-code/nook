import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
    Animated,
    ActivityIndicator,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    StyleSheet,
    ScrollView,
    Text,
    View,
    type View as ViewType,
} from "react-native";
import { BlurView } from "expo-blur";
import { FeedIcon } from "./feed-icon";
import { useAppTheme } from "@/lib/theme";
import type { ChatMessage } from "@/hooks/use-chat-screen";
import type { SocialProfile } from "@/lib/social";
import { Avatar } from "./social/media";

export type ReactionTarget = {
    message: ChatMessage;
    frame: { x: number; y: number; width: number; height: number };
};

export type MessageReactor = {
    user: SocialProfile;
    emoji: string;
    isOwn: boolean;
};

function MessageBody({
    message,
    theme,
    scale,
    vertical,
}: {
    message: ChatMessage;
    theme: ReturnType<typeof useAppTheme>;
    scale: number;
    vertical: number;
}) {
    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "flex-end",
            }}
        >
            <Text
                style={{
                    flexShrink: 1,
                    fontSize: scale * 14,
                    lineHeight: 19 * vertical,
                    color: message.deletedForMe || message.deletedForEveryone
                        ? message.outgoing
                            ? theme.isDark
                                ? "#10233D"
                                : "rgba(255,255,255,0.82)"
                            : theme.muted
                        : message.outgoing
                          ? "white"
                          : theme.ink,
                    letterSpacing: -0.2,
                    fontStyle:
                        message.deletedForMe || message.deletedForEveryone
                            ? "italic"
                            : "normal",
                }}
            >
                {message.text}
            </Text>
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flexShrink: 0,
                    gap: 3 * scale,
                    marginLeft: 6 * scale,
                }}
            >
                <Text
                    style={{
                        color: message.outgoing
                            ? "rgba(255,255,255,0.72)"
                            : theme.muted,
                        fontSize: 10 * scale,
                        lineHeight: 13 * vertical,
                    }}
                >
                    {message.edited ? "Edited · " : ""}
                    {message.status === "pending" ? "Sending…" : message.time}
                </Text>
                {message.outgoing &&
                    message.status !== "pending" &&
                    message.status !== "failed" &&
                    (message.delivered ? (
                        <View
                            accessibilityLabel="Delivered"
                            style={{ flexDirection: "row" }}
                        >
                            <FeedIcon
                                name="check"
                                size={13 * scale}
                                color="rgba(255,255,255,0.72)"
                            />
                            <View style={{ marginLeft: -8 * scale }}>
                                <FeedIcon
                                    name="check"
                                    size={13 * scale}
                                    color="rgba(255,255,255,0.72)"
                                />
                            </View>
                        </View>
                    ) : (
                        <FeedIcon
                            name="check"
                            size={13 * scale}
                            color="rgba(255,255,255,0.72)"
                        />
                    ))}
            </View>
        </View>
    );
}

export function ReplyQuote({
    reply,
    outgoing,
    peerName,
    scale,
    vertical,
    onPress,
}: {
    reply: NonNullable<ChatMessage["replyTo"]>;
    outgoing: boolean;
    peerName: string;
    scale: number;
    vertical: number;
    onPress?: () => void;
}) {
    const theme = useAppTheme();
    return (
        <Pressable
            accessibilityRole={onPress ? "button" : undefined}
            accessibilityLabel={
                onPress
                    ? `Go to message from ${reply.outgoing ? "you" : peerName}`
                    : undefined
            }

            disabled={!onPress}
            onPress={onPress}
            style={{
                borderLeftWidth: 2,
                borderLeftColor: outgoing ? "#B8D8FF" : theme.blue,
                backgroundColor: outgoing ? "rgba(0, 0, 0, 0.12)" : theme.input,
                borderRadius: scale * 9,
                paddingHorizontal: scale * 10,
                paddingVertical: scale * 7,
                marginBottom: 8 * vertical,
                gap: 2 * vertical,
            }}
        >
            <Text
                numberOfLines={1}
                style={{
                    color: outgoing ? "#FFFFFF" : theme.blue,
                    fontSize: scale * 11,
                    fontWeight: "700",
                    letterSpacing: 0.1,
                }}
            >
                {reply.outgoing ? "You" : peerName}
            </Text>
            <Text
                numberOfLines={2}
                style={{
                    color: outgoing ? "#F1F6FF" : theme.secondary,
                    fontSize: scale * 12,
                    lineHeight: scale * 16,
                }}
            >
                {reply.text}
            </Text>
        </Pressable>
    );
}

export function SpotlightMessage({
    message,
    peerName,
    theme,
    scale,
    vertical,
    onPressReply,
}: {
    message: ChatMessage;
    peerName: string;
    theme: ReturnType<typeof useAppTheme>;
    scale: number;
    vertical: number;
    onPressReply: (messageId: string) => void;
}) {
    const fs = (value: number) => value * scale;
    return (
        <View
            style={{
                alignSelf: message.outgoing ? "flex-end" : "flex-start",
                maxWidth: "100%",
                borderRadius: fs(20),
            }}
        >
            <View
                style={{
                    backgroundColor: message.outgoing ? theme.blue : theme.subtle,
                    borderRadius: fs(16),
                    paddingHorizontal: fs(14),
                    paddingVertical: 9 * vertical,
                    maxWidth: fs(290),
                }}
            >
                {message.replyTo && (
                    <ReplyQuote
                        reply={message.replyTo}
                        outgoing={message.outgoing}
                        peerName={peerName}
                        scale={scale}
                        vertical={vertical}
                        onPress={() => onPressReply(message.replyTo!.id)}
                    />
                )}
                <MessageBody
                    message={message}
                    theme={theme}
                    scale={scale}
                    vertical={vertical}
                />
            </View>
        </View>
    );
}

export function MessageRow({
    message,
    highlightPulse,
    peer,
    scale,
    vertical,
    onReply,
    onLongPress,
    onMessageLayout,
    onPressReply,
    onReactionPress,
}: {
    message: ChatMessage;
    highlightPulse: number;
    peer: {
        name: string;
        avatar: (size: number) => ReactNode;
    };
    scale: number;
    vertical: number;
    onReply: (message: ChatMessage) => void;
    onLongPress: (
        message: ChatMessage,
        frame: { x: number; y: number; width: number; height: number },
    ) => void;
    onMessageLayout: (messageId: string, y: number) => void;
    onPressReply: (messageId: string) => void;
    onReactionPress: (message: ChatMessage, emoji: string) => void;
}) {
    const theme = useAppTheme();
    const fs = (value: number) => value * scale;
    const [translateX] = useState(() => new Animated.Value(0));
    const [highlightOpacity] = useState(() => new Animated.Value(0));
    const bubbleRef = useRef<View>(null);
    useEffect(() => {
        if (!highlightPulse) return;
        highlightOpacity.stopAnimation();
        highlightOpacity.setValue(0);
        const animation = Animated.sequence([
            Animated.timing(highlightOpacity, {
                toValue: 0.55,
                duration: 180,
                useNativeDriver: true,
            }),
            Animated.delay(500),
            Animated.timing(highlightOpacity, {
                toValue: 0,
                duration: 750,
                useNativeDriver: true,
            }),
        ]);
        animation.start();
        return () => animation.stop();
    }, [highlightOpacity, highlightPulse]);
    const panResponder = useMemo(
        () =>
            PanResponder.create({
                onStartShouldSetPanResponder: () => false,
                onMoveShouldSetPanResponder: (_, gesture) => {
                    const swipeTowardReply = message.outgoing
                        ? gesture.dx < -12
                        : gesture.dx > 12;
                    return (
                        message.status !== "pending" &&
                        message.status !== "failed" &&
                        swipeTowardReply &&
                        Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2
                    );
                },
                onPanResponderMove: (_, gesture) => {
                    const offset = message.outgoing
                        ? Math.max(-68 * scale, Math.min(0, gesture.dx))
                        : Math.min(68 * scale, Math.max(0, gesture.dx));
                    translateX.setValue(offset);
                },
                onPanResponderRelease: (_, gesture) => {
                    const reachedReplyThreshold = message.outgoing
                        ? gesture.dx <= -58 * scale
                        : gesture.dx >= 58 * scale;
                    if (
                        reachedReplyThreshold &&
                        message.status !== "pending" &&
                        message.status !== "failed"
                    ) {
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
    const canReact =
        Boolean(message.backendId) &&
        !message.deletedForMe &&
        !message.deletedForEveryone &&
        message.status !== "pending" &&
        message.status !== "failed";
    return (
        <Animated.View
            {...panResponder.panHandlers}
            onLayout={(event) => {
                const y = event.nativeEvent.layout.y;
                onMessageLayout(message.backendId ?? message.id, y);
                onMessageLayout(message.id, y);
            }}
            style={{
                marginBottom: 4.5 * vertical,
                width: "100%",
                alignItems: message.outgoing ? "flex-end" : "flex-start",
                transform: [{ translateX }],
            }}
        >
            <Pressable
                style={{
                    alignSelf: message.outgoing ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                }}
                disabled={!canReact}
                onLongPress={() => {
                    bubbleRef.current?.measureInWindow((x, y, width, height) => {
                        onLongPress(message, { x, y, width, height });
                    });
                }}
                delayLongPress={300}
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
                            flexShrink: 1,
                            alignItems: message.outgoing ? "flex-end" : "flex-start",
                        }}
                    >
                        <View
                            ref={bubbleRef}
                            style={{
                                backgroundColor: message.outgoing
                                    ? theme.blue
                                    : theme.subtle,
                                borderRadius: fs(16),
                                paddingHorizontal: fs(14),
                                paddingVertical: 9 * vertical,
                                overflow: "hidden",
                            }}
                        >
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    StyleSheet.absoluteFill,
                                    {
                                        backgroundColor: theme.blueSoft,
                                        opacity: highlightOpacity,
                                    },
                                ]}
                            />
                            {message.replyTo && (
                                <ReplyQuote
                                    reply={message.replyTo}
                                    outgoing={message.outgoing}
                                    peerName={peer.name}
                                    scale={scale}
                                    vertical={vertical}
                                    onPress={() =>
                                        onPressReply(message.replyTo!.id)
                                    }
                                />
                            )}
                            <MessageBody
                                message={message}
                                theme={theme}
                                scale={scale}
                                vertical={vertical}
                            />
                        </View>
                    </View>
                </View>
            </Pressable>
            {!!message.reactions?.length && (
                <View
                    style={{
                        flexDirection: "row",
                        gap: fs(4),
                        marginTop: 3 * vertical,
                        alignSelf: message.outgoing ? "flex-end" : "flex-start",
                        marginLeft: message.outgoing ? 0 : fs(47),
                    }}
                >
                    {message.reactions.map((reaction) => (
                        <Pressable
                            key={reaction.emoji}
                            accessibilityRole="button"
                            accessibilityLabel={`See who reacted ${reaction.emoji}`}
                            onPress={() => onReactionPress(message, reaction.emoji)}
                            style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: fs(3),
                                paddingHorizontal: fs(7),
                                paddingVertical: 2 * vertical,
                                borderRadius: fs(12),
                                backgroundColor: reaction.reacted
                                    ? theme.blueSoft
                                    : theme.subtle,
                            }}
                        >
                            <Text style={{ fontSize: fs(13) }}>{reaction.emoji}</Text>
                            <Text
                                style={{
                                    color: reaction.reacted ? theme.blue : theme.muted,
                                    fontSize: fs(11),
                                }}
                            >
                                {reaction.count}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}
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

export function ReactionSpotlight({
    target,
    animation,
    blurTarget,
    scale,
    vertical,
    peerName,
    width,
    onClose,
    onReact,
    onPressReply,
    onEditMessage,
    onDeleteMessageForMe,
    onDeleteMessageForEveryone,
    bottomInset,
}: {
    target: ReactionTarget | null;
    animation: Animated.Value;
    blurTarget: RefObject<ViewType | null>;
    scale: number;
    vertical: number;
    peerName: string;
    width: number;
    onClose: () => void;
    onReact: (message: ChatMessage, emoji: string | null) => void;
    onPressReply: (messageId: string) => void;
    onEditMessage: (message: ChatMessage) => void;
    onDeleteMessageForMe: (message: ChatMessage) => void;
    onDeleteMessageForEveryone: (message: ChatMessage) => void;
    bottomInset: number;
}) {
    const theme = useAppTheme();
    const [actionsVisible, setActionsVisible] = useState(false);
    if (!target) return null;
    return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 1000 }]}>
            <BlurView
                intensity={theme.isDark ? 42 : 34}
                tint={theme.isDark ? "dark" : "light"}
                blurTarget={blurTarget}
                blurMethod={
                    Platform.OS === "android"
                        ? "dimezisBlurViewSdk31Plus"
                        : undefined
                }
                style={StyleSheet.absoluteFill}
            />
            <Animated.View
                pointerEvents="none"
                style={[
                    StyleSheet.absoluteFill,
                    {
                        backgroundColor: theme.isDark
                            ? "rgba(0,0,0,0.38)"
                            : "rgba(13,21,41,0.28)",
                        opacity: animation,
                    },
                ]}
            />
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Dismiss reactions"
                onPress={onClose}
                style={StyleSheet.absoluteFill}
            />
            <Animated.View
                pointerEvents="none"
                style={{
                    position: "absolute",
                    left: target.frame.x,
                    top: target.frame.y,
                    width: target.frame.width,
                    minHeight: target.frame.height,
                    justifyContent: "center",
                    transform: [
                        {
                            scale: animation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.96, 1],
                            }),
                        },
                    ],
                    shadowColor: "#000",
                    shadowOpacity: 0.3,
                    shadowRadius: 22,
                    shadowOffset: { width: 0, height: 10 },
                    elevation: 18,
                }}
            >
                <SpotlightMessage
                    message={target.message}
                    peerName={peerName}
                    theme={theme}
                    scale={scale}
                    vertical={vertical}
                    onPressReply={onPressReply}
                />
            </Animated.View>
            <Animated.View
                style={{
                    position: "absolute",
                    top: Math.max(12, target.frame.y - 62 * scale),
                    left: target.message.outgoing
                        ? Math.max(
                              12 * scale,
                              Math.min(
                                  width - 310 * scale,
                                  target.frame.x +
                                      target.frame.width -
                                      310 * scale,
                              ),
                          )
                        : Math.min(width - 310 * scale, 12 * scale),
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 2 * scale,
                    padding: 6 * scale,
                    borderRadius: 28 * scale,
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderWidth: StyleSheet.hairlineWidth,
                    shadowColor: "#000",
                    shadowOpacity: 0.22,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 20,
                    opacity: animation,
                    transform: [
                        {
                            scale: animation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.72, 1],
                            }),
                        },
                        {
                            translateY: animation.interpolate({
                                inputRange: [0, 1],
                                outputRange: [14, 0],
                            }),
                        },
                    ],
                }}
            >
                {["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => {
                    const selected =
                        target.message.reactions?.some(
                            (reaction) =>
                                reaction.emoji === emoji && reaction.reacted,
                        ) ?? false;
                    return (
                        <Pressable
                            key={emoji}
                            accessibilityRole="button"
                            accessibilityLabel={`${selected ? "Remove" : "React with"} ${emoji}`}
                            onPress={() => {
                                onClose();
                                onReact(target.message, selected ? null : emoji);
                            }}
                            style={{
                                width: 37 * scale,
                                height: 44 * scale,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 22 * scale,
                                backgroundColor: selected
                                    ? theme.blueSoft
                                    : "transparent",
                            }}
                        >
                            <Text style={{ fontSize: 25 * scale }}>{emoji}</Text>
                        </Pressable>
                    );
                })}
                {target.message.backendId &&
                    !target.message.deletedForMe &&
                    !target.message.deletedForEveryone && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Message options"
                        onPress={() => setActionsVisible(true)}
                        style={{
                            width: 37 * scale,
                            height: 44 * scale,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 22 * scale,
                        }}
                    >
                        <FeedIcon
                            name="more-vertical"
                            size={20 * scale}
                            color={theme.muted}
                        />
                    </Pressable>
                )}
            </Animated.View>
            {actionsVisible &&
                target.message.backendId &&
                !target.message.deletedForMe &&
                !target.message.deletedForEveryone && (
                <MessageActionsSheet
                    message={target.message}
                    scale={scale}
                    bottomInset={bottomInset}
                    onClose={() => setActionsVisible(false)}
                    onEdit={() => {
                        setActionsVisible(false);
                        onClose();
                        onEditMessage(target.message);
                    }}
                    onDeleteForMe={() => {
                        setActionsVisible(false);
                        onClose();
                        onDeleteMessageForMe(target.message);
                    }}
                    onDeleteForEveryone={() => {
                        setActionsVisible(false);
                        onClose();
                        onDeleteMessageForEveryone(target.message);
                    }}
                />
            )}
        </View>
    );
}

function MessageActionsSheet({
    message,
    scale,
    bottomInset,
    onClose,
    onEdit,
    onDeleteForMe,
    onDeleteForEveryone,
}: {
    message: ChatMessage;
    scale: number;
    bottomInset: number;
    onClose: () => void;
    onEdit: () => void;
    onDeleteForMe: () => void;
    onDeleteForEveryone: () => void;
}) {
    const theme = useAppTheme();
    const [confirming, setConfirming] = useState<"me" | "everyone" | null>(null);
    const canDeleteForEveryone = Boolean(message.canDeleteForEveryone);

    const action = confirming === "me" ? onDeleteForMe : onDeleteForEveryone;
    const confirmationText =
        confirming === "me"
            ? "This message will be removed only from your chat."
            : "This message will be removed for everyone in the conversation.";
    return (
        <Modal
            visible
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View
                style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    backgroundColor: "rgba(5, 12, 25, 0.42)",
                }}
            >
                <Pressable
                    accessibilityLabel="Close message options"
                    onPress={onClose}
                    style={{ flex: 1 }}
                />
                <View
                    style={{
                        paddingHorizontal: 20 * scale,
                        paddingTop: 18 * scale,
                        paddingBottom: Math.max(bottomInset, 16) + 12 * scale,
                        borderTopLeftRadius: 24 * scale,
                        borderTopRightRadius: 24 * scale,
                        backgroundColor: theme.surface,
                    }}
                >
                    <Text
                        style={{
                            color: theme.ink,
                            fontSize: 16 * scale,
                            fontWeight: "700",
                            marginBottom: 10 * scale,
                        }}
                    >
                        {confirming ? "Delete message?" : "Message options"}
                    </Text>
                    {confirming ? (
                        <>
                            <Text
                                style={{
                                    color: theme.secondary,
                                    fontSize: 14 * scale,
                                    marginBottom: 16 * scale,
                                }}
                            >
                                {confirmationText}
                            </Text>
                            <View style={{ flexDirection: "row", gap: 10 * scale }}>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => setConfirming(null)}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 13 * scale,
                                        alignItems: "center",
                                        borderRadius: 14 * scale,
                                        backgroundColor: theme.subtle,
                                    }}
                                >
                                    <Text style={{ color: theme.ink, fontWeight: "600" }}>
                                        Cancel
                                    </Text>
                                </Pressable>
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={action}
                                    style={{
                                        flex: 1,
                                        paddingVertical: 13 * scale,
                                        alignItems: "center",
                                        borderRadius: 14 * scale,
                                        backgroundColor: "#D93848",
                                    }}
                                >
                                    <Text style={{ color: "white", fontWeight: "700" }}>
                                        Delete
                                    </Text>
                                </Pressable>
                            </View>
                        </>
                    ) : (
                        <View style={{ gap: 4 * scale }}>
                            {message.outgoing && (
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={onEdit}
                                    style={{ paddingVertical: 13 * scale }}
                                >
                                    <Text style={{ color: theme.ink, fontSize: 15 * scale }}>
                                        Edit
                                    </Text>
                                </Pressable>
                            )}
                            <Pressable
                                accessibilityRole="button"
                                onPress={() => setConfirming("me")}
                                style={{ paddingVertical: 13 * scale }}
                            >
                                <Text style={{ color: theme.ink, fontSize: 15 * scale }}>
                                    Delete for me
                                </Text>
                            </Pressable>
                            {canDeleteForEveryone && (
                                <Pressable
                                    accessibilityRole="button"
                                    onPress={() => setConfirming("everyone")}
                                    style={{ paddingVertical: 13 * scale }}
                                >
                                    <Text style={{ color: "#D93848", fontSize: 15 * scale }}>
                                        Delete for everyone
                                    </Text>
                                </Pressable>
                            )}
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

export function ReactionDetailsSheet({
    visible,
    emoji,
    reactors,
    loading,
    scale,
    bottomInset,
    onClose,
    onRemove,
}: {
    visible: boolean;
    emoji: string;
    reactors: MessageReactor[];
    loading: boolean;
    scale: number;
    bottomInset: number;
    onClose: () => void;
    onRemove: () => void;
}) {
    const theme = useAppTheme();
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View
                style={{
                    flex: 1,
                    justifyContent: "flex-end",
                    backgroundColor: "rgba(5, 12, 25, 0.42)",
                }}
            >
                <Pressable
                    accessibilityLabel="Close reaction details"
                    onPress={onClose}
                    style={{ flex: 1 }}
                />
                <View
                    style={{
                        maxHeight: "60%",
                        paddingHorizontal: 20 * scale,
                        paddingTop: 18 * scale,
                        paddingBottom: Math.max(bottomInset, 16) + 12 * scale,
                        borderTopLeftRadius: 24 * scale,
                        borderTopRightRadius: 24 * scale,
                        backgroundColor: theme.surface,
                    }}
                >
                    <View
                        style={{
                            width: 34 * scale,
                            height: 4 * scale,
                            borderRadius: 2 * scale,
                            backgroundColor: theme.border,
                            alignSelf: "center",
                            marginBottom: 16 * scale,
                        }}
                    />
                    <View
                        style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 9 * scale,
                            paddingBottom: 14 * scale,
                            borderBottomWidth: 1,
                            borderColor: theme.border,
                        }}
                    >
                        <Text style={{ fontSize: 25 * scale }}>{emoji}</Text>
                        <Text
                            style={{
                                color: theme.ink,
                                fontSize: 16 * scale,
                                fontWeight: "700",
                            }}
                        >
                            Reactions
                        </Text>
                        <Text style={{ color: theme.muted, fontSize: 14 * scale }}>
                            {reactors.length}
                        </Text>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Close reaction details"
                            onPress={onClose}
                            hitSlop={10}
                            style={{ marginLeft: "auto", padding: 4 * scale }}
                        >
                            <FeedIcon name="close" size={18 * scale} color={theme.muted} />
                        </Pressable>
                    </View>
                    {loading ? (
                        <View
                            style={{
                                minHeight: 88 * scale,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <ActivityIndicator color={theme.blue} />
                        </View>
                    ) : (
                        <ScrollView
                            style={{ flexGrow: 0 }}
                            contentContainerStyle={{
                                paddingTop: 8 * scale,
                                paddingBottom: 8 * scale,
                            }}
                            showsVerticalScrollIndicator={false}
                        >
                            {reactors.map((reactor) => (
                                <View
                                    key={reactor.user._id}
                                    style={{
                                        minHeight: 58 * scale,
                                        flexDirection: "row",
                                        alignItems: "center",
                                        gap: 11 * scale,
                                    }}
                                >
                                    <Avatar profile={reactor.user} size={40 * scale} />
                                    <View style={{ flex: 1 }}>
                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                color: theme.ink,
                                                fontSize: 14 * scale,
                                                fontWeight: "600",
                                            }}
                                        >
                                            {reactor.user.username}
                                        </Text>
                                        <Text
                                            numberOfLines={1}
                                            style={{
                                                color: theme.muted,
                                                fontSize: 12 * scale,
                                                marginTop: 2 * scale,
                                            }}
                                        >
                                            {reactor.user.name}
                                        </Text>
                                    </View>
                                    {reactor.isOwn ? (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={`Remove your ${reactor.emoji} reaction`}
                                            onPress={onRemove}
                                            style={{
                                                alignItems: "center",
                                                minWidth: 48 * scale,
                                            }}
                                        >
                                            <Text style={{ fontSize: 24 * scale }}>
                                                {reactor.emoji}
                                            </Text>
                                            <Text
                                                style={{
                                                    color: theme.blue,
                                                    fontSize: 10 * scale,
                                                    marginTop: 1 * scale,
                                                }}
                                            >
                                                Tap to remove
                                            </Text>
                                        </Pressable>
                                    ) : (
                                        <Text style={{ fontSize: 24 * scale }}>
                                            {reactor.emoji}
                                        </Text>
                                    )}
                                </View>
                            ))}
                            {!reactors.length && !loading && (
                                <Text
                                    style={{
                                        color: theme.muted,
                                        textAlign: "center",
                                        paddingVertical: 24 * scale,
                                    }}
                                >
                                    No reactions yet.
                                </Text>
                            )}
                        </ScrollView>
                    )}
                </View>
            </View>
        </Modal>
    );
}
