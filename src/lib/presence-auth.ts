import {
  browserLocalPersistence,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import type { FirebaseApp } from "firebase/app";

export function initializePresenceAuth(app: FirebaseApp, remember: boolean): Auth {
  try {
    return initializeAuth(app, {
      persistence: remember ? browserLocalPersistence : inMemoryPersistence,
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
    remember ? browserLocalPersistence : inMemoryPersistence,
  );
}
