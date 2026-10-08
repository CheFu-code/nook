import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
    FlatList,
    Pressable,
    Text,
    View,
    useWindowDimensions,
    type ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { type SocialPost } from "@/lib/social";
import { useNookCursorPaginatedQuery } from "@/hooks/use-nook-api";
import { Header, ConnectionStatus, LoadMore, ui } from "./ui";
import { HomeHeader } from "../home-layout";
import { Stories } from "./stories";
import { PostCard } from "./post-card";
import { useAppTheme } from "@/lib/theme";
import { useNookLanguage } from "@/lib/language";

export function LiveHome() {
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const s = width / 390;
    const theme = useAppTheme();
    const { t } = useNookLanguage();
    const { results, status, loadMore } = useNookCursorPaginatedQuery<SocialPost>(
        "/nook/posts?feed=home&cursorMode=true",
    );
    const [visible, setVisible] = useState<string[]>([]);
    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken<SocialPost>[] }) =>
            setVisible(viewableItems.map((item) => item.item._id)),
    ).current;
    return (
        <View
            style={[ui.screen, { paddingTop: Math.max(40 * s, insets.top - 15 * s), backgroundColor: theme.background }]}
        >
            <HomeHeader />
            <ConnectionStatus />
            <FlatList
                data={results}
                keyExtractor={(item) => item._id}
                ListHeaderComponent={<Stories />}
                contentInsetAdjustmentBehavior="never"
                renderItem={({ item }) => (
                    <PostCard home post={item} visible={visible.includes(item._id)} />
                )}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
                onEndReached={() => {
                    if (status === "CanLoadMore") loadMore(20);
                }}
                onEndReachedThreshold={0.5}
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
                ListEmptyComponent={
                    status !== "LoadingFirstPage" ? (
                        <View style={{ padding: 32, gap: 16, alignItems: "center" }}>
                            <Text style={[ui.title, { color: theme.ink }]}>{t("Your feed starts here")}</Text>
                            <Text style={[ui.muted, { textAlign: "center", color: theme.muted }]}>
                                {t("Share your first moment, or discover people to follow.")}
                            </Text>
                            <Pressable
                                style={ui.button}
                                onPress={() => router.push("/compose")}
                            >
                                <Text style={ui.buttonText}>{t("Create a post")}</Text>
                            </Pressable>
                            <Pressable onPress={() => router.navigate("/explore")}>
                                <Text style={ui.link}>{t("Explore the community")}</Text>
                            </Pressable>
                        </View>
                    ) : null
                }
                ListFooterComponent={<LoadMore status={status} loadMore={loadMore} />}
            />
        </View>
    );
}
