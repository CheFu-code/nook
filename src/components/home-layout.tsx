import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { FeedIcon } from "./feed-icon";
import { useAppTheme } from "@/lib/theme";
import { useNookLanguage } from "@/lib/language";

export function HomeHeader() {
    const router = useRouter();
    const theme = useAppTheme();
    const { t } = useNookLanguage();
    const { width, height } = useWindowDimensions();
    const s = width / 390;
    const v = height / 916;
    return (
        <View
            style={{
                height: 50 * v,
                marginHorizontal: 14 * s,
                flexDirection: "row",
                alignItems: "center",
                gap: 10 * s,
            }}
        >
            <Image
                source={require("../../assets/images/logo-2.png")}
                tintColor={theme.isDark ? theme.ink : undefined}
                style={{ width: 38 * s, height: 38 * s }}
            />
            <Text
                style={{
                    flex: 1,
                    color: theme.ink,
                    fontSize: 23 * s,
                    fontWeight: "700",
                    letterSpacing: -0.8 * s,
                }}
            >
                nook
            </Text>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Search people and posts")}
                onPress={() => router.navigate("/explore")}
                style={{
                    width: 38 * s,
                    height: 38 * s,
                    borderRadius: 99,
                    backgroundColor: theme.subtle,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <FeedIcon name="search" size={22 * s} color={theme.ink} />
            </Pressable>
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("Create a post")}
                onPress={() => router.push("/compose")}
                style={{
                    width: 38 * s,
                    height: 38 * s,
                    borderRadius: 99,
                    backgroundColor: theme.blueSoft,
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <FeedIcon name="plus" size={23 * s} color={theme.blue} />
            </Pressable>
        </View>
    );
}
