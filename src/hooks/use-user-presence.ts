import { useEffect, useState } from "react";
import { useAuth } from "@/lib/chefu-auth";
import { subscribeToPresence, type UserPresence } from "@/lib/presence";

export function useUserPresenceStatus(
  uid: string,
  enabled = true,
): UserPresence | undefined {
  const { userId } = useAuth();
  const [presence, setPresence] = useState<
    { uid: string; status: UserPresence } | undefined
  >();
  const isSelf = uid === userId;

  useEffect(() => {
    if (!enabled || !uid || isSelf) return;
    return subscribeToPresence(uid, (status) => setPresence({ uid, status }));
  }, [enabled, isSelf, uid]);

  return enabled && !isSelf && presence?.uid === uid
    ? presence.status
    : undefined;
}

export function useUserPresence(uid: string, enabled = true) {
  return useUserPresenceStatus(uid, enabled)?.online ?? false;
}
