import { useAppTheme } from "@/lib/theme";
import type { SocialPost } from "@/lib/social";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { FeedIcon } from "../feed-icon";
import { useNookLanguage } from "@/lib/language";

export function PostCardOptions({
    post,
    scale,
    optionsOpen,
    onOptionsClose,
    onEdit,
    onShare,
    deleteConfirmOpen,
    onDeleteRequest,
    onDeleteCancel,
    onDelete,
    editOpen,
    caption,
    onCaptionChange,
    onEditCancel,
    onSave,
    busy,
    feedback,
    onDismissFeedback,
}: {
    post: SocialPost;
    scale: number;
    optionsOpen: boolean;
    onOptionsClose: () => void;
    onEdit: () => void;
    onShare: () => void;
    deleteConfirmOpen: boolean;
    onDeleteRequest: () => void;
    onDeleteCancel: () => void;
    onDelete: () => void;
    editOpen: boolean;
    caption: string;
    onCaptionChange: (value: string) => void;
    onEditCancel: () => void;
    onSave: () => void;
    busy: boolean;
    feedback: { title: string; message: string } | null;
    onDismissFeedback: () => void;
}) {
    const theme = useAppTheme();
    const { t } = useNookLanguage();
    const closeOptions = () => {
        onOptionsClose();
    };

    return (
        <>
            <Modal
                visible={optionsOpen}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={closeOptions}
            >
                <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#00000099" }}>
                    <Pressable
                        accessibilityLabel={t("Close post options")}
                        onPress={closeOptions}
                        style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
                    />
                    <View
                        style={{
                            paddingHorizontal: 22 * scale,
                            paddingTop: 12 * scale,
                            paddingBottom: 24 * scale,
                            borderTopLeftRadius: 26 * scale,
                            borderTopRightRadius: 26 * scale,
                            backgroundColor: theme.surface,
                            borderTopWidth: 1,
                            borderColor: theme.border,
                        }}
                    >
                        <View
                            style={{
                                width: 38 * scale,
                                height: 4 * scale,
                                borderRadius: 2 * scale,
                                alignSelf: "center",
                                backgroundColor: theme.muted,
                                marginBottom: 18 * scale,
                            }}
                        />
                        <Text style={{ color: theme.ink, fontSize: 20 * scale, fontWeight: "700" }}>
                            {t("Post options")}
                        </Text>
                        <View
                            style={{
                                marginTop: 16 * scale,
                                padding: 5 * scale,
                                borderRadius: 17 * scale,
                                borderWidth: 1,
                                borderColor: theme.border,
                                backgroundColor: theme.background,
                            }}
                        >
                            <PostOptionRow
                                icon="compose"
                                title={t("Edit")}
                                subtitle={t(post.kind === "text" ? "Edit your post" : "Edit your caption")}
                                scale={scale}
                                onPress={onEdit}
                            />
                            <View style={{ height: 1, marginHorizontal: 10 * scale, backgroundColor: theme.border }} />
                            <PostOptionRow
                                icon="post-share"
                                title={t("Share")}
                                subtitle={t("Send a link to this post")}
                                scale={scale}
                                onPress={onShare}
                            />
                            <View style={{ height: 1, marginHorizontal: 10 * scale, backgroundColor: theme.border }} />
                            <PostOptionRow
                                icon="trash"
                                title={t("Delete")}
                                subtitle={t("Remove this post")}
                                destructive
                                scale={scale}
                                onPress={onDeleteRequest}
                            />
                        </View>
                        <Pressable
                            accessibilityRole="button"
                            onPress={closeOptions}
                            style={{
                                minHeight: 46 * scale,
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: 10 * scale,
                                borderRadius: 14 * scale,
                                backgroundColor: theme.subtle,
                            }}
                        >
                            <Text style={{ color: theme.ink, fontSize: 14 * scale, fontWeight: "600" }}>
                                {t("Cancel")}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={editOpen}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={onEditCancel}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24 * scale,
                        backgroundColor: "#000000AA",
                    }}
                >
                    <View
                        style={{
                            width: "100%",
                            maxWidth: 420 * scale,
                            padding: 22 * scale,
                            borderRadius: 24 * scale,
                            backgroundColor: theme.surface,
                            borderWidth: 1,
                            borderColor: theme.border,
                        }}
                    >
                        <Text style={{ color: theme.ink, fontSize: 20 * scale, fontWeight: "700" }}>
                            {t(post.kind === "text" ? "Edit post" : "Edit caption")}
                        </Text>
                        <TextInput
                            accessibilityLabel={t(post.kind === "text" ? "Post text" : "Post caption")}
                            value={caption}
                            onChangeText={onCaptionChange}
                            multiline
                            maxLength={2200}
                            textAlignVertical="top"
                            placeholder={t("Write a caption…")}
                            placeholderTextColor={theme.muted}
                            style={{
                                minHeight: 150 * scale,
                                maxHeight: 260 * scale,
                                marginTop: 16 * scale,
                                padding: 14 * scale,
                                borderRadius: 14 * scale,
                                borderWidth: 1,
                                borderColor: theme.border,
                                color: theme.ink,
                                backgroundColor: theme.background,
                                fontSize: 15 * scale,
                                lineHeight: 22 * scale,
                            }}
                        />
                        <Text style={{ color: theme.muted, textAlign: "right", fontSize: 11 * scale, marginTop: 6 * scale }}>
                            {caption.length}/2200
                        </Text>
                        <View style={{ flexDirection: "row", gap: 10 * scale, marginTop: 16 * scale }}>
                            <PostModalButton label={t("Cancel")} onPress={onEditCancel} scale={scale} disabled={busy} />
                            <PostModalButton
                                label={t("Save")}
                                onPress={onSave}
                                scale={scale}
                                disabled={busy || (post.kind === "text" && !caption.trim())}
                                busy={busy}
                                primary
                            />
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
            <Modal
                visible={deleteConfirmOpen}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={onDeleteCancel}
            >
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24 * scale,
                        backgroundColor: "#000000AA",
                    }}
                >
                    <View
                        style={{
                            width: "100%",
                            maxWidth: 380 * scale,
                            padding: 24 * scale,
                            alignItems: "center",
                            borderRadius: 24 * scale,
                            backgroundColor: theme.surface,
                            borderWidth: 1,
                            borderColor: theme.border,
                        }}
                    >
                        <View
                            style={{
                                width: 52 * scale,
                                height: 52 * scale,
                                alignItems: "center",
                                justifyContent: "center",
                                borderRadius: 26 * scale,
                                backgroundColor: theme.isDark ? "#482731" : "#FFF0F1",
                                marginBottom: 14 * scale,
                            }}
                        >
                            <FeedIcon name="trash" size={22 * scale} color="#E5485D" />
                        </View>
                        <Text style={{ color: theme.ink, fontSize: 19 * scale, fontWeight: "700", textAlign: "center" }}>
                            {t("Delete post?")}
                        </Text>
                        <Text style={{ color: theme.muted, fontSize: 14 * scale, lineHeight: 21 * scale, textAlign: "center", marginTop: 8 * scale }}>
                            {t("This removes the post, its media, likes, and comments.")}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 10 * scale, width: "100%", marginTop: 20 * scale }}>
                            <PostModalButton label={t("Cancel")} onPress={onDeleteCancel} scale={scale} disabled={busy} />
                            <PostModalButton label={t("Delete")} onPress={onDelete} scale={scale} disabled={busy} busy={busy} destructive />
                        </View>
                    </View>
                </View>
            </Modal>
            <Modal
                visible={feedback !== null}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={onDismissFeedback}
            >
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24 * scale,
                        backgroundColor: "#000000AA",
                    }}
                >
                    <View
                        style={{
                            width: "100%",
                            maxWidth: 380 * scale,
                            padding: 24 * scale,
                            alignItems: "center",
                            borderRadius: 24 * scale,
                            backgroundColor: theme.surface,
                            borderWidth: 1,
                            borderColor: theme.border,
                        }}
                    >
                        <FeedIcon name="info" size={26 * scale} color={theme.blue} />
                        <Text style={{ color: theme.ink, fontSize: 18 * scale, fontWeight: "700", textAlign: "center", marginTop: 12 * scale }}>
                            {feedback?.title}
                        </Text>
                        <Text style={{ color: theme.muted, fontSize: 14 * scale, lineHeight: 21 * scale, textAlign: "center", marginTop: 8 * scale }}>
                            {feedback?.message}
                        </Text>
                        <PostModalButton label={t("OK")} onPress={onDismissFeedback} scale={scale} primary />
                    </View>
                </View>
            </Modal>
        </>
    );
}

function PostOptionRow({
    icon,
    title,
    subtitle,
    scale,
    onPress,
    destructive = false,
}: {
    icon: "compose" | "post-share" | "trash";
    title: string;
    subtitle: string;
    scale: number;
    onPress: () => void;
    destructive?: boolean;
}) {
    const theme = useAppTheme();
    const color = destructive ? "#E5485D" : theme.ink;
    return (
        <Pressable
            accessibilityRole="button"
            onPress={onPress}
            style={({ pressed }) => ({
                minHeight: 62 * scale,
                flexDirection: "row",
                alignItems: "center",
                gap: 12 * scale,
                paddingHorizontal: 10 * scale,
                borderRadius: 12 * scale,
                backgroundColor: pressed ? theme.subtle : "transparent",
            })}
        >
            <FeedIcon name={icon} size={19 * scale} color={color} />
            <View style={{ flex: 1, gap: 3 * scale }}>
                <Text style={{ color, fontSize: 14 * scale, fontWeight: "600" }}>{title}</Text>
                <Text style={{ color: theme.muted, fontSize: 11 * scale }}>{subtitle}</Text>
            </View>
            <FeedIcon name="chevron-right" size={15 * scale} color={theme.muted} />
        </Pressable>
    );
}

function PostModalButton({
    label,
    onPress,
    scale,
    disabled = false,
    busy = false,
    primary = false,
    destructive = false,
}: {
    label: string;
    onPress: () => void;
    scale: number;
    disabled?: boolean;
    busy?: boolean;
    primary?: boolean;
    destructive?: boolean;
}) {
    const theme = useAppTheme();
    const color = destructive ? "#E5485D" : primary ? "white" : theme.ink;
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled, busy }}
            disabled={disabled}
            onPress={onPress}
            style={{
                flex: 1,
                minHeight: 46 * scale,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 12 * scale,
                borderRadius: 13 * scale,
                backgroundColor: destructive
                    ? theme.isDark ? "#482731" : "#FFF0F1"
                    : primary ? theme.blue : theme.subtle,
                opacity: disabled && !busy ? 0.6 : 1,
            }}
        >
            {busy ? (
                <ActivityIndicator color={color} />
            ) : (
                <Text style={{ color, fontSize: 14 * scale, fontWeight: "600" }}>{label}</Text>
            )}
        </Pressable>
    );
}
