import {
  getAuth,
  getReactNativePersistence,
  inMemoryPersistence,
  initializeAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import type { FirebaseApp } from "firebase/app";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function initializePresenceAuth(app: FirebaseApp, remember: boolean): Auth {
  try {
    return initializeAuth(app, {
      persistence: remember
        ? getReactNativePersistence(AsyncStorage)
        : inMemoryPersistence,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "auth/already-initialized"
    ) {
      return getAuth(app);
    }
    throw error;
  }
}

export function updatePresenceAuthPersistence(auth: Auth, remember: boolean) {
  return setPersistence(
    auth,
    remember
      ? getReactNativePersistence(AsyncStorage)
      : inMemoryPersistence,
  );
}
