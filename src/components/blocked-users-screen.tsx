import { useState } from "react";
import {
    Alert,
    ActivityIndicator,
    FlatList,
    Pressable,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNookApi, useNookPaginatedQuery } from "@/hooks/use-nook-api";
import { errorMessage, type SocialProfile } from "@/lib/social";
import { useAppTheme } from "@/lib/theme";
import { Avatar } from "./social/media";
import { FeedIcon } from "./feed-icon";
import { LoadMore } from "./social/ui";
import { useNookLanguage } from "@/lib/language";

export function BlockedUsersScreen({ onClose }: { onClose: () => void }) {
    const theme = useAppTheme();
    const { t } = useNookLanguage();
    const insets = useSafeAreaInsets();
    const request = useNookApi();
    const blocked = useNookPaginatedQuery<SocialProfile>("/nook/blocks");
    const [busyUid, setBusyUid] = useState<string | null>(null);
    const items = blocked.results;

    async function unblock(profile: SocialProfile) {
        if (busyUid) return;
        setBusyUid(profile._id);
        try {
            await request(`/nook/profiles/${encodeURIComponent(profile._id)}/block`, {
                method: "DELETE",
            });
            await blocked.refresh();
        } finally {
            setBusyUid(null);
        }
    }

    return (
        <View
            style={{
                flex: 1,
                paddingTop: insets.top,
                backgroundColor: theme.background,
            }}
        >
            <View
                style={{
                    minHeight: 52,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 14,
                    gap: 12,
                }}
            >
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("Back to settings")}
                    onPress={onClose}
                    hitSlop={8}
                >
                    <FeedIcon name="back" size={24} color={theme.ink} />
                </Pressable>
                <Text
                    accessibilityRole="header"
                    style={{
                        color: theme.ink,
                        fontSize: 22,
                        fontWeight: "700",
                        letterSpacing: -0.5,
                    }}
                >
                    {t("Blocked users")}
                </Text>
            </View>
            {blocked.status === "Error" && items.length === 0 ? (
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 24,
                        gap: 12,
                    }}
                >
                    <Text style={{ color: theme.secondary, textAlign: "center" }}>
                        {t("Couldn’t load your blocked users.")} {errorMessage(blocked.error)}
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => void blocked.refresh()}
                        style={{
                            paddingHorizontal: 18,
                            paddingVertical: 10,
                            borderRadius: 12,
                            backgroundColor: theme.blue,
                        }}
                    >
                        <Text style={{ color: "white", fontWeight: "600" }}>{t("Try again")}</Text>
                    </Pressable>
                </View>
            ) : blocked.status === "LoadingFirstPage" ? (
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator color={theme.blue} />
                </View>
            ) : items.length === 0 ? (
                <View
                    style={{
                        flex: 1,
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 28,
                    }}
                >
                    <FeedIcon name="blocked" size={32} color={theme.muted} />
                    <Text
                        style={{
                            color: theme.ink,
                            fontSize: 17,
                            fontWeight: "700",
                            marginTop: 14,
                        }}
                    >
                        {t("No blocked users")}
                    </Text>
                    <Text
                        style={{
                            color: theme.muted,
                            textAlign: "center",
                            lineHeight: 21,
                            marginTop: 6,
                        }}
                    >
                        {t("People you block will appear here. You can unblock them at any time.")}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={profile => profile._id}
                    contentContainerStyle={{
                        paddingHorizontal: 16,
                        paddingTop: 8,
                        paddingBottom: insets.bottom + 20,
                    }}
                    ItemSeparatorComponent={() => (
                        <View style={{ height: 1, backgroundColor: theme.border, marginLeft: 60 }} />
                    )}
                    renderItem={({ item }) => (
                        <View
                            style={{
                                minHeight: 76,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12,
                            }}
                        >
                            <Avatar profile={item} size={44} />
                            <View style={{ flex: 1 }}>
                                <Text
                                    numberOfLines={1}
                                    style={{ color: theme.ink, fontWeight: "600", fontSize: 14 }}
                                >
                                    {item.name || item.username}
                                </Text>
                                <Text
                                    numberOfLines={1}
                                    style={{ color: theme.muted, fontSize: 13, marginTop: 3 }}
                                >
                                    @{item.username}
                                </Text>
                            </View>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={`${t("Unblock")} @${item.username}`}
                                accessibilityState={{ disabled: busyUid !== null, busy: busyUid === item._id }}
                                disabled={busyUid !== null}
                                onPress={() => {
                                    void unblock(item).catch(error => {
                                        Alert.alert(t("Could not unblock user"), errorMessage(error));
                                    });
                                }}
                                style={{
                                    minWidth: 90,
                                    minHeight: 36,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderWidth: 1,
                                    borderColor: theme.border,
                                    borderRadius: 11,
                                    paddingHorizontal: 12,
                                }}
                            >
                                {busyUid === item._id ? (
                                    <ActivityIndicator size="small" color={theme.blue} />
                                ) : (
                                    <Text style={{ color: theme.ink, fontWeight: "600", fontSize: 13 }}>
                                        {t("Unblock")}
                                    </Text>
                                )}
                            </Pressable>
                        </View>
                    )}
                    ListFooterComponent={
                        <LoadMore status={blocked.status} loadMore={blocked.loadMore} />
                    }
                />
            )}
        </View>
    );
}
