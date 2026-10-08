import { useEffect } from "react";
import { AppState } from "react-native";
import { useNookApi } from "@/hooks/use-nook-api";
import { useAuth } from "@/lib/chefu-auth";
import { startPresenceSession } from "@/lib/presence";

export function PresenceSession() {
  const { isSignedIn, userId } = useAuth();
  const request = useNookApi();

  useEffect(() => {
    if (!isSignedIn || !userId) return;
    let cancelled = false;
    let session:
      | Awaited<ReturnType<typeof startPresenceSession>>
      | undefined;
    const subscription = AppState.addEventListener("change", (state) => {
      session?.setActive(state === "active");
    });

    void startPresenceSession(userId, async () => {
      const result = await request<{ customToken: string }>(
        "/nook/presence-token",
        { method: "POST" },
      );
      return result.customToken;
    })
      .then((activeSession) => {
        if (cancelled) {
          void activeSession.close();
          return;
        }
        session = activeSession;
        session.setActive(AppState.currentState === "active");
      })
      .catch((error: unknown) => {
        console.error("Unable to start Nook presence.", error);
      });

    return () => {
      cancelled = true;
      subscription.remove();
      void session?.close();
    };
  }, [isSignedIn, request, userId]);

  return null;
}
