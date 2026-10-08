import { StatusBar } from "expo-status-bar";
import { useState, type ReactNode } from "react";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NookQueryStatus } from "@/hooks/use-nook-api";
import type { Conversation } from "@/lib/social";
import { FeedIcon } from "./feed-icon";
import { Avatar } from "./social/media";
import { inboxTime, NewConversation } from "./social/messages";
import { LoadMore } from "./social/ui";
import { useAppTheme } from "@/lib/theme";

export function MessagesTabView({
    conversations,
    onFilter,
    onOpenConversation,
    footerStatus,
    loadMore,
    loading,
    showEmpty,
}: {
    conversations: Conversation[];
    onFilter: (unread: boolean) => void;
    onOpenConversation: (conversation: Conversation) => void;
    footerStatus: NookQueryStatus;
    loadMore: (count?: number) => void;
    loading: boolean;
    showEmpty: boolean;
}) {
    const [filter, setFilter] = useState("All");
    const [newChat, setNewChat] = useState(false);
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const s = width / 390;
    const vertical = Math.max(1, Math.min(1.12, height / width / (1502 / 739)));
    const liveRows = conversations.map((item) => (
        <ConversationRow
            key={item._id}
            name={item.other.username}
            text={item.preview}
            time={inboxTime(item.lastMessageAt)}
            unreadCount={item.unreadCount}
            unreadCountExact={item.unreadCountExact}
            avatar={(size) => <Avatar profile={item.other} size={size} />}
            onPress={() => onOpenConversation(item)}
        />
    ));

    return (
        <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: theme.background }]}>
            <StatusBar style={theme.isDark ? "light" : "dark"} />
            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingHorizontal: 19 * s,
                    paddingTop: 19 * s * vertical,
                    paddingBottom: 24 * s * vertical,
                }}
            >
                <Text
                    accessibilityRole="header"
                    style={[styles.heading, { fontSize: 33 * s, color: theme.ink }]}
                >
                    Messages
                </Text>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="New message"
                    onPress={() => setNewChat(true)}
                    hitSlop={12}
                >
                    <FeedIcon name="compose" size={27 * s} color="#087EFF" />
                </Pressable>
            </View>
            <View
                style={{
                    flexDirection: "row",
                    gap: 6 * s,
                    paddingHorizontal: 18 * s,
                    paddingBottom: 20 * s * vertical,
                }}
            >
                {["All", "Unread", "Groups"].map((label) => (
                    <Pressable
                        key={label}
                        accessibilityRole="button"
                        accessibilityState={{ selected: filter === label }}
                        onPress={() => {
                            setFilter(label);
                            onFilter(label === "Unread");
                        }}
                        style={{
                            backgroundColor: filter === label ? theme.blue : theme.subtle,
                            borderRadius: 24 * s,
                            width: (label === "All" ? 70 : 95) * s,
                            height: 37 * s * vertical,
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <Text
                            style={{
                                fontSize: 15 * s,
                                color: filter === label ? "white" : theme.secondary,
                                letterSpacing: -0.4,
                            }}
                        >
                            {label}
                        </Text>
                    </Pressable>
                ))}
            </View>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 18 * s, paddingBottom: 20 }}
            >
                {filter === "Groups" ? (
                    <View style={{ padding: 30, alignItems: "center", gap: 10 }}>
                        <FeedIcon name="comment" size={32} color="#8A90A7" />
                        <Text style={[styles.name, { color: theme.ink }]}>Group messaging</Text>
                        <Text style={[styles.preview, { textAlign: "center", color: theme.muted }]}>
                            For now, start a private conversation with one member.
                        </Text>
                    </View>
                ) : (
                    <>
                        {liveRows}
                        {showEmpty && !loading && !liveRows.length && (
                            <View style={{ padding: 30, alignItems: "center", gap: 10 }}>
                                <FeedIcon name="comment" size={32} color="#8A90A7" />
                                <Text style={[styles.name, { color: theme.ink }]}>
                                    {filter === "Unread" ? "You’re all caught up" : "No conversations yet"}
                                </Text>
                                <Text style={[styles.preview, { textAlign: "center", color: theme.muted }]}>
                                    {filter === "Unread"
                                        ? "You don’t have any unread messages."
                                        : "Start a conversation with someone in the community."}
                                </Text>
                            </View>
                        )}
                        <LoadMore status={footerStatus} loadMore={loadMore} />
                    </>
                )}
            </ScrollView>
            <Modal
                visible={newChat}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setNewChat(false)}
            >
                <NewConversation close={() => setNewChat(false)} />
            </Modal>
        </View>
    );
}

function ConversationRow({
    name,
    text,
    time,
    unreadCount,
    unreadCountExact,
    avatar,
    onPress,
}: {
    name: string;
    text: string;
    time: string;
    unreadCount: number;
    unreadCountExact: boolean;
    avatar: (size: number) => ReactNode;
    onPress: () => void;
}) {
    const { width, height } = useWindowDimensions();
    const theme = useAppTheme();
    const s = width / 390;
    const vertical = Math.max(1, Math.min(1.12, height / width / (1502 / 739)));
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open chat with ${name}${unreadCount > 0 ? `, ${unreadCountExact ? unreadCount : "at least one"} unread messages` : ""}`}
            onPress={onPress}
            style={{
                backgroundColor: theme.subtle,
                borderRadius: 18 * s,
                padding: 9 * s,
                height: 80 * s * vertical,
                marginBottom: 10 * s * vertical,
                flexDirection: "row",
                alignItems: "center",
                gap: 19 * s,
            }}
        >
            <View>{avatar(60 * s)}</View>
            <View style={{ flex: 1, gap: 5 * s }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text
                        numberOfLines={1}
                        style={[styles.name, { flex: 1, fontSize: 18 * s, color: theme.ink }]}
                    >
                        {name}
                    </Text>
                    <Text
                        style={{
                            color: theme.muted,
                            fontSize: 13 * s,
                            marginRight: 9 * s,
                            letterSpacing: -0.4,
                        }}
                    >
                        {time}
                    </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7 * s }}>
                    <Text
                        numberOfLines={1}
                        style={[styles.preview, { flex: 1, fontSize: 15 * s, color: theme.muted }]}
                    >
                        {text}
                    </Text>
                    {unreadCount > 0 && (
                        <View
                            style={{
                                minWidth: 21 * s,
                                height: 21 * s,
                                paddingHorizontal: 5 * s,
                                borderRadius: 11 * s,
                                backgroundColor: theme.blue,
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <Text style={{ color: "white", fontSize: 11 * s, fontWeight: "700" }}>
                                {!unreadCountExact ? "1+" : unreadCount > 99 ? "99+" : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: "#FCFDFE" },
    heading: { fontWeight: "700", color: "#0C112D", letterSpacing: -1.2 },
    name: {
        fontSize: 18,
        fontWeight: "700",
        color: "#0C112D",
        letterSpacing: -0.6,
    },
    preview: { fontSize: 15, color: "#8491B1", letterSpacing: -0.5 },
});
