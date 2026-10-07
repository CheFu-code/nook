import { ActivityIndicator, Text, View } from "react-native";
import { ui } from "./ui";

export function ProfileLoading() {
    return (
        <View style={ui.screen}>
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
                        backgroundColor: "#F4F4F5",
                        marginBottom: 24,
                    }}
                >
                    <ActivityIndicator color="#087EFF" size="small" />
                </View>

                <Text
                    style={[
                        ui.title,
                        {
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
