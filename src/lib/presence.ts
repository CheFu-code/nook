import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
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

type PresenceListener = (online: boolean) => void;
type PresenceSubscription = {
  listeners: Set<PresenceListener>;
  unsubscribe?: () => void;
};

const subscriptions = new Map<string, PresenceSubscription>();
let presenceDatabase: Database | null = null;

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

function attachUserSubscription(uid: string, subscription: PresenceSubscription) {
  if (!presenceDatabase || subscription.unsubscribe) return;
  const userRef = ref(presenceDatabase, `presence/${uid}`);
  subscription.unsubscribe = onValue(
    userRef,
    (snapshot) => {
      const online = snapshot.exists();
      subscription.listeners.forEach((listener) => listener(online));
    },
    (error) => {
      console.error("Unable to read user presence.", error);
      subscription.listeners.forEach((listener) => listener(false));
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

export async function startPresenceSession(
  uid: string,
  getCustomToken: () => Promise<string>,
) {
  const database = getPresenceDatabase();
  const auth = getAuth(getApp("nook-presence"));
  if (auth.currentUser?.uid !== uid) {
    const token = await getCustomToken();
    const credentials = await signInWithCustomToken(auth, token);
    if (credentials.user.uid !== uid) {
      await auth.signOut();
      throw new Error("Firebase presence authentication returned the wrong user.");
    }
  }

  subscriptions.forEach((subscription, subscribedUid) =>
    attachUserSubscription(subscribedUid, subscription),
  );

  const ownPresenceRef = ref(
    database,
    `presence/${uid}/${randomUUID()}`,
  );
  let active = true;
  let closed = false;
  let writeInFlight: Promise<void> = Promise.resolve();
  const publishOnline = async () => {
    if (!active || closed) return;
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
        await set(ownPresenceRef, null);
      } catch (error) {
        console.error("Unable to clear online presence on session end.", error);
      } finally {
        goOffline(database);
      }
    },
  };
}
