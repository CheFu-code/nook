import { ActivityIndicator, Text, View } from "react-native";
import { ui } from "./ui";
import { useAppTheme } from "@/lib/theme";

export function ProfileLoading() {
    const theme = useAppTheme();
    return (
        <View style={[ui.screen, { backgroundColor: theme.background }]}>
            <View
                style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 32,
                }}
            >
                <View
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: theme.subtle,
                        marginBottom: 24,
                    }}
                >
                    <ActivityIndicator color={theme.blue} size="small" />
                </View>

                <Text
                    style={[
                        ui.title,
                        {
                            color: theme.ink,
                            textAlign: "center",
                            marginBottom: 8,
                        },
                    ]}
                >
                    Getting things ready
                </Text>

                <Text
                    style={[
                        ui.muted,
                        {
                            color: theme.muted,
                            textAlign: "center",
                            maxWidth: 300,
                            lineHeight: 21,
                        },
                    ]}
                >
                    We’re setting up your account. This will only take a moment.
                </Text>
            </View>
        </View>
    );
}
