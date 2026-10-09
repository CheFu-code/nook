import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  signInWithCustomToken,
  type Auth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  initializePresenceAuth,
  updatePresenceAuthPersistence,
} from "./presence-auth";
import {
  getDatabase,
  goOffline,
  goOnline,
  onDisconnect,
  onValue,
  ref,
  serverTimestamp,
  set,
  type Database,
} from "firebase/database";
import { randomUUID } from "expo-crypto";

export type UserPresence = {
  online: boolean;
  lastSeen: number | null;
};
type PresenceListener = (presence: UserPresence) => void;
type PresenceSubscription = {
  listeners: Set<PresenceListener>;
  unsubscribe?: () => void;
};
export type ConversationEvent = {
  eventId: string;
  type: "message" | "reaction" | "delivery";
  sequence: number;
  sentAt: number;
};
type ConversationEventSubscription = {
  listeners: Set<(event: ConversationEvent) => void>;
  unsubscribe?: () => void;
};

const subscriptions = new Map<string, PresenceSubscription>();
const conversationEventSubscriptions = new Map<
  string,
  ConversationEventSubscription
>();
let presenceDatabase: Database | null = null;
let presenceAuth: Auth | null = null;
let presenceAuthReady = false;
const PRESENCE_AUTH_REMEMBER_KEY = "nook_presence_auth_remember";

function getPresenceDatabase() {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const databaseURL = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
  if (!apiKey || !appId || !projectId || !databaseURL) {
    throw new Error(
      "Firebase presence is not configured. Set the public Firebase app and Realtime Database environment variables.",
    );
  }

  const existing = getApps().find((app) => app.name === "nook-presence");
  const app: FirebaseApp =
    existing ??
    initializeApp(
      { apiKey, appId, projectId, databaseURL },
      "nook-presence",
    );
  presenceDatabase ??= getDatabase(app);
  return presenceDatabase;
}

function getPresenceAuth(remember: boolean) {
  if (presenceAuth) return presenceAuth;

  const auth = initializePresenceAuth(getApp("nook-presence"), remember);
  presenceAuth = auth;
  return auth;
}

export async function getPresenceAuthRemembered() {
  const storedPreference = await AsyncStorage.getItem(PRESENCE_AUTH_REMEMBER_KEY);
  if (storedPreference === null) return true;
  if (storedPreference === "true") return true;
  if (storedPreference === "false") return false;
  throw new Error("The saved presence sign-in preference is invalid.");
}

export async function setPresenceAuthRemembered(remember: boolean) {
  const previousPreference = await getPresenceAuthRemembered();
  if (presenceAuth) {
    await updatePresenceAuthPersistence(presenceAuth, remember);
  }
  try {
    await AsyncStorage.setItem(
      PRESENCE_AUTH_REMEMBER_KEY,
      String(remember),
    );
  } catch (error) {
    if (presenceAuth && previousPreference !== remember) {
      try {
        await updatePresenceAuthPersistence(presenceAuth, previousPreference);
      } catch (rollbackError) {
        console.error(
          "Unable to restore the previous presence authentication persistence.",
          rollbackError,
        );
      }
    }
    throw error;
  }
}

function attachUserSubscription(uid: string, subscription: PresenceSubscription) {
  if (!presenceDatabase || !presenceAuthReady || subscription.unsubscribe) return;
  const userRef = ref(presenceDatabase, `presence/${uid}`);
  subscription.unsubscribe = onValue(
    userRef,
    (snapshot) => {
      const sessions = snapshot.child("sessions");
      const online = sessions.exists()
        ? Object.values(sessions.val() as Record<string, { state?: unknown }>).some(
            (session) => session?.state === "online",
          )
        : Object.entries(snapshot.val() ?? {}).some(
            ([key, value]) =>
              key !== "lastSeen" &&
              key !== "sessions" &&
              (value as { state?: unknown } | null)?.state === "online",
          );
      const rawLastSeen = snapshot.child("lastSeen").val();
      const presence = {
        online,
        lastSeen:
          typeof rawLastSeen === "number" && Number.isFinite(rawLastSeen)
            ? rawLastSeen
            : null,
      };
      subscription.listeners.forEach((listener) => listener(presence));
    },
    (error) => {
      console.error("Unable to read user presence.", error);
      subscription.listeners.forEach((listener) =>
        listener({ online: false, lastSeen: null }),
      );
    },
  );
}

function attachConversationEventSubscription(
  uid: string,
  conversationId: string,
  subscription: ConversationEventSubscription,
) {
  if (!presenceDatabase || !presenceAuthReady || subscription.unsubscribe) return;
  subscription.unsubscribe = onValue(
    ref(presenceDatabase, `chatEvents/${uid}/${conversationId}`),
    (snapshot) => {
      const value: unknown = snapshot.val();
      if (
        typeof value !== "object" ||
        value === null ||
        !("eventId" in value) ||
        typeof value.eventId !== "string" ||
        !("type" in value) ||
        (value.type !== "message" &&
          value.type !== "reaction" &&
          value.type !== "delivery") ||
        !("sequence" in value) ||
        typeof value.sequence !== "number" ||
        !("sentAt" in value) ||
        typeof value.sentAt !== "number"
      ) {
        return;
      }
      subscription.listeners.forEach((listener) =>
        listener(value as ConversationEvent),
      );
    },
    (error) => {
      console.error("Unable to subscribe to conversation updates.", error);
    },
  );
}

export function subscribeToPresence(
  uid: string,
  listener: PresenceListener,
) {
  let subscription = subscriptions.get(uid);
  if (!subscription) {
    subscription = { listeners: new Set() };
    subscriptions.set(uid, subscription);
  }
  subscription.listeners.add(listener);
  attachUserSubscription(uid, subscription);

  return () => {
    const current = subscriptions.get(uid);
    if (!current) return;
    current.listeners.delete(listener);
    if (!current.listeners.size) {
      current.unsubscribe?.();
      subscriptions.delete(uid);
    }
  };
}

export function subscribeToConversationEvents(
  uid: string,
  conversationId: string,
  listener: (event: ConversationEvent) => void,
) {
  const key = `${uid}:${conversationId}`;
  let subscription = conversationEventSubscriptions.get(key);
  if (!subscription) {
    subscription = { listeners: new Set() };
    conversationEventSubscriptions.set(key, subscription);
  }
  subscription.listeners.add(listener);
  attachConversationEventSubscription(uid, conversationId, subscription);

  return () => {
    const current = conversationEventSubscriptions.get(key);
    if (!current) return;
    current.listeners.delete(listener);
    if (!current.listeners.size) {
      current.unsubscribe?.();
      conversationEventSubscriptions.delete(key);
    }
  };
}

export async function startPresenceSession(
  uid: string,
  getCustomToken: () => Promise<string>,
) {
  const database = getPresenceDatabase();
  const auth = getPresenceAuth(await getPresenceAuthRemembered());
  if (auth.currentUser?.uid !== uid) {
    presenceAuthReady = false;
    const token = await getCustomToken();
    const credentials = await signInWithCustomToken(auth, token);
    if (credentials.user.uid !== uid) {
      presenceAuthReady = false;
      await auth.signOut();
      throw new Error("Firebase presence authentication returned the wrong user.");
    }
  }

  presenceAuthReady = auth.currentUser?.uid === uid;
  if (!presenceAuthReady) {
    throw new Error("Firebase presence authentication is not ready for this user.");
  }

  subscriptions.forEach((subscription, subscribedUid) =>
    attachUserSubscription(subscribedUid, subscription),
  );
  conversationEventSubscriptions.forEach((subscription, key) => {
    const separator = key.indexOf(":");
    const subscribedUid = key.slice(0, separator);
    const conversationId = key.slice(separator + 1);
    attachConversationEventSubscription(
      subscribedUid,
      conversationId,
      subscription,
    );
  });

  const ownPresenceRef = ref(
    database,
    `presence/${uid}/sessions/${randomUUID()}`,
  );
  const lastSeenRef = ref(database, `presence/${uid}/lastSeen`);
  let active = true;
  let closed = false;
  let writeInFlight: Promise<void> = Promise.resolve();
  const publishOnline = async () => {
    if (!active || closed) return;
    await onDisconnect(lastSeenRef).set(serverTimestamp());
    await onDisconnect(ownPresenceRef).remove();
    if (active && !closed) {
      await set(ownPresenceRef, {
        state: "online",
        lastChanged: serverTimestamp(),
      });
    }
  };
  const connectedUnsubscribe = onValue(
    ref(database, ".info/connected"),
    (snapshot) => {
      if (!active || snapshot.val() !== true) return;
      writeInFlight = writeInFlight
        .then(publishOnline)
        .catch((error: unknown) => {
          console.error("Unable to publish online presence.", error);
        });
    },
    (error) => {
      console.error("Unable to monitor Firebase presence connection.", error);
    },
  );

  return {
    setActive(nextActive: boolean) {
      if (closed || active === nextActive) return;
      active = nextActive;
      if (active) {
        goOnline(database);
        writeInFlight = writeInFlight
          .then(publishOnline)
          .catch((error: unknown) => {
            console.error("Unable to restore online presence.", error);
          });
        return;
      }
      writeInFlight = writeInFlight
        .then(() => set(lastSeenRef, serverTimestamp()))
        .then(() => set(ownPresenceRef, null))
        .then(() => {
          if (!active) goOffline(database);
        })
        .catch((error: unknown) => {
          console.error("Unable to clear online presence.", error);
          if (!active) goOffline(database);
        });
    },
    async close() {
      if (closed) return;
      closed = true;
      active = false;
      connectedUnsubscribe();
      try {
        await writeInFlight;
        await set(lastSeenRef, serverTimestamp());
        await set(ownPresenceRef, null);
      } catch (error) {
        console.error("Unable to clear online presence on session end.", error);
      } finally {
        goOffline(database);
      }
    },
  };
}
