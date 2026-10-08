import { useEffect, useState } from "react";
import { useAuth } from "@/lib/chefu-auth";
import { subscribeToPresence } from "@/lib/presence";

export function useUserPresence(uid: string, enabled = true) {
  const { userId } = useAuth();
  const [presence, setPresence] = useState<{ uid: string; online: boolean }>();
  const isSelf = uid === userId;

  useEffect(() => {
    if (!enabled || !uid || isSelf) return;
    return subscribeToPresence(uid, (online) => setPresence({ uid, online }));
  }, [enabled, isSelf, uid]);

  return enabled && !isSelf && presence?.uid === uid && presence.online;
}
