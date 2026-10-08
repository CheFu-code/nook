import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sentry from "@sentry/react-native";
import { useNookApi } from "@/hooks/use-nook-api";
import { useAuth } from "@/lib/chefu-auth";
import { useAppTheme } from "@/lib/theme";

type IncomingMessageNotification = {
  title: string;
  body: string;
  conversationId: string;
};

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function readMessageNotification(
  notification: Notifications.Notification,
): IncomingMessageNotification | null {
  const data = notification.request.content.data;
  if (
    !data ||
    data.type !== "message" ||
    typeof data.conversationId !== "string" ||
    !data.conversationId
  ) {
    return null;
  }
  return {
    title: notification.request.content.title || "New message",
    body: notification.request.content.body || "",
    conversationId: data.conversationId,
  };
}

export function MessageNotifications() {
  const { isSignedIn, userId } = useAuth();
  const request = useNookApi();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const [alert, setAlert] = useState<IncomingMessageNotification | null>(null);
  const registeredToken = useRef<string | null>(null);
  const handledResponse = useRef<string | null>(null);

  useEffect(() => {
    if (!isSignedIn || !Device.isDevice || Platform.OS === "web") return;
    let cancelled = false;

    async function register() {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("messages", {
          name: "Messages",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#087EFF",
        });
      }
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted) permission = await Notifications.requestPermissionsAsync();
      if (!permission.granted) return;

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) throw new Error("Expo project ID is missing from app configuration.");
      const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      if (cancelled) return;
      await request("/nook/messages/push-token", {
        method: "POST",
        body: { token, platform: Platform.OS },
      });
      registeredToken.current = token;
    }

    void register().catch(error => {
      if (!cancelled) Sentry.captureException(error);
    });
    return () => {
      cancelled = true;
      const token = registeredToken.current;
      registeredToken.current = null;
      if (token) {
        void request("/nook/messages/push-token", {
          method: "DELETE",
          body: { token },
        }).catch(error => Sentry.captureException(error));
      }
    };
  }, [isSignedIn, userId, request]);

  useEffect(() => {
    const openNotification = (notification: Notifications.Notification) => {
      const identifier = notification.request.identifier;
      if (handledResponse.current === identifier) return;
      handledResponse.current = identifier;
      const message = readMessageNotification(notification);
      void Notifications.clearLastNotificationResponseAsync()
        .catch(error => Sentry.captureException(error));
      if (!message) return;
      setAlert(null);
      router.push({
        pathname: "/chat/[id]",
        params: { id: message.conversationId },
      });
    };
    const received = Notifications.addNotificationReceivedListener(notification => {
      const message = readMessageNotification(notification);
      if (!message) return;
      const openConversationPath = `/chat/${encodeURIComponent(message.conversationId)}`;
      if (pathname !== openConversationPath) setAlert(message);
    });
    const response = Notifications.addNotificationResponseReceivedListener(event => {
      openNotification(event.notification);
    });
    void Notifications.getLastNotificationResponseAsync()
      .then(event => {
        if (!event) return;
        openNotification(event.notification);
      })
      .catch(error => Sentry.captureException(error));
    return () => {
      received.remove();
      response.remove();
    };
  }, [pathname, router]);

  useEffect(() => {
    if (!alert) return;
    const timeout = setTimeout(() => setAlert(null), 5000);
    return () => clearTimeout(timeout);
  }, [alert]);

  if (!alert || !isSignedIn) return null;
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        paddingHorizontal: 12,
        paddingTop: insets.top + 8,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Message from ${alert.title}: ${alert.body}`}
        onPress={() => {
          setAlert(null);
          router.push({
            pathname: "/chat/[id]",
            params: { id: alert.conversationId },
          });
        }}
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          boxShadow: "0px 4px 14px #00000026",
        }}
      >
        <Text style={{ color: theme.ink, fontWeight: "700", fontSize: 15 }}>
          {alert.title}
        </Text>
        <Text
          numberOfLines={2}
          style={{ color: theme.secondary, fontSize: 14, marginTop: 3 }}
        >
          {alert.body}
        </Text>
      </Pressable>
    </View>
  );
}
