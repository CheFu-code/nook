import type { SocialProfile } from "@/lib/social";
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { FeedIcon, type IconName } from "../feed-icon";
import { Avatar } from "./media";
import { useNookLanguage } from "@/lib/language";

type StoryViewerProfile = SocialProfile & { viewedAt: number };
type StoryViewersQuery = {
    data: { items: StoryViewerProfile[]; hasMore: boolean } | undefined;
    error: unknown;
    refresh: () => void;
};

type StoryViewerOverlaysProps = {
    story: { author: SocialProfile };
    insetsBottom: number;
    viewerCount: number;
    viewersOpen: boolean;
    viewersQuery: StoryViewersQuery;
    optionsOpen: boolean;
    deleteConfirmOpen: boolean;
    feedback: { title: string; message: string } | null;
    onCloseViewers: () => void;
    onShare: () => void;
    onDeleteRequest: () => void;
    onCancelOptions: () => void;
    onCancelDelete: () => void;
    onDelete: () => void;
    onDismissFeedback: () => void;
};

export function StoryViewerOverlays({
    story,
    insetsBottom,
    viewerCount,
    viewersOpen,
    viewersQuery,
    optionsOpen,
    deleteConfirmOpen,
    feedback,
    onCloseViewers,
    onShare,
    onDeleteRequest,
    onCancelOptions,
    onCancelDelete,
    onDelete,
    onDismissFeedback,
}: StoryViewerOverlaysProps) {
    const { t } = useNookLanguage();
    return (
        <>
            {viewersOpen && (
                <Modal
                    visible
                    transparent
                    animationType="slide"
                    statusBarTranslucent
                    onRequestClose={() => {
                        onCloseViewers();
                    }}
                >
                    <View
                        style={{
                            flex: 1,
                            justifyContent: "flex-end",
                            backgroundColor: "#00000099",
                        }}
                    >
                        <Pressable
                            accessibilityLabel={t("Close story viewers")}
                            onPress={() => {
                                onCloseViewers();
                            }}
                            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                        />
                        <View
                            style={{
                                maxHeight: "75%",
                                minHeight: 320,
                                paddingHorizontal: 24,
                                paddingTop: 12,
                                paddingBottom: Math.max(insetsBottom, 20),
                                borderTopLeftRadius: 28,
                                borderTopRightRadius: 28,
                                borderTopWidth: 1,
                                borderColor: "#FFFFFF18",
                                backgroundColor: "#111827",
                            }}
                        >
                            <View
                                style={{
                                    width: 38,
                                    height: 4,
                                    borderRadius: 2,
                                    alignSelf: "center",
                                    backgroundColor: "#667085",
                                    marginBottom: 22,
                                }}
                            />
                            <View
                                style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 12,
                                }}
                            >
                                <Text style={{ color: "white", fontSize: 20, fontWeight: "700" }}>
                                    Story viewers
                                </Text>
                                <Text
                                    accessibilityLabel={`${viewerCount} ${viewerCount === 1 ? "viewer" : "viewers"}`}
                                    style={{ color: "#AAB5C7", fontSize: 14, fontWeight: "600" }}
                                >
                                    {viewerCount}
                                </Text>
                            </View>
                            <Text style={{ color: "#AAB5C7", fontSize: 13, marginTop: 5 }}>
                                People who have seen this story
                            </Text>
                            {viewersQuery.error ? (
                                <View
                                    style={{
                                        flex: 1,
                                        minHeight: 120,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 12,
                                    }}
                                >
                                    <Text style={{ color: "#AAB5C7", fontSize: 14, textAlign: "center" }}>
                                        Viewer details couldn’t be loaded.
                                    </Text>
                                    <Pressable
                                        accessibilityRole="button"
                                        onPress={viewersQuery.refresh}
                                        style={{
                                            paddingHorizontal: 18,
                                            paddingVertical: 10,
                                            borderRadius: 18,
                                            backgroundColor: "#20334F",
                                        }}
                                    >
                                        <Text style={{ color: "#8BC4FF", fontWeight: "600" }}>
                                            Try again
                                        </Text>
                                    </Pressable>
                                </View>
                            ) : viewersQuery.data === undefined ? (
                                <View
                                    style={{
                                        flex: 1,
                                        minHeight: 120,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        gap: 10,
                                    }}
                                >
                                    <ActivityIndicator color="#8BC4FF" />
                                    <Text style={{ color: "#AAB5C7", fontSize: 13 }}>
                                        Loading viewers…
                                    </Text>
                                </View>
                            ) : viewersQuery.data.items.length === 0 ? (
                                <View
                                    style={{
                                        flex: 1,
                                        minHeight: 120,
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <Text style={{ color: "#AAB5C7", fontSize: 14 }}>
                                        No viewers yet.
                                    </Text>
                                </View>
                            ) : (
                                <ScrollView
                                    style={{ flexShrink: 1 }}
                                    contentContainerStyle={{ paddingBottom: 8 }}
                                    showsVerticalScrollIndicator={false}
                                    nestedScrollEnabled
                                >
                                    {viewersQuery.data.items.map((viewer) => (
                                        <View
                                            key={viewer._id}
                                            style={{
                                                minHeight: 64,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                gap: 12,
                                                borderBottomWidth: 1,
                                                borderBottomColor: "#FFFFFF10",
                                            }}
                                        >
                                            <Avatar profile={viewer} size={42} />
                                            <View style={{ flex: 1, gap: 3 }}>
                                                <Text
                                                    numberOfLines={1}
                                                    style={{ color: "white", fontSize: 14, fontWeight: "600" }}
                                                >
                                                    {viewer.name || viewer.username}
                                                </Text>
                                                <Text
                                                    numberOfLines={1}
                                                    style={{ color: "#AAB5C7", fontSize: 12 }}
                                                >
                                                    @{viewer.username}
                                                </Text>
                                            </View>
                                            <Text style={{ color: "#77869C", fontSize: 11 }}>
                                                Viewed
                                            </Text>
                                        </View>
                                    ))}
                                    {viewersQuery.data.hasMore && (
                                        <Text
                                            style={{
                                                color: "#77869C",
                                                fontSize: 12,
                                                textAlign: "center",
                                                paddingTop: 12,
                                            }}
                                        >
                                            Showing the latest 100 viewers
                                        </Text>
                                    )}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </Modal>
            )}
            {optionsOpen && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 10,
                        flex: 1,
                        justifyContent: "flex-end",
                        backgroundColor: "#00000099",
                    }}
                >
                    <Pressable
                        accessibilityLabel={t("Close story options")}
                        onPress={() => {
                            onCancelOptions();
                        }}
                        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    />
                    <View
                        style={{
                            paddingHorizontal: 22,
                            paddingTop: 12,
                            paddingBottom: Math.max(insetsBottom, 16) + 8,
                            borderTopLeftRadius: 28,
                            borderTopRightRadius: 28,
                            borderTopWidth: 1,
                            borderColor: "#FFFFFF18",
                            backgroundColor: "#111827",
                        }}
                    >
                        <View
                            style={{
                                width: 38,
                                height: 4,
                                borderRadius: 2,
                                alignSelf: "center",
                                backgroundColor: "#667085",
                                marginBottom: 20,
                            }}
                        />
                        <Text style={{ color: "white", fontSize: 21, fontWeight: "700" }}>
                            Story options
                        </Text>
                        <Text style={{ color: "#AAB5C7", fontSize: 13, marginTop: 5, marginBottom: 18 }}>
                            Choose what you’d like to do with this story.
                        </Text>
                        <View
                            style={{
                                padding: 6,
                                borderRadius: 18,
                                backgroundColor: "#1B2434",
                                borderWidth: 1,
                                borderColor: "#FFFFFF0D",
                                marginBottom: 12,
                            }}
                        >
                            <StoryOptionRow
                                icon="post-share"
                                title={t("Share story")}
                                subtitle={t("Send a link to this story")}
                                onPress={onShare}
                            />
                        {story.author.isOwn && (
                                <>
                                    <View style={{ height: 1, marginHorizontal: 12, backgroundColor: "#FFFFFF12" }} />
                                    <StoryOptionRow
                                        icon="trash"
                                        title={t("Delete story")}
                                        subtitle={t("Remove it before it expires")}
                                        destructive
                                        onPress={onDeleteRequest}
                                    />
                                </>
                            )}
                        </View>
                        <StoryModalButton
                            label="Cancel"
                            onPress={() => {
                                onCancelOptions();
                            }}
                        />
                    </View>
                </View>
            )}
            {deleteConfirmOpen && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 11,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        backgroundColor: "#000000AA",
                    }}
                >
                    <Pressable
                        accessibilityLabel={t("Cancel deleting story")}
                        onPress={onCancelDelete}
                        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    />
                    <View
                        style={{
                            width: "100%",
                            maxWidth: 360,
                            padding: 24,
                            borderRadius: 26,
                            borderWidth: 1,
                            borderColor: "#FFFFFF18",
                            backgroundColor: "#141D2C",
                            alignItems: "center",
                        }}
                    >
                        <View
                            style={{
                                width: 54,
                                height: 54,
                                borderRadius: 27,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#482731",
                                marginBottom: 16,
                            }}
                        >
                            <FeedIcon name="trash" size={23} color="#FF7A88" />
                        </View>
                        <Text style={{ color: "white", fontSize: 20, fontWeight: "700", textAlign: "center" }}>
                            Delete your story?
                        </Text>
                        <Text style={{ color: "#AAB5C7", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 9 }}>
                            This photo will be removed from your stories and can’t be restored.
                        </Text>
                        <View style={{ flexDirection: "row", gap: 10, width: "100%", marginTop: 22 }}>
                            <StoryModalButton label="Keep story" onPress={onCancelDelete} />
                            <StoryModalButton
                                label="Delete"
                                destructive
                                onPress={onDelete}
                            />
                        </View>
                    </View>
                </View>
            )}
            {feedback && (
                <View
                    style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        zIndex: 12,
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        backgroundColor: "#000000AA",
                    }}
                >
                    <Pressable
                        accessibilityLabel={t("Dismiss message")}
                        onPress={() => {
                            onDismissFeedback();
                        }}
                        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    />
                    <View
                        style={{
                            width: "100%",
                            maxWidth: 360,
                            padding: 24,
                            borderRadius: 26,
                            borderWidth: 1,
                            borderColor: "#FFFFFF18",
                            backgroundColor: "#141D2C",
                            alignItems: "center",
                        }}
                    >
                        <View
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: 26,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: "#20334F",
                                marginBottom: 16,
                            }}
                        >
                            <FeedIcon name="info" size={23} color="#8BC4FF" />
                        </View>
                        <Text style={{ color: "white", fontSize: 20, fontWeight: "700", textAlign: "center" }}>
                            {feedback?.title}
                        </Text>
                        <Text style={{ color: "#AAB5C7", fontSize: 14, lineHeight: 21, textAlign: "center", marginTop: 9 }}>
                            {feedback?.message}
                        </Text>
                        <View style={{ width: "100%", marginTop: 22 }}>
                            <StoryModalButton
                                label="OK"
                                onPress={onDismissFeedback}
                            />
                        </View>
                    </View>
                </View>
            )}
        </>
    );
}

function StoryOptionRow({
    icon,
    title,
    subtitle,
    onPress,
    destructive = false,
}: {
    icon: IconName;
    title: string;
    subtitle: string;
    onPress: () => void;
    destructive?: boolean;
}) {
    const color = destructive ? "#FF7A88" : "#8BC4FF";
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => ({
                minHeight: 68,
                flexDirection: "row",
                alignItems: "center",
                gap: 13,
                paddingHorizontal: 10,
                borderRadius: 13,
                backgroundColor: pressed ? "#FFFFFF0D" : "transparent",
            })}
        >
            <View
                style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: destructive ? "#482731" : "#20334F",
                }}
            >
                <FeedIcon name={icon} size={19} color={color} />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ color: destructive ? color : "white", fontSize: 15, fontWeight: "600" }}>
                    {title}
                </Text>
                <Text style={{ color: "#98A5B8", fontSize: 12 }}>
                    {subtitle}
                </Text>
            </View>
            <FeedIcon name="chevron-right" size={15} color="#78869B" />
        </Pressable>
    );
}

function StoryModalButton({
    label,
    onPress,
    destructive = false,
}: {
    label: string;
    onPress: () => void;
    destructive?: boolean;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={{
                        flex: 1,
                        minHeight: 48,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 16,
                        borderRadius: 15,
                        backgroundColor: destructive ? "#482731" : "#263246",
                    }}
                >
                    <Text
                        style={{
                            color: destructive ? "#FF7A88" : "white",
                            fontSize: 15,
                            fontWeight: "600",
                            textAlign: "center",
                        }}
                    >
                {label}
            </Text>
        </Pressable>
    );
}
